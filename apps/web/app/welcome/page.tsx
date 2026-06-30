'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

/**
 * Build a jagged "torn paper" edge as two complementary clip-path polygons.
 * Both halves share the exact same tear points so they meet seamlessly when
 * intact, and split along the irregular line as they pull apart.
 */
function buildClips(segments = 44, mid = 50, base = 1.3) {
  // Deterministic pseudo-random so SSR and client render the same edge
  // (avoids a hydration mismatch on the inline clip-path style).
  const rand = (i: number) => {
    const s = Math.sin((i + 1) * 127.1) * 43758.5453;
    return s - Math.floor(s); // 0..1
  };
  // Irregular rupture line — mostly smooth waves with the occasional sharp
  // jag, like stretched plastic that finally snaps.
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= segments; i++) {
    const x = (i / segments) * 100;
    const r = rand(i);
    const spike = r > 0.9 ? 2.5 + rand(i * 3) * 2.5 : 0;
    const dir = i % 2 === 0 ? -1 : 1;
    const amp = base + r * 1.1 + spike;
    pts.push({ x: +x.toFixed(2), y: +(mid + dir * amp).toFixed(2) });
  }
  pts[0].x = 0;
  pts[pts.length - 1].x = 100;
  const ltr = pts.map((p) => `${p.x}% ${p.y}%`).join(', ');
  const rtl = [...pts]
    .reverse()
    .map((p) => `${p.x}% ${p.y}%`)
    .join(', ');
  return {
    top: `polygon(0% 0%, 100% 0%, ${rtl})`,
    bottom: `polygon(${ltr}, 100% 100%, 0% 100%)`,
  };
}

function Poster() {
  // Decorative — duplicated in both halves; clip-path reveals each region.
  return (
    <div className="poster" aria-hidden="true">
      <div className="poster-inner">
        <span className="poster-eyebrow">✦ AI-Verified Marketplace</span>
        <h1 className="poster-brand">
          Prakash<span className="dot">·</span>Mobile
        </h1>
        <p className="poster-tag">The next era of smart electronics.</p>
      </div>
    </div>
  );
}

const THRESHOLD = 0.62; // fraction of the way before the tear auto-completes

export default function WelcomePage() {
  const router = useRouter();
  const topRef = useRef<HTMLDivElement>(null);
  const botRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startY: 0, y: 0, raf: 0, progress: 0 });
  const [phase, setPhase] = useState<'idle' | 'dragging' | 'done'>('idle');
  const [mounted, setMounted] = useState(false);
  const clips = useMemo(() => buildClips(), []);

  // Portal to <body> only after mount: the global .container has
  // backdrop-filter, which would otherwise trap our position:fixed overlay
  // inside it instead of covering the full viewport.
  useEffect(() => setMounted(true), []);

  // Lock the page scroll while the overlay is mounted.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function setTransforms(p: number) {
    // Plastic: elongates a lot (stretchY) and necks in (narrows, neckX) while
    // the torn edges stay close — separation lags the stretch until it rips.
    const ease = 1 - Math.pow(1 - p, 2); // easeOutQuad
    const sep = p * Math.min(window.innerHeight * 0.09, 80);
    const stretchY = 1 + ease * 0.62;
    const neckX = 1 - p * 0.05;
    const rot = p * 1;
    if (topRef.current)
      topRef.current.style.transform = `translate3d(0,${-sep}px,0) scale(${neckX},${stretchY}) rotate(${-rot}deg)`;
    if (botRef.current)
      botRef.current.style.transform = `translate3d(0,${sep}px,0) scale(${neckX},${stretchY}) rotate(${rot}deg)`;
  }

  function completeTear() {
    if (phase === 'done') return;
    setPhase('done');
    drag.current.active = false;
    const top = topRef.current;
    const bot = botRef.current;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      if (top) top.style.transform = 'translate3d(0,-130vh,0)';
      if (bot) bot.style.transform = 'translate3d(0,130vh,0)';
      window.setTimeout(() => router.push('/login'), 90);
      return;
    }

    // Stage 1 — stretch to the breaking point (taut, necked, barely apart).
    for (const el of [top, bot]) {
      el?.classList.remove('snapping', 'ripping');
      el?.classList.add('taut');
    }
    if (top) top.style.transform = 'translate3d(0,-16px,0) scale(0.9,1.62) rotate(0deg)';
    if (bot) bot.style.transform = 'translate3d(0,16px,0) scale(0.9,1.62) rotate(0deg)';

    // Stage 2 — it ruptures: snap back to normal scale and fling apart fast.
    window.setTimeout(() => {
      for (const el of [top, bot]) {
        el?.classList.remove('taut');
        el?.classList.add('ripping');
      }
      if (top) top.style.transform = 'translate3d(0,-130vh,0) scale(1,1) rotate(-5deg)';
      if (bot) bot.style.transform = 'translate3d(0,130vh,0) scale(1,1) rotate(5deg)';
    }, 170);

    window.setTimeout(() => router.push('/login'), 170 + 560);
  }

  function snapBack() {
    for (const el of [topRef.current, botRef.current]) {
      el?.classList.remove('taut', 'ripping');
      el?.classList.add('snapping');
    }
    setTransforms(0);
    drag.current.progress = 0;
    setPhase('idle');
    window.setTimeout(() => {
      for (const el of [topRef.current, botRef.current])
        el?.classList.remove('snapping');
    }, 600);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (phase === 'done') return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    for (const el of [topRef.current, botRef.current])
      el?.classList.remove('snapping', 'taut', 'ripping');
    drag.current.active = true;
    drag.current.startY = e.clientY;
    drag.current.y = e.clientY;
    setPhase('dragging');
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current.active) return;
    drag.current.y = e.clientY;
    if (drag.current.raf) return;
    drag.current.raf = requestAnimationFrame(() => {
      drag.current.raf = 0;
      if (!drag.current.active) return;
      const dist = Math.abs(drag.current.y - drag.current.startY);
      const full = Math.max(window.innerHeight * 0.45, 280);
      const p = Math.min(dist / full, 1);
      drag.current.progress = p;
      setTransforms(p);
      if (p >= THRESHOLD) {
        drag.current.active = false;
        completeTear();
      }
    });
  }

  function onPointerUp() {
    if (!drag.current.active) return;
    drag.current.active = false;
    if (drag.current.progress >= THRESHOLD) completeTear();
    else snapBack();
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className={`tear-root ${phase === 'dragging' ? 'dragging' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="group"
      aria-label="Tear the paper open to enter the store"
    >
      <div
        className="tear-half top"
        ref={topRef}
        style={{ clipPath: clips.top }}
      >
        <Poster />
      </div>
      <div
        className="tear-half bottom"
        ref={botRef}
        style={{ clipPath: clips.bottom }}
      >
        <Poster />
      </div>

      <div className="tear-ui">
        <p className="tear-hint">
          <span className="grip">↕</span> Drag anywhere to rip the fabric open
        </p>
        <button
          type="button"
          className="tear-enter"
          onClick={completeTear}
          onPointerDown={(e) => e.stopPropagation()}
        >
          Enter the store →
        </button>
      </div>
    </div>,
    document.body,
  );
}
