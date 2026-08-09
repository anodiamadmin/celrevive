import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-[var(--bg)] px-4">
      {/* Animated Spinner Icon */}
      <Loader2 className="h-16 w-16 animate-spin text-black" strokeWidth={1.5} />

      {/* Loading Text */}
      <h2 className="mt-8 text-xl font-semibold tracking-wide text-[var(--text-h)] md:text-2xl">
        Customizing your solution...
      </h2>
    </div>
  );
}