"use client";

/**
 * PulseTrader+ Logo — "Apex Mark"
 *
 * A sharp, faceted geometric "P" with a high-frequency pulse waveform
 * cutting through horizontally. No rounded squares, no circles.
 * Pure angular precision — a trading instrument, not a social app.
 */
export default function PulseRingLogo({
  size = 40,
  className = "",
  animate = false,
}: {
  size?: number;
  className?: string;
  animate?: boolean;
}) {
  // Unique gradient IDs to avoid collisions when multiple instances render
  const uid = `pt${size}`;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="none"
      width={size}
      height={size}
      className={className}
    >
      <defs>
        <linearGradient id={`${uid}-m`} x1="0%" y1="20%" x2="100%" y2="80%">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="50%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#0891B2" />
        </linearGradient>
        <linearGradient id={`${uid}-w`} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.2" />
          <stop offset="30%" stopColor="#22D3EE" />
          <stop offset="70%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Ghost outline of P — depth layer */}
      <path
        d="M96 440 L96 72 L312 72 Q416 72 416 176 Q416 264 312 264 L200 264 L200 440 Z"
        fill={`url(#${uid}-m)`}
        opacity="0.06"
      />

      {/* Left vertical bar — strong anchor */}
      <rect x="80" y="56" width="28" height="400" fill={`url(#${uid}-m)`} />

      {/* Top horizontal bar */}
      <rect x="80" y="56" width="248" height="24" fill={`url(#${uid}-m)`} />

      {/* Right side of P — faceted polygon, no curves */}
      <polygon
        points="328,56 432,112 432,224 328,280 328,256 408,212 408,124 328,80"
        fill={`url(#${uid}-m)`}
      />

      {/* Bottom of P bowl */}
      <rect
        x="80"
        y="256"
        width="248"
        height="24"
        fill={`url(#${uid}-m)`}
        opacity="0.7"
      />

      {/* Pulse waveform — the heartbeat of trading */}
      <polyline
        points="0,196 120,196 160,196 192,96 224,296 256,146 288,246 320,196 400,196 512,196"
        fill="none"
        stroke={`url(#${uid}-w)`}
        strokeWidth="8"
        strokeLinecap="square"
        strokeLinejoin="miter"
        className={animate ? "pulse-wave-draw" : ""}
      />

      {/* Apex tick */}
      <line
        x1="192"
        y1="96"
        x2="192"
        y2="82"
        stroke="#22D3EE"
        strokeWidth="4"
        opacity="0.6"
      />
    </svg>
  );
}

/**
 * Wordmark component — "Pulse" (cyan) + "Trader" (white) + "+" (emerald)
 */
export function Wordmark({
  size = "text-base",
  className = "",
}: {
  size?: string;
  className?: string;
}) {
  return (
    <span className={`${size} font-bold tracking-[-0.04em] ${className}`}>
      <span className="text-cyan-400">Pulse</span>
      <span className="text-white">Trader</span>
      <span className="text-emerald-400">+</span>
    </span>
  );
}
