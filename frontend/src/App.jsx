import { useState, useEffect } from 'react';
import LandingIntro from './features/landing/LandingIntro';
import CapturePhoto from './features/camera/CapturePhoto';
import Questionnaire from './features/questionnaire/Questionnaire';
import RecommendationPage from './features/recommendation/RecommendationPage';
import { useSessionStore } from './store/useSessionStore.js';

function App() {
  const currentStep = useSessionStore((state) => state.currentStep);
  const setStep = useSessionStore((state) => state.setStep);

  const [shopifyUser, setShopifyUser] = useState(null);

  useEffect(() => {
    const widgetRoot = document.getElementById('ai-skin-assessment');

    if (widgetRoot) {
      const { customerFirstName, customerName, customerId, customerEmail } = widgetRoot.dataset;

      setShopifyUser({
        firstName: customerFirstName || customerName || null,
        customerId: customerId || null,
        email: customerEmail || null,
      });
    }
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col">
      {currentStep === 'landing' && (
        <LandingIntro onStartAssessment={() => setStep('camera')} />
      )}

      {currentStep === 'camera' && (
        <CapturePhoto
          onSubmit={() => {
            setStep('questionnaire');
          }}
        />
      )}

      {currentStep === 'questionnaire' && (
        <Questionnaire
          onComplete={() => {
            setStep('recommendation');
          }}
        />
      )}

      {currentStep === 'recommendation' && (
        <RecommendationPage shopifyUser={shopifyUser} />
      )}
    </div>
  );
}

export default App;