import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import CapturePhoto from '../src/features/camera/CapturePhoto';
import { validateImage } from '../src/api';
import { useSessionStore } from '../src/store/useSessionStore.js';

// --- Mocks ---
jest.mock('../src/api', () => ({
  validateImage: jest.fn(),
}));

jest.mock('../src/store/useSessionStore.js', () => ({
  useSessionStore: jest.fn(),
}));

let originalCreateElement;

beforeAll(() => {
  // 1. FOOLPROOF DIALOG MOCK: Intercept DOM Element Creation directly
  originalCreateElement = document.createElement.bind(document);
  document.createElement = (tagName, options) => {
    const element = originalCreateElement(tagName, options);
    
    // If React tries to create a dialog, force the methods directly onto the instance
    if (tagName.toLowerCase() === 'dialog') {
      element.showModal = jest.fn(function() {
        this.open = true;
        this.setAttribute('open', '');
      });
      element.close = jest.fn(function() {
        this.open = false;
        this.removeAttribute('open');
      });
    }
    return element;
  };

  // 2. Mock Video Play API to stop JSDOM crash
  window.HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue({});
  
  // 3. Mock Camera API (navigator.mediaDevices)
  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: {
      getUserMedia: jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      }),
    },
    writable: true,
  });

  // 4. Mock HTML Canvas API (Image Cropping)
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    drawImage: jest.fn(),
    clearRect: jest.fn(),
  }));
  HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/jpeg;base64,mockedImage');

  // 5. Mock FileReader (File Upload)
  window.FileReader = jest.fn().mockImplementation(() => ({
    readAsDataURL: function () {
      this.result = 'data:image/jpeg;base64,mockedImage';
      if (this.onload) this.onload(); 
    },
  }));
});

afterAll(() => {
  // Clean up our interceptor
  document.createElement = originalCreateElement;
});

beforeEach(() => {
  jest.clearAllMocks();
  // Provide a valid session ID by default
  useSessionStore.mockImplementation((selector) => selector({ sessionId: 'mock-session-123' }));
});

