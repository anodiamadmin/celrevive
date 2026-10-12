import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useSessionStore = create(
  persist(
    (set) => ({
      sessionId: null,
      currentStep: 'landing', // Tracks the active page: 'landing', 'capture', 'questionnaire' or 'recommendation'
      
      setSessionId: (id) => set({ sessionId: id }),
      setStep: (step) => set({ currentStep: step }),
      clearSession: () => set({ sessionId: null, currentStep: 'landing' }),
    }),
    {
      name: 'skin-assessment-session',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);