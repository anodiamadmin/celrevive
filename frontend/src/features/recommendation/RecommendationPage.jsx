// import { ArrowRight } from 'lucide-react';

// const DUMMY_RESULT = {
//   userName: 'Emma',
//   skinAnalysis: {
//     skinType: 'Dry / Mature',
//     sensitiveLevel: 'High – Prone to tight sensation, flakiness, and visible redness.',
//     primaryConcerns: 'Dehydration, Barrier damage.',
//   },
//   recommendation: {
//     baseName: 'Rich Cream (85g)',
//     baseReason:
//       'Chosen for high occlusivity, balanced emolliency, and enhanced moisture retention.',
//     activeIngredients: [
//       {
//         name: 'Ectoin® natural (10g)',
//         benefit: 'Provides high hydration and barrier protection.',
//       },
//       {
//         name: 'TRI-SOLVE® (5g)',
//         benefit: 'Intensive barrier repair specifically for dry skin.',
//       },
//     ],
//     whyThisFormula:
//       'Ectoin® natural delivers superior hydration, while TRI-SOLVE® provides targeted barrier repair for highly sensitive, dry skin profiles.',
//   },
// };

// export default function RecommendationPage({ result = DUMMY_RESULT, onAddToCart }) {
//   const { userName, skinAnalysis, recommendation } = result;

//   const handleAddToCart = () => {
//     console.log('Add to Cart clicked for:', recommendation.baseName);
//     onAddToCart?.(recommendation);
//     alert('Added to cart (dummy action) — this will call the real Shopify cart API later.');
//   };

//   return (
//     // CHANGED: reduced top padding (py-12 -> pt-6 pb-12) so the heading sits
//     // closer to the top of the viewport instead of vertically centered-looking.
//     <div className="min-h-screen bg-white px-10 pb-12 pt-6 sm:px-16">
//       {/* Greeting */}
//       {/* CHANGED: mb-10 -> mb-6 to tighten the gap between the heading block and the cards,
//           which pulls both cards upward along with the heading. */}
//       <div className="mb-6">
//         <h1 className="text-4xl font-semibold text-slate-900">Hello {userName}!</h1>
//         <p className="mt-2 text-base text-gray-500">Your detailed report is ready.</p>
//       </div>

//       {/* CHANGED: added lg:items-start (kept items-start for mobile too) and self-start
//           isn't needed since flex children shrink-to-fit by default here — this keeps
//           each card's height fully driven by its own content, so as the Active
//           Ingredients list grows/shrinks the right card resizes dynamically without
//           stretching or affecting the left card's height. */}
//       <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-start">
//         {/* Left card: Skin Analysis Result — shrink-to-fit, no stretching */}
//         <div className="w-full rounded-2xl border border-gray-200 bg-white p-8 lg:w-[46%]">
//           <h2 className="mb-6 text-xl font-medium text-teal-800">
//             Skin Analysis Result:
//           </h2>

//           <div className="space-y-4 text-[15px] leading-relaxed text-slate-800">
//             <p>
//               <span className="font-semibold">Skin Type:</span>{' '}
//               {skinAnalysis.skinType}.
//             </p>
//             <p>
//               <span className="font-semibold">Sensitive Level:</span>{' '}
//               {skinAnalysis.sensitiveLevel}
//             </p>
//             <p>
//               <span className="font-semibold">Primary Concerns:</span>{' '}
//               {skinAnalysis.primaryConcerns}
//             </p>
//           </div>
//         </div>

//         {/* Right card: Recommended For You — naturally taller since it has more content.
//             CHANGED: Active Ingredients block now comes BEFORE the Base block (order swapped
//             per request), with the divider moved to sit between Active Ingredients and Base. */}
//         <div className="w-full rounded-2xl border border-gray-200 bg-white p-8 lg:w-[54%]">
//           <h2 className="mb-6 text-xl font-medium text-teal-800">
//             Recommended For You:
//           </h2>

