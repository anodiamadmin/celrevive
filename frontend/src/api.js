import { QUESTIONNAIRE_VERSION } from './constants/questionnaireData';

const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (isLocalhost ? 'http://localhost:8000/api/v1' : '/apps/celrevive-backend/api/v1');

const REQUEST_TIMEOUT_MS = 30000;

/**
 * Safely extracts a human-readable string from FastAPI error responses (400/404/409/422/500/502).
 */
async function extractApiErrorMessage(res, fallbackMessage) {
  try {
    const data = await res.json();
    if (typeof data?.detail === 'string') {
      return data.detail;
    }
    if (Array.isArray(data?.detail) && data.detail.length > 0) {
      return data.detail
        .map((err) => err?.msg || JSON.stringify(err))
        .join(', ');
    }
    if (typeof data?.message === 'string') {
      return data.message;
    }
  } catch {
    // Non-JSON error body (e.g., proxy 502/504 HTML)
  }
  return `${fallbackMessage} (HTTP ${res.status})`;
}

/**
 * Wrapper around fetch with an AbortController timeout so requests never hang indefinitely.
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error('Request timed out. Please check your internet connection and try again.');
    }
    throw new Error(err?.message || 'Network error. Unable to reach the server.');
  } finally {
    clearTimeout(timer);
  }
}

const getShopifyCustomerContext = () => {
  const root = document.getElementById('ai-skin-assessment');
  if (!root || !root.dataset) return {};
  return {
    shopify_customer_id: root.dataset.customerId || null,
    shopify_customer_name:
      root.dataset.customerName || root.dataset.customerFirstName || null,
    shopify_customer_email: root.dataset.customerEmail || null,
  };
};

/**
 * 1. Creates a secure session for the user journey.
 */
export const createSession = async (consentGiven = true) => {
  const customerContext = getShopifyCustomerContext();

  const res = await fetchWithTimeout(`${API_BASE_URL}/create-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify({
      consent_given: consentGiven,
      ...customerContext,
    }),
  });

  if (!res.ok) {
    const msg = await extractApiErrorMessage(res, 'Failed to create secure session');
    throw new Error(msg);
  }
  return res.json();
};

/**
 * 2. Uploads and validates the image quality.
 */
export const validateImage = async (imageFile, sessionId) => {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('session_id', sessionId);

  const res = await fetchWithTimeout(`${API_BASE_URL}/image-validation`, {
    method: 'POST',
    headers: {
      'ngrok-skip-browser-warning': 'true',
    },
    body: formData,
  });

  if (!res.ok) {
    const msg = await extractApiErrorMessage(res, 'Image validation service unavailable');
    const error = new Error(msg);
    error.status = res.status;
    throw error;
  }
  return res.json();
};

/**
 * 3. Submits the 20-question canonical questionnaire payload.
 */
export const submitQuestionnaire = async (sessionId, responseJson) => {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/sessions/${sessionId}/questionnaire`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({
        questionnaire_version: QUESTIONNAIRE_VERSION,
        response_json: responseJson,
      }),
    }
  );

  if (!res.ok) {
    const msg = await extractApiErrorMessage(res, 'Failed to submit questionnaire');
    const error = new Error(msg);
    error.status = res.status;
    throw error;
  }

  return res.json();
};

/**
 * 4. Polls GET /sessions/{sessionId}/recommendation until 200 OK.
 * Backend returns 409 while still processing, and 502/404 if workflow failed.
 */
export const pollRecommendation = async (sessionId, attempts = 0) => {
  const MAX_ATTEMPTS = 120; // 120 * 2.5s = 5 minutes max

  if (attempts >= MAX_ATTEMPTS) {
    throw new Error(
      'Recommendation generation is taking longer than expected. Please try again.'
    );
  }

  const timestamp = new Date().getTime();
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/sessions/${sessionId}/recommendation?_t=${timestamp}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
    }
  );

  if (res.status === 200) {
    return res.json();
  }

  if (res.status === 409) {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    return pollRecommendation(sessionId, attempts + 1);
  }

  const errorDetail = await extractApiErrorMessage(
    res,
    'Questionnaire or recommendation analysis failed.'
  );
  throw new Error(errorDetail);
};

/**
 * Legacy helper kept for existing unit tests in RecommendationPage.test.jsx.
 */
export const pollImageAnalysis = async (sessionId, attempts = 0) => {
  const MAX_ATTEMPTS = 120;

  if (attempts >= MAX_ATTEMPTS) {
    throw new Error(
      'Analysis is taking longer than expected. Please refresh the page or try again.'
    );
  }

  const timestamp = new Date().getTime();
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/sessions/${sessionId}/analysis?_t=${timestamp}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
    }
  );

  if (!res.ok) {
    const msg = await extractApiErrorMessage(res, 'Failed to retrieve analysis status');
    throw new Error(msg);
  }
  const data = await res.json();

  if (data.analysis_status === 'completed' || data.analysis_status === 'COMPLETED') {
    return {
      primary_concerns: (data.primary_concerns || []).map((c) => c.concern_name || c),
      combined_skin_concerns: data.combined_skin_concerns || null,
    };
  } else if (
    data.analysis_status === 'error' ||
    data.analysis_status === 'ERROR' ||
    data.analysis_status === 'analysis_failed' ||
    data.analysis_status === 'validation_failed'
  ) {
    throw new Error(
      data.message || data.error_message || 'AI analysis failed during processing.'
    );
  } else {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    return pollImageAnalysis(sessionId, attempts + 1);
  }
};

/**
 * 5. Places a zero-cost ($0.00) custom formulation order in Shopify Admin.
 */
export const placeOrder = async (sessionId) => {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/sessions/${sessionId}/place-order`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
    }
  );

  if (!res.ok) {
    const msg = await extractApiErrorMessage(res, 'Failed to place order');
    throw new Error(msg);
  }

  return res.json();
};