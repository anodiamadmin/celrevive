import React from 'react';
import { Sparkles } from 'lucide-react';

export default function RecommendationPage({ result, shopifyUser }) {
  
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
    <div className="min-h-screen bg-[var(--bg)] px-6 py-10 sm:px-16">
      
      {/* Greeting Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-h)]">Hello {firstName}!</h1>
        <p className="mt-1 text-sm text-[var(--text)]">Your detailed report is ready.</p>
      </div>

      <div className="max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--code-bg)] p-8 shadow-sm">
        <h2 className="mb-6 text-xl font-semibold text-[var(--text-h)]">
          Skin Analysis Result:
        </h2>

        {uniqueConcerns.length > 0 ? (
          <div>
            <p className="text-sm text-[var(--text-h)]">
              <span className="font-semibold">Primary Concerns: </span> 
              {uniqueConcerns.join(', ')}.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl bg-[var(--bg)] border border-[var(--border)] p-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-bg)] text-[var(--accent)]">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-h)]">Your Skin is Looking Great!</h3>
            <p className="mt-1 text-sm text-[var(--text)]">
              We could not find any major concerns.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}