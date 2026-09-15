// api.js
const API_BASE_URL = 'http://localhost:8000/api/v1';

/**
 * Fetches AI recommendations from the backend.
 * Since the AI runs as a background task, this function polls the endpoint
 * and waits until the data is ready (Max timeout: 40 seconds).
 */
export const fetchAIRecommendation = async (sessionId, userName = 'Valued Customer') => {
  let retries = 20; // Increased to 20 retries (20 * 2s = 40 seconds) to give AI enough time

  while (retries > 0) {
    try {
      // URL encode the username to safely handle spaces
      const res = await fetch(`${API_BASE_URL}/recommendation/${sessionId}?user_full_name=${encodeURIComponent(userName)}`);
      
      if (res.ok) {
        // Status 200: Data successfully received!
        const data = await res.json();
        return data; 
      } else if (res.status === 404) {
        // Status 404: AI is still processing. Wait for 2 seconds before the next retry.
        console.log(`AI is still processing... retries left: ${retries - 1}`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        retries--;
      } else {
        // Handle other backend errors (e.g., 500 Internal Server Error)
        const errorText = await res.text();
        console.error(`Backend error details:`, errorText);
        throw new Error(`Backend returned an error: ${res.status}`);
      }
    } catch (err) {
      console.error('Fetch attempt failed:', err);
      // Agar retries khatam ho chuke hain tabhi error throw karein, warna next retry chalne dein
      if (retries <= 1) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
      retries--;
    }
  }

  // If no data is received after all retries are exhausted
  throw new Error('AI processing took too long. Please try again.');
};