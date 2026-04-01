import type { RenderEngine } from '../types';

export const orb: RenderEngine = (ctx, frequencyData, state, w, h, config, time) => {
  const cx = w / 2;
  const cy = h / 2;
  const baseRadius = Math.min(w, h) * 0.12;
  const ampScale = config.amplitudeScale ?? 1.0;
  const primary = state === 'speaking' ? (config.secondaryColor ?? '#10b981') : (config.primaryColor ?? '#008a3e');
  const glow = config.glowIntensity ?? 0.6;
  const reactivity = config.reactivityScale ?? 1.0;

  ctx.clearRect(0, 0, w, h);

  const avg = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length / 255;

  let orbRadius: number;
  let deformation: number;

  if (state === 'idle') {
    const breath = Math.sin(time * 0.0012) * 0.08 + 1;
    orbRadius = baseRadius * breath;
    deformation = 0.02;
  } else if (state === 'processing') {
    const pulse = Math.sin(time * 0.004) * 0.06 + 1;
    orbRadius = baseRadius * pulse;
    deformation = 0.04;
  } else {
    orbRadius = baseRadius * (1 + avg * 0.5 * ampScale);
    deformation = avg * 0.25 * reactivity;
  }

  // Outer glow rings
  if (glow > 0) {
    for (let ring = 3; ring >= 1; ring--) {
      const ringR = orbRadius + ring * (8 + avg * 15);
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = primary;
      ctx.globalAlpha = 0.04 * glow * (4 - ring);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // Deformed orb shape
  const points = 120;
  ctx.beginPath();
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const freqIdx = Math.floor((i / points) * (frequencyData.length - 1));
    const freqVal = frequencyData[freqIdx] / 255;
    const deformAmount = freqVal * deformation * orbRadius;
    const noiseR = orbRadius + deformAmount * Math.sin(angle * 3 + time * 0.002) + deformAmount * Math.cos(angle * 5 - time * 0.0015);
    const x = cx + Math.cos(angle) * noiseR;
    const y = cy + Math.sin(angle) * noiseR;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  // Radial gradient fill
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbRadius * 1.3);
  gradient.addColorStop(0, primary + '40');
  gradient.addColorStop(0.6, primary + '20');
  gradient.addColorStop(1, primary + '05');
  ctx.fillStyle = gradient;
  ctx.globalAlpha = state === 'idle' ? 0.4 : 0.8;
  ctx.fill();

  // Edge stroke
  ctx.strokeStyle = primary;
  ctx.globalAlpha = state === 'idle' ? 0.2 : 0.6;
  ctx.lineWidth = 1.5;
  if (glow > 0) {
    ctx.shadowColor = primary;
    ctx.shadowBlur = 15 * glow + avg * 25;
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
};
