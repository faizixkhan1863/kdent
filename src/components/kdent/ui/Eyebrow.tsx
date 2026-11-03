'use client';

import { ReactNode } from 'react';

/** Eyebrow — gold luxury section label with hairline. */
export default function Eyebrow({
  children,
  center = false,
  className = '',
}: {
  children: ReactNode;
  center?: boolean;
  className?: string;
}) {
  return (
    <span className={`eyebrow ${center ? 'eyebrow-center' : ''} ${className}`}>
      {children}
    </span>
  );
}
