



// import { useState, useEffect } from 'react';
// import LandingIntro from './features/landing/LandingIntro';
// import PersonalInfo from './features/personalInfo/PersonalInfo';
// import CapturePhoto from './features/camera/CapturePhoto';
// import Questionnaire from './features/questionnaire/Questionnaire';
// import LoadingScreen from './features/recommendation/LoadingScreen';
// import RecommendationPage from './features/recommendation/RecommendationPage';

// function App() {
//   const [step, setStep] = useState('landing');
//   const [personalInfo, setPersonalInfo] = useState(null);
//   const [photo, setPhoto] = useState(null);
//   const [answers, setAnswers] = useState(null);
  
//   // [ADDED]: Backend se aane wale real AI analysis result ko store karne ke liye state
//   const [analysisResult, setAnalysisResult] = useState(null);

//   // ==========================================
//   // 🟢 SHOPIFY USER STATE (TEAMMATE ZONE)
//   // ==========================================
//   const [shopifyUser, setShopifyUser] = useState({
//     firstName: '',
//     customerId: ''
//   });

//   useEffect(() => {
//     // 🚨 TEAMMATE INSTRUCTIONS:
//     // Yahan par Shopify ka real data React mein inject karna hai (Liquid variables ya API Bridge se).
//     // Example: setShopifyUser({ firstName: window.customerName, customerId: window.customerId });
    
//     // Abhi frontend testing ke liye dummy user set kiya gaya hai:
//     setShopifyUser({
//       firstName: 'Emma', // Teammate: Ise real Shopify dynamic first name se replace karein
//       customerId: 'shop_123456789' // Teammate: Ise real Shopify Customer ID se replace karein
//     });
//   }, []);

//   return (
//     <>
//       {/* 1. Landing Page */}
//       {step === 'landing' && (
//         <LandingIntro onStartAssessment={() => setStep('camera')} />
//       )}

//      {/* 3. Camera / Photo Capture */}
//       {step === 'camera' && (
//         <CapturePhoto
//           // Teammate Note: Jab backend call mein customerId bhejna ho, toh 'shopifyUser.customerId' pass kar dena
//           onSubmit={(imageDataUrl, sessionId, backendData) => {
//             setPhoto(imageDataUrl);
            
//             console.log("App.jsx received backendData:", backendData);
            
//             if (backendData) {
//               setAnalysisResult(backendData); // 👈 Real data yahan save ho gaya
//             }
            
//             setStep('recommendation');
//           }}
//         />
//       )}

//       {/* 6. Recommendation Page */}
//       {step === 'recommendation' && (
//         <RecommendationPage 
//           result={analysisResult} 
//           // shopifyUser={shopifyUser} // Teammate Note: Agar backend se naam na aaye aur direct yahan se pass karna ho, toh isko uncomment kar lena.
//         />
//       )}


//       {/* for testing */}

//       {/* 6. Recommendation Page */}
//       {/* {step === 'recommendation' && (
//         <RecommendationPage 
//           result={{
//             user_full_name: "Azad Ansari", // 👈 Yahan apna full name daalo
//             primary_concerns: ["Testing Concern 1", "Testing Concern 2"] // Screen khali na dikhe isliye dummy concerns
//           }} 
//         />
//       )} */}
//     </>
//   );
// }

// export default App;




// changes for shopify
// pt-[140px] add karne se upar space mil jayegi
// {/* <div className="pt-[140px] min-h-screen"> 
   {/* baaki components */}
// </div> */}

// import { useState, useEffect } from 'react';
// import LandingIntro from './features/landing/LandingIntro';
// import PersonalInfo from './features/personalInfo/PersonalInfo';
// import CapturePhoto from './features/camera/CapturePhoto';
// import Questionnaire from './features/questionnaire/Questionnaire';
// import LoadingScreen from './features/recommendation/LoadingScreen';
// import RecommendationPage from './features/recommendation/RecommendationPage';

// function App() {
//   const [step, setStep] = useState('landing');
//   const [personalInfo, setPersonalInfo] = useState(null);
//   const [photo, setPhoto] = useState(null);
//   const [answers, setAnswers] = useState(null);
  
//   // [ADDED]: Backend se aane wale real AI analysis result ko store karne ke liye state
//   const [analysisResult, setAnalysisResult] = useState(null);

//   // ==========================================
//   // 🟢 SHOPIFY USER STATE (TEAMMATE ZONE)
//   // ==========================================
//   const [shopifyUser, setShopifyUser] = useState({
//     firstName: '',
//     customerId: ''
//   });

