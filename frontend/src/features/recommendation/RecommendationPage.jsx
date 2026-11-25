import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Loader2,
  RefreshCcw,
  Check,
  ExternalLink,
} from 'lucide-react';
import { pollRecommendation, placeOrder } from '../../api';
import { useSessionStore } from '../../store/useSessionStore';
import Modal from '../../components/Modal';

const CUSTOM_FORMULA_VARIANT_ID = 68105686417728;

const SKIN_TYPE_LABELS = {
  normal: 'Normal Skin',
  dry: 'Dry Skin',
  oily: 'Oily Skin',
  combination_oily: 'Combination / Oily Skin',
  sensitive: 'Sensitive Skin',
  mature: 'Mature / Ageing Skin',
  unknown: 'Normal Skin',
};

const BOLD_LABEL_STYLE = {
  fontWeight: 700,
  fontSynthesis: 'weight',
  WebkitTextStroke: '0.25px currentColor',
  color: '#08060d',
};

const NORMAL_TEXT_STYLE = {
  fontWeight: 400,
  WebkitTextStroke: '0px',
  color: '#4b5563',
};

const SECTION_HEADING_STYLE = {
  color: '#1f6f61',
  fontWeight: 700,
  fontSynthesis: 'weight',
  WebkitTextStroke: '0.2px #1f6f61',
};

function getOrderStorageKey(sessionId) {
  return `celrevive_order_placed_${sessionId}`;
}

