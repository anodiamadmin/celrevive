
import { useState } from 'react';
import { ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';

const TOTAL_QUESTIONS = 20;

const QUESTIONS = [
  {
    id: 'skin-type',
    type: 'single',
    question: 'How would you characterise your skin?',
    options: [
      'Normal',
      'Dry',
      'Oily',
      'Combination',
      'Sensitive',
      'Mature',
      'Unsure',
    ],
  },
  {
    id: 'skin-concerns',
    type: 'multi',
    maxSelect: 3,
    question: 'Which skin concerns are you currently experiencing?',
    options: [
      'Dryness or dehydration',
      'Redness or irritation',
      'Acne or breakouts',
      'Enlarged pores',
      'Fine lines or wrinkles',
      'Uneven skin tone or pigmentation',
      'Dullness',
      'Itching or flaking',
      'Oiliness',
      'Skin sensitivity/reactivity',
      'Psoriasis-prone skin',
      'Eczema-prone skin',
      'Rosacea',
      'None of the above',
    ],
  },
  {
    id: 'sensitive-skin',
    type: 'single',
    layout: 'list',
    question: 'Would you describe your skin as sensitive?',
    options: [
      'Yes — highly sensitive/reactive',
      'Yes — mildly sensitive',
      'No',
      'Unsure',
    ],
  },
  {
    id: 'skin-discomfort-frequency',
    type: 'single',
    layout: 'list',
    question: 'How often does your skin feel tight, dry, itchy, or uncomfortable?',
    options: [
      'Daily',
      'A few times a week',
      'Occasionally',
      'Rarely',
      'Never',
    ],
  },
  {
    id: 'clogged-pores-frequency',
    type: 'single',
    layout: 'list',
    question: 'How often do you experience blackheads or clogged pores?',
    options: [
      'Frequently',
      'Occasionally',
      'Rarely',
      'Never',
    ],
  },
  {
    id: 'diagnosed-skin-condition',
    type: 'multi',
    maxSelect: 8,
    hideCounter: true,
    question: 'Have you ever been diagnosed with a skin condition?',
    options: [
      'Acne',
      'Rosacea',
      'Eczema/Dermatitis',
      'Psoriasis',
      'Seborrheic dermatitis',
      'Melasma/Pigmentation disorder',
      'None',
      'Prefer not to say',
    ],
  },
  {
    id: 'allergies-sensitivities',
    type: 'single-with-input',
    layout: 'list',
    singleLine: true, 
    question: 'Do you have any allergies or ingredient sensitivities we should know about?',
    options: ['Yes', 'No', 'Unsure'],
  },
  {
    id: 'prescription-treatments',
    type: 'multi',
    maxSelect: 7,
    hideCounter: true,
    question: 'Are you currently using prescription skin treatments or medications that may affect your skin?',
    options: [
      'Acne Medication',
      'Steroid creams',
      'Hormonal medication',
      'Cancer treatment',
      'Immunosuppressive medication',
      'No',
      'Prefer not to say',
    ],
  },
  {
    id: 'cosmetic-treatments',
    type: 'multi',
    maxSelect: 6,
    hideCounter: true,
    singleLine: true,
    question: 'Have you recently undergone any cosmetic or professional skin treatments?',
    options: [
      'Chemical peels',
      'Laser treatments',
      'Microneedling',
      'Injectable treatments',
      'Facial treatments',
      'No recent treatments',
    ],
  },
  {
    id: 'exfoliating-products-frequency',
    type: 'single',
    layout: 'list',
    singleLine: true,
    question: 'Do you use exfoliating products (such as scrubs, acids, or retinol)?',
    options: [
      'Daily',
      'A few times a week',
      'Occasionally',
      'Never',
    ],
  },
  {
    id: 'current-skincare-products',
    type: 'multi',
    maxSelect: 10,
    hideCounter: true,
    singleLine: true,
    question: 'Which skincare products do you currently use regularly?',
    subtitle: '(Select all that apply)',
    options: [
      'Cleanser',
      'Moisturizer',
      'Serum',
      'Retinol/Vitamin A',
      'Vitamin C',
      'Exfoliating acids',
      'Face oils',
      'SPF/Sunscreen',
      'Prescription skincare',
      'I use very few skincare products',
    ],
  },
  {
    id: 'skincare-routine-description',
    type: 'single',
    layout: 'list',
    singleLine: true,
    question: 'How would you describe your skincare routine?',
    options: [
      'Minimal/simple',
      'Moderate',
      'Advanced/multi-step',
      'Changes frequently',
      'I’m new to skincare',
    ],
  },
  {
    id: 'sleep-hours',
    type: 'single',
    layout: 'list',
    singleLine: true,
    question: 'On average, how many hours of sleep do you get per night?',
    options: [
      'More than 8 hours',
      'Around 7–8 hours',
      'Around 6–7 hours',
      'Slightly under 6 hours',
      'Much less than 6 hours',
    ],
  },
  {
    id: 'stress-levels',
    type: 'single',
    layout: 'list',
    singleLine: true,
    question: 'How would you describe your stress levels?',
    options: [
      'Low',
      'Moderate',
      'High',
      'Extremely high',
      'Varies significantly',
    ],
  },
  {
    id: 'climate-environment',
    type: 'single',
    layout: 'list',
    singleLine: true,
    question: 'How would you best describe the climate you live in or are currently travelling to?',
    options: [
      'Cool & dry',
      'Warm & dry',
      'Moderate',
      'Tropical/humid',
      'Seasonal/extreme changes',
    ],
  },
  {
    id: 'environment-exposure',
    type: 'single',
    layout: 'list',
    singleLine: true,
    question: 'Which environment are you exposed to most often?',
    options: [
      'Air-conditioned indoor environment',
      'Outdoor sun exposure',
      'Urban/city pollution',
      'Dry heating environments',
      'Coastal/humid environment',
      'Mixed environments',
    ],
  },
  {
    id: 'daily-water-intake',
    type: 'single',
    layout: 'list',
    singleLine: true,
    question: 'How much water do you typically drink each day?',
    options: [
      'More than 2 litres',
      'Around 1–2 litres',
      'Less than 1 litre',
      'I\'m not sure',
    ],
  },
  {
    id: 'preferred-texture',
    type: 'single',
    singleLine: true,
    question: 'What type of skincare texture do you prefer?',
    options: [
      'Lightweight gel',
      'Serum',
      'Light Lotion',
      'Moisturiser',
      'Cream',
      'Rich balm',
      'Face oil',
      'No preference',
    ],
  },
  {
    id: 'product-qualities',
    type: 'multi',
    maxSelect: 3,
    singleLine: true,
    question: 'Which product qualities are most important to you?',
    options: [
      'Fragrance-free',
      'Fast absorbing',
      'Lightweight feel',
      'Deep hydration',
      'Barrier repair',
      'Anti-ageing support',
      'Acne-friendly',
      'Natural ingredients',
      'Microbiome-friendly',
      'Clinically proven',
      'Non-greasy finish',
      'Sensitive skin suitable',
    ],
  },
  {
    id: 'primary-skincare-goal',
    type: 'single',
    singleLine: true,
    cols: 3,
    question: 'What is your primary skincare goal over the next 3 months?',
    options: [
      'Reduce redness/sensitivity',
      'Improve hydration',
      'Strengthen skin barrier',
      'Reduce breakouts',
      'Improve texture/smoothness',
      'Brighten skin tone',
      'Reduce signs of ageing',
      'Maintain healthy skin',
      'Recover from treatments or irritation',
    ],
  },
];

export default function Questionnaire({ onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = QUESTIONS[currentIndex];
  const isMulti = currentQuestion.type === 'multi';
  const isListLayout = currentQuestion.layout === 'list';
  const isWithInput = currentQuestion.type === 'single-with-input';
  const isSingleLine = Boolean(currentQuestion.singleLine);
  const hideCounter = Boolean(currentQuestion.hideCounter);
  const rawAnswer = answers[currentQuestion.id];

  const selectedSingle = !isMulti ? rawAnswer : undefined;
  const selectedMulti = isMulti ? rawAnswer || [] : [];
  const hasSelection = isMulti ? selectedMulti.length > 0 : Boolean(selectedSingle);

  const progressPercent = ((currentIndex + 1) / TOTAL_QUESTIONS) * 100;

  const handleSelectSingle = (option) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: prev[currentQuestion.id] === option ? undefined : option,
    }));
  };

  const handleSelectMulti = (option) => {
    setAnswers((prev) => {
      const current = prev[currentQuestion.id] || [];
      const alreadySelected = current.includes(option);

      const exclusiveOptions = ['No', 'Prefer not to say', 'No recent treatments', 'None', 'I use very few skincare products'];

      if (exclusiveOptions.includes(option)) {
        return { ...prev, [currentQuestion.id]: alreadySelected ? [] : [option] };
      }

      const filteredCurrent = current.filter((o) => !exclusiveOptions.includes(o));

      if (alreadySelected) {
        return { ...prev, [currentQuestion.id]: filteredCurrent.filter((o) => o !== option) };
      }
      if (filteredCurrent.length >= (currentQuestion.maxSelect || 3)) {
        return prev;
      }
      return { ...prev, [currentQuestion.id]: [...filteredCurrent, option] };
    });
  };

  const handleSelectOption = (option) => {
    if (isMulti) {
      handleSelectMulti(option);
    } else {
      handleSelectSingle(option);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const isLastQuestion = currentIndex === TOTAL_QUESTIONS - 1;

  const handleNext = async () => {
    if (!hasSelection || isSubmitting) return;

    if (currentIndex < QUESTIONS.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else if (isLastQuestion) {
      setIsSubmitting(true);
      try {
        await onComplete?.({ ...answers, allergyDetails: additionalDetails });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg)]">
      {/* Progress bar + question counter */}
      <div className="w-full shrink-0 border-b border-[var(--border)] px-6 pb-3 pt-3">
        <div className="flex justify-end">
          <span className="text-xs font-semibold tracking-widest text-[var(--text)]">
            QUESTION {currentIndex + 1} OUT OF {TOTAL_QUESTIONS}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--code-bg)]">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Heading + Options */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-4">
        {/* Centered Heading */}
        <div
          className={`mb-4 flex flex-col items-center justify-center text-center ${
            isSingleLine ? 'max-w-6xl px-2' : 'max-w-3xl px-2'
          }`}
        >
          <h1
            className={`text-base font-bold leading-snug text-[var(--text-h)] md:text-xl lg:text-2xl ${
              isSingleLine ? 'md:whitespace-nowrap' : ''
            }`}
          >
            {currentQuestion.question}
            {currentQuestion.subtitle && (
              <span className="ml-2 font-bold italic text-[var(--text-h)]">
                {currentQuestion.subtitle}
              </span>
            )}
          </h1>
        </div>

        {/* ========================================== */}
        {/* UPDATED: Q2 & Q19 me "(Select up to 3)" display hoga, baki multi-select me "(Multi-Select Answers)" */}
        {/* ========================================== */}
        {isMulti && (
          <div
            className={`mb-4 flex w-full max-w-4xl items-center text-xs px-2 ${
              hideCounter ? 'justify-end' : 'justify-between'
            }`}
          >
            <span className="font-medium text-gray-500">
              {hideCounter
                ? '(Multi-Select Answers)'
                : `(Select up to ${currentQuestion.maxSelect})`}
            </span>
            {!hideCounter && currentQuestion.maxSelect && (
              <span className="font-semibold uppercase tracking-wider text-blue-600">
                SELECTED: {selectedMulti.length}/{currentQuestion.maxSelect}
              </span>
            )}
          </div>
        )}

        {/* Dynamic Grid / Stack based on layout */}
        <div
          className={`mx-auto w-full ${
            isListLayout
              ? 'max-w-xl space-y-3'
              : currentQuestion.cols === 3
              ? 'grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3'
              : 'grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4'
          }`}
        >
          {currentQuestion.options.map((option) => {
            const isSelected = isMulti
              ? selectedMulti.includes(option)
              : selectedSingle === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => handleSelectOption(option)}
                className={`flex items-center rounded-xl border px-6 text-sm font-medium transition-colors ${
                  isListLayout
                    ? 'h-14 w-full justify-start text-left'
                    : 'h-20 justify-center text-center md:h-24'
                } ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-[var(--border)] bg-white text-[var(--text-h)] hover:bg-[var(--code-bg)]'
                }`}
              >
                {option}
              </button>
            );
          })}

          {/* Conditional Text Area for "If Yes" */}
          {isWithInput && selectedSingle === 'Yes' && (
            <div className="mt-4 w-full text-left">
              <label className="mb-2 block text-xs font-semibold text-gray-700">
                "If Yes"
              </label>
              <textarea
                value={additionalDetails}
                onChange={(e) => setAdditionalDetails(e.target.value)}
                placeholder="Please provide details"
                className="h-28 w-full resize-none rounded-xl border border-[var(--border)] p-4 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="w-full shrink-0 border-t border-[var(--border)] px-6 py-3">
        <div className="flex items-center justify-between">
          {currentIndex > 0 ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handlePrevious}
              className="flex items-center gap-2 rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-[var(--text-h)] transition-colors hover:bg-[var(--code-bg)] disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
              Previous
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={!hasSelection || isSubmitting}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-all ${
              hasSelection && !isSubmitting
                ? 'bg-blue-600 hover:opacity-90'
                : 'cursor-not-allowed bg-blue-300'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : isLastQuestion ? (
              <>
                Submit
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}