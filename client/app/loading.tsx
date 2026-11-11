export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--surface)]">
      {/* Ambient background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[20%] left-[15%] w-[300px] h-[300px] rounded-full bg-[var(--primary)]/8 blur-[120px] animate-[pulse_4s_ease-in-out_infinite]" />
        <div className="absolute bottom-[15%] right-[20%] w-[250px] h-[250px] rounded-full bg-indigo-500/8 blur-[100px] animate-[pulse_5s_ease-in-out_infinite_1s]" />
      </div>

      {/* Main loading content */}
      <div className="relative flex flex-col items-center gap-12">
        {/* Geometric Constellation */}
        <div className="relative w-[200px] h-[200px]">
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Gradient for lines */}
              <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffb1c5" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#ff0080" stopOpacity="0.2" />
              </linearGradient>

              {/* Glow filter */}
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Soft glow for nodes */}
              <filter id="nodeGlow">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Outer rotating hexagon */}
            <g className="origin-center" style={{ transformOrigin: '100px 100px' }}>
              <polygon
                points="100,20 168,55 168,125 100,160 32,125 32,55"
                fill="none"
                stroke="url(#lineGrad)"
                strokeWidth="0.5"
                className="animate-[hexSpin_12s_linear_infinite]"
                style={{ transformOrigin: '100px 100px' }}
              />
            </g>

            {/* Inner rotating hexagon (reverse) */}
            <g>
              <polygon
                points="100,45 145,65 145,115 100,135 55,115 55,65"
                fill="none"
                stroke="url(#lineGrad)"
                strokeWidth="0.5"
                className="animate-[hexSpinReverse_10s_linear_infinite]"
                style={{ transformOrigin: '100px 100px' }}
              />
            </g>

            {/* Connecting lines from center to vertices — with staggered dash animation */}
            {[
              { x: 100, y: 20 },
              { x: 168, y: 55 },
              { x: 168, y: 125 },
              { x: 100, y: 160 },
              { x: 32, y: 125 },
              { x: 32, y: 55 },
            ].map((point, i) => (
              <line
                key={i}
                x1="100"
                y1="90"
                x2={point.x}
                y2={point.y}
                stroke="#ffb1c5"
                strokeOpacity="0.15"
                strokeWidth="0.5"
                strokeDasharray="4 6"
                className="animate-[dashFlow_3s_linear_infinite]"
                style={{ animationDelay: `${i * 0.3}s` }}
              />
            ))}

            {/* Nodes at hexagon vertices — outer */}
            {[
              { cx: 100, cy: 20, delay: 0 },
              { cx: 168, cy: 55, delay: 0.4 },
              { cx: 168, cy: 125, delay: 0.8 },
              { cx: 100, cy: 160, delay: 1.2 },
              { cx: 32, cy: 125, delay: 1.6 },
              { cx: 32, cy: 55, delay: 2.0 },
            ].map((node, i) => (
              <g key={`outer-${i}`}>
                {/* Outer glow ring */}
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r="6"
                  fill="none"
                  stroke="#ffb1c5"
                  strokeWidth="0.5"
                  strokeOpacity="0.3"
                  className="animate-[nodeRing_2.5s_ease-in-out_infinite]"
                  style={{ animationDelay: `${node.delay}s`, transformOrigin: `${node.cx}px ${node.cy}px` }}
                />
                {/* Core dot */}
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r="2.5"
                  fill="#ffb1c5"
                  filter="url(#nodeGlow)"
                  className="animate-[nodePulse_2.5s_ease-in-out_infinite]"
                  style={{ animationDelay: `${node.delay}s` }}
                />
              </g>
            ))}

            {/* Nodes at inner hexagon vertices */}
            {[
              { cx: 100, cy: 45, delay: 0.2 },
              { cx: 145, cy: 65, delay: 0.6 },
              { cx: 145, cy: 115, delay: 1.0 },
              { cx: 100, cy: 135, delay: 1.4 },
              { cx: 55, cy: 115, delay: 1.8 },
              { cx: 55, cy: 65, delay: 2.2 },
            ].map((node, i) => (
              <circle
                key={`inner-${i}`}
                cx={node.cx}
                cy={node.cy}
                r="1.5"
                fill="#ff0080"
                filter="url(#glow)"
                className="animate-[nodePulse_2s_ease-in-out_infinite]"
                style={{ animationDelay: `${node.delay}s` }}
              />
            ))}

            {/* Center pulsing core */}
            <circle
              cx="100"
              cy="90"
              r="4"
              fill="#ffb1c5"
              filter="url(#nodeGlow)"
              className="animate-[corePulse_2s_ease-in-out_infinite]"
            />
            <circle
              cx="100"
              cy="90"
              r="12"
              fill="none"
              stroke="#ffb1c5"
              strokeWidth="0.5"
              strokeOpacity="0.2"
              className="animate-[coreRipple_2s_ease-out_infinite]"
              style={{ transformOrigin: '100px 90px' }}
            />
            <circle
              cx="100"
              cy="90"
              r="12"
              fill="none"
              stroke="#ffb1c5"
              strokeWidth="0.5"
              strokeOpacity="0.15"
              className="animate-[coreRipple_2s_ease-out_infinite_0.6s]"
              style={{ transformOrigin: '100px 90px' }}
            />

            {/* Orbital particle */}
            <circle
              r="1.5"
              fill="#ff0080"
              filter="url(#glow)"
              className="animate-[orbitPath_6s_linear_infinite]"
            >
              <animateMotion
                dur="6s"
                repeatCount="indefinite"
                path="M100,20 L168,55 L168,125 L100,160 L32,125 L32,55 Z"
              />
            </circle>
          </svg>

          {/* Radial grid background behind SVG */}
          <div className="absolute inset-0 -z-10 opacity-20">
            <div className="absolute inset-[-50%] bg-[radial-gradient(circle_at_center,rgba(255,177,197,0.1)_0%,transparent_50%)]" />
          </div>
        </div>

        {/* Brand text with typing reveal */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--primary)] animate-[corePulse_2s_ease-in-out_infinite]" />
            <span
              className="label-md text-gray-500 uppercase tracking-[0.3em] animate-[textReveal_1.5s_ease-out_forwards]"
              style={{ opacity: 0 }}
            >
              VisulAI
            </span>
          </div>

          {/* Animated progress bar */}
          <div className="w-32 h-[1px] bg-[var(--surface-container-highest)] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-container)] animate-[progressSweep_2s_ease-in-out_infinite] rounded-full" />
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes hexSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes hexSpinReverse {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }

        @keyframes nodePulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }

        @keyframes nodeRing {
          0%, 100% { r: 6; opacity: 0.3; }
          50% { r: 10; opacity: 0; }
        }

        @keyframes corePulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }

        @keyframes coreRipple {
          0% { r: 8; opacity: 0.3; }
          100% { r: 28; opacity: 0; }
        }

        @keyframes dashFlow {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -20; }
        }

        @keyframes textReveal {
          0% { opacity: 0; letter-spacing: 0.6em; }
          100% { opacity: 1; letter-spacing: 0.3em; }
        }

        @keyframes progressSweep {
          0% { transform: translateX(-100%); width: 100%; }
          50% { transform: translateX(0%); width: 100%; }
          100% { transform: translateX(200%); width: 100%; }
        }
      `}</style>
    </div>
  );
}
