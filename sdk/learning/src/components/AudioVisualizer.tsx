import React, { useEffect, useRef } from 'react';

interface Props {
  analyser: AnalyserNode | null;
  isActive: boolean;
  accentColor?: string;
}

const AudioVisualizer: React.FC<Props> = ({ analyser, isActive, accentColor = '#38bdf8' }) => {
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

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;

        ctx.fillStyle = accentColor;
        // Mirror effect for aesthetic
        ctx.fillRect(x, canvas.height / 2 - barHeight / 2, barWidth, barHeight);

        x += barWidth + 1;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [analyser, isActive, accentColor]);

  return (
    <canvas 
      ref={canvasRef} 
      width={300} 
      height={60} 
      className="rounded-lg bg-slate-800/50 backdrop-blur-sm"
    />
  );
};

export default AudioVisualizer;