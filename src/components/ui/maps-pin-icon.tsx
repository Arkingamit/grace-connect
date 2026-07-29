import React from 'react';
import { cn } from '@/lib/utils';

/** Google Maps–style pin used on location / directions buttons. */
export function MapsPinIcon({
  className,
  alt = '',
}: {
  className?: string;
  alt?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/maps-pin.png"
      alt={alt}
      width={20}
      height={20}
      className={cn('object-contain shrink-0 pointer-events-none', className)}
      aria-hidden={alt ? undefined : true}
    />
  );
}
