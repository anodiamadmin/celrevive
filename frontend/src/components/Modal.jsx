import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const MODAL_TITLE_STYLE = {
  fontWeight: 700,
  fontSynthesis: 'weight',
  WebkitTextStroke: '0.25px currentColor',
  color: '#08060d',
};

const MODAL_BODY_STYLE = {
  fontWeight: 400,
  WebkitTextStroke: '0px',
  color: '#4b5563',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  imageUrl,
  imageAlt,
  fullImage = false,
  meta,
  description,
  maxWidthClass = 'max-w-[480px]',
  children,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-[16px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Details modal'}
    >
      <div
        className={`max-h-[85vh] w-full ${maxWidthClass} overflow-y-auto rounded-xl border border-gray-200 bg-white p-[24px] shadow-xl sm:p-[28px]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-[18px] flex items-start justify-between gap-[12px] border-b border-gray-100 pb-[14px]">
          <div>
            {badge && (
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#1f6f61]">
                {badge}
              </span>
            )}
            {title && (
              <h3
                className="m-0 mt-[2px] text-[18px]"
                style={
                  badge
                    ? MODAL_TITLE_STYLE
                    : { ...MODAL_TITLE_STYLE, color: '#1f6f61' }
                }
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-[4px] text-[13px]" style={MODAL_BODY_STYLE}>
                {subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-[6px] text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            aria-label="Close modal"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        {imageUrl && (
          fullImage ? (
            <div className="w-full overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
              <img
                src={imageUrl}
                alt={imageAlt || title || 'Ingredient image'}
                className="block h-auto w-full object-contain"
              />
            </div>
          ) : (
            <div className="mb-[16px] flex h-[190px] w-full items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-gray-50 p-[12px]">
              <img
                src={imageUrl}
                alt={imageAlt || title || 'Ingredient image'}
                className="h-full w-full object-contain"
              />
            </div>
          )
        )}

        {meta && (
          <p className="m-0 mb-[10px] text-[13px]" style={MODAL_TITLE_STYLE}>
            {meta}
          </p>
        )}

        {description && (
          <p
            className="m-0 text-[14px] leading-relaxed"
            style={MODAL_BODY_STYLE}
          >
            {description}
          </p>
        )}

        {children}
      </div>
    </div>
  );
}