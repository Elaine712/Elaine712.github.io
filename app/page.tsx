"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import config from "../config";

type Stage = "welcome" | "letter" | "photos" | "cake" | "celebration" | "final";
type Countdown = { days: number; hours: number; minutes: number; seconds: number; isToday: boolean; hasPassed: boolean };
type FireworkParticle = {
  x: number; y: number; vx: number; vy: number; alpha: number; decay: number;
  hue: number; size: number; trail: Array<{ x: number; y: number }>;
};
type Rocket = { x: number; y: number; targetY: number; vx: number; vy: number; hue: number; trail: Array<{ x: number; y: number }> };

function getCountdown(): Countdown {
  const now = new Date();
  const thisYear = new Date(now.getFullYear(), config.birthdayMonth - 1, config.birthdayDay);
  const isToday =
    now.getMonth() === config.birthdayMonth - 1 && now.getDate() === config.birthdayDay;
  const hasPassed = now > thisYear && !isToday;
  const target = hasPassed
    ? new Date(now.getFullYear() + 1, config.birthdayMonth - 1, config.birthdayDay)
    : thisYear;
  const difference = Math.max(0, target.getTime() - now.getTime());
  return {
    days: Math.floor(difference / 86400000),
    hours: Math.floor((difference / 3600000) % 24),
    minutes: Math.floor((difference / 60000) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    isToday,
    hasPassed,
  };
}

function FireworksCanvas({ active, burstSignal }: { active: boolean; burstSignal: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rocketsRef = useRef<Rocket[]>([]);
  const particlesRef = useRef<FireworkParticle[]>([]);
  const launchRef = useRef<((x?: number, y?: number) => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let width = 0;
    let height = 0;
    let frame = 0;
    let lastLaunch = 0;
    let animationId = 0;
    let paused = document.hidden;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowPower = navigator.hardwareConcurrency ? navigator.hardwareConcurrency <= 4 : false;
    const particleCap = reduced ? 90 : lowPower ? 280 : 520;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const launch = (providedX?: number, providedY?: number) => {
      if (!active || rocketsRef.current.length > 8) return;
      const x = providedX ?? width * (0.16 + Math.random() * 0.68);
      const targetY = providedY ?? height * (0.12 + Math.random() * 0.36);
      rocketsRef.current.push({
        x, y: height + 18, targetY,
        vx: (Math.random() - 0.5) * 0.65,
        vy: -(8.5 + Math.random() * 2),
        hue: [38, 48, 330, 205, 18][Math.floor(Math.random() * 5)],
        trail: [],
      });
    };
    launchRef.current = launch;

    const explode = (rocket: Rocket) => {
      const remaining = Math.max(0, particleCap - particlesRef.current.length);
      const count = Math.min(remaining, reduced ? 24 : lowPower ? 42 : 58);
      for (let index = 0; index < count; index += 1) {
        const angle = (Math.PI * 2 * index) / count + Math.random() * 0.08;
        const speed = 1.5 + Math.random() * 3.6;
        particlesRef.current.push({
          x: rocket.x, y: rocket.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          decay: 0.011 + Math.random() * 0.009,
          hue: rocket.hue + (Math.random() - 0.5) * 20,
          size: 1 + Math.random() * 1.5,
          trail: [],
        });
      }
    };

    const drawTrail = (trail: Array<{ x: number; y: number }>, hue: number, alpha: number, size: number) => {
      if (trail.length < 2) return;
      context.beginPath();
      context.moveTo(trail[0].x, trail[0].y);
      for (let index = 1; index < trail.length; index += 1) context.lineTo(trail[index].x, trail[index].y);
      context.strokeStyle = `hsla(${hue}, 88%, 68%, ${alpha * 0.42})`;
      context.lineWidth = size;
      context.stroke();
    };

    const animate = (time: number) => {
      animationId = requestAnimationFrame(animate);
      if (paused) return;
      context.globalCompositeOperation = "source-over";
      context.fillStyle = active ? "rgba(5, 8, 27, 0.22)" : "rgba(5, 8, 27, 0.08)";
      context.fillRect(0, 0, width, height);
      context.globalCompositeOperation = "lighter";

      if (active && time - lastLaunch > (reduced ? 2200 : lowPower ? 1050 : 720)) {
        launch();
        lastLaunch = time;
      }

      rocketsRef.current = rocketsRef.current.filter((rocket) => {
        rocket.trail.unshift({ x: rocket.x, y: rocket.y });
        rocket.trail.length = Math.min(rocket.trail.length, 8);
        rocket.x += rocket.vx;
        rocket.y += rocket.vy;
        rocket.vy += 0.055;
        drawTrail(rocket.trail, rocket.hue, 1, 1.5);
        context.beginPath();
        context.arc(rocket.x, rocket.y, 2, 0, Math.PI * 2);
        context.fillStyle = `hsl(${rocket.hue}, 92%, 75%)`;
        context.fill();
        if (rocket.y <= rocket.targetY || rocket.vy >= -1.6) {
          explode(rocket);
          return false;
        }
        return true;
      });

      particlesRef.current = particlesRef.current.filter((particle) => {
        particle.trail.unshift({ x: particle.x, y: particle.y });
        particle.trail.length = Math.min(particle.trail.length, 5);
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.985;
        particle.vy = particle.vy * 0.985 + 0.055;
        particle.alpha -= particle.decay;
        drawTrail(particle.trail, particle.hue, particle.alpha, particle.size);
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fillStyle = `hsla(${particle.hue}, 94%, 72%, ${Math.max(0, particle.alpha)})`;
        context.fill();
        return particle.alpha > 0.02;
      });
      frame += 1;
    };

    const onVisibility = () => { paused = document.hidden; };
    resize();
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    animationId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      launchRef.current = null;
    };
  }, [active]);

  useEffect(() => {
    if (!active || burstSignal === 0 || !launchRef.current) return;
    for (let index = 0; index < 5; index += 1) {
      window.setTimeout(() => launchRef.current?.(), index * 180);
    }
  }, [burstSignal, active]);

  return <canvas ref={canvasRef} className="fireworks" aria-hidden="true" />;
}

