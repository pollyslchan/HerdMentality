import React from 'react';

interface PlayerAvatarProps {
  number: number;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PlayerAvatar({ number, color, size = 'md' }: PlayerAvatarProps) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary',
    secondary: 'bg-pink-500',
    accent: 'bg-purple-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
    dark: 'bg-gray-800',
  };
  
  const sizeMap: Record<string, string> = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };
  
  const bgClass = colorMap[color] || 'bg-primary';
  const sizeClass = sizeMap[size] || sizeMap.md;
  
  return (
    <div className={`${sizeClass} ${bgClass} rounded-full text-white flex items-center justify-center font-bold`}>
      {number}
    </div>
  );
}
