/**
 * ToothStill — a zero-JS porcelain tooth still-life.
 * Stand-in for the WebGL scene on phones, low-power devices and
 * prefers-reduced-motion users: instant render, no three.js download,
 * nothing to jank the scroll.
 */
export default function ToothStill({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <div className="lux-still-float absolute right-[4%] top-[14%] w-[64vw] max-w-[24rem] sm:right-[8%] sm:top-[16%] md:right-[9%] md:top-[10%] md:w-[30rem]">
        <svg
          viewBox="0 0 220 250"
          className="h-auto w-full drop-shadow-[0_44px_56px_rgba(7,39,43,0.18)]"
          fill="none"
        >
          <defs>
            <linearGradient id="ts-porc" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="55%" stopColor="#f4fcf9" />
              <stop offset="100%" stopColor="#d5eee7" />
            </linearGradient>
            <radialGradient id="ts-halo" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#9ce6da" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#9ce6da" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* soft mint halo */}
          <ellipse cx="110" cy="112" rx="102" ry="98" fill="url(#ts-halo)" />

          {/* ground shadow */}
          <ellipse cx="110" cy="234" rx="60" ry="11" fill="#05302f" opacity="0.09" />

          {/* porcelain crown + roots */}
          <path
            d="M110 30 C 84 8, 36 16, 32 62 C 29 96, 47 112, 55 146 C 62 176, 67 218, 83 218 C 97 218, 93 160, 110 160 C 127 160, 123 218, 137 218 C 153 218, 158 176, 165 146 C 173 112, 191 96, 188 62 C 184 16, 136 8, 110 30 Z"
            fill="url(#ts-porc)"
          />

          {/* glossy highlight */}
          <path
            d="M62 56 C 66 36, 86 28, 99 33"
            stroke="#ffffff"
            strokeWidth="11"
            strokeLinecap="round"
            opacity="0.8"
          />
          <ellipse cx="150" cy="92" rx="10" ry="16" fill="#ffffff" opacity="0.5" />

          {/* enamel sparkles */}
          <circle className="lux-twinkle" cx="36" cy="44" r="3" fill="#0e8f84" />
          <circle className="lux-twinkle-2" cx="196" cy="70" r="2.4" fill="#9ce6da" />
          <circle className="lux-twinkle" cx="188" cy="160" r="2" fill="#0e8f84" />
          <circle className="lux-twinkle-2" cx="52" cy="176" r="2.6" fill="#9ce6da" />
        </svg>
      </div>
    </div>
  );
}
