"use client";

import React from 'react';

interface TagPinProps {
  name: string;
  color?: string;
  small?: boolean;
}

function hexToRgb(hex: string) {
  try {
    const cleaned = hex.replace('#', '');
    const bigint = parseInt(cleaned.length === 3 ? cleaned.split('').map(c => c + c).join('') : cleaned, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
  } catch (e) {
    return { r: 220, g: 220, b: 220 };
  }
}

function getContrastColor(hex: string) {
  const { r, g, b } = hexToRgb(hex || '#DDD');
  // Perceived luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  // if background is very light, use dark text, otherwise white text
  return luminance > 0.6 ? '#000000' : '#FFFFFF';
}

export function TagPin({ name, color = '#DDD', small = false }: TagPinProps) {
  const fontClass = small ? 'text-xs' : 'text-sm font-medium';
  const padding = small ? 'px-2 py-0.5' : 'px-3 py-1';

  // Use a soft background based on the tag color (reduced alpha)
  const bg = `${color}33`;
  const textColor = getContrastColor(color);

  return (
    <div className={`inline-flex items-center gap-2 rounded ${padding} ${fontClass} select-none`} style={{ background: bg, borderColor: color }}>
      <span style={{ color: textColor }}>{name}</span>
    </div>
  );
}

export default TagPin;
