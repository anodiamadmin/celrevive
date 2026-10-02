
// before shopify intigration

// import React from 'react';
// import { CheckCircle2, Sparkles } from 'lucide-react';

// export default function RecommendationPage({ result }) {
//   console.log("RecommendationPage final result received:", result);

//   // 1. Fallback agar result khali ho
//   const data = result || {};
//   const userName = data.user_full_name || 'Valued Customer';
  
//   // 2. Backend ka 'primary_concerns' array nikalna
//   const rawConcerns = data.primary_concerns || [];

//   // 3. Duplicate values ko hatane ke liye JavaScript 'Set' ka use kiya hai
//   const uniqueConcerns = [...new Set(rawConcerns)];

//   return (
//     <div className="min-h-screen bg-slate-50 px-6 py-10 sm:px-16">
      
//       {/* Greeting Header */}
//       <div className="mb-8">
//         <h1 className="text-3xl font-bold text-slate-900">Hello {userName}! 👋</h1>
//         <p className="mt-1 text-sm text-slate-500">Your detailed report is ready.</p>
//       </div>

//       <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
//         <h2 className="mb-6 text-xl font-semibold text-teal-800 border-b pb-3">
//           Skin Analysis Result:
//         </h2>

//         {uniqueConcerns.length > 0 ? (
//           <div>
//             <p className="mb-4 text-sm font-semibold text-slate-900">
//               Primary Concerns Detected:
//             </p>
//             <ul className="space-y-3">
//               {uniqueConcerns.map((concernName, index) => (
//                 <li 
//                   key={index} 
//                   className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 border border-slate-100"
//                 >
//                   <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0" />
//                   <span className="font-medium text-slate-800 text-sm">
//                     {concernName}
//                   </span>
//                 </li>
//               ))}
//             </ul>
//           </div>
//         ) : (
//           /* Agar koi concern nahi hai (Perfect Skin) */
//           <div className="flex flex-col items-center justify-center rounded-xl bg-green-50 p-6 text-center border border-green-100">
//             <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
//               <Sparkles className="h-6 w-6" />
//             </div>
//             <h3 className="text-lg font-bold text-green-800">Your Skin is Looking Great!</h3>
//             <p className="mt-1 text-sm text-green-700">
//               We could not find any major concerns.
//             </p>
//           </div>
//         )}

//       </div>
//     </div>
//   );
// }


// import React from 'react';
// import { CheckCircle2, Sparkles } from 'lucide-react';

// export default function RecommendationPage({ result }) {
//   console.log("RecommendationPage final result received:", result);

//   // 1. Fallback agar result khali ho
//   const data = result || {};
//   const userName = data.user_full_name || 'Valued Customer';
  
//   // ==========================================
//   // 🟢 SESSION ID LOGIC (MANUAL vs DYNAMIC)
//   // ==========================================
  
//   // Option A: Hardcoded Session ID (Abhi testing ke liye jo aapne manually define kiya hai)
//   const manualSessionId = "5581e1d0-4e59-448c-b5a3-1187c05c2365"; 
  
//   // Option B: Dynamic Session ID (Jo backend API response se aayega)
//   const dynamicSessionId = data.session_id;

//   // 👇 Yahan aap choose kar sakte hain ki konsa ID use karna hai:
//   // Agar API se aane wala ID use karna hai toh dynamicSessionId rakhein.
//   // Agar manual test karna hai toh manualSessionId rakhein.
//   const activeSessionId = dynamicSessionId || manualSessionId; 
  
//   console.log("Current Active Session ID for Shopify/Concerns:", activeSessionId);

//   // ==========================================
//   // 🟢 CONCERN DUPLICATION HANDLING
//   // ==========================================
  
//   const rawConcerns = data.primary_concerns || [];

//   // Yahan hum JavaScript 'Set' ka use kar rahe hain.
//   // Yeh automatically check karega:
//   // - Agar backend se ek concern 10 baar aaya, toh ye usko sirf 1 baar hi array mein rakhega.
//   // - Agar backend theek hone ke baad concern naturally 1 hi baar aata hai, toh bhi ye bina kisi error ke perfectly kaam karega.
//   // Dono hi cases mein aapko clean aur unique array milega.
//   const uniqueConcerns = [...new Set(rawConcerns)];

//   return (
//     <div className="min-h-screen bg-slate-50 px-6 py-10 sm:px-16">
      