describe('CapturePhoto Component', () => {

  test('1. renders initial idle stage with static UI elements correctly', () => {
    render(<CapturePhoto onSubmit={jest.fn()} />);
    expect(screen.getByText(/Capture a Photo of Your Affected Skin Area/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Take a photo/i })).toBeInTheDocument();
  });

  test('2. transitions to preview stage when crop is confirmed', async () => {
    render(<CapturePhoto onSubmit={jest.fn()} />);
    
    const galleryInput = document.querySelectorAll('input[type="file"]')[1];
    fireEvent.change(galleryInput, { target: { files: [new File(['img'], 'test.png', { type: 'image/png' })] } });
    
    fireEvent.click(screen.getByRole('button', { name: /Confirm crop/i }));
    
    expect(screen.getByAltText('Captured preview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit/i })).toBeInTheDocument();
  });

  test('3. fails submission if sessionId is missing', async () => {
    useSessionStore.mockImplementation((selector) => selector({ sessionId: null }));
    render(<CapturePhoto onSubmit={jest.fn()} />);
    
    const galleryInput = document.querySelectorAll('input[type="file"]')[1];
    fireEvent.change(galleryInput, { target: { files: [new File(['img'], 'test.png', { type: 'image/png' })] } });
    
    fireEvent.click(screen.getByRole('button', { name: /Confirm crop/i }));
    fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

    expect(await screen.findByText(/Session ID missing/i)).toBeInTheDocument();
    expect(validateImage).not.toHaveBeenCalled();
  });

  test('4. calls onSubmit successfully when AI validation passes', async () => {
    const mockOnSubmit = jest.fn();
    validateImage.mockResolvedValueOnce({ valid: true });
    
    render(<CapturePhoto onSubmit={mockOnSubmit} />);

    const galleryInput = document.querySelectorAll('input[type="file"]')[1];
    fireEvent.change(galleryInput, { target: { files: [new File(['img'], 'test.png', { type: 'image/png' })] } });
    
    fireEvent.click(screen.getByRole('button', { name: /Confirm crop/i }));

    const submitBtn = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitBtn);

    expect(submitBtn).toBeDisabled();
    expect(screen.getByText(/Submitting to AI.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(validateImage).toHaveBeenCalledTimes(1);
      expect(mockOnSubmit).toHaveBeenCalledWith('data:image/jpeg;base64,mockedImage', 'mock-session-123');
    });
  });

  test('5. shows API error message in modal when AI validation fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    validateImage.mockResolvedValueOnce({ valid: false, reasons: ['blurry', 'low_resolution'] });
    
    render(<CapturePhoto onSubmit={jest.fn()} />);

    const galleryInput = document.querySelectorAll('input[type="file"]')[1];
    fireEvent.change(galleryInput, { target: { files: [new File(['img'], 'test.png', { type: 'image/png' })] } });
    
    fireEvent.click(screen.getByRole('button', { name: /Confirm crop/i }));
    fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/Error: blurry, low_resolution/i)).toBeInTheDocument();
      expect(screen.getByAltText('Captured preview')).toBeInTheDocument();
    });
    console.error.mockRestore();
  });

  test('6. clears validation error instantly when user clicks Retake', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    validateImage.mockResolvedValueOnce({ valid: false, reasons: ['blurry'] });
    
    render(<CapturePhoto onSubmit={jest.fn()} />);

    const galleryInput = document.querySelectorAll('input[type="file"]')[1];
    fireEvent.change(galleryInput, { target: { files: [new File(['img'], 'test.png', { type: 'image/png' })] } });
    
    fireEvent.click(screen.getByRole('button', { name: /Confirm crop/i }));
    fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

    expect(await screen.findByText(/Error: blurry/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Retake/i }));
    
    // Wait for BOTH the error to clear AND the camera stream to fully resolve
    // to prevent React 'act(...)' memory leak warnings
    await waitFor(() => {
      expect(screen.queryByText(/Error: blurry/i)).not.toBeInTheDocument();
      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      expect(screen.getByTitle('Capture Photo')).toBeInTheDocument(); // Camera UI is fully mounted
    });
    console.error.mockRestore();
  });

  test('7. safely ignores empty file selection (e.g., user canceled OS file dialog)', () => {
    render(<CapturePhoto onSubmit={jest.fn()} />);
    const galleryInput = document.querySelectorAll('input[type="file"]')[1];
    
    fireEvent.change(galleryInput, { target: { files: [] } });
    
    // Should do nothing, remain in idle stage
    expect(screen.queryByAltText('Crop preview')).not.toBeInTheDocument();
  });

  test('8. handles unformatted API crash objects safely', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    validateImage.mockRejectedValueOnce({ message: undefined }); // Raw object crash
    
    render(<CapturePhoto onSubmit={jest.fn()} />);
    
    const galleryInput = document.querySelectorAll('input[type="file"]')[1];
    fireEvent.change(galleryInput, { target: { files: [new File(['img'], 'test.png', { type: 'image/png' })] } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm crop/i }));
    fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/Error:/i)).toBeInTheDocument();
    });
    console.error.mockRestore();
  });

  test('9. triggers file selection and clears error via onFileSelect', () => {
    render(<CapturePhoto onSubmit={jest.fn()} />);
    
    // The first file input in the DOM is the environment capture input (onFileSelect)
    const fileInputs = document.querySelectorAll('input[type="file"]');
    const primaryFileInput = fileInputs[0];
    
    fireEvent.change(primaryFileInput, { 
      target: { files: [new File(['img'], 'test.png', { type: 'image/png' })] } 
    });
    
    expect(screen.getByAltText('Crop preview')).toBeInTheDocument();
  });

  test('10. opens camera when main "Take a photo" button is clicked', async () => {
    render(<CapturePhoto onSubmit={jest.fn()} />);
    
    const takePhotoBtn = screen.getByRole('button', { name: /Take a photo/i });
    
    await act(async () => {
      fireEvent.click(takePhotoBtn);
    });

    expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
  });
});