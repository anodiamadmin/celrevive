// with consent boxes
import React, { useState } from 'react';
import heroImg from '../../assets/skin-analysis.png';

export default function LandingIntro({ onStartAssessment }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConsentGiven, setIsConsentGiven] = useState(false);
  const handleStartAssessment = async () => {
    if (isSubmitting || !isConsentGiven) return;
    setIsSubmitting(true);

    try {
      // TEMPORARY FIX: Generate a dummy session ID on the frontend 
      // since the backend /create-session route is bypassed for now.
      const dummySessionId = crypto.randomUUID(); 
      sessionStorage.setItem('session_id', dummySessionId);
      console.log("Mock Session ID saved to storage:", dummySessionId);

      if (onStartAssessment) {
        onStartAssessment();
      }
    } catch (error) {
      console.error('Session Error:', error);
      alert('Unable to start assessment. Please try again.');
      setIsSubmitting(false); // Re-enable button on error
    }
  };

  return (
    /* 
      [BACKGROUND COLOR & PAGE PADDING]: 
      - Change 'bg-[#faf9f6]' to alter the main page background color.
      - Change 'px-5 py-10' (padding) to adjust the outer spacing of the entire screen.
    */
    <div className="min-h-screen bg-[#faf9f6] text-[#111] font-sans px-5 py-10 flex flex-col justify-between box-border">

      {/* Main Center Container */}
      {/* 
        [CONTAINER POSITION & ALIGNMENT]:
        - Change 'max-w-[1100px]' to change the maximum width of the content box.
        - Change 'gap-10' to control the spacing between the Left Column (text/steps) and Right Column (image).
      */}
      <div className="max-w-[1100px] mx-auto w-full flex flex-wrap gap-10 items-center justify-between">

        {/* Left Column: Heading, Subtitle & 4 Step Cards */}
        <div className="flex-[1_1_500px]">

          {/* 
            [HEADING (AI Skin Analysis)]:
            - Change 'text-[42px]' to change the heading font size.
            - Change 'font-extrabold' for font weight.
            - Change 'mb-3' to adjust the gap between this heading and the subheading right below it.
            - To change the font family globally or locally, modify 'font-sans' or add a custom class.
          */}
          <h1 className="text-[45px] font-semibold mb-6 text-black tracking-[-0.8px]">
            AI Skin Analysis
          </h1>

          {/* 
            [SUBHEADING / PARAGRAPH]:
            - Change 'text-[15px]' for text size.
            - Change 'mb-[30px]' (margin-bottom) to increase or decrease the gap between this subheading and the 2x2 Step Cards grid.
            - Change 'max-w-[480px]' to adjust how wide the text block stretches.
          */}
          <p className="text-[15px] text-[#666] leading-relaxed mb-[30px] max-w-[450px]">
            Check your skin! Professional-grade dermatological analysis powered by advanced artificial intelligence.
          </p>

          {/* 2x2 Grid for Steps */}
          {/* 
            [STEP CARDS GRID LAYOUT]:
            - Change 'gap-4' to adjust the space/margin between individual step cards.
          */}
          <div className="grid grid-cols-2 gap-4">

            {/* Step 1 */}
            {/* 
              [STEP BOXES (CARDS) STYLING]:
              - Change 'bg-[#f2efe9]' to adjust the background color of the step boxes.
              - Change 'p-[18px]' to adjust the inner padding of the cards.
              - Change 'rounded-[4px]' to change the corner curve of the boxes.
            */}
            <div className="bg-[#e5e2dc] p-[18px] rounded-[4px]">
              <span className="text-[15px] font-bold text-[#777] block mb-1 tracking-[0.5px]">STEP 1</span>
              <h3 className="text-[18px] font-bold text-black mb-1">Photo</h3>
              <p className="text-[14px] text-[#555] m-0 leading-snug">Take a photo of your skin area.</p>
            </div>

            {/* Step 2 */}
            <div className="bg-[#e5e2dc] p-[18px] rounded-[4px]">
              <span className="text-[15px] font-bold text-[#777] block mb-1 tracking-[0.5px]">STEP 2</span>
              <h3 className="text-[18px] font-bold text-black mb-1">Analyze</h3>
              <p className="text-[14px] text-[#555] m-0 leading-snug">AI instantly analyzes skin conditions.</p>
            </div>

            {/* Step 3 */}
            <div className="bg-[#e5e2dc] p-[18px] rounded-[4px]">
              <span className="text-[15px] font-bold text-[#777] block mb-1 tracking-[0.5px]">STEP 3</span>
              <h3 className="text-[18px] font-bold text-black mb-1">Consult</h3>
              <p className="text-[14px] text-[#555] m-0 leading-snug">AI asks specific questions.</p>
            </div>

            {/* Final Step */}
            <div className="bg-[#e5e2dc] p-[18px] rounded-[4px]">
              <span className="text-[15px] font-bold text-[#777] block mb-1 tracking-[0.5px]">FINAL STEP</span>
              <h3 className="text-[18px] font-bold text-black mb-1">Results</h3>
              <p className="text-[14px] text-[#556] m-0 leading-snug">Get Personalized Skincare Recommendations.</p>
            </div>

          </div>
        </div>

        {/* Right Column: Framed Image Card */}
        {/* 
          [IMAGE CONTAINER & SETTINGS]:
          - Change 'border-[#dcd6cd]' to alter the outer image frame border color.
          - Change 'p-4' for the frame padding around the image.
          - Change 'rounded-2xl' for the frame curve.
          - Change 'max-w-[400px]' to scale the image box size up or down.
        */}
        <div className="flex-[1_1_400px] flex justify-center">
          <div className="border border-[#dcd6cd] p-4 rounded-2xl bg-white shadow-[0_4px_15px_rgba(0,0,0,0.04)] max-w-[450px] w-full">
            <img
              src={heroImg}
              alt="AI Skin Analysis Model"
              className="w-full h-auto rounded-[10px] block object-cover"
            />
          </div>
        </div>

      </div>

      {/* Bottom Center Action Button */}
      {/* 
        [BEGIN ASSESSMENT BUTTON POSITION & STYLING]:
        - Change 'mt-10 mb-5' (margin-top/bottom) to position the button higher or lower on the page.
        - Change 'px-12 py-4' to make the button bigger or smaller.
        - Change 'bg-black' and 'text-white' to modify button colors.
        - Change 'rounded-none' to make button corners curved (e.g., rounded-full).
      */}
      <div className="text-center mt-10 mb-10 flex flex-col items-center">
        
        {/* NEW: Consent Checkbox */}
        <div className="flex items-center gap-2 mb-4">
          <input 
            type="checkbox" 
            id="consent" 
            className="w-4 h-4 cursor-pointer"
            checked={isConsentGiven}
            onChange={(e) => setIsConsentGiven(e.target.checked)}
          />
          <label htmlFor="consent" className="text-sm font-medium text-[#444] cursor-pointer select-none">
            I agree to share my image for AI analysis
          </label>
        </div>

        <button
          onClick={handleStartAssessment}
          // {/* [CHANGE]: Bound the 'disabled' attribute to 'isSubmitting' & 'isConsentGiven' so the button is disabled after first click or if unchecked */}
          disabled={isSubmitting || !isConsentGiven}
          //  [CHANGE]: Added 'disabled:opacity-50' and 'disabled:cursor-not-allowed' styles for accessibility feedback
          className="bg-black text-white px-12 py-4 text-xs font-bold tracking-[2px] border-none rounded-none cursor-pointer shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:bg-[#222] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'STARTING...' : 'BEGIN ASSESSMENT'}
        </button>

      </div>

    </div>
  );
}