import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CapturePhoto from './CapturePhoto';

// =====================================================================
// GLOBAL MOCKS: Faking Browser APIs because Jest runs in a Terminal
// =====================================================================
beforeAll(() => {
  // 0. Mock Video Play API to stop JSDOM crash
  window.HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue({});

  // 1. Mock Camera API (navigator.mediaDevices)
  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: {
      getUserMedia: jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      }),
    },
    writable: true,
  });

  // 2. Mock HTML Canvas API (Image Cropping)
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    drawImage: jest.fn(),
    clearRect: jest.fn(),
  }));
  HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/jpeg;base64,mockedImage');

  // 3. Mock FileReader (File Upload)
  window.FileReader = jest.fn().mockImplementation(() => ({
    readAsDataURL: function () {
      this.result = 'data:image/jpeg;base64,mockedImage';
      if (this.onload) this.onload(); // Instantly trigger onload
    },
  }));
});

beforeEach(() => {
  jest.clearAllMocks();
  // 🚀 [FUTURE BACKEND UPDATE]: 
  // Jab tum fetch API use karoge, toh purane fake fetch calls ko clear karne ke liye yahan ye line add karna:
  // global.fetch = jest.fn(); 
});

describe('CapturePhoto Component', () => {

  test('1. renders initial idle stage with static UI elements correctly', () => {
    render(<CapturePhoto onSubmit={jest.fn()} />);
    expect(screen.getByText(/Capture a Photo of Your Affected Skin Area/i)).toBeInTheDocument();
    expect(screen.getByText(/Private & secure/i)).toBeInTheDocument();
    expect(screen.getByText(/Backed by Dermatologists/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Take a photo/i })).toBeInTheDocument();
  });

  test('2. transitions to crop modal when a file is uploaded', async () => {
    render(<CapturePhoto onSubmit={jest.fn()} />);
    const fileInputs = document.querySelectorAll('input[type="file"]');
    const galleryInput = fileInputs[1];
    const file = new File(['fake-image'], 'test.png', { type: 'image/png' });
    await userEvent.upload(galleryInput, file);
    expect(screen.getByAltText('Crop preview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirm crop/i })).toBeInTheDocument();
  });

  test('3. returns to idle stage when cancel is clicked in crop modal', async () => {
    render(<CapturePhoto onSubmit={jest.fn()} />);
    const galleryInput = document.querySelectorAll('input[type="file"]')[1];
    await userEvent.upload(galleryInput, new File(['img'], 'test.png', { type: 'image/png' }));
    
    const cancelBtn = screen.getByRole('button', { name: /Back to take photo page/i });
    await userEvent.click(cancelBtn);
    
    expect(screen.getByRole('button', { name: /Take a photo/i })).toBeInTheDocument();
    expect(screen.queryByAltText('Crop preview')).not.toBeInTheDocument();
  });

  test('4. transitions to preview stage when crop is confirmed', async () => {
    render(<CapturePhoto onSubmit={jest.fn()} />);
    const galleryInput = document.querySelectorAll('input[type="file"]')[1];
    await userEvent.upload(galleryInput, new File(['img'], 'test.png', { type: 'image/png' }));
    
    const confirmBtn = screen.getByRole('button', { name: /Confirm crop/i });
    await userEvent.click(confirmBtn);
    
    expect(screen.getByAltText('Captured skin area preview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retake/i })).toBeInTheDocument();
  });

  test('5. disables Submit button and shows "Checking..." on rapid clicks (Spam Guard)', async () => {
    render(<CapturePhoto onSubmit={jest.fn()} />);
    const galleryInput = document.querySelectorAll('input[type="file"]')[1];
    await userEvent.upload(galleryInput, new File(['img'], 'test.png', { type: 'image/png' }));
    await userEvent.click(screen.getByRole('button', { name: /Confirm crop/i }));

    const submitBtn = screen.getByRole('button', { name: /Submit/i });

    // 🚀 [FUTURE BACKEND UPDATE]:
    // Jab backend API lag jayegi, toh API me 1-2 second ka time lagega. 
    // Tab tum 'fireEvent.click' ko wapas 'await userEvent.click(submitBtn)' kar sakte ho.
    fireEvent.click(submitBtn);

    expect(submitBtn).toBeDisabled();
    expect(screen.getByText(/Checking.../i)).toBeInTheDocument();
  });

  test('6. calls onSubmit successfully when validation passes', async () => {
    const mockOnSubmit = jest.fn();
    render(<CapturePhoto onSubmit={mockOnSubmit} />);

    // 🚀 [FUTURE BACKEND UPDATE]:
    // Backend banne ke baad, API ko "Success (true)" mock karne ke liye ye 3 lines uncomment karna:
    /*
    global.fetch = jest.fn(() => Promise.resolve({
      json: () => Promise.resolve({ isValid: true }) 
    }));
    */

    const galleryInput = document.querySelectorAll('input[type="file"]')[1];
    await userEvent.upload(galleryInput, new File(['img'], 'test.png', { type: 'image/png' }));
    await userEvent.click(screen.getByRole('button', { name: /Confirm crop/i }));

    const submitBtn = screen.getByRole('button', { name: /Submit/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      expect(mockOnSubmit).toHaveBeenCalledWith('data:image/jpeg;base64,mockedImage');
    });
  });

  // 🚀 [FUTURE BACKEND UPDATE]:
  // Abhi is test case ke aage '.skip' laga hai kyuki code me 'isValid = true' hardcoded hai.
  // Jab API lag jayegi, toh '.skip' word hata dena, aur ise normal 'test(...)' bana dena!
  test.skip('7. shows error message and resets to idle when validation fails', async () => {
    const mockOnSubmit = jest.fn();
    render(<CapturePhoto onSubmit={mockOnSubmit} />);

    // 🚀 [FUTURE BACKEND UPDATE]:
    // API ko "Failed (false)" mock karne ke liye ye code use karna:
    /*
    global.fetch = jest.fn(() => Promise.resolve({
      json: () => Promise.resolve({ isValid: false }) 
    }));
    */

    const galleryInput = document.querySelectorAll('input[type="file"]')[1];
    await userEvent.upload(galleryInput, new File(['img'], 'test.png', { type: 'image/png' }));
    await userEvent.click(screen.getByRole('button', { name: /Confirm crop/i }));

    const submitBtn = screen.getByRole('button', { name: /Submit/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      // 1. Submit function trigger nahi hona chahiye
      expect(mockOnSubmit).not.toHaveBeenCalled();
      // 2. Error message screen par aana chahiye
      expect(screen.getByText(/Your image is not valid/i)).toBeInTheDocument();
      // 3. User wapas Idle stage par aana chahiye (Take a photo button dikhega)
      expect(screen.getByRole('button', { name: /Take a photo/i })).toBeInTheDocument();
    });
  });

  test('8. prevents multiple camera stream requests on rapid Retake clicks (Spam Guard)', async () => {
    render(<CapturePhoto onSubmit={jest.fn()} />);

    const galleryInput = document.querySelectorAll('input[type="file"]')[1];
    await userEvent.upload(galleryInput, new File(['img'], 'test.png', { type: 'image/png' }));
    await userEvent.click(screen.getByRole('button', { name: /Confirm crop/i }));

    const retakeBtn = screen.getByRole('button', { name: /Retake/i });
    await userEvent.tripleClick(retakeBtn);

    await waitFor(() => {
      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
    });
  });

});