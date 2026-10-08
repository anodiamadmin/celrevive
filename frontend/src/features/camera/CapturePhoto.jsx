import { useState, useRef, useEffect } from 'react';
import { useImageCapture } from '../../hooks/useImageCapture';
import {
  Camera, ShieldKeyhole, MonitorSmartphone, BriefcaseMedical, Bot,
  Info, X, RotateCcw, Check, Image as ImageIcon, RefreshCw,
} from 'lucide-react';
import localScanDevicePhoto from '../../assets/scan-device.png';
import localSelfieCapturePhoto from '../../assets/selfie-capture.png';

const TRUST_ITEMS = [
  { icon: ShieldKeyhole, label: 'Private & secure' },
  { icon: MonitorSmartphone, label: 'On-hand tool' },
  { icon: BriefcaseMedical, label: 'Backed by Dermatologists' },
  { icon: Bot, label: 'AI-powered accuracy' },
];

function dataURLtoFile(dataurl, filename) {
  let arr = dataurl.split(','),
      mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[arr.length - 1]), 
      n = bstr.length, 
      u8arr = new Uint8Array(n);
  while(n--){ u8arr[n] = bstr.charCodeAt(n); }
  return new File([u8arr], filename, {type:mime});
}

// Native HTML5 Dialog wrapper that bypasses all Shopify CSS trapping
function TopLayerModal({ isOpen, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal(); // Hoists into the browser's native Top Layer
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Prevent Esc key from closing modal silently and breaking React state
  useEffect(() => {
    const dialog = dialogRef.current;
    const handleCancel = (e) => e.preventDefault();
    dialog?.addEventListener('cancel', handleCancel);
    return () => dialog?.removeEventListener('cancel', handleCancel);
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="border-none bg-black/90 backdrop:bg-black/90"
      style={{ 
        margin: 0, 
        padding: 0, 
        position: 'fixed',
        inset: 0,
        width: '100vw', 
        height: '100dvh',
        maxWidth: '100vw', 
        maxHeight: '100dvh' 
      }}
    >
      {isOpen && (
        <div className="flex h-full w-full items-center justify-center p-4">
          {children}
        </div>
      )}
    </dialog>
  );
}

export default function CapturePhoto({ onSubmit }) {
  const {
    stage, setStage, capturedImage, setCapturedImage,
    cameraError, isOpeningCamera, facingMode, isFlipping, cropBox,
    videoRef, canvasRef, fileInputRef, galleryInputRef, cropContainerRef, cropImageRef,
    openCamera, closeCamera, flipCamera, capturePhoto, handleFileSelect, openGallery, handleGallerySelect,
    cancelCrop, retake, confirmCrop, handleCropDragStart, handleCropResizeStart
  } = useImageCapture();

  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState('');

  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const baseUrl = isLocalhost ? 'http://localhost:8000' : '/apps/celrevive-backend';

  const widgetRoot = document.getElementById('ai-skin-assessment');
  const scanDeviceImg = widgetRoot?.dataset?.scanDeviceImg || localScanDevicePhoto;
  const selfieCaptureImg = widgetRoot?.dataset?.selfieCaptureImg || localSelfieCapturePhoto;

  const validateImage = async (imageData) => {
    setIsValidating(true);
    setValidationError(''); 

    try {
      const imageFile = dataURLtoFile(imageData, 'selfie.jpg');
      const formData = new FormData();
      
      const sessionId = crypto.randomUUID(); 

      formData.append('image', imageFile);
      formData.append('session_id', sessionId);

      const customerName = widgetRoot?.dataset?.customerName || 'Customer';
      const apiUrl = isLocalhost 
        ? `${baseUrl}/api/v1/image-analysis?user_full_name=${encodeURIComponent(customerName)}`
        : `${baseUrl}/image-analysis?user_full_name=${encodeURIComponent(customerName)}`;

      const res = await fetch(apiUrl, { method: 'POST', body: formData });

      if (!res.ok) throw new Error(`Server returned status ${res.status}`);

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
    if (result.isValid) onSubmit?.(capturedImage, result.sessionId, result.backendData);
  };

  return (
    <div className="flex w-full flex-col bg-[var(--bg)]">
      <div className="flex w-full shrink-0 flex-col items-center justify-center px-4 py-5">
        
        <div className="mb-4 w-full text-center">
          <h1 className="m-0 text-[20px] font-bold leading-tight text-[var(--text-h)] sm:text-[24px] md:text-[28px]">
            Capture a Photo of Your Affected Skin Area or Take a Selfie!
          </h1>
          {validationError && <p className="mt-2 text-[14px] font-medium text-red-500">{validationError}</p>}
          <div className="mx-auto mt-2 block h-[2px] w-[56px] bg-[var(--text-h)]" />
        </div>

        <div className="w-full max-w-[768px]">
          <div className="rounded-xl border border-[var(--border)] p-3 md:p-4">
            <div className="grid grid-cols-2 gap-3 overflow-hidden rounded-lg">
              <div className="h-[224px] overflow-hidden rounded-lg bg-[var(--code-bg)] sm:h-[256px] md:h-[288px]">
                <img src={scanDeviceImg} alt="Scanning skin" className="h-full w-full object-cover" />
              </div>
              <div className="h-[224px] overflow-hidden rounded-lg bg-[var(--code-bg)] sm:h-[256px] md:h-[288px]">
                <img src={selfieCaptureImg} alt="Taking selfie" className="h-full w-full object-cover" />
              </div>
            </div>

            <div className="mt-3 text-center">
              <p className="text-[11px] font-bold tracking-widest text-[var(--text-h)]">WHY USERS TRUST US:</p>
              <div className="mx-auto mt-3 grid max-w-[448px] grid-cols-2 gap-x-[40px] gap-y-2 whitespace-nowrap">
                {TRUST_ITEMS.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 text-[14px] text-[var(--text)]">
                    <Icon className="h-[16px] w-[16px] shrink-0 text-[var(--text-h)]" strokeWidth={1.75} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={() => openCamera(facingMode)}
                className="flex h-[44px] w-full max-w-[384px] items-center justify-center gap-2 rounded-lg bg-[var(--text-h)] text-[14px] font-semibold text-[var(--bg)] transition-opacity hover:opacity-90"
              >
                <Camera className="h-[16px] w-[16px]" strokeWidth={2} /> Take a photo
              </button>
            </div>

            {cameraError && <p className="mt-2 text-center text-[12px] text-red-500">{cameraError}</p>}

            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
            <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleGallerySelect} />
          </div>
        </div>
      </div>

      <div className="w-full px-4 pb-10">
        <div className="mx-auto flex w-full max-w-[768px] gap-3 rounded-xl border border-[var(--border)] p-5">
          <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-[var(--accent-bg)] text-[var(--accent)]">
            <Info className="h-[16px] w-[16px]" strokeWidth={2} />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-[var(--text-h)]">TIP FOR ACCURACY</p>
            <p className="mt-1 text-[14px] leading-relaxed text-[var(--text)]">
              For more accurate results please take a clear photo of the same skin area under good lighting. Avoid wearing heavy make-up, hat or glasses while taking a selfie. This helps the AI analyze the spot more precisely and distinguish subtle texture.
            </p>
          </div>
        </div>
      </div>

      <TopLayerModal isOpen={stage === 'camera'}>
        <div className="relative h-full w-full overflow-hidden bg-black">
          <button type="button" onClick={closeCamera} className="absolute right-6 top-6 z-30 flex h-[44px] w-[44px] items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
            <X className="h-[24px] w-[24px]" />
          </button>
          
          <video ref={videoRef} autoPlay playsInline muted className={`absolute inset-0 h-full w-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} />
          
          <div className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-center gap-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-6 py-12">
            <button 
              type="button" 
              onClick={openGallery} 
              className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-transform hover:scale-105 active:scale-95"
              title="Open Gallery"
            >
              <ImageIcon className="h-[24px] w-[24px]" strokeWidth={2} />
            </button>

            <button 
              type="button" 
              onClick={capturePhoto} 
              className="flex h-[80px] w-[80px] items-center justify-center rounded-full border-4 border-white bg-white/20 transition-transform active:scale-95 shadow-lg" 
              title="Capture Photo"
            />

            <button 
              type="button" 
              onClick={flipCamera} 
              disabled={isFlipping} 
              className={`flex h-[56px] w-[56px] items-center justify-center rounded-full border-2 border-white/40 bg-white/20 text-white backdrop-blur-md transition-all ${
                isFlipping ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
              }`}
              title="Flip Camera"
            >
              <RefreshCw className={`h-[24px] w-[24px] ${isFlipping ? 'animate-spin' : ''}`} strokeWidth={2} />
            </button>
          </div>
        </div>
      </TopLayerModal>

      <TopLayerModal isOpen={stage === 'crop' && capturedImage}>
        <div className="w-full max-w-[448px] overflow-hidden rounded-xl bg-[var(--bg)]">
          <div ref={cropContainerRef} className="relative aspect-[3/4] w-full touch-none select-none overflow-hidden bg-black">
            <img ref={cropImageRef} src={capturedImage} alt="Crop preview" className="pointer-events-none block h-full w-full object-contain" draggable={false} />

            <div onPointerDown={handleCropDragStart} className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" style={{ left: `${cropBox.x}%`, top: `${cropBox.y}%`, width: `${cropBox.w}%`, height: `${cropBox.h}%` }}>
              {['nw', 'ne', 'sw', 'se'].map(dir => (
                <div key={dir} onPointerDown={(e) => handleCropResizeStart(e, dir)} className={`absolute ${dir.includes('n') ? '-top-2' : '-bottom-2'} ${dir.includes('w') ? '-left-2' : '-right-2'} h-[20px] w-[20px] cursor-${dir}-resize rounded-full border-2 border-[var(--text-h)] bg-[var(--bg)]`} />
              ))}
              {['n', 's', 'w', 'e'].map(dir => (
                <div key={dir} onPointerDown={(e) => handleCropResizeStart(e, dir)} className={`absolute ${dir === 'n' || dir === 's' ? 'left-1/2 -translate-x-1/2' : 'top-1/2 -translate-y-1/2'} ${dir === 'n' ? '-top-2' : dir === 's' ? '-bottom-2' : dir === 'w' ? '-left-2' : '-right-2'} h-[20px] w-[20px] cursor-${dir}-resize rounded-full border-2 border-[var(--text-h)] bg-[var(--bg)]`} />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 p-4">
            <button type="button" onClick={cancelCrop} className="flex h-[44px] w-[44px] items-center justify-center rounded-full border border-[var(--border)] text-red-500 hover:bg-[var(--code-bg)]">
              <X className="h-[20px] w-[20px]" />
            </button>
            <button type="button" onClick={confirmCrop} className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-[var(--text-h)] text-[var(--bg)] hover:opacity-90">
              <Check className="h-[20px] w-[20px]" />
            </button>
          </div>
        </div>
      </TopLayerModal>

      <TopLayerModal isOpen={stage === 'preview' && capturedImage}>
        <div className="w-full max-w-[448px] overflow-hidden rounded-xl bg-[var(--bg)]">
          <img src={capturedImage} alt="Captured preview" className="max-h-[60vh] w-full object-contain" />

          <div className="flex gap-3 p-4">
            <button type="button" onClick={retake} disabled={isValidating || isOpeningCamera} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--border)] py-3 font-semibold text-[var(--text-h)] hover:bg-[var(--code-bg)] disabled:opacity-50">
              <RotateCcw className="h-[16px] w-[16px]" /> Retake
            </button>
            <button type="button" onClick={submitPhoto} disabled={isValidating} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--text-h)] py-3 font-semibold text-[var(--bg)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
              {isValidating ? <><RefreshCw className="h-[16px] w-[16px] animate-spin" /> Checking...</> : <><Check className="h-[16px] w-[16px]" /> Submit</>}
            </button>
          </div>
        </div>
      </TopLayerModal>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}