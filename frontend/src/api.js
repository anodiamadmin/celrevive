const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * 1. Creates a secure session for the user journey.
 */
export const createSession = async (consentGiven = true) => {
  const res = await fetch(`${API_BASE_URL}/create-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ consent_given: consentGiven })
  });

  if (!res.ok) throw new Error('Failed to create secure session');
  return res.json();
};

/**
 * 2. Uploads and validates the image quality.
 */
export const validateImage = async (imageFile, sessionId) => {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('session_id', sessionId);
  
  const res = await fetch(`${API_BASE_URL}/image-validation`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) throw new Error('Image validation service unavailable');
  return res.json();
};

/**
 * 3. Polls the backend until the async image analysis is completed.
 * Includes a timeout safeguard to prevent infinite looping.
 */
export const pollImageAnalysis = async (sessionId, attempts = 0) => {
  const MAX_ATTEMPTS = 120; // 120 attempts * 2.5 seconds = 300 seconds (5 minutes) total timeout

  if (attempts >= MAX_ATTEMPTS) {
    throw new Error('Analysis is taking longer than expected. Please refresh the page or try again.');
  }

  const timestamp = new Date().getTime();
  
  const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/analysis?_t=${timestamp}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'ngrok-skip-browser-warning': 'true' 
    }
  });
  
  if (!res.ok) throw new Error('Failed to retrieve analysis status');
  const data = await res.json();

  if (data.analysis_status === 'completed' || data.analysis_status === 'COMPLETED') {
    return {
      primary_concerns: (data.primary_concerns || []).map(c => c.concern_name || c)
    };
  } else if (data.analysis_status === 'error' || data.analysis_status === 'ERROR') {
    throw new Error(data.error_message || 'AI analysis failed during processing.');
  } else {
    // PENDING, PROCESSING, etc.: Wait 2.5 seconds and poll again, incrementing the attempt counter
    await new Promise(resolve => setTimeout(resolve, 2500));
    return pollImageAnalysis(sessionId, attempts + 1);
  }
};