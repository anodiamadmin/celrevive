import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[var(--bg)] px-4">
      {/* Animated Spinner Icon uses dynamic accent color */}
      <Loader2 className="h-16 w-16 animate-spin text-[var(--accent)]" strokeWidth={1.5} />

      {/* Loading Text inherits Shopify heading color */}
      <h2 className="mt-8 text-xl font-semibold tracking-wide text-[var(--text-h)] md:text-2xl">
        Analyzing your skin...
      </h2>
    </div>
  );
}