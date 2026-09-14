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




const DUMMY_RESULT = {
  userName: 'Emma',
  hasConcerns: false, // 👈  'false' , "We could not find any concern!" dikhega
  skinAnalysis: {
    primaryConcerns: 'Active acne, Sebum production, Pore visibility.', 
  }
};

export default function RecommendationPage({ result = DUMMY_RESULT }) {
  // Result se sirf userName, hasConcerns aur skinAnalysis nikal liya
  const { userName, hasConcerns, skinAnalysis } = result;

  return (
    <div className="min-h-screen bg-white px-10 pb-12 pt-6 sm:px-16">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-4xl font-semibold text-slate-900">Hello {userName}!</h1>
        <p className="mt-2 text-base text-gray-500">Your detailed report is ready.</p>
      </div>

      <div className="flex flex-col items-start gap-6">
        
        {/* ONLY Left card: Skin Analysis Result */}
        {/* (w-full aur lg:w-[46%] rakha hai taaki card ki width design jaisi hi rahe) */}
        <div className="w-full rounded-2xl border border-gray-200 bg-white p-8 lg:w-[46%]">
          <h2 className="mb-6 text-xl font-medium text-teal-800">
            Skin Analysis Result:
          </h2>

          <div className="space-y-4 text-[15px] leading-relaxed text-slate-800">
            {/* Condition: Agar concerns hain toh Primary Concerns dikhao, warna No Concern message */}
            {hasConcerns ? (
              <p>
                <span className="font-semibold">Primary Concerns:</span>{' '}
                {skinAnalysis.primaryConcerns}
              </p>
            ) : (
            //   <p className="font-medium text-slate-800">
              <p className="text-base font-medium text-red-500">
                We could not find any concern!
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}