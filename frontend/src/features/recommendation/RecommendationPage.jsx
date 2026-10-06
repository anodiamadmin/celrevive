
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



import React from 'react';
import { Sparkles } from 'lucide-react';

export default function RecommendationPage({ result, shopifyUser }) {
  
  const data = result || {};
  
  // ==========================================
  // 🟢 STRICT FIRST NAME LOGIC
  // ==========================================
  let firstName = 'Customer'; 

  // 1. Shopify se naam aata hai toh uska First Name lo
  if (shopifyUser && shopifyUser.firstName) {
    firstName = shopifyUser.firstName.trim().split(' ')[0];
  } 
  // 2. Nahi toh backend wale data se First Name lo
  else if (data.user_full_name) {
    firstName = data.user_full_name.trim().split(' ')[0];
  }

  // ==========================================
  // 🟢 CONCERN DUPLICATION HANDLING LOGIC
  // ==========================================
  const rawConcerns = data.primary_concerns || [];
  // 👇 Tumhara duplicate hatane wala logic yahan already hai!
  const uniqueConcerns = [...new Set(rawConcerns)];

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 sm:px-16">
      
      {/* Greeting Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Hello {firstName}!</h1>
        <p className="mt-1 text-sm text-slate-500">Your detailed report is ready.</p>
      </div>

      <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-xl font-semibold text-teal-800 ">
          Skin Analysis Result:
        </h2>

        {uniqueConcerns.length > 0 ? (
          <div>
            <p className="text-sm text-slate-700">
              <span className="font-semibold text-slate-800">Primary Concerns: </span> 
              {uniqueConcerns.join(', ')}.
            </p>
          </div>
        ) : (
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