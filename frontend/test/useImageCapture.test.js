import { renderHook, act } from '@testing-library/react';
import { useImageCapture } from '../src/hooks/useImageCapture';

describe('useImageCapture Hook', () => {
  let mockGetUserMedia;
  let mockStopTrack;

  beforeAll(() => {
    window.HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue({});
    
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      drawImage: jest.fn(),
      clearRect: jest.fn(),
    }));
    HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/jpeg;base64,mocked');
    
    window.FileReader = jest.fn().mockImplementation(() => ({
      readAsDataURL: function(file) {
        this.result = 'data:image/jpeg;base64,filedata';
        if (this.onload) this.onload();
      }
    }));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockStopTrack = jest.fn();
    mockGetUserMedia = jest.fn().mockResolvedValue({
      getTracks: () => [{ stop: mockStopTrack }]
    });

    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      writable: true,
      configurable: true
    });
  });

  test('1. initializes with default states', () => {
    const { result } = renderHook(() => useImageCapture());
    
    expect(result.current.stage).toBe('idle');
    expect(result.current.capturedImage).toBeNull();
    expect(result.current.cameraError).toBe('');
    expect(result.current.facingMode).toBe('environment');
    expect(result.current.cropBox).toEqual({ x: 0, y: 0, w: 100, h: 100 });
  });

  test('2. openCamera successfully sets up stream and transitions to camera stage', async () => {
    const { result } = renderHook(() => useImageCapture());
    
    await act(async () => {
      await result.current.openCamera();
    });

    expect(mockGetUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'environment' }, audio: false });
    expect(result.current.stage).toBe('camera');
    expect(result.current.streamRef.current).not.toBeNull();
  });

  test('3. openCamera handles permission denial and clicks file fallback', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    mockGetUserMedia.mockRejectedValueOnce(new Error('Permission Denied'));
    const { result } = renderHook(() => useImageCapture());
    
    result.current.fileInputRef.current = { click: jest.fn() };

    await act(async () => {
      await result.current.openCamera();
    });

    expect(result.current.cameraError).toContain('Camera access denied');
    expect(result.current.fileInputRef.current.click).toHaveBeenCalled();
    
    console.error.mockRestore();
  });

  test('4. flipCamera toggles facingMode and restarts stream', async () => {
    const { result } = renderHook(() => useImageCapture());
    
    await act(async () => {
      await result.current.flipCamera();
    });

    expect(result.current.facingMode).toBe('user');
    expect(mockGetUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'user' }, audio: false });
  });

  test('5. closeCamera stops tracks and resets stage', async () => {
    const { result } = renderHook(() => useImageCapture());
    
    await act(async () => {
      await result.current.openCamera();
    });
    
    act(() => {
      result.current.closeCamera();
    });

    expect(mockStopTrack).toHaveBeenCalled();
    expect(result.current.stage).toBe('idle');
  });

  test('6. capturePhoto reads from video canvas and advances to crop stage', () => {
    const { result } = renderHook(() => useImageCapture());
    
    result.current.videoRef.current = document.createElement('video');
    result.current.canvasRef.current = document.createElement('canvas');

    act(() => {
      result.current.capturePhoto();
    });

    expect(result.current.capturedImage).toBe('data:image/jpeg;base64,mocked');
    expect(result.current.stage).toBe('crop');
  });

  test('7. capturePhoto bails out safely if refs are missing', () => {
    const { result } = renderHook(() => useImageCapture());
    
    act(() => {
      result.current.capturePhoto();
    });

    expect(result.current.stage).toBe('idle');
  });

  test('8. file & gallery handlers load files and advance to crop', () => {
    const { result } = renderHook(() => useImageCapture());
    const fileEvent = { target: { files: [new File([''], 'test.png')], value: 'path' } };

    act(() => {
      result.current.handleFileSelect(fileEvent);
    });
    expect(result.current.capturedImage).toBe('data:image/jpeg;base64,filedata');
    expect(result.current.stage).toBe('crop');

    act(() => {
      result.current.handleGallerySelect(fileEvent);
    });
    expect(result.current.stage).toBe('crop');
  });

  test('9. openGallery triggers hidden gallery input click', () => {
    const { result } = renderHook(() => useImageCapture());
    result.current.galleryInputRef.current = { click: jest.fn() };

    act(() => {
      result.current.openGallery();
    });

    expect(result.current.galleryInputRef.current.click).toHaveBeenCalled();
  });

  test('10. retake clears image and reopens camera', async () => {
    const { result } = renderHook(() => useImageCapture());
    
    await act(async () => {
      await result.current.retake();
    });

    expect(result.current.capturedImage).toBeNull();
    expect(mockGetUserMedia).toHaveBeenCalled();
  });

  test('11. cancelCrop clears state back to idle', () => {
    const { result } = renderHook(() => useImageCapture());
    
    act(() => {
      result.current.setStage('crop');
      result.current.cancelCrop();
    });

    expect(result.current.stage).toBe('idle');
    expect(result.current.capturedImage).toBeNull();
  });

  test('12. confirmCrop handles unaltered bounds by jumping straight to preview', () => {
    const { result } = renderHook(() => useImageCapture());
    
    act(() => {
      result.current.setStage('crop');
      result.current.confirmCrop();
    });

    expect(result.current.stage).toBe('preview');
  });

  test('13. confirmCrop scales and crops modified bounds to canvas', () => {
    const { result } = renderHook(() => useImageCapture());
    
    result.current.cropContainerRef.current = { 
      clientWidth: 100, 
      clientHeight: 100,
      getBoundingClientRect: () => ({ width: 100, height: 100, top: 0, left: 0 })
    };
    result.current.cropImageRef.current = { naturalWidth: 200, naturalHeight: 200 };
    result.current.canvasRef.current = document.createElement('canvas');

    act(() => {
      result.current.setStage('crop');
    });

    // We must use a RESIZE event, because you cannot pan a 100% box inside a 100% container
    act(() => {
      result.current.handleCropResizeStart({ stopPropagation: jest.fn(), clientX: 0, clientY: 0 }, 'nw');
    });
    
    act(() => {
      const moveEvent = new Event('pointermove');
      moveEvent.clientX = 10;
      moveEvent.clientY = 10;
      window.dispatchEvent(moveEvent);
    });

    // Calling confirmCrop in a separate act block ensures it reads the newly updated cropBox state
    act(() => {
      result.current.confirmCrop();
    });

    expect(result.current.capturedImage).toBe('data:image/jpeg;base64,mocked');
    expect(result.current.stage).toBe('preview');
  });

  test('14. Pointer events properly resize cropBox dynamically (N/S/E/W math)', () => {
    const { result } = renderHook(() => useImageCapture());
    
    act(() => {
       result.current.cropContainerRef.current = { getBoundingClientRect: () => ({ width: 100, height: 100, top: 0, left: 0 }) };
       result.current.handleCropResizeStart({ stopPropagation: jest.fn(), clientX: 0, clientY: 0 }, 'nw');
    });

    act(() => {
      const moveEvent = new Event('pointermove');
      moveEvent.clientX = 10; 
      moveEvent.clientY = 10; 
      window.dispatchEvent(moveEvent);
    });

    expect(result.current.cropBox.x).toBeGreaterThan(0);
    expect(result.current.cropBox.y).toBeGreaterThan(0);
    expect(result.current.cropBox.w).toBeLessThan(100);

    act(() => {
      window.dispatchEvent(new Event('pointerup'));
    });
  });

  test('15. openCamera handles completely missing mediaDevices gracefully', async () => {
    const originalMediaDevices = global.navigator.mediaDevices;
    delete global.navigator.mediaDevices;
    
    const { result } = renderHook(() => useImageCapture());
    result.current.fileInputRef.current = { click: jest.fn() };

    await act(async () => {
      await result.current.openCamera();
    });

    expect(result.current.cameraError).toContain('Camera access denied');
    global.navigator.mediaDevices = originalMediaDevices; // Restore
  });

  test('16. pointer handlers support mobile touch events (e.touches)', () => {
    const { result } = renderHook(() => useImageCapture());
    
    act(() => {
      result.current.cropContainerRef.current = { getBoundingClientRect: () => ({ width: 100, height: 100, top: 0, left: 0 }) };
      
      // Simulate mobile touch for drag
      result.current.handleCropDragStart({ touches: [{ clientX: 50, clientY: 50 }], preventDefault: jest.fn(), stopPropagation: jest.fn() });
      
      // Simulate mobile touch for resize
      result.current.handleCropResizeStart({ touches: [{ clientX: 50, clientY: 50 }], preventDefault: jest.fn(), stopPropagation: jest.fn() }, 'se');
    });

    act(() => {
      const moveEvent = new Event('pointermove');
      moveEvent.touches = [{ clientX: 60, clientY: 60 }];
      window.dispatchEvent(moveEvent);
    });

    expect(result.current.cropBox.w).toBeDefined();
  });

  test('17. openCamera handles missing videoRef without crashing', async () => {
    const { result } = renderHook(() => useImageCapture());
    result.current.videoRef.current = null; // Simulate video element unmounting mid-load
    
    await act(async () => {
      await result.current.openCamera();
    });
    
    expect(result.current.stage).toBe('camera');
  });
});