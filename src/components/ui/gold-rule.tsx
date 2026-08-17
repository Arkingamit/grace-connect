import React from 'react';

export function GoldRule({ className = "" }: { className?: string }) {
  return (
    <div className={`h-[2px] w-12 bg-accent mt-2 mb-4 rounded-full ${className}`} />
  );
}
