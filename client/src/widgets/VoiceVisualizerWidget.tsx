import React, { useEffect, useRef } from 'react';

export interface VoiceVisualizerWidgetProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  accentColor?: string;
  width?: number;
  height?: number;
  style?: 'bars' | 'orb' | 'waveform';
  className?: string;
}

/**
 * Portable Voice Visualizer Widget
 * Can be embedded in any chat interface or standalone page
 * Supports multiple visualization styles: bars, orb, waveform
 */
export const VoiceVisualizerWidget: React.FC<VoiceVisualizerWidgetProps> = ({
  analyser,
  isActive,
  accentColor = '#38bdf8',
  width = 300,
  height = 60,
  style = 'bars',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (!analyser || !isActive) {
        // Draw flat line or silence
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.strokeStyle = '#334155';
        ctx.stroke();
        return;
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (style === 'bars') {
        drawBars(ctx, dataArray, bufferLength, canvas, accentColor);
      } else if (style === 'orb') {
        drawOrb(ctx, dataArray, bufferLength, canvas, accentColor);
      } else if (style === 'waveform') {
        drawWaveform(ctx, dataArray, bufferLength, canvas, accentColor);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [analyser, isActive, accentColor, style]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`rounded-lg bg-slate-800/50 backdrop-blur-sm ${className}`}
    />
  );
};

function drawBars(
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  bufferLength: number,
  canvas: HTMLCanvasElement,
  color: string
) {
  const barWidth = (canvas.width / bufferLength) * 2.5;
  let barHeight;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    barHeight = dataArray[i] / 2;
    ctx.fillStyle = color;
    // Mirror effect for aesthetic
    ctx.fillRect(x, canvas.height / 2 - barHeight / 2, barWidth, barHeight);
    x += barWidth + 1;
  }
}

function drawOrb(
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  bufferLength: number,
  canvas: HTMLCanvasElement,
  color: string
) {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const average = dataArray.reduce((sum, val) => sum + val, 0) / bufferLength;
  const radius = (average / 255) * (Math.min(canvas.width, canvas.height) / 2) * 0.8;

  // Draw outer glow
  const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.5, centerX, centerY, radius * 1.5);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Draw center orb
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawWaveform(
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  bufferLength: number,
  canvas: HTMLCanvasElement,
  color: string
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();

  const sliceWidth = canvas.width / bufferLength;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const v = dataArray[i] / 128.0;
    const y = (v * canvas.height) / 2;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }

    x += sliceWidth;
  }

  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();
}

export default VoiceVisualizerWidget;