//           <p className="text-sm font-semibold text-slate-900">
//             Active Ingredients:
//           </p>
//           <ul className="mt-3 space-y-2">
//             {recommendation.activeIngredients.map((ingredient) => (
//               <li
//                 key={ingredient.name}
//                 className="flex gap-2 text-sm leading-relaxed text-slate-800"
//               >
//                 <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-800" />
//                 <span>
//                   <span className="font-semibold">{ingredient.name}</span> –{' '}
//                   {ingredient.benefit}
//                 </span>
//               </li>
//             ))}
//           </ul>

//           <hr className="my-6 border-gray-200" />

//           <p className="text-sm font-semibold text-slate-900">
//             Base: {recommendation.baseName}
//           </p>
//           <p className="mt-1 text-sm italic text-gray-500">
//             {recommendation.baseReason}
//           </p>

//           <hr className="my-6 border-gray-200" />

//           <p className="text-sm leading-relaxed text-slate-800">
//             <span className="font-semibold">Why this formula?</span>{' '}
//             {recommendation.whyThisFormula}
//           </p>

//           <div className="mt-8 flex justify-center">
//             <button
//               type="button"
//               onClick={handleAddToCart}
//               className="flex items-center gap-2 rounded-lg bg-black px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
//             >
//               Add to Cart <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }




// const DUMMY_RESULT = {
//   userName: 'Emma',
//   hasConcerns: false, // 👈  'false' , "We could not find any concern!" dikhega
//   skinAnalysis: {
//     primaryConcerns: 'Active acne, Sebum production, Pore visibility.', 
//   }
// };

// export default function RecommendationPage({ result = DUMMY_RESULT }) {
//   // Result se sirf userName, hasConcerns aur skinAnalysis nikal liya
//   const { userName, hasConcerns, skinAnalysis } = result;

//   return (
//     <div className="min-h-screen bg-white px-10 pb-12 pt-6 sm:px-16">
//       {/* Greeting */}
//       <div className="mb-6">
//         <h1 className="text-4xl font-semibold text-slate-900">Hello {userName}!</h1>
//         <p className="mt-2 text-base text-gray-500">Your detailed report is ready.</p>
//       </div>

//       <div className="flex flex-col items-start gap-6">
        
//         {/* ONLY Left card: Skin Analysis Result */}
//         {/* (w-full aur lg:w-[46%] rakha hai taaki card ki width design jaisi hi rahe) */}
//         <div className="w-full rounded-2xl border border-gray-200 bg-white p-8 lg:w-[46%]">
//           <h2 className="mb-6 text-xl font-medium text-teal-800">
//             Skin Analysis Result:
//           </h2>

//           <div className="space-y-4 text-[15px] leading-relaxed text-slate-800">
//             {/* Condition: Agar concerns hain toh Primary Concerns dikhao, warna No Concern message */}
//             {hasConcerns ? (
//               <p>
//                 <span className="font-semibold">Primary Concerns:</span>{' '}
//                 {skinAnalysis.primaryConcerns}
//               </p>
//             ) : (
//             //   <p className="font-medium text-slate-800">
//               <p className="text-base font-medium text-red-500">
//                 We could not find any concern!
//               </p>
//             )}
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// }



// const DUMMY_RESULT = {
//   user_full_name: 'Emma',
//   primary_concerns: ['Active acne', 'Sebum production', 'Pore visibility'] 
// };

// export default function RecommendationPage({ result }) {
//   // Safe fallback agar result empty ya undefined aaye
//   const finalResult = result && Object.keys(result).length > 0 ? result : DUMMY_RESULT;

//   const user_full_name = finalResult.user_full_name || finalResult.userName || 'Valued Customer';
//   const rawConcerns = finalResult.primary_concerns || finalResult.skinAnalysis?.primaryConcerns || [];

//   // Check karo ki concerns hain ya nahi
//   const hasConcerns = Array.isArray(rawConcerns) ? rawConcerns.length > 0 : Boolean(rawConcerns);

//   // Agar concerns objects hain ( jaise {name: 'Acne'} ya {skin_concern_name: 'Acne'}), toh unhe text mein convert karo
//   let formattedConcerns = '';
//   if (Array.isArray(rawConcerns)) {
//     formattedConcerns = rawConcerns
//       .map(item => (typeof item === 'object' ? item.name || item.skin_concern_name : item))
//       .filter(Boolean)
//       .join(', ');
//   } else {
//     formattedConcerns = String(rawConcerns);
//   }

