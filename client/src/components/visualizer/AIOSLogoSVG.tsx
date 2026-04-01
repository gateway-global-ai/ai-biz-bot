import type React from 'react';

/**
 * AIOS Logo — inline SVG for visualizer center.
 * Green brand variant matching the circular pulse ring color.
 * Renders as HTML overlay (not canvas-drawn) for crisp DPR scaling.
 */
export function AIOSLogoSVG({ size = 80, className, style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  const boxW = size * 0.28;
  const boxH = size * 0.28;
  const r = boxW * 0.22;
  const gap = size * 0.03;
  const fontSize = boxW * 0.48;
  const totalW = boxW * 2 + gap * 2 + size * 0.22;

  return (
    <svg
      viewBox={`0 0 ${totalW} ${boxH}`}
      width={totalW}
      height={boxH}
      className={className}
      style={style}
      aria-label="AI OS"
      role="img"
    >
      {/* AI text — no box background */}
      <text
        x={size * 0.11}
        y={boxH * 0.72}
        fill="#00963F"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="800"
        fontSize={fontSize}
        textAnchor="middle"
      >
        AI
      </text>

      {/* O box */}
      <rect
        x={size * 0.22 + gap}
        y={0}
        width={boxW}
        height={boxH}
        rx={r}
        fill="#00963F"
      />
      <text
        x={size * 0.22 + gap + boxW / 2}
        y={boxH * 0.72}
        fill="#ffffff"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="700"
        fontSize={fontSize}
        textAnchor="middle"
      >
        O
      </text>

      {/* S box */}
      <rect
        x={size * 0.22 + gap * 2 + boxW}
        y={0}
        width={boxW}
        height={boxH}
        rx={r}
        fill="#00963F"
      />
      <text
        x={size * 0.22 + gap * 2 + boxW + boxW / 2}
        y={boxH * 0.72}
        fill="#ffffff"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="700"
        fontSize={fontSize}
        textAnchor="middle"
      >
        S
      </text>
    </svg>
  );
}