function StarField() {
  return (
    <div className="star-field" aria-hidden="true">
      {Array.from({ length: 34 }, (_, index) => (
        <i key={index} style={{
          "--x": `${(index * 37) % 101}%`,
          "--y": `${(index * 61) % 97}%`,
          "--delay": `${(index % 9) * -0.7}s`,
          "--size": `${1 + (index % 3)}px`,
        } as React.CSSProperties} />
      ))}
    </div>
  );
}

function MusicButton({ playing, onClick }: { playing: boolean; onClick: () => void }) {
  return (
    <button className={`music-control ${playing ? "is-playing" : ""}`} onClick={onClick}
      aria-label={playing ? "关闭背景音乐" : "打开背景音乐"} aria-pressed={playing}>
      <span aria-hidden="true">{playing ? "♫" : "♪"}</span>
      <span>{playing ? "音乐开" : "音乐关"}</span>
    </button>
  );
}

function Cake({ candlesOut }: { candlesOut: boolean }) {
  return (
    <div className={`cake ${candlesOut ? "candles-out" : ""}`} role="img" aria-label="点亮蜡烛的三层生日蛋糕">
      <div className="cake-stars" aria-hidden="true">✦　·　✧</div>
      <div className="candles">
        {[0, 1, 2].map((candle) => <span className="candle" key={candle}><i className="flame" /></span>)}
      </div>
      <div className="cake-tier tier-top"><i /><i /><i /></div>
      <div className="cake-tier tier-middle"><i /><i /><i /><i /></div>
      <div className="cake-tier tier-bottom"><i /><i /><i /><i /><i /></div>
      <div className="cake-plate" />
      <div className="smoke" aria-hidden="true"><i /><i /><i /></div>
    </div>
  );
}

