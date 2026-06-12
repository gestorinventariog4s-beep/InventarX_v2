import React from 'react';

interface HexagonLogoProps {
  className?: string;
  strokeWidth?: number;
}

export const HexagonLogo: React.FC<HexagonLogoProps> = ({ className = "w-6 h-6", strokeWidth = 2.5 }) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth={strokeWidth * 3.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="25,6.7 75,6.7 100,50 75,93.3 25,93.3 0,50" />
    <polyline points="25,6.7 50,50 25,93.3" />
  </svg>
);
