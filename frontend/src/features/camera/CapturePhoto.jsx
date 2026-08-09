// // added crop option + redirect to camera capture section + gallery section + camera flip option


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
  SwitchCamera,
} from 'lucide-react';
import scanDevicePhoto from '../../assets/scan-device.png';
import selfieCapturePhoto from '../../assets/selfie-capture.png';

const TRUST_ITEMS = [
  { icon: ShieldKeyhole, label: 'Private & secure' },
  { icon: MonitorSmartphone, label: 'On-hand tool' },
  { icon: BriefcaseMedical, label: 'Backed by Dermatologists' },
  { icon: Bot, label: 'AI-powered accuracy' },
];

const DEFAULT_CROP_BOX = { x: 10, y: 10, w: 80, h: 80 };
const MIN_CROP_SIZE_PERCENT = 15;

export default function CapturePhoto({ onSubmit }) {
  const [stage, setStage] = useState('idle');
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraError, setCameraError] = useState('');

  const [facingMode, setFacingMode] = useState('environment');
  // UPDATED: rapid clicks control karne ke liye flipping state add ki
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

  // UPDATED: stream ke saare tracks ko explicitly stop karne ka robust function
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
      setCameraError(
        'Camera access nahi mil paya. Gallery se photo select kar lo.'
      );
      fileInputRef.current?.click();
    }
  };

  // UPDATED: Har click par camera reliably flip/switch karne ka logic
  const flipCamera = async () => {
    if (isFlipping) return; // double-click prevent karta hai
    setIsFlipping(true);

    const nextFacingMode = facingMode === 'environment' ? 'user' : 'environment';
    stopCamera();

    try {
      // 2. Nayi stream request karo
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacingMode },
        audio: false,
      });

      streamRef.current = stream;
      setFacingMode(nextFacingMode);

      // 3. Video element par nayi stream set karke play karo
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

  const retake = () => {
    setCapturedImage(null);
    openCamera(facingMode);
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
      let newW = state.startBox.w + dxPercent;
      let newH = state.startBox.h + dyPercent;
      newW = Math.min(
        Math.max(newW, MIN_CROP_SIZE_PERCENT),
        100 - state.startBox.x
      );
      newH = Math.min(
        Math.max(newH, MIN_CROP_SIZE_PERCENT),
        100 - state.startBox.y
      );
      setCropBox((prev) => ({ ...prev, w: newW, h: newH }));
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

  const handleCropResizeStart = (e) => {
    e.stopPropagation();
    const container = cropContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    dragStateRef.current = {
      mode: 'resize',
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
    const container = cropContainerRef.current;
    const imgEl = cropImageRef.current;
    const canvas = canvasRef.current;
    if (!container || !imgEl || !canvas) return;

    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    const naturalW = imgEl.naturalWidth;
    const naturalH = imgEl.naturalHeight;

    const scale = Math.max(containerW / naturalW, containerH / naturalH);
    const scaledW = naturalW * scale;
    const scaledH = naturalH * scale;
    const offsetX = (scaledW - containerW) / 2;
    const offsetY = (scaledH - containerH) / 2;

    const containerCropX = (cropBox.x / 100) * containerW;
    const containerCropY = (cropBox.y / 100) * containerH;
    const containerCropW = (cropBox.w / 100) * containerW;
    const containerCropH = (cropBox.h / 100) * containerH;

    const naturalCropX = (containerCropX + offsetX) / scale;
    const naturalCropY = (containerCropY + offsetY) / scale;
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

  const cancelCrop = () => {
    retake();
  };

  const submitPhoto = () => {
    onSubmit?.(capturedImage);
  };

  return (
    <div className="flex h-screen flex-col overflow-y-auto bg-[var(--bg)]">
      <div className="flex w-full shrink-0 flex-col items-center justify-center px-4 py-5">
        <div className="w-full max-w-3xl">
          <div className="mb-4 text-center">
            <h1 className="m-0 text-xl font-bold leading-tight text-[var(--text-h)] sm:text-2xl md:text-[28px]">
              Capture a Photo of Your Affected Skin Area or Take a Selfie!
            </h1>
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
                className="flex h-11 w-full max-w-sm items-center justify-center gap-2 rounded-lg bg-[var(--text-h)] text-sm font-semibold text-white transition-opacity hover:opacity-90"
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
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
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

      {/* Camera modal */}
      {stage === 'camera' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative w-full max-w-md overflow-hidden rounded-xl bg-black">
            <button
              type="button"
              onClick={closeCamera}
              aria-label="Close camera"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Front camera preview par CSS mirror effect diya hai taaki selfie natural lage */}
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
                {/* UPDATED: disabled={isFlipping} aur smooth transition add kiya */}
                <button
                  type="button"
                  onClick={flipCamera}
                  disabled={isFlipping}
                  aria-label="Flip camera"
                  className={`flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white transition-transform ${
                    isFlipping ? 'opacity-50' : 'hover:bg-white/30 active:scale-90'
                  }`}
                >
                  <SwitchCamera className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Crop modal */}
      {stage === 'crop' && capturedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white">
            <div
              ref={cropContainerRef}
              className="relative aspect-[3/4] w-full touch-none select-none overflow-hidden bg-black"
              style={{ touchAction: 'none' }}
            >
              <img
                ref={cropImageRef}
                src={capturedImage}
                alt="Crop preview"
                className="pointer-events-none block h-full w-full object-cover"
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
                  onPointerDown={handleCropResizeStart}
                  className="absolute -bottom-2 -right-2 h-5 w-5 cursor-se-resize rounded-full border-2 border-[var(--text-h)] bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 p-4">
              <button
                type="button"
                onClick={cancelCrop}
                aria-label="Retake photo"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] text-red-500 hover:bg-[var(--code-bg)]"
              >
                <X className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={confirmCrop}
                aria-label="Confirm crop"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--text-h)] text-white hover:opacity-90"
              >
                <Check className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {stage === 'preview' && capturedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white">
            <img
              src={capturedImage}
              alt="Captured skin area preview"
              className="max-h-[60vh] w-full object-cover"
            />
            <div className="flex gap-3 p-4">
              <button
                type="button"
                onClick={retake}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--border)] py-3 font-semibold text-[var(--text-h)] hover:bg-[var(--code-bg)]"
              >
                <RotateCcw className="h-4 w-4" /> Retake
              </button>
              <button
                type="button"
                onClick={submitPhoto}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--text-h)] py-3 font-semibold text-white hover:opacity-90"
              >
                <Check className="h-4 w-4" /> Submit
              </button>
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}