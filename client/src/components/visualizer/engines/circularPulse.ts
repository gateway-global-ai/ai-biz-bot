import type { RenderEngine, VisualizerConfig } from '../types';

export const circularPulse: RenderEngine = (ctx, frequencyData, state, w, h, config, time) => {
  const cx = w / 2;
  const cy = h / 2;
  const baseRadius = Math.min(w, h) * 0.28;
  const barCount = config.barCount ?? 64;
  const ampScale = config.amplitudeScale ?? 1.0;
  const glow = config.glowIntensity ?? 0.6;
  const primary = state === 'speaking' ? (config.secondaryColor ?? '#10b981') : (config.primaryColor ?? '#008a3e');
  const smoothing = config.smoothing ?? 0.7;

  ctx.clearRect(0, 0, w, h);

  if (state === 'processing') {
    drawProcessingRing(ctx, cx, cy, baseRadius, primary, time);
    return;
  }

  const step = Math.floor(frequencyData.length / barCount);
  const hasSignal = state === 'listening' || state === 'speaking';

  // Glow behind ring
  if (glow > 0) {
    const avg = hasSignal ? frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length / 255 : 0;
    ctx.save();
    ctx.shadowColor = primary;
    ctx.shadowBlur = 20 + avg * 40 * glow;
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
    ctx.strokeStyle = primary;
    ctx.globalAlpha = 0.15 + avg * 0.2;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // Base ring
  ctx.beginPath();
  ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
  ctx.strokeStyle = primary;
  ctx.globalAlpha = state === 'idle' ? 0.25 : 0.5;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Frequency bars radiating outward
  for (let i = 0; i < barCount; i++) {
    const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
    const dataIdx = Math.min(i * step, frequencyData.length - 1);
    let val = frequencyData[dataIdx] / 255;

    if (state === 'idle') {
      val = 0.02 + 0.03 * Math.sin(time * 0.001 + i * 0.15);
    }

    const barLen = val * baseRadius * 0.9 * ampScale;
    const x1 = cx + Math.cos(angle) * baseRadius;
    const y1 = cy + Math.sin(angle) * baseRadius;
    const x2 = cx + Math.cos(angle) * (baseRadius + barLen);
    const y2 = cy + Math.sin(angle) * (baseRadius + barLen);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = primary;
    ctx.globalAlpha = 0.3 + val * 0.7;
    ctx.lineWidth = Math.max(1, (Math.PI * 2 * baseRadius) / barCount * 0.5);
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  ctx.globalAlpha = 1;

  // Inner breathing circle for idle
  if (state === 'idle') {
    const breath = Math.sin(time * 0.0015) * 0.15 + 0.85;
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius * 0.3 * breath, 0, Math.PI * 2);
    ctx.fillStyle = primary;
    ctx.globalAlpha = 0.08;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
};

function drawProcessingRing(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, radius: number,
  color: string, time: number,
) {
  const dashOffset = time * 0.05;
  const segments = 12;
  const gapAngle = Math.PI * 2 / segments * 0.35;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(dashOffset * 0.02);

  for (let i = 0; i < segments; i++) {
    const startAngle = (i / segments) * Math.PI * 2;
    const endAngle = startAngle + (Math.PI * 2 / segments) - gapAngle;

    ctx.beginPath();
    ctx.arc(0, 0, radius, startAngle, endAngle);
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.3 + 0.3 * Math.sin(time * 0.003 + i);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}
