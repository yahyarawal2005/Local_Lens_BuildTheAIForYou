"use client";

import React from "react";

interface CoconutTreeBackdropProps {
  className?: string;
  variant?: "dashboard" | "settings" | "sponsor";
  opacity?: number;
}

export const CoconutTreeBackdrop: React.FC<CoconutTreeBackdropProps> = ({
  className = "",
  variant = "sponsor",
  opacity = 0.12,
}) => {
  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden ${className}`}
    >
      {/* Background Image Layer */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700"
        style={{
          backgroundImage: "url('/images/sponsor-bg.jpg')",
          opacity: opacity,
        }}
      />
      {/* Soft Light Diffuse Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#f8fafc]/60 via-[#f8fafc]/40 to-[#f8fafc]/80" />
    </div>
  );
};

export default CoconutTreeBackdrop;
