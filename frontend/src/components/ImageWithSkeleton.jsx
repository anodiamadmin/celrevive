import React, { useEffect, useState } from 'react';

export default function ImageWithSkeleton({
  src,
  alt = '',
  containerClassName = '',
  imgClassName = '',
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  if (!src || hasError) return null;

  return (
    <div className={`relative w-full overflow-hidden ${containerClassName}`}>
      <style>{`
        @keyframes celreviveShimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>

      {!isLoaded && (
        <div
          aria-hidden="true"
          className="relative h-[260px] w-full overflow-hidden rounded-lg bg-gray-200 sm:h-[300px]"
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.65) 50%, rgba(255,255,255,0) 100%)',
              animation: 'celreviveShimmer 2.0s infinite ease-in-out',
            }}
          />
        </div>
      )}

      <img
        src={src}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setHasError(true);
          setIsLoaded(true);
        }}
        className={`${
          isLoaded ? 'block' : 'pointer-events-none absolute inset-0 opacity-0'
        } ${imgClassName}`}
      />
    </div>
  );
}