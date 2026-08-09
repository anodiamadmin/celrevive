
// 2.updated code with comments

import React from 'react';
import heroImg from '../../assets/skin-analysis.png';

export default function LandingIntro({ onStartAssessment }) {
  return (
    
    <div className="min-h-screen bg-[#faf9f6] text-[#111] font-sans px-5 py-10 flex flex-col justify-between box-border">
      <div className="max-w-[1100px] mx-auto w-full flex flex-wrap gap-10 items-center justify-between">
        
        {/* Left Column: Heading, Subtitle & 4 Step Cards */}
        <div className="flex-[1_1_500px]">
        
          <h1 className="text-[45px] font-semibold mb-6 text-black tracking-[-0.8px]">
            AI Skin Analysis
          </h1>
          <p className="text-[15px] text-[#666] leading-relaxed mb-[30px] max-w-[450px]">
            Check your skin! Professional-grade dermatological analysis powered by advanced artificial intelligence.
          </p>

          <div className="grid grid-cols-2 gap-4">
            
            {/* Step 1 */}
            
            <div className="bg-[#e5e2dc]  p-[18px] rounded-[4px]">
              <span className="text-[10px] font-bold text-[#777] block mb-1 tracking-[0.5px]">STEP 1</span>
              <h3 className="text-[15px] font-bold text-black mb-1">Photo</h3>
              <p className="text-[12px] text-[#555] m-0 leading-snug">Take a photo of your skin area.</p>
            </div>

            {/* Step 2 */}
            <div className="bg-[#e5e2dc] p-[18px] rounded-[4px]">
              <span className="text-[10px] font-bold text-[#777] block mb-1 tracking-[0.5px]">STEP 2</span>
              <h3 className="text-[15px] font-bold text-black mb-1">Analyze</h3>
              <p className="text-[12px] text-[#555] m-0 leading-snug">AI instantly analyzes skin conditions.</p>
            </div>

            {/* Step 3 */}
            <div className="bg-[#e5e2dc] p-[18px] rounded-[4px]">
              <span className="text-[10px] font-bold text-[#777] block mb-1 tracking-[0.5px]">STEP 3</span>
              <h3 className="text-[15px] font-bold text-black mb-1">Consult</h3>
              <p className="text-[12px] text-[#555] m-0 leading-snug">AI asks specific questions.</p>
            </div>

            {/* Final Step */}
            <div className="bg-[#e5e2dc] p-[18px] rounded-[4px]">
              <span className="text-[10px] font-bold text-[#777] block mb-1 tracking-[0.5px]">FINAL STEP</span>
              <h3 className="text-[15px] font-bold text-black mb-1">Results</h3>
              <p className="text-[11.8px] text-[#556] m-0 leading-snug">Get Personalized Skincare Recommendations.</p>
            </div>

          </div>
        </div>

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
      <div className="text-center mt-10 mb-10">
        <button 
          onClick={onStartAssessment} 
          className="bg-black text-white px-12 py-4 text-xs font-bold tracking-[2px] border-none rounded-none cursor-pointer shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:bg-[#222] transition-all"
        >
          BEGIN ASSESSMENT
        </button>
      </div>

    </div>
  );
}