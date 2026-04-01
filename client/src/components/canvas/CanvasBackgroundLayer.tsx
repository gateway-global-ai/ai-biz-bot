/**
 * Full-bleed animated layer behind the Concierge canvas column.
 * Token-safe: effects use canvas/SVG/Tailwind; tint derives from effect profile name hash.
 */
import React, { useEffect, useRef } from 'react';
import {
  type CanvasChromeSettings,
  DEFAULT_CANVAS_CHROME,
  hexToRgba,
} from '@/lib/canvasChromeSettings';
import { getBackgroundItemById } from './shadcnBackgroundCatalog';

export interface CanvasBackgroundLayerProps {
  backgroundId: string | null;
  /** Optional full-area tint on top of the library effect (default: none). */
  chrome?: CanvasChromeSettings;
}

function hashHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 360;
}

function MatrixRain({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    const chars = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂ0123456789';
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const fontSize = 12;
    const columns = Math.ceil(canvas.width / fontSize);
    const drops = Array.from({ length: columns }, () => Math.random() * -50);
    const tick = () => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.12)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = `hsla(${hue}, 70%, 55%, 0.85)`;
      ctx.font = `${fontSize}px ui-monospace, monospace`;
      for (let i = 0; i < drops.length; i++) {
        const ch = chars[(i + drops[i] * 7) % chars.length];
        const x = i * fontSize;
        const y = (drops[i] + 1) * fontSize;
        ctx.fillText(ch, x, y);
        if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 0.35 + Math.random() * 0.15;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

/** Radial “hyperspace” drift — distinct from constellation (network) and twinkling effects. */
function StarfieldCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let stars: Array<{ angle: number; dist: number; spd: number; sz: number }> = [];
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
      stars = Array.from({ length: 180 }, () => ({
        angle: Math.random() * Math.PI * 2,
        dist: Math.random() * Math.min(canvas.width, canvas.height) * 0.45,
        spd: 0.6 + Math.random() * 2.8,
        sz: Math.random() * 1.2 + 0.25,
      }));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      const cx = canvas.width * 0.5;
      const cy = canvas.height * 0.5;
      const maxD = Math.hypot(cx, cy) * 1.25;
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (const st of stars) {
        st.dist += st.spd;
        if (st.dist > maxD) {
          st.dist = Math.random() * 12;
          st.angle = Math.random() * Math.PI * 2;
        }
        const x = cx + Math.cos(st.angle) * st.dist;
        const y = cy + Math.sin(st.angle) * st.dist;
        const a = st.dist / maxD;
        ctx.fillStyle = `hsla(${hue}, 70%, ${62 + a * 28}%, ${0.2 + a * 0.75})`;
        ctx.beginPath();
        ctx.arc(x, y, st.sz * (0.4 + a * 1.4), 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function RainCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let drops: Array<{ x: number; y: number; len: number; speed: number }> = [];
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
      drops = Array.from({ length: 100 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        len: 12 + Math.random() * 16,
        speed: 6 + Math.random() * 8,
      }));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = `hsla(${hue}, 50%, 60%, 0.35)`;
      ctx.lineWidth = 1;
      for (const d of drops) {
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - 2, d.y + d.len);
        ctx.stroke();
        d.y += d.speed;
        d.x -= 1;
        if (d.y > canvas.height) {
          d.y = -20;
          d.x = Math.random() * canvas.width;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

/** Dense drifting dots — distinct from starfield (parallax “space” vs. 2D swarm). */
function FloatingParticlesCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    type P = { x: number; y: number; vx: number; vy: number; r: number };
    let parts: P[] = [];
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
      const n = Math.min(140, Math.floor((canvas.width * canvas.height) / 9000));
      parts = Array.from({ length: n }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 1.1,
        vy: (Math.random() - 0.5) * 1.1,
        r: Math.random() * 1.8 + 0.6,
      }));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (const q of parts) {
        q.x += q.vx;
        q.y += q.vy;
        if (q.x < 0) q.x += canvas.width;
        if (q.x > canvas.width) q.x -= canvas.width;
        if (q.y < 0) q.y += canvas.height;
        if (q.y > canvas.height) q.y -= canvas.height;
        ctx.fillStyle = `hsla(${hue}, 65%, 62%, 0.75)`;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function SparklesCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let stars: Array<{ x: number; y: number; ph: number; sp: number }> = [];
    let t = 0;
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
      stars = Array.from({ length: 100 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        ph: Math.random() * Math.PI * 2,
        sp: 0.8 + Math.random() * 1.6,
      }));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      t += 0.016;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        const a = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
        ctx.fillStyle = `hsla(${hue}, 80%, 78%, ${a})`;
        ctx.fillRect(s.x, s.y, 2, 2);
        ctx.fillRect(s.x + 1, s.y - 1, 1, 1);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function FirefliesCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    type F = { x: number; y: number; ax: number; ay: number; off: number };
    let flies: F[] = [];
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
      flies = Array.from({ length: 32 }, (_, i) => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        ax: Math.random() * 2 + 0.5,
        ay: Math.random() * 2 + 0.5,
        off: i * 1.7,
      }));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      t += 0.018;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const baseHue = 55 + (hue % 25);
      for (const f of flies) {
        f.x += Math.sin(t * f.ax + f.off) * 1.4;
        f.y += Math.cos(t * f.ay + f.off * 0.7) * 1.1;
        if (f.x < -10) f.x = canvas.width + 10;
        if (f.x > canvas.width + 10) f.x = -10;
        if (f.y < -10) f.y = canvas.height + 10;
        if (f.y > canvas.height + 10) f.y = -10;
        const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 3 + f.off));
        ctx.shadowBlur = 12;
        ctx.shadowColor = `hsla(${baseHue}, 90%, 55%, ${pulse})`;
        ctx.fillStyle = `hsla(${baseHue}, 85%, 58%, ${0.5 + pulse * 0.45})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function BokehCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    type B = { x: number; y: number; r: number; dx: number; dy: number; a: number };
    let blobs: B[] = [];
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
      blobs = Array.from({ length: 14 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 40 + Math.random() * 90,
        dx: (Math.random() - 0.5) * 0.35,
        dy: (Math.random() - 0.5) * 0.35,
        a: 0.15 + Math.random() * 0.2,
      }));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (const b of blobs) {
        b.x += b.dx;
        b.y += b.dy;
        if (b.x < -b.r) b.x = canvas.width + b.r;
        if (b.x > canvas.width + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = canvas.height + b.r;
        if (b.y > canvas.height + b.r) b.y = -b.r;
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, `hsla(${(hue + 40) % 360}, 70%, 65%, ${b.a * 1.8})`);
        g.addColorStop(0.45, `hsla(${hue}, 60%, 50%, ${b.a})`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function BubblesCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    type Bu = { x: number; y: number; r: number; sp: number; w: number };
    let bubs: Bu[] = [];
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
      bubs = Array.from({ length: 48 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 4 + Math.random() * 14,
        sp: 0.6 + Math.random() * 1.4,
        w: Math.random() * 0.8,
      }));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = `hsla(${hue}, 55%, 70%, 0.45)`;
      ctx.lineWidth = 1.2;
      for (const b of bubs) {
        b.y -= b.sp;
        b.x += Math.sin(b.y * 0.02 + b.w) * 0.4;
        if (b.y < -b.r) {
          b.y = canvas.height + b.r;
          b.x = Math.random() * canvas.width;
        }
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.stroke();
        const g = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, 0, b.x, b.y, b.r);
        g.addColorStop(0, `hsla(${hue}, 40%, 85%, 0.25)`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function seededRand(seed: string, i: number): number {
  let h = 0;
  const s = seed + String(i);
  for (let k = 0; k < s.length; k++) h = (h * 31 + s.charCodeAt(k)) >>> 0;
  return (h % 10000) / 10000;
}

function ConfettiCanvas({ seed, hue }: { seed: string; hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    type C = { x: number; y: number; w: number; h: number; vy: number; rot: number; vr: number; hueShift: number };
    let pieces: C[] = [];
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
      pieces = Array.from({ length: 70 }, (_, i) => ({
        x: seededRand(seed, i * 2) * canvas.width,
        y: seededRand(seed, i * 2 + 1) * canvas.height,
        w: 3 + seededRand(seed, i + 99) * 5,
        h: 4 + seededRand(seed, i + 199) * 7,
        vy: 1.2 + seededRand(seed, i + 300) * 3,
        rot: seededRand(seed, i + 400) * Math.PI * 2,
        vr: (seededRand(seed, i + 500) - 0.5) * 0.15,
        hueShift: Math.floor(seededRand(seed, i + 600) * 80),
      }));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      pieces.forEach((c, i) => {
        c.y += c.vy;
        c.rot += c.vr;
        if (c.y > canvas.height + 20) {
          c.y = -20;
          c.x = seededRand(seed, 8000 + i) * canvas.width;
        }
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rot);
        ctx.fillStyle = `hsla(${(hue + c.hueShift) % 360}, 70%, 58%, 0.9)`;
        ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        ctx.restore();
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [seed, hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function FireworksCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    type Pt = { x: number; y: number; vx: number; vy: number; life: number; col: number };
    let burst: Pt[] = [];
    let cooldown = 0;
    const spawn = (w: number, h: number) => {
      const cx = w * (0.2 + Math.random() * 0.6);
      const cy = h * (0.15 + Math.random() * 0.35);
      burst = Array.from({ length: 48 }, () => {
        const ang = Math.random() * Math.PI * 2;
        const sp = 2 + Math.random() * 4;
        return {
          x: cx,
          y: cy,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp,
          life: 1,
          col: (hue + Math.floor(Math.random() * 50)) % 360,
        };
      });
      cooldown = 110;
    };
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
      spawn(canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      cooldown -= 1;
      if (cooldown <= 0 && burst.length === 0) spawn(canvas.width, canvas.height);
      const next: Pt[] = [];
      for (const pt of burst) {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vy += 0.06;
        pt.life -= 0.014;
        if (pt.life > 0 && pt.y < canvas.height + 40) {
          ctx.fillStyle = `hsla(${pt.col}, 85%, 62%, ${Math.max(0, pt.life)})`;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2.2, 0, Math.PI * 2);
          ctx.fill();
          next.push(pt);
        }
      }
      burst = next;
      if (burst.length === 0) cooldown -= 1;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function ConstellationCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let pts: Array<{ x: number; y: number }> = [];
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
      pts = Array.from({ length: 42 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
      }));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    let t = 0;
    const tick = () => {
      t += 0.002;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const thresh = Math.min(120, canvas.width * 0.12);
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d = Math.hypot(dx, dy);
          if (d < thresh) {
            ctx.strokeStyle = `hsla(${hue}, 50%, 58%, ${0.15 * (1 - d / thresh)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
        const ox = Math.sin(t + i) * 0.4;
        const oy = Math.cos(t * 0.8 + i * 0.2) * 0.4;
        ctx.fillStyle = `hsla(${hue}, 70%, 78%, 0.95)`;
        ctx.beginPath();
        ctx.arc(pts[i].x + ox, pts[i].y + oy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function OrbitsCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let orbits: Array<{ cx: number; cy: number; r: number; sp: number; ph: number; sz: number }> = [];
    let t = 0;
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
      const cx = canvas.width * 0.5;
      const cy = canvas.height * 0.48;
      orbits = Array.from({ length: 9 }, (_, i) => ({
        cx,
        cy,
        r: 40 + i * 28,
        sp: 0.35 / (i + 1),
        ph: (i / 9) * Math.PI * 2,
        sz: 2.5 + (i % 3) * 0.6,
      }));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      t += 0.018;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = `hsla(${hue}, 35%, 40%, 0.15)`;
      for (const o of orbits) {
        ctx.beginPath();
        ctx.arc(o.cx, o.cy, o.r, 0, Math.PI * 2);
        ctx.stroke();
        const a = t * o.sp + o.ph;
        const x = o.cx + Math.cos(a) * o.r;
        const y = o.cy + Math.sin(a) * o.r;
        ctx.fillStyle = `hsla(${(hue + 30) % 360}, 75%, 62%, 0.95)`;
        ctx.beginPath();
        ctx.arc(x, y, o.sz, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function MeteorsCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    type M = { x: number; y: number; len: number; spd: number };
    let meteors: M[] = [];
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
      meteors = Array.from({ length: 28 }, () => ({
        x: Math.random() * canvas.width * 1.2,
        y: -Math.random() * canvas.height,
        len: 18 + Math.random() * 40,
        spd: 9 + Math.random() * 12,
      }));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = `hsla(${hue}, 65%, 68%, 0.55)`;
      ctx.lineWidth = 2;
      for (const m of meteors) {
        const dx = m.spd * 0.85;
        const dy = m.spd;
        m.x -= dx;
        m.y += dy;
        if (m.y > canvas.height + 80 || m.x < -100) {
          m.x = canvas.width + Math.random() * 200;
          m.y = -20 - Math.random() * 120;
          m.len = 18 + Math.random() * 45;
          m.spd = 9 + Math.random() * 14;
        }
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x + m.len * 0.65, m.y - m.len);
        const g = ctx.createLinearGradient(m.x, m.y, m.x + m.len * 0.65, m.y - m.len);
        g.addColorStop(0, `hsla(${hue}, 80%, 85%, 0.95)`);
        g.addColorStop(1, 'transparent');
        ctx.strokeStyle = g;
        ctx.stroke();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function ShootingStarsCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    type S = { x: number; y: number; vx: number; vy: number; life: number; len: number } | null;
    let shot: S = null;
    let wait = 30;
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      wait -= 1;
      if (!shot && wait <= 0) {
        shot = {
          x: Math.random() * canvas.width * 0.3,
          y: Math.random() * canvas.height * 0.35,
          vx: 14 + Math.random() * 8,
          vy: 6 + Math.random() * 5,
          life: 1,
          len: 120 + Math.random() * 100,
        };
      }
      if (shot) {
        const g = ctx.createLinearGradient(shot.x, shot.y, shot.x - shot.len, shot.y - shot.len * 0.45);
        g.addColorStop(0, `hsla(${hue}, 95%, 92%, ${shot.life})`);
        g.addColorStop(0.35, `hsla(${hue}, 70%, 65%, ${shot.life * 0.5})`);
        g.addColorStop(1, 'transparent');
        ctx.strokeStyle = g;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(shot.x, shot.y);
        ctx.lineTo(shot.x - shot.len, shot.y - shot.len * 0.45);
        ctx.stroke();
        shot.x += shot.vx;
        shot.y += shot.vy;
        shot.life -= 0.018;
        if (shot.life <= 0 || shot.x > canvas.width + 50) {
          shot = null;
          wait = 40 + Math.floor(Math.random() * 90);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function SnowCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    type S = { x: number; y: number; r: number; vy: number; vx: number };
    let flakes: S[] = [];
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
      flakes = Array.from({ length: 100 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 1 + Math.random() * 2.5,
        vy: 0.8 + Math.random() * 1.8,
        vx: (Math.random() - 0.5) * 0.5,
      }));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
      for (const f of flakes) {
        f.y += f.vy;
        f.x += f.vx + Math.sin(f.y * 0.02) * 0.3;
        if (f.y > canvas.height) {
          f.y = -5;
          f.x = Math.random() * canvas.width;
        }
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

/** Northern-lights style bands — not a starfield or generic gradient pulse. */
function AuroraCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      t += 0.012;
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const hBase = (hue % 80) + 140;
      for (let layer = 0; layer < 5; layer++) {
        const ly = canvas.height * (0.15 + layer * 0.14);
        const amp = 22 + layer * 8;
        ctx.beginPath();
        for (let x = 0; x <= canvas.width; x += 6) {
          const y =
            ly +
            Math.sin(x * 0.004 + t * (0.9 + layer * 0.1)) * amp +
            Math.sin(x * 0.012 + t * 1.4 + layer) * (amp * 0.35);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, ly - 40, canvas.width, ly + 120);
        const hh = (hBase + layer * 18) % 360;
        g.addColorStop(0, `hsla(${hh}, 65%, 48%, 0)`);
        g.addColorStop(0.45, `hsla(${(hh + 40) % 360}, 75%, 55%, ${0.12 + layer * 0.05})`);
        g.addColorStop(1, `hsla(${(hh + 80) % 360}, 60%, 45%, 0)`);
        ctx.fillStyle = g;
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function GridPatternCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const gap = 32;
    const draw = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = `hsla(${hue}, 45%, 52%, 0.35)`;
      ctx.lineWidth = 1;
      for (let x = 0; x <= canvas.width; x += gap) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= canvas.height; y += gap) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas.parentElement!);
    return () => ro.disconnect();
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function DotPatternCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const gap = 22;
    const draw = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = `hsla(${hue}, 40%, 58%, 0.55)`;
      for (let x = gap; x < canvas.width; x += gap) {
        for (let y = gap; y < canvas.height; y += gap) {
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas.parentElement!);
    return () => ro.disconnect();
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function hexCorners(cx: number, cy: number, r: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

function HexagonGridCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const r = 18;
    const w = Math.sqrt(3) * r;
    const h = 1.5 * r;
    const draw = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = `hsla(${hue}, 42%, 55%, 0.4)`;
      ctx.lineWidth = 1;
      let row = 0;
      for (let y = -h; y < canvas.height + h; y += h) {
        const offset = row % 2 === 0 ? 0 : w * 0.5;
        for (let x = -w; x < canvas.width + w; x += w) {
          const cx = x + offset;
          const cy = y;
          const corners = hexCorners(cx, cy, r);
          ctx.beginPath();
          ctx.moveTo(corners[0][0], corners[0][1]);
          for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i][0], corners[i][1]);
          ctx.closePath();
          ctx.stroke();
        }
        row += 1;
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas.parentElement!);
    return () => ro.disconnect();
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function FlickeringGridCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    const cols = 24;
    let phases: number[][] = [];
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
      const rows = Math.ceil(canvas.height / cols) + 2;
      phases = Array.from({ length: rows }, () =>
        Array.from({ length: Math.ceil(canvas.width / cols) + 2 }, () => Math.random() * Math.PI * 2),
      );
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      t += 0.09;
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const cw = cols;
      for (let gy = 0; gy < phases.length; gy++) {
        const row = phases[gy];
        if (!row) continue;
        for (let gx = 0; gx < row.length; gx++) {
          const flick = 0.12 + 0.22 * (0.5 + 0.5 * Math.sin(t * 1.3 + row[gx]));
          ctx.fillStyle = `hsla(${hue}, 55%, 52%, ${flick})`;
          ctx.fillRect(gx * cw, gy * cw, cw - 1, cw - 1);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function RetroGridCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      t += 0.015;
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const horizon = canvas.height * 0.42;
      const cx = canvas.width * 0.5;
      ctx.strokeStyle = `hsla(${hue}, 65%, 58%, 0.45)`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 18; i++) {
        const z = i / 18;
        const y = horizon + Math.pow(z, 1.6) * (canvas.height - horizon);
        ctx.globalAlpha = 0.15 + z * 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      const lines = 24;
      for (let j = -lines; j <= lines; j++) {
        const spread = (j / lines) * 0.92;
        const xTop = cx + spread * canvas.width * 0.48 + Math.sin(t + j * 0.08) * 3;
        const xBot = cx + spread * canvas.width * 0.52;
        ctx.strokeStyle = `hsla(${(hue + 30) % 360}, 60%, 55%, 0.35)`;
        ctx.beginPath();
        ctx.moveTo(xTop, horizon);
        ctx.lineTo(xBot, canvas.height);
        ctx.stroke();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function InteractiveGridCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    const gap = 28;
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      t += 0.018;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const gx = canvas.width * 0.5 + Math.sin(t * 0.7) * canvas.width * 0.22;
      const gy = canvas.height * 0.45 + Math.cos(t * 0.55) * canvas.height * 0.18;
      const rad = Math.min(canvas.width, canvas.height) * 0.42;
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, rad);
      g.addColorStop(0, `hsla(${hue}, 55%, 58%, 0.22)`);
      g.addColorStop(0.5, `hsla(${hue}, 45%, 45%, 0.06)`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = `hsla(${hue}, 35%, 48%, 0.22)`;
      ctx.lineWidth = 1;
      for (let x = 0; x <= canvas.width; x += gap) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= canvas.height; y += gap) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function GradientFlowCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      t += 0.003;
      const h1 = (hue + t * 45) % 360;
      const h2 = (hue + 130 + t * 38) % 360;
      const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      g.addColorStop(0, `hsla(${h1}, 42%, 20%, 1)`);
      g.addColorStop(0.45, `hsla(${(h1 + 55) % 360}, 38%, 23%, 1)`);
      g.addColorStop(1, `hsla(${h2}, 44%, 18%, 1)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function UnderwaterCausticsCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      t += 0.011;
      const waterHue = (hue % 50) + 185;
      ctx.fillStyle = `hsl(${waterHue - 40}, 45%, 12%)`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        const y0 = (canvas.height * 0.2 * (i % 3)) + Math.sin(t + i) * 20;
        for (let x = 0; x <= canvas.width; x += 8) {
          const y =
            y0 +
            i * 35 +
            Math.sin(x * 0.015 + t * 1.2 + i * 0.7) * 14 +
            Math.sin(x * 0.008 + t * 0.6) * 22;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsla(${(waterHue + i * 12) % 360}, 55%, 48%, ${0.06 + i * 0.015})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function NeonRingsCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      t += 0.012;
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width * 0.5;
      const cy = canvas.height * 0.5;
      for (let i = 0; i < 6; i++) {
        const r = 50 + i * 38 + Math.sin(t * 0.8 + i * 1.2) * 12;
        const a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.5 + i));
        const h = (hue + i * 45) % 360;
        ctx.strokeStyle = `hsla(${h}, 90%, 60%, ${a})`;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 18;
        ctx.shadowColor = `hsla(${h}, 85%, 55%, ${a * 0.8})`;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function GlitchCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let frame = 0;
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      frame++;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const glitchActive = frame % 120 < 8;
      if (glitchActive) {
        const slices = 6 + Math.floor(Math.random() * 10);
        for (let i = 0; i < slices; i++) {
          const y = Math.random() * canvas.height;
          const h = 2 + Math.random() * 18;
          const shift = (Math.random() - 0.5) * 40;
          ctx.fillStyle = `hsla(${hue}, 85%, 55%, ${0.3 + Math.random() * 0.4})`;
          ctx.fillRect(shift, y, canvas.width, h);
          ctx.fillStyle = `hsla(${(hue + 120) % 360}, 80%, 50%, ${0.15 + Math.random() * 0.2})`;
          ctx.fillRect(-shift * 0.7, y + 1, canvas.width, h * 0.6);
        }
      }
      for (let i = 0; i < 3; i++) {
        const y = Math.random() * canvas.height;
        ctx.strokeStyle = `hsla(${(hue + i * 60) % 360}, 70%, 60%, 0.08)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function WarpTunnelCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      t += 0.02;
      ctx.fillStyle = 'rgba(2, 6, 23, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width * 0.5;
      const cy = canvas.height * 0.5;
      for (let ring = 0; ring < 12; ring++) {
        const phase = (t * 2 + ring * 0.5) % 6;
        const r = phase * Math.min(cx, cy) * 0.35;
        const a = Math.max(0, 1 - phase / 5.5) * 0.4;
        if (a <= 0) continue;
        ctx.strokeStyle = `hsla(${(hue + ring * 15) % 360}, 65%, 58%, ${a})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function FloatingBoxesCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    type Box = { x: number; y: number; sz: number; rot: number; vr: number; vy: number; hShift: number };
    let boxes: Box[] = [];
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
      boxes = Array.from({ length: 18 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        sz: 14 + Math.random() * 28,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.02,
        vy: -0.3 - Math.random() * 0.8,
        hShift: Math.floor(Math.random() * 60),
      }));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      t += 0.016;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (const b of boxes) {
        b.y += b.vy;
        b.rot += b.vr;
        b.x += Math.sin(t + b.hShift) * 0.3;
        if (b.y < -b.sz * 2) {
          b.y = canvas.height + b.sz;
          b.x = Math.random() * canvas.width;
        }
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        ctx.strokeStyle = `hsla(${(hue + b.hShift) % 360}, 55%, 55%, 0.45)`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-b.sz / 2, -b.sz / 2, b.sz, b.sz);
        ctx.fillStyle = `hsla(${(hue + b.hShift) % 360}, 45%, 45%, 0.08)`;
        ctx.fillRect(-b.sz / 2, -b.sz / 2, b.sz, b.sz);
        ctx.restore();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function BeamsCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      t += 0.008;
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width * 0.5;
      const cy = canvas.height * 0.35;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + t * 0.3;
        const len = Math.min(canvas.width, canvas.height) * 0.9;
        const ex = cx + Math.cos(angle) * len;
        const ey = cy + Math.sin(angle) * len;
        const g = ctx.createLinearGradient(cx, cy, ex, ey);
        g.addColorStop(0, `hsla(${(hue + i * 20) % 360}, 65%, 60%, 0.25)`);
        g.addColorStop(0.6, `hsla(${(hue + i * 20) % 360}, 55%, 50%, 0.05)`);
        g.addColorStop(1, 'transparent');
        ctx.strokeStyle = g;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function BeamsCollisionCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      t += 0.012;
      ctx.fillStyle = 'rgba(2, 6, 23, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const p1x = canvas.width * 0.2 + Math.sin(t * 0.7) * 60;
      const p1y = canvas.height * 0.3;
      const p2x = canvas.width * 0.8 + Math.cos(t * 0.5) * 60;
      const p2y = canvas.height * 0.4;
      const mx = (p1x + p2x) / 2;
      const my = (p1y + p2y) / 2;
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + t;
        const bx = mx + Math.cos(angle) * 30;
        const by = my + Math.sin(angle) * 30;
        const g1 = ctx.createLinearGradient(p1x, p1y, bx, by);
        g1.addColorStop(0, `hsla(${hue}, 70%, 60%, 0.3)`);
        g1.addColorStop(1, `hsla(${(hue + 60) % 360}, 80%, 70%, 0.5)`);
        ctx.strokeStyle = g1;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.lineTo(bx, by);
        ctx.stroke();
        const g2 = ctx.createLinearGradient(p2x, p2y, bx, by);
        g2.addColorStop(0, `hsla(${(hue + 120) % 360}, 70%, 60%, 0.3)`);
        g2.addColorStop(1, `hsla(${(hue + 60) % 360}, 80%, 70%, 0.5)`);
        ctx.strokeStyle = g2;
        ctx.beginPath();
        ctx.moveTo(p2x, p2y);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
      ctx.fillStyle = `hsla(${(hue + 60) % 360}, 90%, 75%, ${0.3 + 0.2 * Math.sin(t * 3)})`;
      ctx.beginPath();
      ctx.arc(mx, my, 5, 0, Math.PI * 2);
      ctx.fill();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function SpotlightCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      t += 0.01;
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const sx = canvas.width * (0.5 + 0.3 * Math.sin(t * 0.6));
      const sy = canvas.height * (0.4 + 0.2 * Math.cos(t * 0.45));
      const r = Math.min(canvas.width, canvas.height) * 0.35;
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
      g.addColorStop(0, `hsla(${hue}, 50%, 65%, 0.3)`);
      g.addColorStop(0.4, `hsla(${hue}, 45%, 50%, 0.1)`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function RippleCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      t += 0.02;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width * 0.5;
      const cy = canvas.height * 0.45;
      const maxR = Math.min(canvas.width, canvas.height) * 0.6;
      for (let ring = 0; ring < 8; ring++) {
        const phase = (t + ring * 0.8) % 6;
        const r = (phase / 6) * maxR;
        const a = Math.max(0, 1 - phase / 5) * 0.35;
        if (a <= 0) continue;
        ctx.strokeStyle = `hsla(${(hue + ring * 12) % 360}, 55%, 60%, ${a})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function CirclesCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    type Circ = { cx: number; cy: number; r: number; phase: number; speed: number };
    let circles: Circ[] = [];
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
      circles = Array.from({ length: 10 }, () => ({
        cx: Math.random() * canvas.width,
        cy: Math.random() * canvas.height,
        r: 40 + Math.random() * 80,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1.5,
      }));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      t += 0.015;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (const c of circles) {
        const scale = 0.7 + 0.3 * Math.sin(t * c.speed + c.phase);
        const r = c.r * scale;
        ctx.strokeStyle = `hsla(${(hue + c.phase * 30) % 360}, 50%, 55%, ${0.15 + 0.1 * scale})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(c.cx, c.cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function WavyLinesCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      t += 0.015;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let line = 0; line < 8; line++) {
        const baseY = canvas.height * (0.15 + line * 0.1);
        ctx.beginPath();
        for (let x = 0; x <= canvas.width; x += 4) {
          const y = baseY + Math.sin(x * 0.008 + t * 1.2 + line * 0.8) * 25 + Math.sin(x * 0.003 + t * 0.5) * 15;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsla(${(hue + line * 20) % 360}, 55%, 55%, ${0.15 + line * 0.04})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function LightWavesCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      t += 0.008;
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let band = 0; band < 5; band++) {
        const baseY = canvas.height * (0.3 + band * 0.12);
        ctx.beginPath();
        for (let x = 0; x <= canvas.width; x += 3) {
          const y = baseY + Math.sin(x * 0.005 + t + band * 1.3) * (30 + band * 8) + Math.cos(x * 0.012 + t * 1.5) * 10;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, baseY - 40, 0, baseY + 80);
        const h = (hue + band * 25) % 360;
        g.addColorStop(0, `hsla(${h}, 60%, 50%, 0)`);
        g.addColorStop(0.5, `hsla(${h}, 55%, 48%, ${0.08 + band * 0.03})`);
        g.addColorStop(1, `hsla(${h}, 50%, 40%, 0)`);
        ctx.fillStyle = g;
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function WaveGridCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      t += 0.02;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const gap = 20;
      const rows = Math.ceil(canvas.height / gap) + 2;
      const cols = Math.ceil(canvas.width / gap) + 2;
      ctx.strokeStyle = `hsla(${hue}, 45%, 50%, 0.2)`;
      ctx.lineWidth = 1;
      for (let r = 0; r < rows; r++) {
        ctx.beginPath();
        for (let c = 0; c <= cols; c++) {
          const x = c * gap;
          const y = r * gap + Math.sin(c * 0.3 + t + r * 0.2) * 6;
          if (c === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      for (let c = 0; c < cols; c++) {
        ctx.beginPath();
        for (let r = 0; r <= rows; r++) {
          const x = c * gap + Math.sin(r * 0.3 + t * 0.8 + c * 0.15) * 6;
          const y = r * gap;
          if (r === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function TopographyCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const tick = () => {
      t += 0.004;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width * 0.5;
      const cy = canvas.height * 0.45;
      for (let ring = 0; ring < 18; ring++) {
        const baseR = 30 + ring * 22;
        ctx.beginPath();
        for (let a = 0; a <= Math.PI * 2; a += 0.04) {
          const wobble = Math.sin(a * 3 + t + ring * 0.5) * 8 + Math.sin(a * 5 + t * 1.3 + ring) * 4;
          const r = baseR + wobble;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r * 0.7;
          if (a === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `hsla(${(hue + ring * 8) % 360}, 40%, 50%, ${0.12 + (ring % 4 === 0 ? 0.1 : 0)})`;
        ctx.lineWidth = ring % 4 === 0 ? 1.5 : 0.8;
        ctx.stroke();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function AnimatedPathsCanvas({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    type PathDot = { pathIdx: number; progress: number; speed: number };
    let dots: PathDot[] = [];
    const pathCount = 12;
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
      dots = Array.from({ length: 40 }, () => ({
        pathIdx: Math.floor(Math.random() * pathCount),
        progress: Math.random(),
        speed: 0.001 + Math.random() * 0.003,
      }));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    const getPathPoint = (idx: number, prog: number) => {
      const w = canvas.width;
      const h = canvas.height;
      const baseY = h * (0.08 + (idx / pathCount) * 0.84);
      const x = prog * w;
      const y = baseY + Math.sin(prog * Math.PI * 2 + idx * 1.7 + t) * 30 + Math.sin(prog * Math.PI * 4 + idx) * 12;
      return { x, y };
    };
    const tick = () => {
      t += 0.012;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < pathCount; i++) {
        ctx.beginPath();
        for (let p = 0; p <= 1; p += 0.005) {
          const pt = getPathPoint(i, p);
          if (p === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.strokeStyle = `hsla(${(hue + i * 15) % 360}, 40%, 45%, 0.12)`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      for (const d of dots) {
        d.progress += d.speed;
        if (d.progress > 1) {
          d.progress = 0;
          d.pathIdx = Math.floor(Math.random() * pathCount);
        }
        const pt = getPathPoint(d.pathIdx, d.progress);
        ctx.fillStyle = `hsla(${(hue + d.pathIdx * 15) % 360}, 65%, 65%, 0.8)`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [hue]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

/** Maps shadcn.io-style profiles to lightweight runtime visuals */
function EffectBody({ profile, seed }: { profile: string; seed: string }) {
  const hue = hashHue(seed + profile);
  switch (profile) {
    case 'matrix':
      return <MatrixRain hue={(hue % 80) + 120} />;
    case 'starfield':
      return <StarfieldCanvas hue={hue} />;
    case 'constellation':
      return <ConstellationCanvas hue={hue} />;
    case 'orbits':
      return <OrbitsCanvas hue={hue} />;
    case 'meteors':
      return <MeteorsCanvas hue={hue} />;
    case 'shooting_stars':
      return <ShootingStarsCanvas hue={hue} />;
    case 'rain':
      return <RainCanvas hue={(hue % 40) + 180} />;
    case 'underwater':
      return <UnderwaterCausticsCanvas hue={hue} />;
    case 'snow':
      return <SnowCanvas />;
    case 'fog':
      return (
        <div className="absolute inset-0 animate-pulse bg-slate-950/95 bg-[radial-gradient(ellipse_at_50%_80%,rgba(148,163,184,0.18)_0%,transparent_55%)]" />
      );
    case 'aurora':
      return <AuroraCanvas hue={hue} />;
    case 'mesh_gradient':
      return (
        <div className="absolute inset-0 overflow-hidden bg-slate-950">
          <div
            className="absolute -inset-[40%] animate-pulse opacity-90 blur-3xl"
            style={{
              background: `radial-gradient(ellipse at 30% 20%, hsla(${(hue + 40) % 360}, 55%, 45%, 0.35), transparent 50%),
                radial-gradient(ellipse at 70% 60%, hsla(${(hue + 120) % 360}, 50%, 40%, 0.3), transparent 45%),
                radial-gradient(ellipse at 50% 90%, hsla(${(hue + 200) % 360}, 45%, 38%, 0.25), transparent 40%)`,
            }}
          />
        </div>
      );
    case 'gradient':
      return (
        <div
          className="absolute inset-0 bg-gradient-to-tr opacity-95 from-slate-950 via-indigo-950/80 to-emerald-950/70"
          style={{
            backgroundImage: `linear-gradient(125deg, hsla(${hue}, 40%, 18%, 1) 0%, hsla(${(hue + 60) % 360}, 45%, 22%, 1) 45%, hsla(${(hue + 140) % 360}, 35%, 16%, 1) 100%)`,
          }}
        />
      );
    case 'gradient_animation':
      return <GradientFlowCanvas hue={hue} />;
    case 'vortex':
      return (
        <div className="absolute inset-0 overflow-hidden bg-slate-950">
          <div
            className="absolute left-1/2 top-1/2 h-[min(180vmax,2400px)] w-[min(180vmax,2400px)] -translate-x-1/2 -translate-y-1/2 animate-spin opacity-95"
            style={{
              animationDuration: '36s',
              background: `conic-gradient(from 0deg, hsla(${hue}, 48%, 34%, 0.55), hsla(${(hue + 110) % 360}, 42%, 28%, 0.4), hsla(${(hue + 220) % 360}, 40%, 26%, 0.5), hsla(${hue}, 48%, 34%, 0.55))`,
            }}
          />
        </div>
      );
    case 'grid_pattern':
      return <GridPatternCanvas hue={hue} />;
    case 'dot_pattern':
      return <DotPatternCanvas hue={hue} />;
    case 'hexagon':
      return <HexagonGridCanvas hue={hue} />;
    case 'flickering_grid':
      return <FlickeringGridCanvas hue={hue} />;
    case 'retro_grid':
      return <RetroGridCanvas hue={hue} />;
    case 'interactive_grid':
      return <InteractiveGridCanvas hue={hue} />;
    case 'neon':
      return <NeonRingsCanvas hue={hue} />;
    case 'glitch':
      return <GlitchCanvas hue={hue} />;
    case 'warp':
      return <WarpTunnelCanvas hue={hue} />;
    case 'boxes':
      return <FloatingBoxesCanvas hue={hue} />;
    case 'beams':
      return <BeamsCanvas hue={hue} />;
    case 'beams_collision':
      return <BeamsCollisionCanvas hue={hue} />;
    case 'spotlight':
      return <SpotlightCanvas hue={hue} />;
    case 'ripple':
      return <RippleCanvas hue={hue} />;
    case 'circles':
      return <CirclesCanvas hue={hue} />;
    case 'wavy':
      return <WavyLinesCanvas hue={hue} />;
    case 'light_waves':
      return <LightWavesCanvas hue={hue} />;
    case 'wave_grid':
      return <WaveGridCanvas hue={hue} />;
    case 'topography':
      return <TopographyCanvas hue={hue} />;
    case 'paths':
      return <AnimatedPathsCanvas hue={hue} />;
    case 'particles':
      return <FloatingParticlesCanvas hue={hue} />;
    case 'sparkles':
      return <SparklesCanvas hue={hue} />;
    case 'fireflies':
      return <FirefliesCanvas hue={hue} />;
    case 'bokeh':
      return <BokehCanvas hue={hue} />;
    case 'bubbles':
      return <BubblesCanvas hue={hue} />;
    case 'confetti':
      return <ConfettiCanvas seed={seed} hue={hue} />;
    case 'fireworks':
      return <FireworksCanvas hue={hue} />;
    default:
      return <FloatingParticlesCanvas hue={hue} />;
  }
}

export const CanvasBackgroundLayer: React.FC<CanvasBackgroundLayerProps> = ({ backgroundId, chrome }) => {
  const item = getBackgroundItemById(backgroundId);
  if (!item) return null;

  const c = chrome ?? DEFAULT_CANVAS_CHROME;
  const showBgTint = c.bgOverlayOpacity > 0.001;

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <EffectBody profile={item.effectProfile} seed={item.id} />
      {showBgTint && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: hexToRgba(c.bgOverlayColor, c.bgOverlayOpacity) }}
        />
      )}
    </div>
  );
};