export default function Home() {
  const [stage, setStage] = useState<Stage>("welcome");
  const [countdown, setCountdown] = useState<Countdown | null>(null);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [candlesOut, setCandlesOut] = useState(false);
  const [burstSignal, setBurstSignal] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [validPhotos, setValidPhotos] = useState(config.photos.map(() => true));
  const transitioning = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fallbackAudioRef = useRef<AudioContext | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const usablePhotos = config.showPhotos && config.photos.some((_, index) => validPhotos[index]);

  useEffect(() => {
    setCountdown(getCountdown());
    const timer = window.setInterval(() => setCountdown(getCountdown()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!usablePhotos || stage !== "photos") return;
    const timer = window.setInterval(
      () => setPhotoIndex((current) => (current + 1) % config.photos.length),
      4800,
    );
    return () => window.clearInterval(timer);
  }, [stage, usablePhotos]);

  useEffect(() => {
    const audio = new Audio(config.musicSrc);
    audio.loop = true;
    audio.volume = config.musicVolume;
    audio.preload = "auto";
    audio.load();
    audioRef.current = audio;
    return () => {
      audio.pause();
      if (fallbackTimerRef.current) window.clearInterval(fallbackTimerRef.current);
      fallbackAudioRef.current?.close();
    };
  }, []);

  const primeFallbackAudio = useCallback(() => {
    if (fallbackAudioRef.current) {
      void fallbackAudioRef.current.resume();
      return fallbackAudioRef.current;
    }
    const AudioContextClass = window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    const context = new AudioContextClass();
    fallbackAudioRef.current = context;
    void context.resume();
    return context;
  }, []);

  const playFallbackMusic = useCallback(() => {
    if (fallbackTimerRef.current) return;
    const context = primeFallbackAudio();
    if (!context) return;
    const gain = context.createGain();
    gain.gain.value = Math.min(config.musicVolume, 0.28);
    gain.connect(context.destination);
    const notes = [261.63, 329.63, 392, 523.25, 392, 329.63];
    let noteIndex = 0;
    const playNote = () => {
      const oscillator = context.createOscillator();
      const noteGain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = notes[noteIndex % notes.length];
      noteGain.gain.setValueAtTime(0, context.currentTime);
      noteGain.gain.linearRampToValueAtTime(0.35, context.currentTime + 0.08);
      noteGain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 1.4);
      oscillator.connect(noteGain).connect(gain);
      oscillator.start();
      oscillator.stop(context.currentTime + 1.5);
      noteIndex += 1;
    };
    playNote();
    fallbackTimerRef.current = window.setInterval(playNote, 1550);
  }, [primeFallbackAudio]);

  const startMusic = useCallback(() => {
    primeFallbackAudio();
    if (!audioRef.current) {
      const audio = new Audio(config.musicSrc);
      audio.loop = true;
      audio.volume = config.musicVolume;
      audio.preload = "auto";
      audioRef.current = audio;
    }
    setMusicPlaying(true);
    void audioRef.current.play().catch(() => playFallbackMusic());
  }, [playFallbackMusic, primeFallbackAudio]);

  const stopMusic = useCallback(() => {
    audioRef.current?.pause();
    if (fallbackTimerRef.current) window.clearInterval(fallbackTimerRef.current);
    fallbackTimerRef.current = null;
    fallbackAudioRef.current?.close();
    fallbackAudioRef.current = null;
    setMusicPlaying(false);
  }, []);

  const toggleMusic = () => musicPlaying ? stopMusic() : startMusic();

  const moveTo = useCallback((next: Stage, delay = 0) => {
    if (transitioning.current) return;
    transitioning.current = true;
    window.setTimeout(() => {
      setStage(next);
      transitioning.current = false;
    }, delay);
  }, []);

  const openWish = () => {
    startMusic();
    moveTo("letter", 900);
  };

  const afterLetter = () => moveTo(usablePhotos ? "photos" : "cake");

  const blowCandles = () => {
    if (candlesOut || transitioning.current) return;
    setCandlesOut(true);
    window.setTimeout(() => {
      setStage("celebration");
      setBurstSignal((value) => value + 1);
      window.setTimeout(() => setStage("final"), config.fireworksDuration);
    }, 1150);
  };

  const replay = () => {
    setCandlesOut(false);
    setPhotoIndex(0);
    setStage("welcome");
  };

  const isFireworks = stage === "celebration" || stage === "final";
  const dateLabel = `${config.birthdayMonth}月${config.birthdayDay}日`;
  const countdownLabel = countdown?.isToday
    ? `今天是${config.recipient}的生日！`
    : countdown?.hasPassed
      ? "美好的祝福永远不会迟到"
      : `距离${config.recipient}的生日还有`;
  const primaryLabel = countdown?.isToday ? "开启今天的生日惊喜" : countdown?.hasPassed ? "打开这份生日祝福" : "提前开启祝福";

  const progress = useMemo(() => {
    const order: Stage[] = ["welcome", "letter", "photos", "cake", "celebration", "final"];
    return Math.max(0, order.indexOf(stage));
  }, [stage]);

  return (
    <main className={`birthday-app stage-${stage}`}>
      <StarField />
      <div className="aurora" aria-hidden="true" />
      <FireworksCanvas active={isFireworks} burstSignal={burstSignal} />
      <MusicButton playing={musicPlaying} onClick={toggleMusic} />
      <div className="progress-dots" aria-label={`生日祝福进度，第 ${Math.min(progress + 1, 5)} 步，共 5 步`}>
        {[0, 1, 2, 3, 4].map((dot) => <i key={dot} className={progress >= dot ? "active" : ""} />)}
      </div>

      <section className={`scene welcome-scene ${stage === "welcome" ? "active" : ""}`} aria-hidden={stage !== "welcome"}>
        <div className="welcome-copy">
          <p className="eyebrow">{dateLabel} · {config.openingEyebrow}</p>
          <h1>{config.openingTitle}</h1>
          <p className="for-whom">送给 <strong>{config.recipient}</strong></p>
        </div>
        <button className="envelope" onClick={openWish} tabIndex={stage === "welcome" ? 0 : -1} aria-label="打开生日祝福信">
          <span className="envelope-back" />
          <span className="letter-peek">敬呈<br /><b>{config.recipient}</b></span>
          <span className="envelope-front" />
          <span className="envelope-flap" />
          <span className="wax-seal">愿</span>
        </button>
        <div className="countdown-panel" aria-live="polite">
          <p>{countdownLabel}</p>
          {countdown && !countdown.isToday && !countdown.hasPassed && (
            <div className="countdown-grid">
              {[
                [countdown.days, "天"], [countdown.hours, "时"],
                [countdown.minutes, "分"], [countdown.seconds, "秒"],
              ].map(([value, unit]) => <span key={unit}><b>{String(value).padStart(2, "0")}</b><small>{unit}</small></span>)}
            </div>
          )}
        </div>
        <button className="primary-button" onClick={openWish} tabIndex={stage === "welcome" ? 0 : -1}>{primaryLabel}<span>→</span></button>
        <p className="sound-hint">建议打开声音，体验完整效果</p>
      </section>

      <section className={`scene letter-scene ${stage === "letter" ? "active" : ""}`} aria-hidden={stage !== "letter"}>
        <article className="letter-card">
          <p className="eyebrow">{config.letterEyebrow}</p>
          <h2>{config.letterTitle}</h2>
          <div className="message-lines">
            {config.letterMessage.map((line, index) => (
              <p key={line} style={{ "--line-delay": `${0.5 + index * 0.7}s` } as React.CSSProperties}>{line}</p>
            ))}
          </div>
          <footer>{config.letterSender}</footer>
          <button className="primary-button" onClick={afterLetter} tabIndex={stage === "letter" ? 0 : -1}>点亮生日蛋糕 <span>→</span></button>
        </article>
      </section>

      <section className={`scene photo-scene ${stage === "photos" ? "active" : ""}`} aria-hidden={stage !== "photos"}>
        <div className="photo-copy">
          <p className="eyebrow">时光留影</p>
          <h2>珍贵的美好时光</h2>
        </div>
        <div className="photo-deck">
          {config.photos.map((photo, index) => validPhotos[index] && (
            <figure key={photo.src} className={photoIndex === index ? "active" : ""}>
              <img src={photo.src} alt={photo.caption || `回忆照片 ${index + 1}`} loading="lazy"
                onError={() => setValidPhotos((current) => current.map((valid, item) => item === index ? false : valid))} />
              <figcaption>{photo.caption}</figcaption>
            </figure>
          ))}
        </div>
        <button className="primary-button" onClick={() => moveTo("cake")} tabIndex={stage === "photos" ? 0 : -1}>继续点亮蛋糕 <span>→</span></button>
      </section>

      <section className={`scene cake-scene ${stage === "cake" ? "active" : ""}`} aria-hidden={stage !== "cake"}>
        <div className="cake-copy">
          <p className="eyebrow">{dateLabel} · 生日愿望</p>
          <h2>{config.recipient}<br /><span>请许下一个美好的生日愿望</span></h2>
        </div>
        <Cake candlesOut={candlesOut} />
        <button className="primary-button" onClick={blowCandles} disabled={candlesOut} tabIndex={stage === "cake" ? 0 : -1}>
          {candlesOut ? "愿望正在飞向星空…" : "许好愿了，吹灭蜡烛"} <span>→</span>
        </button>
        <p className="sound-hint">轻轻点击，惊喜即将绽放</p>
      </section>

      <section className={`scene celebration-scene ${stage === "celebration" ? "active" : ""}`} aria-hidden={stage !== "celebration"}>
        <div className="celebration-title">
          <p className="eyebrow">HAPPY BIRTHDAY</p>
          <h2><span>{config.recipient}</span>生日快乐！</h2>
          <p>{config.finalWish}</p>
        </div>
        <div className="ribbons" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div>
      </section>

      <section className={`scene final-scene ${stage === "final" ? "active" : ""}`} aria-hidden={stage !== "final"}>
        <article className="final-card">
          <div className="mini-cake" aria-hidden="true"><i /><span>✦</span></div>
          <p className="eyebrow">{dateLabel} · 谨以此页送上祝福</p>
          <h2>{config.greetingTitle}</h2>
          <div className="final-photo-story" aria-label="生日留影">
            {config.finalPhotos.map((photo, index) => (
              <figure className={`final-photo-card final-photo-${index + 1}`} key={photo.src}>
                <img src={photo.src} alt={photo.alt} decoding="async" />
                <figcaption>{photo.caption}</figcaption>
              </figure>
            ))}
          </div>
          <div className="final-message">
            {config.message
              .filter((line) => line !== config.finalNote)
              .map((line) => <p key={line}>{line}</p>)}
          </div>
          <p className="final-note">{config.finalNote}</p>
          <footer>— {config.sender}</footer>
        </article>
        <div className="final-actions">
          <button className="primary-button" onClick={replay}>再次播放</button>
          <button className="secondary-button" onClick={toggleMusic}>{musicPlaying ? "音乐关闭" : "音乐打开"}</button>
          <button className="secondary-button" onClick={() => setBurstSignal((value) => value + 1)}>再放一场烟花</button>
        </div>
      </section>
    </main>
  );
}
