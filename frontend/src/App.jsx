// import { useState } from 'react';
// import LandingIntro from './features/landing/LandingIntro';
// import PersonalInfo from './features/personalInfo/PersonalInfo';
// import CapturePhoto from './features/camera/CapturePhoto';
// import Questionnaire from './features/questionnaire/Questionnaire';
// import LoadingScreen from './features/recommendation/LoadingScreen';

// function App() {
//   const [step, setStep] = useState('landing');
//   const [personalInfo, setPersonalInfo] = useState(null);
//   const [photo, setPhoto] = useState(null);
//   const [answers, setAnswers] = useState(null);

//   return (
//     <>
//       {/* 1. Landing Page */}
//       {step === 'landing' && (
//         <LandingIntro onStartAssessment={() => setStep('personal-info')} />
//       )}

//       {/* 2. Personal Info Form */}
//       {step === 'personal-info' && (
//         <PersonalInfo
//           initialData={personalInfo}
//           onPrevious={() => setStep('landing')}
//           // CHANGES HERE: 'onNext' ko 'onSaved' kar diya hai taaki component ke prop se match ho sake
//           onSaved={(data) => {
//             setPersonalInfo(data); // User ka data save ho gaya
//             setStep('camera');     // User ab camera section mein chala jayega
//           }}
//         />
//       )}

//       {/* 3. Camera / Photo Capture */}
//       {step === 'camera' && (
//         <CapturePhoto
//           onSubmit={(imageDataUrl) => {
//             setPhoto(imageDataUrl);
//             setStep('questionnaire');
//           }}
//         />
//       )}

//       {/* 4. Questionnaire */}
//       {step === 'questionnaire' && (
//         <Questionnaire
//           onComplete={(collectedAnswers) => {
//             setAnswers(collectedAnswers);
//             console.log('Personal Info:', personalInfo);
//             console.log('Photo captured:', photo);
//             console.log('Questionnaire answers:', collectedAnswers);
//             setStep('loading');
//           }}
//         />
//       )}

//       {/* 5. Loading Screen */}
//       {step === 'loading' && <LoadingScreen />}
//     </>
//   );
// }

// export default App;



import { useState } from 'react';
import LandingIntro from './features/landing/LandingIntro';
import PersonalInfo from './features/personalInfo/PersonalInfo';
import CapturePhoto from './features/camera/CapturePhoto';
import Questionnaire from './features/questionnaire/Questionnaire';
import LoadingScreen from './features/recommendation/LoadingScreen';
// ADDED: import the new Recommendation page
// import RecommendationPage from './features/recommendation/RecommendationPage';

function App() {
  const [step, setStep] = useState('landing');
  const [personalInfo, setPersonalInfo] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [answers, setAnswers] = useState(null);

  return (
    <>
      {/* 1. Landing Page */}
      {step === 'landing' && (
        <LandingIntro onStartAssessment={() => setStep('personal-info')} />
      )}

      {/* 2. Personal Info Form */}
      {step === 'personal-info' && (
        <PersonalInfo
          initialData={personalInfo}
          onPrevious={() => setStep('landing')}
          // CHANGES HERE: 'onNext' ko 'onSaved' kar diya hai taaki component ke prop se match ho sake
          onSaved={(data) => {
            setPersonalInfo(data); // User ka data save ho gaya
            setStep('camera');     // User ab camera section mein chala jayega
          }}
        />
      )}

      {/* 3. Camera / Photo Capture */}
      {step === 'camera' && (
        <CapturePhoto
          onSubmit={(imageDataUrl) => {
            setPhoto(imageDataUrl);
            setStep('questionnaire');
          }}
        />
      )}

      {/* 4. Questionnaire */}
      {step === 'questionnaire' && (
        <Questionnaire
          onComplete={(collectedAnswers) => {
            setAnswers(collectedAnswers);
            console.log('Personal Info:', personalInfo);
            console.log('Photo captured:', photo);
            console.log('Questionnaire answers:', collectedAnswers);
            setStep('loading');
          }}
        />
      )}

      {/* 5. Loading Screen */}
      {/* CHANGED: added onComplete so LoadingScreen can move the user forward
          into the recommendation page once its loading delay/animation finishes.
          If LoadingScreen doesn't currently call an onComplete prop internally,
          see the note below this code block for how to add it. */}
      {step === 'loading' && (
        <LoadingScreen onComplete={() => setStep('recommendation')} />
      )}

      {/* 6. Recommendation Page (ADDED) */}
      {/* Using dummy data for now — RecommendationPage defaults to DUMMY_RESULT
          when no `result` prop is passed, so this works as-is. */}
      {/* {step === 'recommendation' && <RecommendationPage />} */}
    </>
  );
}

export default App;