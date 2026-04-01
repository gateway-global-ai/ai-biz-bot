import type { RenderEngine } from '../types';

export const sineWave: RenderEngine = (ctx, frequencyData, state, w, h, config, time) => {
  const cx = w / 2;
  const cy = h / 2;
  const ampScale = config.amplitudeScale ?? 1.0;
  const primary = state === 'speaking' ? (config.secondaryColor ?? '#10b981') : (config.primaryColor ?? '#008a3e');
  const glow = config.glowIntensity ?? 0.6;
  const waveCount = 3;

  ctx.clearRect(0, 0, w, h);

  const avg = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length / 255;
  const amplitude = state === 'idle'
    ? 8 + Math.sin(time * 0.001) * 4
    : state === 'processing'
    ? 6 + Math.sin(time * 0.003) * 3
    : avg * 60 * ampScale;

  const waveWidth = Math.min(w, h) * 0.35;
  const startX = cx - waveWidth;
  const endX = cx + waveWidth;

  for (let wave = 0; wave < waveCount; wave++) {
    const offset = wave * 0.8;
    const freq = 0.015 + wave * 0.005;
    const speed = state === 'processing' ? 0.004 : 0.002;
    const waveAmp = amplitude * (1 - wave * 0.25);

    ctx.beginPath();
    for (let x = startX; x <= endX; x += 2) {
      const norm = (x - startX) / (endX - startX);
      const envelope = Math.sin(norm * Math.PI);
      const y = cy + Math.sin((x - startX) * freq + time * speed + offset) * waveAmp * envelope;
      if (x === startX) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.strokeStyle = primary;
    ctx.globalAlpha = (0.7 - wave * 0.2) * (state === 'idle' ? 0.35 : 1);
    ctx.lineWidth = 2.5 - wave * 0.5;
    ctx.lineCap = 'round';

    if (glow > 0 && wave === 0) {
      ctx.shadowColor = primary;
      ctx.shadowBlur = 12 * glow + avg * 20;
    }

    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  ctx.globalAlpha = 1;
};