//   const isConcernAvailable = Boolean(formattedConcerns && formattedConcerns.trim().length > 0);

//   return (
//     <div className="min-h-screen bg-white px-10 pb-12 pt-6 sm:px-16">
      
//       {/* Greeting Section */}
//       <div className="mb-6">
//         <h1 className="text-4xl font-semibold text-slate-900">Hello {user_full_name}!</h1>
//         <p className="mt-2 text-base text-gray-500">Your detailed report is ready.</p>
//       </div>

//       <div className="flex flex-col items-start gap-6">
        
//         {/* Skin Analysis Result Card */}
//         <div className="w-full rounded-2xl border border-gray-200 bg-white p-8 lg:w-[46%] shadow-sm">
//           <h2 className="mb-6 text-xl font-medium text-teal-800">
//             Skin Analysis Result:
//           </h2>

//           <div className="space-y-4 text-[15px] leading-relaxed text-slate-800">
            
//             {isConcernAvailable ? (
//               <p>
//                 <span className="font-semibold text-slate-900">Primary Concerns Detected:</span>{' '}
//                 <br />
//                 <span className="text-slate-700">{formattedConcerns}</span>
//               </p>
//             ) : (
//               <div className="rounded-lg bg-green-50 p-4 border border-green-100">
//                 <p className="text-base font-semibold text-green-700">
//                   Your skin is looking great! ✨
//                 </p>
//                 <p className="mt-1 text-sm text-green-600">
//                   We could not find any major concerns.
//                 </p>
//               </div>
//             )}
            
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// }

// import React from 'react';
// import { CheckCircle2, Sparkles } from 'lucide-react';

// export default function RecommendationPage({ result }) {
//   const data = result || {};
//   const userName = data.user_full_name || data.userName || 'Valued Customer';
  
//   // Terminal wale 'image_skin_concerns' array ko nikalna
//   const allConcerns = data.image_skin_concerns || [];

//   // Sirf unhi concerns ke naam lena jinka 'skin_concern_exists' TRUE hai
//   const activeConcerns = allConcerns
//     .filter((item) => item.skin_concern_exists === true)
//     .map((item) => item.skin_concern_name);

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

//         {activeConcerns.length > 0 ? (
//           <div>
//             <p className="mb-4 text-sm font-semibold text-slate-900">
//               Primary Concerns Detected:
//             </p>
//             <ul className="space-y-3">
//               {activeConcerns.map((concernName, index) => (
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
//           /* Agar koi concern true nahi hai (Perfect Skin) */
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
import { CheckCircle2, Sparkles } from 'lucide-react';

export default function RecommendationPage({ result }) {
  console.log("RecommendationPage final result received:", result);

  // 1. Fallback agar result khali ho
  const data = result || {};
  const userName = data.user_full_name || 'Valued Customer';
  
  // 2. Backend ka 'primary_concerns' array nikalna
  const rawConcerns = data.primary_concerns || [];

  // 3. Duplicate values ko hatane ke liye JavaScript 'Set' ka use kiya hai
  const uniqueConcerns = [...new Set(rawConcerns)];

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 sm:px-16">
      
      {/* Greeting Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Hello {userName}! 👋</h1>
        <p className="mt-1 text-sm text-slate-500">Your detailed report is ready.</p>
      </div>

      <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-xl font-semibold text-teal-800 border-b pb-3">
          Skin Analysis Result:
        </h2>

        {uniqueConcerns.length > 0 ? (
          <div>
            <p className="mb-4 text-sm font-semibold text-slate-900">
              Primary Concerns Detected:
            </p>
            <ul className="space-y-3">
              {uniqueConcerns.map((concernName, index) => (
                <li 
                  key={index} 
                  className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 border border-slate-100"
                >
                  <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0" />
                  <span className="font-medium text-slate-800 text-sm">
                    {concernName}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          /* Agar koi concern nahi hai (Perfect Skin) */
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