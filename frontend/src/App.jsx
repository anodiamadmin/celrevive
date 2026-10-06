import { useState, useEffect } from 'react';
import LandingIntro from './features/landing/LandingIntro';
import PersonalInfo from './features/personalInfo/PersonalInfo';
import CapturePhoto from './features/camera/CapturePhoto';
import Questionnaire from './features/questionnaire/Questionnaire';
import LoadingScreen from './features/recommendation/LoadingScreen';
import RecommendationPage from './features/recommendation/RecommendationPage';

function App() {
  const [step, setStep] = useState('landing');
  const [personalInfo, setPersonalInfo] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [answers, setAnswers] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [shopifyUser, setShopifyUser] = useState(null);

  useEffect(() => {
    setShopifyUser({
      firstName: 'Azad Ansari',
      customerId: 'shop_123456789' 
    });
  }, []);

  return (

    <div id="ai-skin-assessment" className="pt-[120px] min-h-screen">
      
      {/* 1. Landing Page */}
      {step === 'landing' && (
        <LandingIntro onStartAssessment={() => setStep('camera')} />
      )}

      {/* 3. Camera / Photo Capture */}
      {step === 'camera' && (
        <CapturePhoto
          onSubmit={(imageDataUrl, sessionId, backendData) => {
            setPhoto(imageDataUrl);
            console.log("App.jsx received backendData:", backendData);
            
            if (backendData) {
              setAnalysisResult(backendData); 
            }
            setStep('recommendation');
          }}
        />
      )}

      {/* 6. Recommendation Page */}
      {step === 'recommendation' && (
        <RecommendationPage 
          result={analysisResult} 
          shopifyUser={shopifyUser}
        />
      )}
      
    </div>
  );
}

export default App;