import React from 'react';

/**
 * Custom-coded vector illustration demonstrating the synergy between urban living,
 * atmospheric air circulation, protective home envelope, and family wellbeing.
 * Designed with strict adherence to the brand color palette and zero crude sketchiness.
 */
export function HeroIllustration({ className }: { className?: string }) {
  return (
    <div className={`relative w-full max-w-xl mx-auto ${className || ''}`}>
      <svg
        viewBox="0 0 600 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto drop-shadow-sm select-none"
        aria-labelledby="hero-illustration-title hero-illustration-desc"
        role="img"
      >
        <title id="hero-illustration-title">
          Clean Air Circulation and Family Protection Illustration
        </title>
        <desc id="hero-illustration-desc">
          Vector artwork depicting an urban city silhouette protected by clean air currents, a healthy home with HEPA filtration, and vibrant botanical trees.
        </desc>

        <defs>
          {/* Subtle Ambient Radial Glow */}
          <radialGradient
            id="skyGlow"
            cx="50%"
            cy="50%"
            r="50%"
            fx="50%"
            fy="50%"
          >
            <stop offset="0%" stopColor="#EEF3EA" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#F7F8F3" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#F7F8F3" stopOpacity="0" />
          </radialGradient>

          {/* Clean Air Flow Stream Gradient */}
          <linearGradient id="cleanAirGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#397A55" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#718C72" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#EEF3EA" stopOpacity="0.2" />
          </linearGradient>

          {/* Soft Inversion Smog Layer (Distant background) */}
          <linearGradient id="smogInversion" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#D69B47" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#E2E8DE" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#F7F8F3" stopOpacity="0" />
          </linearGradient>

          <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#27352D" floodOpacity="0.06" />
          </filter>
        </defs>

        {/* Ambient Atmospheric Backdrop */}
        <circle cx="300" cy="250" r="230" fill="url(#skyGlow)" />

        {/* Distant Winter Smog Inversion Layer Band */}
        <rect x="50" y="160" width="500" height="40" rx="20" fill="url(#smogInversion)" />

        {/* Distant City Skyline Silhouettes */}
        <g opacity="0.35">
          <rect x="110" y="210" width="38" height="110" rx="3" fill="#718C72" />
          <rect x="154" y="180" width="46" height="140" rx="3" fill="#718C72" />
          <rect x="206" y="225" width="34" height="95" rx="3" fill="#718C72" />
          <rect x="370" y="200" width="44" height="120" rx="3" fill="#718C72" />
          <rect x="420" y="170" width="52" height="150" rx="3" fill="#718C72" />
          <rect x="478" y="220" width="36" height="100" rx="3" fill="#718C72" />

          {/* Building Window Dots */}
          <circle cx="170" cy="205" r="2" fill="#FFFFFF" />
          <circle cx="184" cy="205" r="2" fill="#FFFFFF" />
          <circle cx="170" cy="225" r="2" fill="#FFFFFF" />
          <circle cx="184" cy="225" r="2" fill="#FFFFFF" />
          <circle cx="438" cy="195" r="2" fill="#FFFFFF" />
          <circle cx="454" cy="195" r="2" fill="#FFFFFF" />
          <circle cx="438" cy="215" r="2" fill="#FFFFFF" />
          <circle cx="454" cy="215" r="2" fill="#FFFFFF" />
        </g>

        {/* Ground Hill Terrain (Gentle curves) */}
        <path
          d="M 40 370 Q 200 320 360 360 T 560 350 L 560 440 L 40 440 Z"
          fill="#EEF3EA"
        />
        <path
          d="M 20 390 Q 220 350 420 380 T 580 380 L 580 440 L 20 440 Z"
          fill="#E2E8DE"
          opacity="0.7"
        />

        {/* Central Protective Home Envelope */}
        <g filter="url(#softShadow)">
          {/* Main House Body */}
          <rect x="230" y="250" width="140" height="120" rx="8" fill="#FFFFFF" stroke="#E2E8DE" strokeWidth="2" />

          {/* Roof */}
          <path
            d="M 215 255 L 300 185 L 385 255 Z"
            fill="#397A55"
            stroke="#2F6647"
            strokeWidth="2"
          />

          {/* Chimney with Sensor Indicator */}
          <rect x="335" y="195" width="22" height="40" rx="2" fill="#718C72" />
          <circle cx="346" cy="190" r="4" fill="#287A4B" />
          <circle cx="346" cy="190" r="8" stroke="#287A4B" strokeWidth="1" strokeDasharray="2 2" />

          {/* Front Door */}
          <rect x="282" y="310" width="36" height="60" rx="4" fill="#EEF3EA" stroke="#718C72" strokeWidth="1.5" />
          <circle cx="310" cy="342" r="2" fill="#397A55" />

          {/* Living Room Window with Warm Light */}
          <rect x="245" y="275" width="28" height="32" rx="4" fill="#FDF8EE" stroke="#E2E8DE" strokeWidth="1.5" />
          <line x1="259" y1="275" x2="259" y2="307" stroke="#E2E8DE" strokeWidth="1" />
          <line x1="245" y1="291" x2="273" y2="291" stroke="#E2E8DE" strokeWidth="1" />

          {/* Bedroom Window */}
          <rect x="327" y="275" width="28" height="32" rx="4" fill="#FDF8EE" stroke="#E2E8DE" strokeWidth="1.5" />
          <line x1="341" y1="275" x2="341" y2="307" stroke="#E2E8DE" strokeWidth="1" />
          <line x1="327" y1="291" x2="355" y2="291" stroke="#E2E8DE" strokeWidth="1" />

          {/* Attic Window (Circle) */}
          <circle cx="300" cy="225" r="12" fill="#EEF3EA" stroke="#FFFFFF" strokeWidth="2" />
          <path d="M 300 213 L 300 237 M 288 225 L 312 225" stroke="#718C72" strokeWidth="1" />
        </g>

        {/* Clean Air Flow Dynamics (Smooth curved streams wrapping around the home) */}
        <g stroke="url(#cleanAirGradient)" strokeWidth="3" strokeLinecap="round" opacity="0.85">
          {/* Stream 1 - Entering house through filtration */}
          <path
            d="M 120 180 C 180 150, 220 190, 260 210"
            strokeDasharray="6 4"
          />
          {/* Stream 2 - Circulating clean flow above */}
          <path
            d="M 140 220 C 200 190, 260 160, 340 165 C 410 170, 460 210, 490 240"
          />
          {/* Stream 3 - Flowing past greenery */}
          <path
            d="M 160 260 C 210 240, 230 260, 240 280"
            strokeDasharray="4 3"
          />
          {/* Stream 4 - Downwind fresh breeze */}
          <path
            d="M 360 260 C 400 250, 440 270, 480 290"
          />
        </g>

        {/* Healthy Urban Trees (Flanking the Home) */}
        {/* Left Tree */}
        <g>
          <rect x="178" y="315" width="10" height="55" rx="3" fill="#68766C" />
          <circle cx="183" cy="295" r="28" fill="#397A55" />
          <circle cx="170" cy="285" r="20" fill="#2F6647" />
          <circle cx="196" cy="282" r="22" fill="#718C72" />
        </g>

        {/* Right Tree */}
        <g>
          <rect x="410" y="325" width="9" height="50" rx="3" fill="#68766C" />
          <circle cx="414.5" cy="305" r="24" fill="#397A55" />
          <circle cx="402" cy="295" r="18" fill="#718C72" />
          <circle cx="426" cy="292" r="19" fill="#2F6647" />
        </g>

        {/* Environmental Sensor / CADR Indicator Floating Badge */}
        <g filter="url(#softShadow)">
          <rect x="90" y="260" width="115" height="42" rx="10" fill="#FFFFFF" stroke="#E2E8DE" strokeWidth="1.5" />
          <circle cx="112" cy="281" r="9" fill="#EBF5EE" />
          <path d="M 108 281 L 111 284 L 117 278" stroke="#287A4B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <text x="127" y="277" fill="#27352D" fontSize="10" fontWeight="bold" fontFamily="system-ui">HEPA ACTIVE</text>
          <text x="127" y="291" fill="#287A4B" fontSize="9" fontWeight="600" fontFamily="system-ui">5.2 ACH • Pure</text>
        </g>

        {/* Real-Time Ambient AQI Radar Floating Badge */}
        <g filter="url(#softShadow)">
          <rect x="385" y="195" width="125" height="42" rx="10" fill="#FFFFFF" stroke="#E2E8DE" strokeWidth="1.5" />
          <circle cx="407" cy="216" r="9" fill="#FDF5E6" />
          <circle cx="407" cy="216" r="4" fill="#D69B47" />
          <text x="423" y="212" fill="#27352D" fontSize="10" fontWeight="bold" fontFamily="system-ui">AQI RADAR</text>
          <text x="423" y="226" fill="#A86B16" fontSize="9" fontWeight="600" fontFamily="system-ui">Inversion Alert</text>
        </g>

        {/* Solar Sun with Gentle Ray */}
        <circle cx="100" cy="110" r="24" fill="#D69B47" opacity="0.85" />
        <circle cx="100" cy="110" r="32" stroke="#D69B47" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
      </svg>
    </div>
  );
}
