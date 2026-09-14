import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LandingIntro from './LandingIntro';

describe('LandingIntro Component', () => {

  // ---------------------------------------------------------------------------
  // TEST CASE 1: Static UI Rendering Check
  // Verifies that all titles, descriptions, step cards, hero image, and CTA button
  // exist and are properly mounted in the DOM.
  // ---------------------------------------------------------------------------
  test('1. renders all static UI elements properly', () => {
    render(<LandingIntro onStartAssessment={jest.fn()} />);

    // Check heading and subtitle
    expect(screen.getByRole('heading', { level: 1, name: /ai skin analysis/i })).toBeInTheDocument();
    expect(screen.getByText(/check your skin!/i)).toBeInTheDocument();

    // Check Hero Image
    const heroImage = screen.getByAltText('AI Skin Analysis Model');
    expect(heroImage).toBeInTheDocument();

    // Check All 4 Steps Cards
    expect(screen.getByText('STEP 1')).toBeInTheDocument();
    expect(screen.getByText('STEP 2')).toBeInTheDocument();
    expect(screen.getByText('STEP 3')).toBeInTheDocument();
    expect(screen.getByText('FINAL STEP')).toBeInTheDocument();

    // Check Begin Assessment Button
    const button = screen.getByRole('button', { name: /begin assessment/i });
    expect(button).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // TEST CASE 2: Single Click Action Trigger
  // Verifies that clicking the button exactly once invokes the parent callback 1 time.
  // ---------------------------------------------------------------------------
  test('2. calls onStartAssessment when Begin Assessment button is clicked', async () => {
    const mockOnStart = jest.fn();
    render(<LandingIntro onStartAssessment={mockOnStart} />);

    const button = screen.getByRole('button', { name: /begin assessment/i });
    await userEvent.click(button);

    // Ensure parent callback received exactly 1 invocation
    expect(mockOnStart).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // TEST CASE 3 [UPDATED]: Spam Protection & Button Disabling
  // Verifies that rapid multiple clicks disable the button in the DOM
  // and prevent duplicate invocations of the callback (fires only once).
  // ---------------------------------------------------------------------------
  test('3. handles multiple rapid clicks by disabling button and invoking callback only once', async () => {
    const mockOnStart = jest.fn();
    render(<LandingIntro onStartAssessment={mockOnStart} />);

    const button = screen.getByRole('button', { name: /begin assessment/i });

    // Simulate 3 rapid consecutive clicks from the user
    await userEvent.tripleClick(button);

    // Check 1: Button must be physically disabled in the DOM to block further clicks
    expect(button).toBeDisabled();

    // Check 2: Callback must execute only once despite 3 clicks happening in succession
    expect(mockOnStart).toHaveBeenCalledTimes(1);
  });

});