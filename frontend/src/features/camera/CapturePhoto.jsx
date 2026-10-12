import { useState, useRef, useEffect } from 'react';
import { useImageCapture } from '../../hooks/useImageCapture';
import { validateImage } from '../../api';
import { useSessionStore } from '../../store/useSessionStore.js';
import {
  Camera, ShieldKeyhole, MonitorSmartphone, BriefcaseMedical, Bot,
  Info, X, RotateCcw, Check, Image as ImageIcon, RefreshCw,
} from 'lucide-react';
import localScanDevicePhoto from '../../assets/scan-device.png';
import localSelfieCapturePhoto from '../../assets/selfie-capture.png';

const TRUST_ITEMS = [
  { icon: ShieldKeyhole, label: 'Private & secure' },
  { icon: MonitorSmartphone, label: 'In-hand tool' },
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

function TopLayerModal({ isOpen, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal(); 
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

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
        maxHeight: '100dvh',
        zIndex: 999999
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
  const sessionId = useSessionStore((state) => state.sessionId);
  
  const {
    stage, setStage, capturedImage, setCapturedImage,
    cameraError, isOpeningCamera, facingMode, isFlipping, cropBox,
    videoRef, canvasRef, fileInputRef, galleryInputRef, cropContainerRef, cropImageRef,
    openCamera, closeCamera, flipCamera, capturePhoto, handleFileSelect, openGallery, handleGallerySelect,
    cancelCrop, retake, confirmCrop, handleCropDragStart, handleCropResizeStart
  } = useImageCapture();

  const [isValidating, setIsValidating] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [validationError, setValidationError] = useState('');

  const widgetRoot = document.getElementById('ai-skin-assessment');
  const scanDeviceImg = widgetRoot?.dataset?.scanDeviceImg || localScanDevicePhoto;
  const selfieCaptureImg = widgetRoot?.dataset?.selfieCaptureImg || localSelfieCapturePhoto;

  const handleRetake = () => {
    setValidationError('');
    retake();
  };

  const onFileSelect = (e) => {
    setValidationError('');
    handleFileSelect(e);
  };

  const onGallerySelect = (e) => {
    setValidationError('');
    handleGallerySelect(e);
  };

  const submitPhoto = async () => {
    if (!capturedImage || isValidating) return;

    if (!sessionId) {
      setValidationError('Session ID missing. Please refresh and restart the assessment.');
      return;
    }

    setIsValidating(true);
    setValidationError(''); 

    try {
      const imageFile = dataURLtoFile(capturedImage, 'selfie.jpg');
      
      setLoadingText('Submitting to AI...');
      const validationData = await validateImage(imageFile, sessionId);
      
      if (!validationData.valid) {
        throw new Error(validationData.reasons?.join(', ') || 'Image did not pass quality checks.');
      }

      onSubmit?.(capturedImage, sessionId);

    } catch (error) {
      console.error('CRASH REASON:', error);
      setValidationError(`Error: ${error.message}`);
    } finally {
      setIsValidating(false);
      setLoadingText('');
    }
  };

  return (
    <div className="flex w-full flex-col bg-[var(--bg)]">
      {/* --- Main Screen (CSS Variables are safe here) --- */}
      <div className="flex w-full shrink-0 flex-col items-center justify-center px-4 py-5">
        <div className="mb-4 w-full text-center">
          <h1 className="m-0 text-[20px] font-bold leading-tight text-[var(--text-h)] sm:text-[24px] md:text-[28px]">
            Capture a Photo of Your Affected Skin Area or Take a Selfie!
          </h1>
          {validationError && !capturedImage && <p className="mt-2 text-[14px] font-medium text-red-500">{validationError}</p>}
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
              <div className="mx-auto mt-3 grid max-w-[448px] grid-cols-2 gap-x-[16px] gap-y-2 whitespace-nowrap">
                {TRUST_ITEMS.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-[13px] text-[var(--text)]">
                    <Icon className="h-[15px] w-[15px] shrink-0 text-[var(--text-h)]" strokeWidth={1.75}/>
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

            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileSelect} />
            <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={onGallerySelect} />
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

      {/* --- Modals (CSS Variables are stripped out here, use Hardcoded values) --- */}

      <TopLayerModal isOpen={stage === 'camera'}>
        <div className="relative h-full w-full overflow-hidden bg-black">
          <button type="button" onClick={closeCamera} className="absolute right-6 top-6 z-30 flex h-[44px] w-[44px] items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
            <X className="h-[24px] w-[24px]" />
          </button>
          
          <video ref={videoRef} autoPlay playsInline muted className={`absolute inset-0 h-full w-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} />
          
          <div className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-center gap-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-6 py-12">
            <button type="button" onClick={openGallery} className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-transform hover:scale-105 active:scale-95" title="Open Gallery">
              <ImageIcon className="h-[24px] w-[24px]" strokeWidth={2} />
            </button>
            <button type="button" onClick={capturePhoto} className="flex h-[80px] w-[80px] items-center justify-center rounded-full border-4 border-white bg-white/20 transition-transform active:scale-95 shadow-lg" title="Capture Photo" />
            <button type="button" onClick={flipCamera} disabled={isFlipping} className={`flex h-[56px] w-[56px] items-center justify-center rounded-full border-2 border-white/40 bg-white/20 text-white backdrop-blur-md transition-all ${isFlipping ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`} title="Flip Camera">
              <RefreshCw className={`h-[24px] w-[24px] ${isFlipping ? 'animate-spin' : ''}`} strokeWidth={2} />
            </button>
          </div>
        </div>
      </TopLayerModal>

      <TopLayerModal isOpen={stage === 'crop' && Boolean(capturedImage)}>
        {/* Hardcoded bg-white to guarantee visibility */}
        <div className="w-full max-w-[448px] overflow-hidden rounded-xl bg-white">
          
          <div 
            ref={cropContainerRef} 
            style={{ 
              width: '100%',
              height: 'auto',
              aspectRatio: '3 / 4', 
              position: 'relative', 
              overflow: 'hidden',
              backgroundColor: '#000000',
              touchAction: 'none',
              margin: 0,
              padding: 0
            }}
          >
            <img 
              ref={cropImageRef} 
              src={capturedImage} 
              alt="Crop preview" 
              draggable={false} 
              style={{
                position: 'absolute', // Forced stacking context separation
                top: 0,
                left: 0,
                display: 'block',
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                pointerEvents: 'none',
                zIndex: 1, // Stay beneath crop box
                margin: 0,
                padding: 0
              }}
            />

            <div 
              onPointerDown={handleCropDragStart} 
              style={{ 
                position: 'absolute',
                left: `${cropBox.x}%`, 
                top: `${cropBox.y}%`, 
                width: `${cropBox.w}%`, 
                height: `${cropBox.h}%`,
                borderWidth: '2px', 
                borderStyle: 'solid', 
                borderColor: '#ffffff', // Hardcoded hex ignores CSS resets
                boxSizing: 'border-box', 
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)', 
                cursor: 'move',
                zIndex: 10, // Stay above image
                display: 'block',
                margin: 0,
                padding: 0
              }}
            >
              {/* Corner Handles - Hardcoded hex colors and undefined layout values bypass Shopify overrides */}
              {['nw', 'ne', 'sw', 'se'].map(dir => (
                <div 
                  key={dir} 
                  onPointerDown={(e) => handleCropResizeStart(e, dir)} 
                  style={{ 
                    position: 'absolute',
                    width: '20px', 
                    height: '20px', 
                    borderRadius: '50%',
                    borderWidth: '2px',
                    borderStyle: 'solid', 
                    borderColor: '#000000', 
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box',
                    cursor: `${dir}-resize`,
                    zIndex: 20,
                    top: dir.includes('n') ? '-10px' : undefined,
                    bottom: dir.includes('s') ? '-10px' : undefined,
                    left: dir.includes('w') ? '-10px' : undefined,
                    right: dir.includes('e') ? '-10px' : undefined,
                    display: 'block',
                    margin: 0,
                    padding: 0
                  }} 
                />
              ))}
              
              {/* Edge Handles */}
              {['n', 's', 'w', 'e'].map(dir => (
                <div 
                  key={dir} 
                  onPointerDown={(e) => handleCropResizeStart(e, dir)} 
                  style={{ 
                    position: 'absolute',
                    width: '20px', 
                    height: '20px', 
                    borderRadius: '50%',
                    borderWidth: '2px',
                    borderStyle: 'solid', 
                    borderColor: '#000000', 
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box',
                    cursor: `${dir}-resize`,
                    zIndex: 20,
                    top: dir === 'n' ? '-10px' : dir === 's' ? undefined : '50%',
                    bottom: dir === 's' ? '-10px' : undefined,
                    left: dir === 'w' ? '-10px' : dir === 'e' ? undefined : '50%',
                    right: dir === 'e' ? '-10px' : undefined,
                    transform: (dir === 'w' || dir === 'e') ? 'translateY(-50%)' : 'translateX(-50%)',
                    display: 'block',
                    margin: 0,
                    padding: 0
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 p-4 bg-white">
            <button type="button" onClick={cancelCrop} className="flex h-[44px] w-[44px] items-center justify-center rounded-full border border-gray-300 text-red-500 hover:bg-gray-100">
              <X className="h-[20px] w-[20px]" />
            </button>
            <button type="button" onClick={confirmCrop} className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-black text-white hover:opacity-90">
              <Check className="h-[20px] w-[20px]" />
            </button>
          </div>
        </div>
      </TopLayerModal>

      <TopLayerModal isOpen={stage === 'preview' && Boolean(capturedImage)}>
        {/* Hardcoded bg-white and standard text colors to bypass CSS variable resets in <dialog> */}
        <div className="w-full max-w-[448px] overflow-hidden rounded-xl bg-white">
          <img src={capturedImage} alt="Captured preview" className="max-h-[60vh] w-full object-contain" />

          {validationError && (
            <div className="border-y border-red-100 bg-red-50 px-4 py-3 text-center">
              <p className="text-[13px] font-medium text-red-600">{validationError}</p>
            </div>
          )}

          <div className="flex gap-3 p-4 bg-white">
            <button type="button" onClick={handleRetake} disabled={isValidating || isOpeningCamera} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 py-3 font-semibold text-black hover:bg-gray-100 disabled:opacity-50">
              <RotateCcw className="h-[16px] w-[16px]" /> Retake
            </button>
            <button type="button" onClick={submitPhoto} disabled={isValidating} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-black py-3 font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
              {isValidating ? <><RefreshCw className="h-[16px] w-[16px] animate-spin" /> {loadingText || 'Checking...'}</> : <><Check className="h-[16px] w-[16px]" /> Submit</>}
            </button>
          </div>
        </div>
      </TopLayerModal>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}