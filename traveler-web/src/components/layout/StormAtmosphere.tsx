'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { useTheme } from '@/context/ThemeContext';

export function StormAtmosphere() {
  const { isStormy } = useTheme();

  // Generate deterministic raindrops positions
  const raindrops = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: `${(i * 2.5) % 100}%`,
      delay: `${((i * 0.17) % 1.5).toFixed(2)}s`,
      duration: `${(0.6 + ((i * 0.1) % 0.5)).toFixed(2)}s`,
      opacity: (0.3 + ((i * 0.05) % 0.5)).toFixed(2),
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* 🌸 Inverted Atithi Devo Bhava Logo Watermark */}
      <div
        className={`absolute -right-12 top-24 w-96 h-96 transition-opacity duration-700 select-none ${
          isStormy ? 'opacity-20 filter invert brightness-150' : 'opacity-[0.14]'
        }`}
      >
        <Image
          src="/assets/images/atithi_devo_bhava_logo.png"
          alt="Atithi Devo Bhava Watermark"
          width={384}
          height={384}
          className="object-contain"
        />
      </div>

      <div
        className={`absolute -right-16 bottom-20 w-80 h-80 transition-opacity duration-700 select-none ${
          isStormy ? 'opacity-15 filter invert brightness-150' : 'opacity-[0.10]'
        }`}
      >
        <Image
          src="/assets/images/atithi_devo_bhava_logo.png"
          alt="Atithi Devo Bhava Watermark"
          width={320}
          height={320}
          className="object-contain"
        />
      </div>

      {/* 🌧️ Zomato-Style Realistic Raindrops Stream */}
      {isStormy && (
        <div className="absolute inset-0">
          {raindrops.map((drop) => (
            <div
              key={drop.id}
              className="rain-drop"
              style={{
                left: drop.left,
                animationDelay: drop.delay,
                animationDuration: drop.duration,
                opacity: drop.opacity,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
