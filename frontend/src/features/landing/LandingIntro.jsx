import React, { useState } from 'react';
import heroImg from '../../assets/skin-analysis.png';

export default function LandingIntro({ onStartAssessment }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConsentGiven, setIsConsentGiven] = useState(false);

  const handleStartAssessment = async () => {
    if (isSubmitting || !isConsentGiven) return;
    setIsSubmitting(true);

    try {
      const dummySessionId = crypto.randomUUID(); 
      sessionStorage.setItem('session_id', dummySessionId);
      console.log("Mock Session ID saved to storage:", dummySessionId);

      if (onStartAssessment) {
        onStartAssessment();
      }
    } catch (error) {
      console.error('Session Error:', error);
      alert('Unable to start assessment. Please try again.');
      setIsSubmitting(false); 
    }
  };

  return (
    <div className="box-border flex min-h-screen flex-col justify-between bg-[var(--bg)] px-5 py-10 text-[var(--text)]">
      <div className="mx-auto flex w-full max-w-[1100px] flex-wrap items-center justify-between gap-10">
        
        <div className="flex-[1_1_500px]">
          <h1 className="mb-6 text-[45px] font-semibold tracking-[-0.8px] text-[var(--text-h)]">
            AI Skin Analysis
          </h1>
          <p className="mb-[30px] max-w-[450px] text-[15px] leading-relaxed">
            Check your skin! Professional-grade dermatological analysis powered by advanced artificial intelligence.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-[4px] bg-[var(--code-bg)] p-[18px]">
              <span className="mb-1 block text-[15px] font-bold tracking-[0.5px] text-[var(--text)]">STEP 1</span>
              <h3 className="mb-1 text-[18px] font-bold text-[var(--text-h)]">Photo</h3>
              <p className="m-0 text-[14px] leading-snug">Take a photo of your skin area.</p>
            </div>
            <div className="rounded-[4px] bg-[var(--code-bg)] p-[18px]">
              <span className="mb-1 block text-[15px] font-bold tracking-[0.5px] text-[var(--text)]">STEP 2</span>
              <h3 className="mb-1 text-[18px] font-bold text-[var(--text-h)]">Analyze</h3>
              <p className="m-0 text-[14px] leading-snug">AI instantly analyzes skin conditions.</p>
            </div>
            <div className="rounded-[4px] bg-[var(--code-bg)] p-[18px]">
              <span className="mb-1 block text-[15px] font-bold tracking-[0.5px] text-[var(--text)]">STEP 3</span>
              <h3 className="mb-1 text-[18px] font-bold text-[var(--text-h)]">Consult</h3>
              <p className="m-0 text-[14px] leading-snug">AI asks specific questions.</p>
            </div>
            <div className="rounded-[4px] bg-[var(--code-bg)] p-[18px]">
              <span className="mb-1 block text-[15px] font-bold tracking-[0.5px] text-[var(--text)]">FINAL STEP</span>
              <h3 className="mb-1 text-[18px] font-bold text-[var(--text-h)]">Results</h3>
              <p className="m-0 text-[14px] leading-snug">Get Personalized Skincare Recommendations.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-[1_1_400px] justify-center">
          <div className="w-full max-w-[450px] rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4 shadow-sm">
            <img
              src={heroImg}
              alt="AI Skin Analysis Model"
              className="block h-auto w-full rounded-[10px] object-cover"
            />
          </div>
        </div>

      </div>

      <div className="mb-10 mt-10 flex flex-col items-center text-center">
        <div className="mb-4 flex items-center gap-2">
          <input 
            type="checkbox" 
            id="consent" 
            className="h-4 w-4 cursor-pointer accent-[var(--text-h)]"
            checked={isConsentGiven}
            onChange={(e) => setIsConsentGiven(e.target.checked)}
          />
          <label htmlFor="consent" className="cursor-pointer select-none text-sm font-medium text-[var(--text)]">
            I agree to share my image for AI analysis
          </label>
        </div>

        <button
          onClick={handleStartAssessment}
          disabled={isSubmitting || !isConsentGiven}
          className="cursor-pointer rounded-none border-none bg-[var(--text-h)] px-12 py-4 text-xs font-bold tracking-[2px] text-[var(--bg)] shadow-sm transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'STARTING...' : 'BEGIN ASSESSMENT'}
        </button>
      </div>
    </div>
  );
}