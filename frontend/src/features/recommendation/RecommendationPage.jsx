import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, RefreshCcw } from 'lucide-react';
import { pollRecommendation } from '../../api';
import { useSessionStore } from '../../store/useSessionStore';

const SKIN_TYPE_LABELS = {
  normal: 'Normal Skin',
  dry: 'Dry Skin',
  oily: 'Oily Skin',
  combination_oily: 'Combination / Oily Skin',
  sensitive: 'Sensitive Skin',
  mature: 'Mature / Ageing Skin',
  unknown: 'Normal Skin',
};

function escapeRegExp(str = '') {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Removes repetitive base or active ingredient names from the AI explanation
 * so the description reads cleanly like the wireframe (e.g. "Chosen for...").
 */
function stripIngredientName(explanation = '', itemName = '') {
  if (!explanation) return '';
  let text = explanation.trim();
  if (!itemName) return text;

  const fullEscaped = escapeRegExp(itemName.trim());
  // Also strip plain version without ® or ™ symbols in case the LLM omitted them
  const plainName = itemName.replace(/[®™]/g, '').trim();
  const plainEscaped = escapeRegExp(plainName);

  const namePattern = `(?:the\\s+)?(?:${fullEscaped}|${plainEscaped})(?:\\s+base|\\s+active)?`;

  // 1. Strip leading "<Name> is/was/provides/offers/helps/supports/..." or "<Name> - "
  const leadingVerbRegex = new RegExp(
    `^${namePattern}\\s*(?:[:–—-]|\\b(?:is|was|has\\s+been|provides|offers|delivers|helps|supports|acts\\s+as|serves\\s+as|works\\s+to)\\b)?\\s*`,
    'i'
  );
  if (leadingVerbRegex.test(text)) {
    text = text.replace(leadingVerbRegex, '');
  } else {
    // 2. Otherwise strip standalone mentions of the name anywhere in the sentence
    const anywhereRegex = new RegExp(`\\b${namePattern}\\b\\s*`, 'gi');
    text = text.replace(anywhereRegex, '');
  }

  // Clean up any leftover leading punctuation or double spaces
  text = text
    .replace(/^[,.:;–—-]+\s*/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!text) return explanation.trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function RecommendationPage({ shopifyUser }) {
  const sessionId = useSessionStore((state) => state.sessionId);
  const clearSession = useSessionStore((state) => state.clearSession);

  const [result, setResult] = useState(null);
  const [isPolling, setIsPolling] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      setError('Session ID is missing.');
      setIsPolling(false);
      return;
    }

    let isMounted = true;

    const fetchResults = async () => {
      try {
        const data = await pollRecommendation(sessionId);
        if (isMounted) {
          setResult(data);
          setIsPolling(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'An error occurred during analysis.');
          setIsPolling(false);
        }
      }
    };

    fetchResults();

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  if (isPolling) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-[var(--bg)] px-[24px] py-[80px] text-center">
        <Loader2 className="mb-[16px] h-[48px] w-[48px] animate-spin text-[var(--text-h)]" />
        <h2 className="text-[20px] font-bold text-[var(--text-h)]">
          Analyzing your skin...
        </h2>
        <p className="mt-[8px] text-[14px] text-[var(--text)]">
          We are generating your custom routine.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-[var(--bg)] px-[24px] py-[80px] text-center">
        <div className="max-w-[448px] rounded-xl border border-red-200 bg-red-50 p-[24px]">
          <h2 className="text-[18px] font-bold text-red-700">Analysis Failed</h2>
          <p className="mt-[8px] text-[14px] text-red-600">{error}</p>

          <button
            type="button"
            onClick={clearSession}
            className="mt-[24px] flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-[16px] py-[8px] text-[14px] font-semibold text-white hover:bg-red-700"
          >
            <RefreshCcw className="h-[16px] w-[16px]" /> Start Over
          </button>
        </div>
      </div>
    );
  }

  const data = result || {};
  let firstName = 'Customer';

  if (shopifyUser && shopifyUser.firstName) {
    firstName = shopifyUser.firstName.trim().split(' ')[0];
  } else if (data.user_full_name) {
    firstName = data.user_full_name.trim().split(' ')[0];
  }

  // Extract unique concern names (supports both full recommendation schema and legacy primary_concerns)
  const rawConcernList = Array.isArray(data.skin_concerns)
    ? data.skin_concerns.map((c) => c.skin_concern_name || c.concern_name || c)
    : Array.isArray(data.primary_concerns)
    ? data.primary_concerns.map((c) => c.concern_name || c)
    : [];
  const uniqueConcerns = [...new Set(rawConcernList.filter(Boolean))];

  const skinTypeLabel =
    SKIN_TYPE_LABELS[data.skin_type] || data.skin_type || 'Normal Skin';

  const recommendedBase = data.recommended_base || null;
  const recommendedActives = Array.isArray(data.recommended_actives)
    ? data.recommended_actives
    : [];
  const weightSuffix = data.formulation_weight_g
    ? ` (${data.formulation_weight_g}g)`
    : '';

  const handleAddToCart = async () => {
    // Safe no-op unless a Shopify product variant ID is configured on #ai-skin-assessment
    const root = document.getElementById('ai-skin-assessment');
    const variantId = root?.dataset?.formulationVariantId;
    if (!variantId) return;

    try {
      await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: Number(variantId),
          quantity: 1,
          properties: {
            'Recommendation ID': data.recommendation_id || '',
            Base: recommendedBase
              ? `${recommendedBase.base_name}${weightSuffix}`
              : '',
            Actives: recommendedActives
              .map(
                (a) =>
                  `${a.active_name}${
                    a.recommended_usage_percentage != null
                      ? ` (${a.recommended_usage_percentage}%)`
                      : ''
                  }`
              )
              .join(', '),
          },
        }),
      });
      window.location.href = '/cart';
    } catch {
      // Do nothing if cart endpoint is not configured
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col bg-[var(--bg)] px-[24px] py-[40px] sm:px-[48px]">
      {/* Greeting Header */}
      <div className="mb-[32px]">
        <h1 className="m-0 text-[32px] font-bold leading-tight text-[var(--text-h)] sm:text-[36px]">
          Hello {firstName}!
        </h1>
        <p className="mt-[6px] text-[14px] text-[var(--text)]">
          Your detailed report is ready.
        </p>
      </div>

      {/* Two-Column Wireframe Layout */}
      <div className="grid grid-cols-1 items-start gap-[28px] lg:grid-cols-12">
        {/* LEFT COLUMN: Skin Analysis Result */}
        <div className="rounded-xl border border-gray-200 bg-white p-[28px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] sm:p-[32px] lg:col-span-5">
          <h2
            className="m-0 mb-[28px] text-[20px] font-semibold"
            style={{ color: '#1f6f61' }}
          >
            Skin Analysis Result:
          </h2>

          <div className="space-y-[24px]">
            <p className="m-0 text-[15px] leading-relaxed text-[var(--text-h)]">
              <span className="font-semibold">Skin Type: </span>
              <span style={{ fontWeight: 400 }}>{skinTypeLabel}</span>
            </p>

            {uniqueConcerns.length > 0 ? (
              <p className="m-0 text-[15px] leading-relaxed text-[var(--text-h)]">
                <span className="font-semibold">Primary Concerns: </span>
                <span style={{ fontWeight: 400 }}>
                  {uniqueConcerns.join(', ')}.
                </span>
              </p>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-[20px] text-center">
                <div className="mb-[8px] flex h-[40px] w-[40px] items-center justify-center rounded-full bg-teal-50 text-teal-700">
                  <Sparkles className="h-[20px] w-[20px]" />
                </div>
                <h3 className="m-0 text-[16px] font-bold text-[var(--text-h)]">
                  Your Skin is Looking Great!
                </h3>
                <p className="mt-[4px] text-[13px] text-[var(--text)]">
                  We could not find any major concerns.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Recommended For You */}
        <div className="rounded-xl border border-gray-200 bg-white p-[28px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] sm:p-[32px] lg:col-span-7">
          <h2
            className="m-0 mb-[24px] text-[20px] font-semibold"
            style={{ color: '#1f6f61' }}
          >
            Recommended For You:
          </h2>

          {/* Base Formula */}
          {recommendedBase && (
            <div className="mb-[24px]">
              <h3 className="m-0 text-[16px] font-bold text-[var(--text-h)]">
                Base: {recommendedBase.base_name}
                {weightSuffix}
              </h3>
              {recommendedBase.if_base_selected_why && (
                <p className="mt-[6px] text-[13px] italic leading-relaxed text-gray-600">
                  {stripIngredientName(
                    recommendedBase.if_base_selected_why,
                    recommendedBase.base_name
                  )}
                </p>
              )}
            </div>
          )}

          {/* Active Ingredients */}
          <div className="mb-[24px]">
            <h3 className="m-0 mb-[12px] text-[15px] font-bold text-[var(--text-h)]">
              Active Ingredients:
            </h3>

            {recommendedActives.length > 0 ? (
              <ul className="m-0 list-disc space-y-[10px] pl-[20px] text-[14px] leading-relaxed text-gray-700">
                {recommendedActives.map((active) => {
                  const pctText =
                    active.recommended_usage_percentage != null
                      ? ` (${active.recommended_usage_percentage}%)`
                      : '';
                  const cleanedWhy = stripIngredientName(
                    active.if_active_selected_why,
                    active.active_name
                  );

                  return (
                    <li key={active.active_id || active.active_name}>
                      <span className="font-medium text-[var(--text-h)]">
                        {active.active_name}
                        {pctText}
                      </span>
                      {cleanedWhy ? ` – ${cleanedWhy}` : ''}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-[14px] text-gray-600">
                No additional active ingredients required for your current skin profile.
              </p>
            )}
          </div>

          {/* Why this formula? */}
          {data.overall_explanation && (
            <div className="border-t border-gray-100 pt-[20px]">
              <p className="m-0 text-[14px] leading-relaxed text-gray-800">
                <strong className="font-bold text-[var(--text-h)]">
                  Why this formula?{' '}
                </strong>
                <span style={{ fontWeight: 400 }}>
                  {data.overall_explanation}
                </span>
              </p>
            </div>
          )}

          {/* ADD TO CART Button */}
          <div className="mt-[32px] flex justify-center">
            <button
              type="button"
              onClick={handleAddToCart}
              style={{ backgroundColor: '#000000', color: '#ffffff' }}
              className="inline-flex items-center justify-center gap-[8px] rounded-none px-[32px] py-[12px] text-[12px] font-bold uppercase tracking-[1.5px] transition-opacity hover:opacity-85"
            >
              <span>ADD TO CART</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Centered "Take Another Assessment" Button Below Both Cards */}
      <div className="mt-[40px] flex w-full justify-center">
        <button
          type="button"
          onClick={clearSession}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--text-h)] px-[32px] py-[12px] text-[14px] font-semibold tracking-wide text-[var(--bg)] transition-opacity hover:opacity-90 sm:w-auto"
        >
          <RefreshCcw className="h-[16px] w-[16px]" /> Take Another Assessment
        </button>
      </div>
    </div>
  );
}