function escapeRegExp(str = '') {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripIngredientName(explanation = '', itemName = '') {
  if (!explanation) return '';
  let text = explanation.trim();
  if (!itemName) return text;

  const fullEscaped = escapeRegExp(itemName.trim());
  const plainName = itemName.replace(/[®™]/g, '').trim();
  const plainEscaped = escapeRegExp(plainName);

  const namePattern = `(?:the\\s+)?(?:${fullEscaped}|${plainEscaped})(?:\\s+base|\\s+active)?`;

  const leadingVerbRegex = new RegExp(
    `^${namePattern}\\s*(?:[:–—-]|\\b(?:is|was|has\\s+been|provides|offers|delivers|helps|supports|acts\\s+as|serves\\s+as|works\\s+to)\\b)?\\s*`,
    'i'
  );
  if (leadingVerbRegex.test(text)) {
    text = text.replace(leadingVerbRegex, '');
  } else {
    const anywhereRegex = new RegExp(
      `(^|[^A-Za-z0-9_])${namePattern}(?=$|[^A-Za-z0-9_])\\s*`,
      'gi'
    );
    text = text.replace(anywhereRegex, '$1');
  }

  text = text
    .replace(/^[,.:;–—-]+\s*/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!text) return explanation.trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getFallbackConfidenceLabel(score) {
  if (typeof score !== 'number' || Number.isNaN(score) || score < 0.5) {
    return null;
  }
  if (score < 0.6) return 'Possible Match';
  if (score < 0.7) return 'Moderate Match';
  if (score < 0.8) return 'Notable Match';
  if (score < 0.9) return 'Strong Match';
  return 'Very Strong Match';
}

function getConfidenceBadge(concern) {
  const backendLabel =
    typeof concern?.confidence_label === 'string'
      ? concern.confidence_label.trim()
      : '';
  if (backendLabel) {
    return backendLabel;
  }
  return getFallbackConfidenceLabel(concern?.confidence_score);
}

function getDetectionSourceBadge(concern) {
  const backendSource =
    typeof concern?.detection_source === 'string'
      ? concern.detection_source.trim()
      : '';
  if (backendSource) {
    return backendSource.replace(/\s*\+\s*/g, ' + ');
  }
  const hasImage = Boolean(concern?.image_skin_concern_exists);
  const hasQuestionnaire = Boolean(concern?.questionnaire_skin_concern_exists);
  if (hasImage && hasQuestionnaire) return 'IMAGE + QUESTIONNAIRE';
  if (hasImage) return 'IMAGE';
  if (hasQuestionnaire) return 'QUESTIONNAIRE';
  return null;
}

export default function RecommendationPage({ shopifyUser }) {
  const sessionId = useSessionStore((state) => state.sessionId);
  const clearSession = useSessionStore((state) => state.clearSession);

  const [result, setResult] = useState(null);
  const [isPolling, setIsPolling] = useState(true);
  const [error, setError] = useState(null);

  const [isDetailedReportOpen, setIsDetailedReportOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState(null);

  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);
  const [isAddHovered, setIsAddHovered] = useState(false);

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(() => {
    if (!sessionId) return null;
    try {
      const saved = localStorage.getItem(getOrderStorageKey(sessionId));
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isOrderHovered, setIsOrderHovered] = useState(false);
  const [orderError, setOrderError] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setError('Session ID is missing.');
      setIsPolling(false);
      return;
    }

    try {
      const saved = localStorage.getItem(getOrderStorageKey(sessionId));
      if (saved) {
        setPlacedOrder(JSON.parse(saved));
      }
    } catch {
      // ignore storage errors
    }

    let isMounted = true;

    const fetchResults = async () => {
      try {
        const data = await pollRecommendation(sessionId);
        if (isMounted) {
          setResult(data);
          if (
            data?.order_placed ||
            data?.status === 'ORDER_PLACED' ||
            data?.session_status === 'ORDER_PLACED'
          ) {
            const orderInfo = { status: 'ORDER_PLACED' };
            setPlacedOrder(orderInfo);
            try {
              localStorage.setItem(
                getOrderStorageKey(sessionId),
                JSON.stringify(orderInfo)
              );
            } catch {
              // ignore storage errors
            }
          }
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
            className="mt-[24px] flex w-full items-center justify-center gap-2 rounded-none bg-red-600 px-[16px] py-[8px] text-[14px] font-semibold text-white hover:bg-red-700"
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

  const concernItems = Array.isArray(data.skin_concerns)
    ? data.skin_concerns.filter((c) => c && c.skin_concern_exists !== false)
    : Array.isArray(data.primary_concerns)
    ? data.primary_concerns
    : [];

  const uniqueConcerns = [
    ...new Set(
      concernItems
        .map((c) =>
          typeof c === 'string' ? c : c.skin_concern_name || c.concern_name
        )
        .filter(Boolean)
    ),
  ];

  const skinTypeLabel =
    SKIN_TYPE_LABELS[data.skin_type] || data.skin_type || 'Normal Skin';

  const recommendedBase = data.recommended_base || null;
  const recommendedActives = Array.isArray(data.recommended_actives)
    ? data.recommended_actives
    : [];
  const formulaWeightG = data.formulation_weight_g || 100;

  const openBaseModal = () => {
    if (!recommendedBase) return;
    setSelectedIngredient({
      type: 'Base',
      title: recommendedBase.base_name,
      imageUrl: recommendedBase.image_url || null,
      fullImage: true,
      meta: null,
      description: null,
    });
  };

  const openActiveModal = (active) => {
    if (!active) return;
    setSelectedIngredient({
      type: 'Active Ingredient',
      title: active.active_name,
      imageUrl: active.image_url || null,
      fullImage: true,
      meta: null,
      description: null,
    });
  };

  const handleAddToCart = async () => {
    if (!sessionId || isAddingToCart || isPlacingOrder) return;
    setIsAddingToCart(true);
    setOrderError('');

    try {
      const baseName = recommendedBase?.base_name || 'Custom Base';
      const weightG = data.formulation_weight_g || 100;
      const activesSummary =
        recommendedActives
          .map((a) => {
            if (!a) return '';
            if (typeof a === 'string') return a;
            return a.recommended_usage_percentage != null
              ? `${a.active_name} (${a.recommended_usage_percentage}%)`
              : a.active_name || '';
          })
          .filter(Boolean)
          .join(', ') || 'None (Base only)';
      const concernsSummary = uniqueConcerns.join(', ') || 'None';

      const cartDrawer = document.querySelector('cart-drawer');
      const sectionsToRender = cartDrawer
        ? ['cart-drawer', 'cart-icon-bubble']
        : [];

      const res = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            {
              id: CUSTOM_FORMULA_VARIANT_ID,
              quantity: 1,
              properties: {
                'Base Formula': `${baseName} (${formulaWeightG}g)`,
                'Active Ingredients': activesSummary,
                'Skin Type': skinTypeLabel,
                'Primary Concerns': concernsSummary,
                _session_id: String(sessionId),
              },
            },
          ],
          sections: sectionsToRender,
          sections_url: window.location.pathname,
        }),
      });

      const cartData = await res.json();
      if (!res.ok) {
        throw new Error(
          cartData.description || cartData.message || 'Could not add to cart.'
        );
      }

      setCartAdded(true);

      if (cartDrawer && typeof cartDrawer.renderContents === 'function') {
        cartDrawer.classList.remove('is-empty');
        cartDrawer.renderContents(
          cartData.items
            ? { ...cartData.items[0], sections: cartData.sections }
            : cartData
        );
      } else {
        const cartIcon = document.querySelector(
          '#cart-icon-bubble, a[href="/cart"]'
        );
        if (cartIcon) cartIcon.click();
        else window.location.href = '/cart';
      }
    } catch (err) {
      setOrderError(
        err.message || 'Unable to add formula to cart right now. Please try again.'
      );
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!sessionId || isPlacingOrder || placedOrder) return;
    setIsPlacingOrder(true);
    setOrderError('');

    try {
      const orderData = await placeOrder(sessionId);
      const persistedState = orderData || { status: 'ORDER_PLACED' };
      setPlacedOrder(persistedState);
      try {
        localStorage.setItem(
          getOrderStorageKey(sessionId),
          JSON.stringify(persistedState)
        );
      } catch {
        // ignore storage errors
      }
    } catch (err) {
      if (
        err.message &&
        err.message.toLowerCase().includes('already placed')
      ) {
        const persistedState = { status: 'ORDER_PLACED' };
        setPlacedOrder(persistedState);
        try {
          localStorage.setItem(
            getOrderStorageKey(sessionId),
            JSON.stringify(persistedState)
          );
        } catch {
          // ignore
        }
      } else {
        setOrderError(
          err.message || 'Unable to place order right now. Please try again.'
        );
      }
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div
      className="mx-auto flex w-full max-w-[1180px] flex-col bg-[var(--bg)] px-[24px] py-[40px] sm:px-[48px]"
      style={{ fontSynthesis: 'weight style' }}
    >
      {/* Greeting Header */}
      <div className="mb-[32px]">
        <h1
          className="m-0 text-[32px] font-bold leading-tight text-[var(--text-h)] sm:text-[36px]"
          style={BOLD_LABEL_STYLE}
        >
          Hello {firstName}!
        </h1>
        <p className="mt-[6px] text-[14px]" style={NORMAL_TEXT_STYLE}>
          Your detailed report is ready.
        </p>
      </div>

      {/* Two-Column Wireframe Layout */}
      <div className="grid grid-cols-1 items-start gap-[28px] lg:grid-cols-12">
        {/* LEFT COLUMN: Skin Analysis Result */}
        <div className="rounded-xl border border-gray-200 bg-white p-[28px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] sm:p-[32px] lg:col-span-5">
          <h2 className="m-0 mb-[28px] text-[20px]" style={SECTION_HEADING_STYLE}>
            Skin Analysis Result:
          </h2>

          <div className="space-y-[24px]">
            <p className="m-0 text-[15px] leading-relaxed">
              <span style={BOLD_LABEL_STYLE}>Skin Type: </span>
              <span style={NORMAL_TEXT_STYLE}>{skinTypeLabel}</span>
            </p>

            {uniqueConcerns.length > 0 ? (
              <div>
                <p className="m-0 text-[15px] leading-relaxed">
                  <span style={BOLD_LABEL_STYLE}>Primary Concerns: </span>
                  <span style={NORMAL_TEXT_STYLE}>
                    {uniqueConcerns.join(', ')}.
                  </span>
                </p>

                <button
                  type="button"
                  onClick={() => setIsDetailedReportOpen(true)}
                  className="group relative mt-[18px] inline-flex items-center gap-[5px] border-0 bg-transparent p-0 text-[15px]"
                  style={{ ...SECTION_HEADING_STYLE, cursor: 'pointer' }}
                >
                  <span className="relative inline-block">
                    <span>View Detailed Report</span>
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute bottom-[-3px] left-0 h-[1.5px] w-full origin-center scale-x-0 bg-[#1f6f61] transition-transform duration-300 ease-out group-hover:scale-x-100"
                    />
                  </span>
                  <ExternalLink
                    className="h-[13px] w-[13px] shrink-0 text-[#1f6f61]"
                    strokeWidth={2.25}
                    aria-hidden="true"
                  />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-[20px] text-center">
                <div className="mb-[8px] flex h-[40px] w-[40px] items-center justify-center rounded-full bg-teal-50 text-teal-700">
                  <Sparkles className="h-[20px] w-[20px]" />
                </div>
                <h3 className="m-0 text-[16px]" style={BOLD_LABEL_STYLE}>
                  Your Skin is Looking Great!
                </h3>
                <p className="mt-[4px] text-[13px]" style={NORMAL_TEXT_STYLE}>
                  We could not find any major concerns.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Recommended For You */}
        <div className="rounded-xl border border-gray-200 bg-white p-[28px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] sm:p-[32px] lg:col-span-7">
          <h2 className="m-0 mb-[24px] text-[20px]" style={SECTION_HEADING_STYLE}>
            Recommended for You:
          </h2>

          {/* CelRiv Custom Formula Group */}
          <div className="mb-[24px]">
            <h3 className="m-0 mb-[16px] text-[17px]" style={BOLD_LABEL_STYLE}>
              CelRiv Custom Formula ({formulaWeightG}g)
            </h3>

            <div className="space-y-[20px] border-l-2 border-gray-100 pl-[16px]">
              {/* Sub-element 1: Base Formula */}
              {recommendedBase && (
                <div>
                  <h4 className="m-0 text-[15px]" style={BOLD_LABEL_STYLE}>
                    <span>Base: </span>
                    <button
                      type="button"
                      onClick={openBaseModal}
                      className="inline-flex items-center gap-[4px] border-0 border-b border-dotted border-[#08060d] bg-transparent p-0 pb-[1px] text-left transition-colors hover:border-[#1f6f61] hover:text-[#1f6f61]"
                      style={{ ...BOLD_LABEL_STYLE, cursor: 'pointer' }}
                      title={`View ${recommendedBase.base_name} details`}
                    >
                      <span>{recommendedBase.base_name}</span>
                      <ExternalLink
                        className="h-[13px] w-[13px] shrink-0 text-[#08060d]"
                        strokeWidth={2.25}
                        aria-hidden="true"
                      />
                    </button>
                  </h4>
                  {recommendedBase.if_base_selected_why && (
                    <p
                      className="mt-[6px] text-[13px] italic leading-relaxed"
                      style={NORMAL_TEXT_STYLE}
                    >
                      {stripIngredientName(
                        recommendedBase.if_base_selected_why,
                        recommendedBase.base_name
                      )}
                    </p>
                  )}
                </div>
              )}

              {/* Sub-element 2: Active Ingredients */}
              <div>
                <h4 className="m-0 mb-[10px] text-[15px]" style={BOLD_LABEL_STYLE}>
                  Active Ingredients:
                </h4>

                {recommendedActives.length > 0 ? (
                  <ul className="m-0 list-disc space-y-[10px] pl-[20px] text-[14px] leading-relaxed">
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
                        <li
                          key={active.active_id || active.active_name}
                          style={{ color: '#08060d' }}
                        >
                          <button
                            type="button"
                            onClick={() => openActiveModal(active)}
                            className="inline items-center gap-[4px] border-0 border-b border-dotted border-[#08060d] bg-transparent p-0 pb-[1px] text-left transition-colors hover:border-[#1f6f61] hover:text-[#1f6f61]"
                            style={{ ...BOLD_LABEL_STYLE, cursor: 'pointer' }}
                            title={`View ${active.active_name} details`}
                          >
                            <span>
                              {active.active_name}
                              {pctText}
                            </span>
                            <ExternalLink
                              className="ml-[3px] inline-block h-[12px] w-[12px] shrink-0 align-baseline text-[#08060d]"
                              strokeWidth={2.25}
                              aria-hidden="true"
                            />
                          </button>
                          {cleanedWhy ? (
                            <span style={NORMAL_TEXT_STYLE}>
                              {` – ${cleanedWhy}`}
                            </span>
                          ) : (
                            ''
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-[14px]" style={NORMAL_TEXT_STYLE}>
                    No additional active ingredients required for your current skin
                    profile.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Why this formula? */}
          {data.overall_explanation && (
            <div className="border-t border-gray-100 pt-[20px]">
              <p className="m-0 text-[14px] leading-relaxed">
                <span style={BOLD_LABEL_STYLE}>Why this formula? </span>
                <span style={NORMAL_TEXT_STYLE}>
                  {data.overall_explanation}
                </span>
              </p>
            </div>
          )}

          {/* Dual CTA Row: Add to Cart (Left) + Place Order (Right) */}
          <div className="mt-[32px] flex flex-col items-center">
            <div className="flex w-full max-w-[520px] flex-col gap-[12px] sm:flex-row">
              <button
                type="button"
                onClick={handleAddToCart}
                onMouseEnter={() => setIsAddHovered(true)}
                onMouseLeave={() => setIsAddHovered(false)}
                disabled={isAddingToCart || isPlacingOrder}
                className="product-form__submit button button--secondary button--full-width"
                aria-haspopup="dialog"
                style={{
                  flex: 1,
                  margin: 0,
                  minHeight: '48px',
                  borderRadius: '9999px',
                  border: '1.5px solid #08060d',
                  backgroundColor: isAddHovered ? '#08060d' : '#ffffff',
                  color: isAddHovered ? '#ffffff' : '#08060d',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  boxShadow: 'none',
                }}
              >
                {isAddingToCart ? (
                  <>
                    <Loader2 className="h-[16px] w-[16px] animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : cartAdded ? (
                  <>
                    <Check className="h-[16px] w-[16px]" />
                    <span>Added to cart</span>
                  </>
                ) : (
                  <span>Add to cart</span>
                )}
              </button>

              <button
                type="button"
                onClick={handlePlaceOrder}
                onMouseEnter={() => setIsOrderHovered(true)}
                onMouseLeave={() => setIsOrderHovered(false)}
                disabled={isPlacingOrder || Boolean(placedOrder)}
                className="button button--primary button--full-width"
                style={{
                  flex: 1,
                  margin: 0,
                  minHeight: '48px',
                  borderRadius: '9999px',
                  border: placedOrder
                    ? '1.5px solid #1f6f61'
                    : '1.5px solid #08060d',
                  backgroundColor: placedOrder
                    ? '#1f6f61'
                    : isOrderHovered
                    ? '#221f29'
                    : '#08060d',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  boxShadow: 'none',
                  cursor: placedOrder ? 'not-allowed' : 'pointer',
                }}
              >
                {isPlacingOrder ? (
                  <>
                    <Loader2 className="h-[16px] w-[16px] animate-spin" />
                    <span>Placing Order...</span>
                  </>
                ) : placedOrder ? (
                  <>
                    <Check className="h-[16px] w-[16px]" />
                    <span>Order Placed</span>
                  </>
                ) : (
                  <>
                    <span>Place Order</span>
                    <span aria-hidden="true">→</span>
                  </>
                )}
              </button>
            </div>

            {orderError && (
              <p className="mt-[10px] text-center text-[13px] font-medium text-red-600">
                {orderError}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Action: Outlined Rectangular "Take Another Assessment" Button */}
      <div className="mt-[40px] flex w-full justify-center">
        <button
          type="button"
          onClick={clearSession}
          style={{
            backgroundColor: 'transparent',
            color: '#08060d',
            border: '1.5px solid #08060d',
            fontWeight: 600,
            fontSynthesis: 'weight',
          }}
          className="flex w-full items-center justify-center gap-2 rounded-none px-[32px] py-[12px] text-[14px] tracking-wide transition-colors hover:bg-black/5 sm:w-auto"
        >
          <RefreshCcw className="h-[16px] w-[16px]" /> Take Another Assessment
        </button>
      </div>

      {/* MODAL USAGE 1: Detailed Skin Concern Report */}
      <Modal
        isOpen={isDetailedReportOpen}
        onClose={() => setIsDetailedReportOpen(false)}
        title="Detailed Skin Analysis Report"
        subtitle={`Skin Type: ${skinTypeLabel}`}
        maxWidthClass="max-w-[600px]"
      >
        {concernItems.length > 0 ? (
          <div className="space-y-[14px]">
            {concernItems.map((concern, idx) => {
              const name =
                typeof concern === 'string'
                  ? concern
                  : concern.skin_concern_name || concern.concern_name;
              const confidenceBadge =
                typeof concern === 'string' ? null : getConfidenceBadge(concern);
              const sourceBadge =
                typeof concern === 'string'
                  ? null
                  : getDetectionSourceBadge(concern);
              const whyText =
                typeof concern === 'string'
                  ? ''
                  : concern.if_skin_concern_true_why || '';

              return (
                <div
                  key={concern.skin_concern_id || name || idx}
                  className="rounded-lg border border-gray-200 bg-gray-50/60 p-[16px]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-[8px]">
                    <span className="text-[15px]" style={BOLD_LABEL_STYLE}>
                      {name}
                    </span>
                    <div className="flex flex-wrap items-center gap-[6px]">
                      {confidenceBadge && (
                        <span className="rounded-full bg-[#1f6f61]/10 px-[10px] py-[2px] text-[11px] font-semibold text-[#1f6f61]">
                          {confidenceBadge}
                        </span>
                      )}
                      {sourceBadge && (
                        <span className="rounded-full border border-gray-200 bg-white px-[10px] py-[2px] text-[11px] font-medium text-gray-700">
                          {sourceBadge}
                        </span>
                      )}
                    </div>
                  </div>
                  {whyText && (
                    <p
                      className="m-0 mt-[8px] text-[13px] leading-relaxed"
                      style={NORMAL_TEXT_STYLE}
                    >
                      {whyText}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="m-0 text-[14px]" style={NORMAL_TEXT_STYLE}>
            No specific skin concerns were flagged in this session.
          </p>
        )}
      </Modal>

      {/* MODAL USAGE 2: Base / Active Ingredient Detail */}
      <Modal
        isOpen={Boolean(selectedIngredient)}
        onClose={() => setSelectedIngredient(null)}
        badge={selectedIngredient?.type}
        title={selectedIngredient?.title}
        imageUrl={selectedIngredient?.imageUrl}
        imageAlt={selectedIngredient?.title}
        fullImage={selectedIngredient?.fullImage}
        meta={selectedIngredient?.meta}
        description={selectedIngredient?.description}
        maxWidthClass="max-w-[480px]"
      />
    </div>
  );
}