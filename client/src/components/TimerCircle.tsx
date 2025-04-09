import React, { useEffect, useState } from 'react';

interface TimerCircleProps {
  seconds: number;
  isRunning: boolean;
  maxTime: number;
}

export function TimerCircle({ seconds, isRunning, maxTime = 30 }: TimerCircleProps) {
  // Calculate the circle stroke dashoffset based on remaining time
  const calculateOffset = () => {
    const totalLength = 283; // Circumference of circle
    return totalLength * (1 - seconds / maxTime);
  };
  
  return (
    <div className="w-[60px] h-[60px] relative">
      <svg width="60" height="60" viewBox="0 0 100 100">
        <circle 
          className="stroke-gray-200 fill-none" 
          cx="50" 
          cy="50" 
          r="45" 
          strokeWidth="10" 
          strokeLinecap="round" 
          transform="translate(5, 5)"
        />
        <circle 
          className="stroke-accent fill-none transition-[stroke-dashoffset] duration-1000 ease-linear" 
          cx="50" 
          cy="50" 
          r="45" 
          strokeWidth="10" 
          strokeLinecap="round" 
          strokeDasharray="283" 
          strokeDashoffset={calculateOffset()} 
          transform="translate(5, 5)"
        />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center font-bold text-xl ${seconds <= 5 ? 'text-error' : 'text-accent'}`}>
        {seconds}
      </div>
    </div>
  );
}
