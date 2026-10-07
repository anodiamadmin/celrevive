import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  ShieldKeyhole,
  MonitorSmartphone,
  BriefcaseMedical,
  Bot,
  Info,
  X,
  RotateCcw,
  Check,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react';
import scanDevicePhoto from '../../assets/scan-device.png';
import selfieCapturePhoto from '../../assets/selfie-capture.png';

const TRUST_ITEMS = [
  { icon: ShieldKeyhole, label: 'Private & secure' },
  { icon: MonitorSmartphone, label: 'On-hand tool' },
  { icon: BriefcaseMedical, label: 'Backed by Dermatologists' },
  { icon: Bot, label: 'AI-powered accuracy' },
];

const DEFAULT_CROP_BOX = { x: 0, y: 0, w: 100, h: 100 };
const MIN_CROP_SIZE_PERCENT = 15;

function dataURLtoFile(dataurl, filename) {
  let arr = dataurl.split(','),
      mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[arr.length - 1]), 
      n = bstr.length, 
      u8arr = new Uint8Array(n);
  while(n--){
      u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, {type:mime});
}

export default function CapturePhoto({ onSubmit }) {
  const [stage, setStage] = useState('idle');
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraError, setCameraError] = useState('');

  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState('');

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
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  useEffect(() => {
    if (stage === 'crop') {
      setCropBox(DEFAULT_CROP_BOX);
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

  useEffect(() => {
    if (stage === 'camera' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [stage]);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);
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
    if (isOpeningCamera || isValidating) return;
    
    setIsOpeningCamera(true);
    
    try {
      setCapturedImage(null);
      setValidationError('');
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
      let newX = state.startBox.x + dxPercent;
      let newY = state.startBox.y + dyPercent;
      newX = Math.min(Math.max(newX, 0), 100 - state.startBox.w);
      newY = Math.min(Math.max(newY, 0), 100 - state.startBox.h);
      setCropBox((prev) => ({ ...prev, x: newX, y: newY }));

    } else if (state.mode === 'resize') {
      let { x, y, w, h } = state.startBox;

      if (state.dir.includes('e')) {
        w = Math.min(Math.max(w + dxPercent, MIN_CROP_SIZE_PERCENT), 100 - x);
      }
      if (state.dir.includes('s')) {
        h = Math.min(Math.max(h + dyPercent, MIN_CROP_SIZE_PERCENT), 100 - y);
      }
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
    const rect = container.getBoundingClientRect();
    dragStateRef.current = {
      mode: 'move',
      startX: e.clientX,
      startY: e.clientY,
      startBox: { ...cropBox },
      rectWidth: rect.width,
      rectHeight: rect.height,
    };
    window.addEventListener('pointermove', handleCropPointerMove);
    window.addEventListener('pointerup', handleCropPointerUp);
  };

  const handleCropResizeStart = (e, dir) => {
    e.stopPropagation();
    const container = cropContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    dragStateRef.current = {
      mode: 'resize',
      dir,
      startX: e.clientX,
      startY: e.clientY,
      startBox: { ...cropBox },
      rectWidth: rect.width,
      rectHeight: rect.height,
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

    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    const naturalW = imgEl.naturalWidth;
    const naturalH = imgEl.naturalHeight;

    const scale = Math.min(containerW / naturalW, containerH / naturalH);
    const scaledW = naturalW * scale;
    const scaledH = naturalH * scale;
    const offsetX = (containerW - scaledW) / 2;
    const offsetY = (containerH - scaledH) / 2;

    const containerCropX = (cropBox.x / 100) * containerW;
    const containerCropY = (cropBox.y / 100) * containerH;
    const containerCropW = (cropBox.w / 100) * containerW;
    const containerCropH = (cropBox.h / 100) * containerH;

    const naturalCropX = (containerCropX - offsetX) / scale;
    const naturalCropY = (containerCropY - offsetY) / scale;
    const naturalCropW = containerCropW / scale;
    const naturalCropH = containerCropH / scale;

    canvas.width = naturalCropW;
    canvas.height = naturalCropH;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      imgEl,
      naturalCropX,
      naturalCropY,
      naturalCropW,
      naturalCropH,
      0,
      0,
      naturalCropW,
      naturalCropH
    );

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(croppedDataUrl);
    setStage('preview');
  };

  const validateImage = async (imageData) => {
    setIsValidating(true);
    setValidationError(''); 

    try {
      const imageFile = dataURLtoFile(imageData, 'selfie.jpg');
      const formData = new FormData();
      const sessionId = sessionStorage.getItem('session_id');

      if (!sessionId) {
        throw new Error("Session ID missing! Please start from the beginning.");
      }

      formData.append('image', imageFile);
      formData.append('session_id', sessionId);

      const widgetRoot = document.getElementById('ai-skin-assessment');
      const customerName = widgetRoot?.dataset?.customerName || 'Customer';
      const apiUrl = `/apps/celrevive-backend/api/v1/image-analysis?user_full_name=${encodeURIComponent(customerName)}`;

      const res = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      return { isValid: true, sessionId, backendData: data };
      
    } catch (error) {
      console.error('CRASH REASON:', error);
      setValidationError(`Error: ${error.message}`);
      setCapturedImage(null);
      setStage('idle');
      return { isValid: false };
    } finally {
      setIsValidating(false);
    }
  };

  const submitPhoto = async () => {
    if (!capturedImage || isValidating) return;
    const result = await validateImage(capturedImage);
    if (result.isValid) {
      onSubmit?.(capturedImage, result.sessionId, result.backendData);
    }
  };

  const getCursor = (dir) => {
    const map = {
      n: 'n-resize', s: 's-resize', e: 'e-resize', w: 'w-resize',
      ne: 'ne-resize', nw: 'nw-resize', se: 'se-resize', sw: 'sw-resize',
    };
    return map[dir] || 'pointer';
  };

  return (
    <div className="flex w-full flex-col bg-[var(--bg)]">
      <div className="flex w-full shrink-0 flex-col items-center justify-center px-4 py-5">
        <div className="w-full max-w-3xl">
          <div className="mb-4 text-center">
            <h1 className="m-0 text-xl font-bold leading-tight text-[var(--text-h)] sm:text-2xl md:text-[28px]">
              Capture a Photo of Your Affected Skin Area or Take a Selfie!
            </h1>

            {validationError && (
              <p className="mt-2 text-sm font-medium text-red-500">
                {validationError}
              </p>
            )}

            <div className="mx-auto mt-2 h-[2px] w-14 bg-[var(--text-h)]" />
          </div>

          <div className="rounded-xl border border-[var(--border)] p-3 md:p-4">
            <div className="grid grid-cols-2 gap-3 overflow-hidden rounded-lg">
              <div className="h-56 overflow-hidden rounded-lg bg-[var(--code-bg)] sm:h-64 md:h-72">
                <img
                  src={scanDevicePhoto}
                  alt="Scanning a skin spot with a phone camera"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="h-56 overflow-hidden rounded-lg bg-[var(--code-bg)] sm:h-64 md:h-72">
                <img
                  src={selfieCapturePhoto}
                  alt="Taking a selfie for skin analysis"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            <div className="mt-3 text-center">
              <p className="text-[11px] font-bold tracking-widest text-[var(--text-h)]">
                WHY USERS TRUST US:
              </p>

              <div className="mx-auto mt-3 grid max-w-md grid-cols-2 gap-x-10 gap-y-2">
                {TRUST_ITEMS.map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 text-sm text-[var(--text)]"
                  >
                    <Icon
                      className="h-4 w-4 shrink-0 text-[var(--text-h)]"
                      strokeWidth={1.75}
                    />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={() => openCamera(facingMode)}
                className="flex h-11 w-full max-w-sm items-center justify-center gap-2 rounded-lg bg-[var(--text-h)] text-sm font-semibold text-[var(--bg)] transition-opacity hover:opacity-90"
              >
                <Camera className="h-4 w-4" strokeWidth={2} />
                Take a photo
              </button>
            </div>

            {cameraError && (
              <p className="mt-2 text-center text-xs text-red-500">
                {cameraError}
              </p>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleGallerySelect}
            />
          </div>
        </div>
      </div>

      <div className="w-full px-4 pb-10">
        <div className="mx-auto flex max-w-3xl gap-3 rounded-xl border border-[var(--border)] p-5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-bg)] text-[var(--accent)]">
            <Info className="h-4 w-4" strokeWidth={2} />
          </div>

          <div>
            <p className="text-sm font-semibold text-[var(--text-h)]">
              TIP FOR ACCURACY
            </p>

            <p className="mt-1 text-sm leading-relaxed text-[var(--text)]">
              For more accurate results please take a clear photo of the same
              skin area under good lighting. Avoid wearing heavy make-up, hat
              or glasses while taking a selfie. This helps the AI analyze the
              spot more precisely and distinguish subtle texture.
            </p>
          </div>
        </div>
      </div>

      {stage === 'camera' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="relative w-full max-w-md overflow-hidden rounded-xl bg-black">
            <button
              type="button"
              onClick={closeCamera}
              aria-label="Close camera"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
            >
              <X className="h-5 w-5" />
            </button>

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`aspect-[3/4] w-full object-cover ${
                facingMode === 'user' ? 'scale-x-[-1]' : ''
              }`}
            />

            <div className="grid grid-cols-3 items-center bg-black py-5 px-4">
              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={openGallery}
                  aria-label="Choose from gallery"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white"
                >
                  <ImageIcon className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={capturePhoto}
                  aria-label="Capture photo"
                  className="h-16 w-16 rounded-full border-4 border-white bg-white/20"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={flipCamera}
                  disabled={isFlipping}
                  aria-label="Flip camera"
                  className={`flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/40 bg-white/20 text-white transition-all duration-200 ${
                    isFlipping
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:scale-110 hover:bg-white/30 active:scale-95'
                  }`}
                >
                  <RefreshCw
                    className={`h-5 w-5 ${isFlipping ? 'animate-spin' : ''}`}
                    strokeWidth={2}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {stage === 'crop' && capturedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-[var(--bg)]">
            <div
              ref={cropContainerRef}
              className="relative aspect-[3/4] w-full touch-none select-none overflow-hidden bg-black"
              style={{ touchAction: 'none' }}
            >
              <img
                ref={cropImageRef}
                src={capturedImage}
                alt="Crop preview"
                className="pointer-events-none block h-full w-full object-contain"
                draggable={false}
              />

              <div
                onPointerDown={handleCropDragStart}
                className="absolute cursor-move border-2 border-white"
                style={{
                  left: `${cropBox.x}%`,
                  top: `${cropBox.y}%`,
                  width: `${cropBox.w}%`,
                  height: `${cropBox.h}%`,
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                }}
              >
                <div
                  onPointerDown={(e) => handleCropResizeStart(e, 'nw')}
                  className="absolute -left-2 -top-2 h-5 w-5 cursor-nw-resize rounded-full border-2 border-[var(--text-h)] bg-[var(--bg)]"
                />
                <div
                  onPointerDown={(e) => handleCropResizeStart(e, 'ne')}
                  className="absolute -right-2 -top-2 h-5 w-5 cursor-ne-resize rounded-full border-2 border-[var(--text-h)] bg-[var(--bg)]"
                />
                <div
                  onPointerDown={(e) => handleCropResizeStart(e, 'sw')}
                  className="absolute -bottom-2 -left-2 h-5 w-5 cursor-sw-resize rounded-full border-2 border-[var(--text-h)] bg-[var(--bg)]"
                />
                <div
                  onPointerDown={(e) => handleCropResizeStart(e, 'se')}
                  className="absolute -bottom-2 -right-2 h-5 w-5 cursor-se-resize rounded-full border-2 border-[var(--text-h)] bg-[var(--bg)]"
                />

                <div
                  onPointerDown={(e) => handleCropResizeStart(e, 'n')}
                  style={{
                    cursor: getCursor('n'),
                    left: '50%',
                    transform: 'translateX(-50%)',
                  }}
                  className="absolute -top-2 h-5 w-5 rounded-full border-2 border-[var(--text-h)] bg-[var(--bg)]"
                />
                <div
                  onPointerDown={(e) => handleCropResizeStart(e, 's')}
                  style={{
                    cursor: getCursor('s'),
                    left: '50%',
                    transform: 'translateX(-50%)',
                  }}
                  className="absolute -bottom-2 h-5 w-5 rounded-full border-2 border-[var(--text-h)] bg-[var(--bg)]"
                />
                <div
                  onPointerDown={(e) => handleCropResizeStart(e, 'w')}
                  style={{
                    cursor: getCursor('w'),
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                  className="absolute -left-2 h-5 w-5 rounded-full border-2 border-[var(--text-h)] bg-[var(--bg)]"
                />
                <div
                  onPointerDown={(e) => handleCropResizeStart(e, 'e')}
                  style={{
                    cursor: getCursor('e'),
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                  className="absolute -right-2 h-5 w-5 rounded-full border-2 border-[var(--text-h)] bg-[var(--bg)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 p-4">
              <button
                type="button"
                onClick={cancelCrop}
                aria-label="Back to take photo page"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] text-red-500 hover:bg-[var(--code-bg)]"
              >
                <X className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={confirmCrop}
                aria-label="Confirm crop"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--text-h)] text-[var(--bg)] hover:opacity-90"
              >
                <Check className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {stage === 'preview' && capturedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-[var(--bg)]">
            <img
              src={capturedImage}
              alt="Captured skin area preview"
              className="max-h-[60vh] w-full object-contain"
            />

            <div className="flex gap-3 p-4">
              <button
                type="button"
                onClick={retake}
                disabled={isValidating || isOpeningCamera}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--border)] py-3 font-semibold text-[var(--text-h)] hover:bg-[var(--code-bg)] disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                Retake
              </button>

              <button
                type="button"
                onClick={submitPhoto}
                disabled={isValidating}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--text-h)] py-3 font-semibold text-[var(--bg)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isValidating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Submit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}