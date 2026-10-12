import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LandingIntro from '../src/features/landing/LandingIntro';
import { createSession } from '../src/api';
import { useSessionStore } from '../src/store/useSessionStore.js';

// --- Mocks ---
jest.mock('../src/api', () => ({
  createSession: jest.fn(),
}));

jest.mock('../src/store/useSessionStore.js', () => ({
  useSessionStore: jest.fn(),
}));

describe('LandingIntro Component', () => {
  const mockSetSessionId = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useSessionStore.mockImplementation((selector) => selector({
      setSessionId: mockSetSessionId
    }));
  });

  test('1. renders all static UI elements properly', () => {
    render(<LandingIntro onStartAssessment={jest.fn()} />);

    expect(screen.getByRole('heading', { level: 1, name: /ai skin analysis/i })).toBeInTheDocument();
    expect(screen.getByText(/check your skin!/i)).toBeInTheDocument();
    expect(screen.getByAltText('AI Skin Analysis Model')).toBeInTheDocument();
    expect(screen.getByText('STEP 1')).toBeInTheDocument();
    expect(screen.getByText('STEP 2')).toBeInTheDocument();
    expect(screen.getByText('STEP 3')).toBeInTheDocument();
    expect(screen.getByText('FINAL STEP')).toBeInTheDocument();
    
    // Ensure button exists and is correctly disabled by default
    const button = screen.getByRole('button', { name: /begin assessment/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  test('2. calls onStartAssessment when session is created successfully', async () => {
    const mockOnStart = jest.fn();
    createSession.mockResolvedValueOnce({ session_id: 'mock-session-123' });

    render(<LandingIntro onStartAssessment={mockOnStart} />);

    // FIX: Check the consent box to enable the button
    const checkbox = screen.getByRole('checkbox', { name: /I agree to share my image/i });
    await userEvent.click(checkbox);

    const button = screen.getByRole('button', { name: /begin assessment/i });
    await userEvent.click(button);

    expect(button).toBeDisabled(); // Button should disable while loading

    await waitFor(() => {
      expect(createSession).toHaveBeenCalledTimes(1);
      expect(mockSetSessionId).toHaveBeenCalledWith('mock-session-123');
      expect(mockOnStart).toHaveBeenCalledTimes(1);
    });
  });

  test('3. handles multiple rapid clicks by invoking API only once', async () => {
    const mockOnStart = jest.fn();
    createSession.mockResolvedValueOnce({ session_id: 'mock-session-123' });

    render(<LandingIntro onStartAssessment={mockOnStart} />);

    // FIX: Check the consent box to enable the button
    const checkbox = screen.getByRole('checkbox', { name: /I agree to share my image/i });
    await userEvent.click(checkbox);

    const button = screen.getByRole('button', { name: /begin assessment/i });
    await userEvent.tripleClick(button);

    await waitFor(() => {
      expect(createSession).toHaveBeenCalledTimes(1);
      expect(mockOnStart).toHaveBeenCalledTimes(1);
    });
  });

  test('4. handles API errors gracefully and re-enables button', async () => {
    const mockOnStart = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    createSession.mockRejectedValueOnce(new Error('Network Error'));

    render(<LandingIntro onStartAssessment={mockOnStart} />);

    // FIX: Check the consent box to enable the button
    const checkbox = screen.getByRole('checkbox', { name: /I agree to share my image/i });
    await userEvent.click(checkbox);

    const button = screen.getByRole('button', { name: /begin assessment/i });
    await userEvent.click(button);

    await waitFor(() => {
      expect(createSession).toHaveBeenCalledTimes(1);
      expect(mockOnStart).not.toHaveBeenCalled();
      expect(button).not.toBeDisabled(); // Should re-enable so user can try again
    });

    console.error.mockRestore();
  });

  test('5. gracefully handles missing session_id in API response', async () => {
    createSession.mockResolvedValueOnce({}); // Response missing the session_id
    render(<LandingIntro onStartAssessment={jest.fn()} />);
    
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /begin assessment/i }));
    
    await waitFor(() => {
      expect(createSession).toHaveBeenCalledTimes(1);
    });
  });

  test('6. safely fires if onStartAssessment prop is completely omitted', async () => {
    createSession.mockResolvedValueOnce({ session_id: '123' });
    render(<LandingIntro />); // No props passed
    
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /begin assessment/i }));
    
    await waitFor(() => {
      expect(createSession).toHaveBeenCalledTimes(1);
    });
  });
});