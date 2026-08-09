import { useState } from 'react';
import LandingIntro from './features/landing/LandingIntro';
import CapturePhoto from './features/camera/CapturePhoto';
import Questionnaire from './features/questionnaire/Questionnaire';
import LoadingScreen from './features/recommendation/LoadingScreen'; // Path updated

function App() {
  // 'landing' | 'camera' | 'questionnaire' | 'loading' | 'recommendation'
  const [step, setStep] = useState('landing');
  const [photo, setPhoto] = useState(null);
  const [answers, setAnswers] = useState(null);

  return (
    <>
      {step === 'landing' && (
        <LandingIntro onStartAssessment={() => setStep('camera')} />
      )}

      {step === 'camera' && (
        <CapturePhoto
          onSubmit={(imageDataUrl) => {
            setPhoto(imageDataUrl);
            setStep('questionnaire');
          }}
        />
      )}

      {step === 'questionnaire' && (
        <Questionnaire
          onComplete={(collectedAnswers) => {
            setAnswers(collectedAnswers);
            console.log('Photo captured:', photo);
            console.log('Questionnaire answers:', collectedAnswers);
            setStep('loading');
          }}
        />
      )}

      {/* Loading Screen */}
      {step === 'loading' && <LoadingScreen />}
    </>
  );
}

export default App;