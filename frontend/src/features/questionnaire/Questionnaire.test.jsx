import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Questionnaire from './Questionnaire';

describe('Questionnaire Component', () => {

  // ---------------------------------------------------------------------------
  // TEST CASE 1: Initial Render & Next Button Validation (Validation Lock)
  // Ensures user cannot proceed without making a selection on Question 1.
  // ---------------------------------------------------------------------------
  test('1. disables "Next" button initially until an option is selected', () => {
    render(<Questionnaire onComplete={jest.fn()} />);

    // Check Question 1 title renders
    expect(screen.getByText(/How would you characterise your skin\?/i)).toBeInTheDocument();

    // Next button should be disabled by default (no selection)
    const nextBtn = screen.getByRole('button', { name: /Next/i });
    expect(nextBtn).toBeDisabled();

    // Previous button should not be mounted on Question 1
    expect(screen.queryByRole('button', { name: /Previous/i })).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // TEST CASE 2: Single Selection & Forward/Backward Navigation (State Persistence)
  // Ensures answer state is preserved across question transitions.
  // ---------------------------------------------------------------------------
  test('2. saves state and enables navigation for single selection', async () => {
    render(<Questionnaire onComplete={jest.fn()} />);

    // Select 'Oily' on Question 1
    const oilyBtn = screen.getByRole('button', { name: 'Oily' });
    await userEvent.click(oilyBtn);

    // Next button should now be enabled
    const nextBtn = screen.getByRole('button', { name: /Next/i });
    expect(nextBtn).toBeEnabled();
    await userEvent.click(nextBtn);

    // Verify transition to Question 2
    expect(screen.getByText(/Which skin concerns are you currently experiencing\?/i)).toBeInTheDocument();

    // Navigate back to Question 1
    const prevBtn = screen.getByRole('button', { name: /Previous/i });
    await userEvent.click(prevBtn);

    // Verify Question 1 is restored with 'Oily' still selected (active class)
    expect(screen.getByText(/How would you characterise your skin\?/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Oily' })).toHaveClass('border-blue-600');
  });

  // ---------------------------------------------------------------------------
  // TEST CASE 3: Multi-Selection & Exclusive Option ("None") Clash Logic
  // Ensures mutually exclusive options clear existing selected values.
  // ---------------------------------------------------------------------------
  test('3. clears other multi-select options when an exclusive option (e.g., "None of the above") is selected', async () => {
    render(<Questionnaire onComplete={jest.fn()} />);

    // Navigate to Question 2 (Multi-select)
    await userEvent.click(screen.getByRole('button', { name: 'Oily' }));
    await userEvent.click(screen.getByRole('button', { name: /Next/i }));

    // Select regular options in Question 2
    const acneBtn = screen.getByRole('button', { name: 'Acne or breakouts' });
    const rednessBtn = screen.getByRole('button', { name: 'Redness or irritation' });
    await userEvent.click(acneBtn);
    await userEvent.click(rednessBtn);

    expect(acneBtn).toHaveClass('border-blue-600');
    expect(rednessBtn).toHaveClass('border-blue-600');

    // Click exclusive option 'None of the above'
    const noneBtn = screen.getByRole('button', { name: 'None of the above' });
    await userEvent.click(noneBtn);

    // Verify previously selected options are deselected and only exclusive option remains active
    expect(acneBtn).not.toHaveClass('border-blue-600');
    expect(rednessBtn).not.toHaveClass('border-blue-600');
    expect(noneBtn).toHaveClass('border-blue-600');
  });

  // ---------------------------------------------------------------------------
  // TEST CASE 4: Conditional Text Input (Dynamic UI for "If Yes")
  // Ensures textarea appears only on "Yes" and updates with user typed input.
  // ---------------------------------------------------------------------------
  test('4. displays textarea conditionally when "Yes" is selected for allergies', async () => {
    render(<Questionnaire onComplete={jest.fn()} />);

    // Fast-forward to Question 7 (allergies question at index 6)
    for (let i = 0; i < 6; i++) {
      const options = screen.getAllByRole('button');
      await userEvent.click(options[0]);
      await userEvent.click(screen.getByRole('button', { name: /Next/i }));
    }

    // Verify Question 7 is mounted
    expect(screen.getByText(/Do you have any allergies or ingredient sensitivities/i)).toBeInTheDocument();

    // Textarea should not exist before selection
    expect(screen.queryByPlaceholderText(/Please provide details/i)).not.toBeInTheDocument();

    // Select "Yes"
    await userEvent.click(screen.getByRole('button', { name: 'Yes' }));

    // Textarea must mount and accept user typing
    const textArea = screen.getByPlaceholderText(/Please provide details/i);
    expect(textArea).toBeInTheDocument();
    await userEvent.type(textArea, 'I am allergic to peanuts');
    expect(textArea).toHaveValue('I am allergic to peanuts');
  });

  // ---------------------------------------------------------------------------
  // TEST CASE 5: Full Submission, Anti-Spam Guard & JSON Payload Verification
  // Tests full flow to Question 20, submit loading state, and JSON data integrity.
  // ---------------------------------------------------------------------------
  test('5. converts to submit button on final question, shows loader, and sends complete JSON payload', async () => {
    // Mock parent onComplete with a 200ms resolved promise to simulate network latency
    const mockOnComplete = jest.fn(() => new Promise((resolve) => setTimeout(resolve, 200)));
    render(<Questionnaire onComplete={mockOnComplete} />);

    // Fast-forward through Question 1 to Question 19
    for (let i = 0; i < 19; i++) {
      const options = screen.getAllByRole('button');
      await userEvent.click(options[0]);
      await userEvent.click(screen.getByRole('button', { name: /Next/i }));
    }

    // Verify Question 20 (Final question) is displayed
    expect(screen.getByText(/What is your primary skincare goal/i)).toBeInTheDocument();

    // Select an answer for Question 20
    const finalOptions = screen.getAllByRole('button');
    await userEvent.click(finalOptions[0]);

    // Button label must now be "Submit"
    const submitBtn = screen.getByRole('button', { name: /Submit/i });
    expect(submitBtn).toBeInTheDocument();

    // Fire submit event
    fireEvent.click(submitBtn);

    // Verify Anti-Spam state: button disables and displays loading indicator
    expect(submitBtn).toBeDisabled();
    expect(screen.getByText(/Submitting.../i)).toBeInTheDocument();

    // Verify completed payload structure (JSON format)
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledTimes(1);

      const payload = mockOnComplete.mock.calls[0][0];

      // Payload must be an Object (valid JSON format)
      expect(typeof payload).toBe('object');
      expect(payload).not.toBeNull();

      // Verify essential JSON payload properties
      expect(payload).toHaveProperty('skin-type');
      expect(payload).toHaveProperty('skin-concerns');
      expect(payload).toHaveProperty('allergyDetails');
    });
  });

  // ---------------------------------------------------------------------------
  // TEST CASE 6: Progress Bar & Question Counter Update (UI Tracking)
  // Ensures the visual progress bar width and counter text update synchronously.
  // ---------------------------------------------------------------------------
  test('6. updates question counter and progress bar width correctly on navigation', async () => {
    const { container } = render(<Questionnaire onComplete={jest.fn()} />);

    // 1. Initial State (Question 1)
    expect(screen.getByText('QUESTION 1 OUT OF 20')).toBeInTheDocument();
    let progressBar = container.querySelector('.bg-blue-600');
    expect(progressBar).toHaveStyle({ width: '5%' }); // (1 / 20) * 100 = 5%

    // Select an option and advance
    await userEvent.click(screen.getByRole('button', { name: 'Oily' }));
    await userEvent.click(screen.getByRole('button', { name: /Next/i }));

    // 2. Next State (Question 2)
    expect(screen.getByText('QUESTION 2 OUT OF 20')).toBeInTheDocument();
    progressBar = container.querySelector('.bg-blue-600');
    expect(progressBar).toHaveStyle({ width: '10%' }); // (2 / 20) * 100 = 10%

    // Return to Question 1
    await userEvent.click(screen.getByRole('button', { name: /Previous/i }));

    // 3. Restored State (Question 1)
    expect(screen.getByText('QUESTION 1 OUT OF 20')).toBeInTheDocument();
    progressBar = container.querySelector('.bg-blue-600');
    expect(progressBar).toHaveStyle({ width: '5%' });
  });

});