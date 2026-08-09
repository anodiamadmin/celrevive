import { useState } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';

const TOTAL_QUESTIONS = 2;

const QUESTIONS = [
  {
    id: 'skin-type',
    type: 'single', // single-select — sirf 1 option chuna ja sakta hai
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
    type: 'multi', // multi-select — max 3 options chune ja sakte hain
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
];

export default function Questionnaire({ onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});

  const currentQuestion = QUESTIONS[currentIndex];
  const isMulti = currentQuestion.type === 'multi';
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

      if (alreadySelected) {
        return { ...prev, [currentQuestion.id]: current.filter((o) => o !== option) };
      }
      if (current.length >= currentQuestion.maxSelect) {
        return prev;
      }
      return { ...prev, [currentQuestion.id]: [...current, option] };
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

  const isLastQuestion = currentIndex === QUESTIONS.length - 1;

  const handleNext = () => {
    if (!hasSelection) return;

    if (!isLastQuestion) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onComplete?.(answers);
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
      <div className="flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-4">
        <h1 className="mb-8 max-w-2xl text-center text-lg font-bold leading-tight text-[var(--text-h)] md:text-xl">
          {currentQuestion.question}
        </h1>

        {isMulti && (
          <div className="mb-3 flex w-full max-w-4xl items-center justify-between text-xs">
            <span className="text-[var(--text)]">
              (Select up to {currentQuestion.maxSelect})
            </span>
            <span className="font-semibold text-blue-600">
              SELECTED: {selectedMulti.length}/{currentQuestion.maxSelect}
            </span>
          </div>
        )}
        {!isMulti && <div className="mb-3" />}

        <div className="mx-auto grid w-full max-w-4xl grid-cols-4 gap-2">
          {currentQuestion.options.map((option) => {
            const isSelected = isMulti
              ? selectedMulti.includes(option)
              : selectedSingle === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => handleSelectOption(option)}
                className={`flex h-16 items-center justify-center rounded-lg border px-2 py-1.5 text-center text-xs font-medium leading-snug transition-colors md:h-20 md:text-sm ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-[var(--border)] bg-white text-[var(--text-h)] hover:bg-[var(--code-bg)]'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="w-full shrink-0 border-t border-[var(--border)] px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Pehle question par empty div taaki Next button right side hi rahe */}
          {currentIndex > 0 ? (
            <button
              type="button"
              onClick={handlePrevious}
              className="flex items-center gap-2 rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-[var(--text-h)] transition-colors hover:bg-[var(--code-bg)]"
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
            disabled={!hasSelection}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-opacity ${
              hasSelection
                ? 'bg-blue-600 hover:opacity-90'
                : 'cursor-not-allowed bg-blue-300'
            }`}
          >
            {isLastQuestion ? 'Submit' : 'Next'}
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}