//   useEffect(() => {
//     // 🚨 TEAMMATE INSTRUCTIONS:
//     // Yahan par Shopify ka real data React mein inject karna hai (Liquid variables ya API Bridge se).
//     // Example: setShopifyUser({ firstName: window.customerName, customerId: window.customerId });
    
//     // Abhi frontend testing ke liye dummy user set kiya gaya hai:
//     setShopifyUser({
//       firstName: 'Emma', // Teammate: Ise real Shopify dynamic first name se replace karein
//       customerId: 'shop_123456789' // Teammate: Ise real Shopify Customer ID se replace karein
//     });
//   }, []);

//   return (
//     // 👇 YAHAN CHANGE KIYA HAI: Empty fragment <> ki jagah div lagaya aur usme classes daali hain
//     // <div className="pt-[140px] min-h-screen">

//     // new 
//     // <div className="min-h-screen">

//     //new new
//     // <div id="ai-skin-app" className="min-h-screen">

//     // new new new for main body in shopify
//     // Pehle ye tha: 
//     // <div id="ai-skin-app" className="min-h-screen">

//     // Ab isko aisa kardo (pt-[120px] ya pt-[140px] lagao):
//     <div id="ai-skin-app" className="pt-[120px] min-h-screen">
      
//       {/* 1. Landing Page */}
//       {step === 'landing' && (
//         <LandingIntro onStartAssessment={() => setStep('camera')} />
//       )}

//      {/* 3. Camera / Photo Capture */}
//       {step === 'camera' && (
//         <CapturePhoto
//           // Teammate Note: Jab backend call mein customerId bhejna ho, toh 'shopifyUser.customerId' pass kar dena
//           onSubmit={(imageDataUrl, sessionId, backendData) => {
//             setPhoto(imageDataUrl);
            
//             console.log("App.jsx received backendData:", backendData);
            
//             if (backendData) {
//               setAnalysisResult(backendData); // 👈 Real data yahan save ho gaya
//             }
            
//             setStep('recommendation');
//           }}
//         />
//       )}

//       {/* 6. Recommendation Page */}
//       {step === 'recommendation' && (
//         <RecommendationPage 
//           result={analysisResult} 
//           shopifyUser={shopifyUser} // Teammate Note: Agar backend se naam na aaye aur direct yahan se pass karna ho, toh isko uncomment kar lena.
//         />
//       )}


//       {/* for testing */}

//       {/* 6. Recommendation Page */}
//       {/* {step === 'recommendation' && (
//         <RecommendationPage 
//           result={{
//             user_full_name: "Azad Ansari", // 👈 Yahan apna full name daalo
//             primary_concerns: ["Testing Concern 1", "Testing Concern 2"] // Screen khali na dikhe isliye dummy concerns
//           }} 
//         />
//       )} */}
      
//     {/* 👇 YAHAN CHANGE KIYA HAI: Fragment closing </> ki jagah div close kiya hai */}
//     </div>
//   );
// }

// export default App;






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

  // ==========================================
  // 🟢 SHOPIFY USER STATE (NAME LOGIC)
  // ==========================================
  const [shopifyUser, setShopifyUser] = useState(null);

  useEffect(() => {
    // 🚨 TEAMMATE INSTRUCTIONS FOR SHOPIFY (COMMENTED FOR NOW):
    // Jab ye app real Shopify store par jayega, toh Liquid se customer ka naam React mein aise lana hoga:
    /*
    if (window.customerName) {
      setShopifyUser({ 
        firstName: window.customerName, 
        customerId: window.customerId 
      });
    }
    */

    // 👇 ABHI KE LIYE LOCAL TESTING (Jab Shopify par live karo toh isko hata dena)
    setShopifyUser({
      firstName: 'Azad Ansari', // Hum pura naam de rahe hain, aage code khud iska first name nikal lega
      customerId: 'shop_123456789' 
    });
  }, []);

  return (
    // 👇 YAHAN CHANGE KIYA HAI: Empty fragment <> ki jagah div lagaya aur usme classes daali hain
    // <div className="pt-[140px] min-h-screen">

    // new 
    // <div className="min-h-screen">

    //new new
    // <div id="ai-skin-app" className="min-h-screen">

    // new new new for main body in shopify
    // Pehle ye tha: 
    // <div id="ai-skin-app" className="min-h-screen">

    // Ab isko aisa kardo (pt-[120px] ya pt-[140px] lagao):
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
          shopifyUser={shopifyUser} // 👈 Yahan se naam aage pass ho raha hai
        />
      )}
      
    </div>
  );
}

export default App;