//       {/* Greeting Header */}
//       <div className="mb-8">
//         <h1 className="text-3xl font-bold text-slate-900">Hello {userName}! 👋</h1>
//         <h2 className="mt-1 text-sm text-slate-500">Your detailed report is ready.</h2>
//         {/* Abhi ke liye screen par session ID dikha raha hoon taaki test kar sako, baad mein hata denge */}
//         {/* <p className="mt-1 text-xs text-slate-400">Session: {activeSessionId}</p> */}
//       </div>

//       <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
//         <h2 className="mb-6 text-xl font-semibold text-teal-800 pb-3">
//           Skin Analysis Result:
//         </h2>

//         {uniqueConcerns.length > 0 ? (
//           <div>
//             <p className="mb-4 text-sm font-semibold text-slate-900">
//               Primary Concerns:
//             </p>
//             {/* 🚧 UI Note: Abhi yeh list format mein hai. 
//                 Jab aap wireframe denge, hum isko comma-separated text mein badal denge. */}
//             <ul className="space-y-3">
//               {uniqueConcerns.map((concernName, index) => (
//                 <li 
//                   key={index} 
//                   className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 border border-slate-100"
//                 >
//                   <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0" />
//                   <span className="font-medium text-slate-800 text-sm">
//                     {concernName}
//                   </span>
//                 </li>
//               ))}
//             </ul>
//           </div>
//         ) : (
//           /* Agar koi concern nahi hai (Perfect Skin) */
//           <div className="flex flex-col items-center justify-center rounded-xl bg-green-50 p-6 text-center border border-green-100">
//             <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
//               <Sparkles className="h-6 w-6" />
//             </div>
//             <h3 className="text-lg font-bold text-green-800">Your Skin is Looking Great!</h3>
//             <p className="mt-1 text-sm text-green-700">
//               We could not find any major concerns.
//             </p>
//           </div>
//         )}

//       </div>
//     </div>
//   );
// }



import React from 'react';
import { Sparkles } from 'lucide-react';

export default function RecommendationPage({ result }) {
  
  // 1. App.jsx se aane wala data (jo CapturePhoto ne backend se laya tha), hum use yahan receive karte hain.
  // Agar result kisi wajah se null aaye, toh app crash na ho isliye ek khali object {} fallback rakha hai.
  const data = result || {};
  
  // ==========================================
  // 🟢 NAME FORMATTING LOGIC
  // ==========================================
  // 2. Hum backend se aane wale poore naam ko padhte hain (e.g., "Emma Smith").
  const fullName = data.user_full_name || 'Valued Customer';

  // for test fullname and fetch first name.
  // const fullName = data.user_full_name || 'Azad Ansari';
  
  // 3. Poore naam mein se space (' ') ke hisaab se pehla hissa nikal lete hain.
  // Taaki screen par "Hello Emma Smith" ki jagah sirf "Hello Emma" dikhe.
  const firstName = fullName.split(' ')[0];

  // ==========================================
  // 🟢 CONCERN FORMATTING LOGIC
  // ==========================================
  // 4. Backend ne jo concerns ki list bheji hai (e.g., ["Dehydration", "Barrier damage", "Dehydration"]), usko padhte hain.
  const rawConcerns = data.primary_concerns || [];
  
  // 5. JavaScript 'Set' ka use karke hum duplicates ko hata dete hain.
  // Ab array mein sirf unique naam bachenge (e.g., ["Dehydration", "Barrier damage"]).
  const uniqueConcerns = [...new Set(rawConcerns)];

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 sm:px-16">
      
      {/* 6. Greeting Header: Yahan upar nikala gaya firstName show hota hai */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Hello {firstName}!</h1>
        <p className="mt-1 text-sm text-slate-500">Your detailed report is ready.</p>
      </div>

      <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-xl font-semibold text-teal-800 ">
          Skin Analysis Result:
        </h2>

        {/* 7. Check karte hain ki kya koi concern mila hai? */}
        {uniqueConcerns.length > 0 ? (
          <div>
            {/* 8. Agar concern mila, toh unhe comma se jod kar (join(', ')) ek line mein dikhate hain */}
            <p className="text-sm text-slate-700">
              <span className="font-semibold text-slate-800">Primary Concerns: </span> 
              {uniqueConcerns.join(', ')}.
            </p>
          </div>
        ) : (
          /* 9. Agar uniqueConcerns array khali hai, toh "Your Skin is Looking Great!" dikhate hain */
          <div className="flex flex-col items-center justify-center rounded-xl bg-green-50 p-6 text-center border border-green-100">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-green-800">Your Skin is Looking Great!</h3>
            <p className="mt-1 text-sm text-green-700">
              We could not find any major concerns.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}