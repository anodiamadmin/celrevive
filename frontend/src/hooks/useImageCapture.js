import { useState, useRef, useEffect, useCallback } from 'react';

const DEFAULT_CROP_BOX = { x: 0, y: 0, w: 100, h: 100 };
const MIN_CROP_SIZE_PERCENT = 15;

export function useImageCapture() {
  const [stage, setStage] = useState('idle');
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [isOpeningCamera, setIsOpeningCamera] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [isFlipping, setIsFlipping] = useState(false);
  const [cropBox, setCropBox] = useState(DEFAULT_CROP_BOX);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const cropContainerRef = useRef(null);
  const cropImageRef = useRef(null);
  const dragStateRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  useEffect(() => {
    if (stage === 'crop') setCropBox(DEFAULT_CROP_BOX);
  }, [stage]);

  useEffect(() => {
    if (stage === 'camera' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [stage]);

  const openCamera = async (targetFacingMode = facingMode) => {
    setCameraError('');
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: targetFacingMode },
        audio: false,
      });
      streamRef.current = stream;
      setStage('camera');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      setCameraError('Camera access denied. Please select a photo from your gallery.');
      fileInputRef.current?.click();
    }
  };

  const flipCamera = async () => {
    if (isFlipping) return;
    setIsFlipping(true);
    const nextFacingMode = facingMode === 'environment' ? 'user' : 'environment';
    stopCamera();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacingMode },
        audio: false,
      });
      streamRef.current = stream;
      setFacingMode(nextFacingMode);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.error('Camera flip error:', err);
    } finally {
      setIsFlipping(false);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    setCapturedImage(canvas.toDataURL('image/jpeg', 0.92));
    stopCamera();
    setStage('crop');
  };

  const closeCamera = () => {
    stopCamera();
    setStage('idle');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result);
      setStage('crop');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const openGallery = () => {
    stopCamera();
    galleryInputRef.current?.click();
  };

  const handleGallerySelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result);
      setStage('crop');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const cancelCrop = () => {
    setCapturedImage(null);
    stopCamera();
    setStage('idle');
  };

  const retake = async () => {
    if (isOpeningCamera) return;
    setIsOpeningCamera(true);
    try {
      setCapturedImage(null);
      await openCamera(facingMode);
    } finally {
      setIsOpeningCamera(false);
    }
  };

  const handleCropPointerMove = (e) => {
    const state = dragStateRef.current;
    if (!state) return;

    const dxPercent = ((e.clientX - state.startX) / state.rectWidth) * 100;
    const dyPercent = ((e.clientY - state.startY) / state.rectHeight) * 100;

    if (state.mode === 'move') {
      let newX = Math.min(Math.max(state.startBox.x + dxPercent, 0), 100 - state.startBox.w);
      let newY = Math.min(Math.max(state.startBox.y + dyPercent, 0), 100 - state.startBox.h);
      setCropBox((prev) => ({ ...prev, x: newX, y: newY }));
    } else if (state.mode === 'resize') {
      let { x, y, w, h } = state.startBox;

      if (state.dir.includes('e')) w = Math.min(Math.max(w + dxPercent, MIN_CROP_SIZE_PERCENT), 100 - x);
      if (state.dir.includes('s')) h = Math.min(Math.max(h + dyPercent, MIN_CROP_SIZE_PERCENT), 100 - y);
      if (state.dir.includes('w')) {
        const newX = Math.min(Math.max(x + dxPercent, 0), x + w - MIN_CROP_SIZE_PERCENT);
        w = w + (x - newX);
        x = newX;
      }
      if (state.dir.includes('n')) {
        const newY = Math.min(Math.max(y + dyPercent, 0), y + h - MIN_CROP_SIZE_PERCENT);
        h = h + (y - newY);
        y = newY;
      }
      setCropBox({ x, y, w, h });
    }
  };

  const handleCropPointerUp = () => {
    dragStateRef.current = null;
    window.removeEventListener('pointermove', handleCropPointerMove);
    window.removeEventListener('pointerup', handleCropPointerUp);
  };

  const handleCropDragStart = (e) => {
    e.stopPropagation();
    const container = cropContainerRef.current;
    if (!container) return;
    dragStateRef.current = {
      mode: 'move',
      startX: e.clientX,
      startY: e.clientY,
      startBox: { ...cropBox },
      rectWidth: container.getBoundingClientRect().width,
      rectHeight: container.getBoundingClientRect().height,
    };
    window.addEventListener('pointermove', handleCropPointerMove);
    window.addEventListener('pointerup', handleCropPointerUp);
  };

  const handleCropResizeStart = (e, dir) => {
    e.stopPropagation();
    const container = cropContainerRef.current;
    if (!container) return;
    dragStateRef.current = {
      mode: 'resize', dir,
      startX: e.clientX, startY: e.clientY,
      startBox: { ...cropBox },
      rectWidth: container.getBoundingClientRect().width,
      rectHeight: container.getBoundingClientRect().height,
    };
    window.addEventListener('pointermove', handleCropPointerMove);
    window.addEventListener('pointerup', handleCropPointerUp);
  };

  const confirmCrop = () => {
    if (cropBox.x === 0 && cropBox.y === 0 && cropBox.w === 100 && cropBox.h === 100) {
      setStage('preview');
      return; 
    }

    const container = cropContainerRef.current;
    const imgEl = cropImageRef.current;
    const canvas = canvasRef.current;
    if (!container || !imgEl || !canvas) return;

    const scale = Math.min(container.clientWidth / imgEl.naturalWidth, container.clientHeight / imgEl.naturalHeight);
    const offsetX = (container.clientWidth - (imgEl.naturalWidth * scale)) / 2;
    const offsetY = (container.clientHeight - (imgEl.naturalHeight * scale)) / 2;

    const naturalCropW = ((cropBox.w / 100) * container.clientWidth) / scale;
    const naturalCropH = ((cropBox.h / 100) * container.clientHeight) / scale;
    const naturalCropX = (((cropBox.x / 100) * container.clientWidth) - offsetX) / scale;
    const naturalCropY = (((cropBox.y / 100) * container.clientHeight) - offsetY) / scale;

    canvas.width = naturalCropW;
    canvas.height = naturalCropH;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgEl, naturalCropX, naturalCropY, naturalCropW, naturalCropH, 0, 0, naturalCropW, naturalCropH);

    setCapturedImage(canvas.toDataURL('image/jpeg', 0.92));
    setStage('preview');
  };

  return {
    stage, setStage, capturedImage, setCapturedImage,
    cameraError, isOpeningCamera, facingMode, isFlipping, cropBox,
    videoRef, canvasRef, streamRef, fileInputRef, galleryInputRef, cropContainerRef, cropImageRef,
    openCamera, closeCamera, flipCamera, capturePhoto, handleFileSelect, openGallery, handleGallerySelect,
    cancelCrop, retake, confirmCrop, handleCropDragStart, handleCropResizeStart
  };
}