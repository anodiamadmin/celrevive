import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, RefreshCcw } from 'lucide-react';
import { pollImageAnalysis } from '../../api';
import { useSessionStore } from '../../store/useSessionStore';

export default function RecommendationPage({ shopifyUser }) {
  const sessionId = useSessionStore((state) => state.sessionId);
  const clearSession = useSessionStore((state) => state.clearSession);
  
  const [result, setResult] = useState(null);
  const [isPolling, setIsPolling] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      setError('Session ID is missing.');
      setIsPolling(false);
      return;
    }

    let isMounted = true;

    const fetchResults = async () => {
      try {
        const data = await pollImageAnalysis(sessionId);
        if (isMounted) {
          setResult(data);
          setIsPolling(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'An error occurred during analysis.');
          setIsPolling(false);
        }
      }
    };

    fetchResults();

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  if (isPolling) {
    return (
      <div className="flex flex-col items-center justify-center bg-[var(--bg)] px-[24px] py-[80px] text-center">
        <Loader2 className="mb-[16px] h-[48px] w-[48px] animate-spin text-[var(--text-h)]" />
        <h2 className="text-[20px] font-bold text-[var(--text-h)]">Analyzing your skin...</h2>
        <p className="mt-[8px] text-[14px] text-[var(--text)]">We are generating your custom routine.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center bg-[var(--bg)] px-[24px] py-[80px] text-center">
        <div className="max-w-[448px] rounded-xl border border-red-200 bg-red-50 p-[24px]">
          <h2 className="text-[18px] font-bold text-red-700">Analysis Failed</h2>
          <p className="mt-[8px] text-[14px] text-red-600">{error}</p>
          
          <button 
            onClick={clearSession}
            className="mt-[24px] flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-[16px] py-[8px] text-[14px] font-semibold text-white hover:bg-red-700"
          >
            <RefreshCcw className="h-[16px] w-[16px]" /> Start Over
          </button>
        </div>
      </div>
    );
  }

  const data = result || {};
  let firstName = 'Customer'; 

  if (shopifyUser && shopifyUser.firstName) {
    firstName = shopifyUser.firstName.trim().split(' ')[0];
  } 
  else if (data.user_full_name) {
    firstName = data.user_full_name.trim().split(' ')[0];
  }

  const rawConcerns = data.primary_concerns || [];
  const uniqueConcerns = [...new Set(rawConcerns)];

  return (
    <div className="flex flex-col bg-[var(--bg)] px-[24px] py-[40px] sm:px-[64px]">
      
      <div className="mb-[32px]">
        <h1 className="text-[30px] font-bold text-[var(--text-h)] leading-tight">Hello {firstName}!</h1>
        <p className="mt-[4px] text-[14px] text-[var(--text)]">Your detailed report is ready.</p>
      </div>

      <div className="max-w-[576px] rounded-2xl border border-[var(--border)] bg-[var(--code-bg)] p-[32px] shadow-sm">
        <h2 className="mb-[24px] text-[20px] font-semibold text-[var(--text-h)]">
          Skin Analysis Result:
        </h2>

        {uniqueConcerns.length > 0 ? (
          <div>
            <p className="text-[14px] leading-relaxed text-[var(--text)]">
              <span className="font-semibold text-[var(--text-h)]">Primary Concerns: </span> 
              {/* Inline style strictly overrides Shopify global theme bolding rules */}
              <span style={{ fontWeight: 400 }}>{uniqueConcerns.join(', ')}.</span>
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg)] p-[24px] text-center">
            <div className="mb-[12px] flex h-[48px] w-[48px] items-center justify-center rounded-full bg-[var(--accent-bg)] text-[var(--accent)]">
              <Sparkles className="h-[24px] w-[24px]" />
            </div>
            <h3 className="text-[18px] font-bold text-[var(--text-h)]">Your Skin is Looking Great!</h3>
            <p className="mt-[4px] text-[14px] text-[var(--text)]">
              We could not find any major concerns.
            </p>
          </div>
        )}
      </div>

      {/* Destruct Session / Start Over Button */}
      <div className="mt-[32px] flex w-full justify-center">
        <button 
          onClick={clearSession}
          className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-[var(--text-h)] px-[32px] py-[12px] text-[14px] font-semibold tracking-wide text-[var(--bg)] transition-opacity hover:opacity-90"
        >
          <RefreshCcw className="h-[16px] w-[16px]" /> Take Another Assessment
        </button>
      </div>

    </div>
  );
}