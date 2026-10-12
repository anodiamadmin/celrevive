import { useState, useEffect } from 'react';
import LandingIntro from './features/landing/LandingIntro';
import CapturePhoto from './features/camera/CapturePhoto';
import RecommendationPage from './features/recommendation/RecommendationPage';
import { useSessionStore } from './store/useSessionStore.js';

function App() {
  const currentStep = useSessionStore((state) => state.currentStep);
  const setStep = useSessionStore((state) => state.setStep);

  const [shopifyUser, setShopifyUser] = useState(null);

  useEffect(() => {
    const widgetRoot = document.getElementById('ai-skin-assessment');
    
    if (widgetRoot) {
      const { customerFirstName, customerId } = widgetRoot.dataset;
      
      setShopifyUser({
        firstName: customerFirstName || null,
        customerId: customerId || null
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