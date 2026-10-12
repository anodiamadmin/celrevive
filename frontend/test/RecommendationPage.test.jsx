import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecommendationPage from '../src/features/recommendation/RecommendationPage';
import { pollImageAnalysis } from '../src/api';
import { useSessionStore } from '../src/store/useSessionStore.js';

// --- Mocks ---
jest.mock('../src/api', () => ({
  pollImageAnalysis: jest.fn(),
}));

jest.mock('../src/store/useSessionStore.js', () => ({
  useSessionStore: jest.fn(),
}));

describe('RecommendationPage Component', () => {
  const mockClearSession = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useSessionStore.mockImplementation((selector) => 
      selector({ sessionId: 'mock-session-123', clearSession: mockClearSession })
    );
  });

  test('1. renders missing session error if sessionId is null', () => {
    useSessionStore.mockImplementation((selector) => selector({ sessionId: null, clearSession: mockClearSession }));
    render(<RecommendationPage shopifyUser={null} />);
    
    expect(screen.getByText(/Analysis Failed/i)).toBeInTheDocument();
    expect(screen.getByText(/Session ID is missing/i)).toBeInTheDocument();
  });

  test('2. shows polling/loading screen initially on mount', () => {
    pollImageAnalysis.mockReturnValue(new Promise(() => {}));
    
    render(<RecommendationPage shopifyUser={null} />);
    
    expect(screen.getByText(/Analyzing your skin.../i)).toBeInTheDocument();
    expect(screen.getByText(/We are generating your custom routine/i)).toBeInTheDocument();
  });

  test('3. displays error screen if polling fails', async () => {
    pollImageAnalysis.mockRejectedValue(new Error('Backend timeout'));
    
    render(<RecommendationPage shopifyUser={null} />);
    
    expect(await screen.findByText(/Analysis Failed/i)).toBeInTheDocument();
    expect(screen.getByText(/Backend timeout/i)).toBeInTheDocument();
  });

  test('4. renders successful skin analysis with specific concerns and fallback name', async () => {
    pollImageAnalysis.mockResolvedValue({
      user_full_name: 'Jane Doe',
      primary_concerns: ['Redness', 'Acne', 'Acne'] 
    });
    
    render(<RecommendationPage shopifyUser={null} />);
    
    expect(await screen.findByText(/Hello Jane!/i)).toBeInTheDocument();
    expect(screen.getByText(/Primary Concerns:/i)).toBeInTheDocument();
    expect(screen.getByText(/Redness, Acne\./i)).toBeInTheDocument();
  });

  test('5. uses Shopify user name if provided over API fallback name', async () => {
    pollImageAnalysis.mockResolvedValue({ user_full_name: 'Jane Doe' });
    
    render(<RecommendationPage shopifyUser={{ firstName: 'ShopifyUser' }} />);
    
    expect(await screen.findByText(/Hello ShopifyUser!/i)).toBeInTheDocument();
  });

  test('6. displays "Looking Great!" empty state if no concerns are found', async () => {
    pollImageAnalysis.mockResolvedValue({
      primary_concerns: []
    });
    
    render(<RecommendationPage shopifyUser={null} />);
    
    expect(await screen.findByText(/Your Skin is Looking Great!/i)).toBeInTheDocument();
    expect(screen.getByText(/We could not find any major concerns/i)).toBeInTheDocument();
  });

  test('7. clears session when "Start Over" button is clicked on error screen', async () => {
    pollImageAnalysis.mockRejectedValue(new Error('Fail'));
    render(<RecommendationPage shopifyUser={null} />);
    
    const startOverBtn = await screen.findByRole('button', { name: /Start Over/i });
    await userEvent.click(startOverBtn);
    
    expect(mockClearSession).toHaveBeenCalledTimes(1);
  });

  test('8. clears session when "Take Another Assessment" is clicked on success screen', async () => {
    pollImageAnalysis.mockResolvedValue({ primary_concerns: ['Dryness'] });
    render(<RecommendationPage shopifyUser={null} />);
    
    const resetBtn = await screen.findByRole('button', { name: /Take Another Assessment/i });
    await userEvent.click(resetBtn);
    
    expect(mockClearSession).toHaveBeenCalledTimes(1);
  });

  test('9. gracefully handles completely unformatted API success responses', async () => {
    pollImageAnalysis.mockResolvedValue({}); // Empty object
    render(<RecommendationPage shopifyUser={null} />);
    
    expect(await screen.findByText(/Your Skin is Looking Great!/i)).toBeInTheDocument();
  });

  test('10. safely executes when optional shopifyUser prop is omitted entirely', async () => {
    pollImageAnalysis.mockResolvedValue({ primary_concerns: ['Dryness'] });
    render(<RecommendationPage />); // No props
    
    expect(await screen.findByText(/Primary Concerns/i)).toBeInTheDocument();
  });
});