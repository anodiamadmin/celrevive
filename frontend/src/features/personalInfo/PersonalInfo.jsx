import { useState } from 'react';

const PinIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="10" r="2.4" />
  </svg>
);

export default function PersonalInfo({ initialData, onSaved }) {
  const [gender, setGender] = useState(initialData?.gender || '');
  const [dob, setDob] = useState(initialData?.dob || '');
  const [location, setLocation] = useState(initialData?.location || '');
  const [touched, setTouched] = useState(false);

  const isComplete = gender && dob && location.trim();

  const handleSave = () => {
    if (!isComplete) {
      setTouched(true);
      return;
    }
    onSaved?.({ gender, dob, location });
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[var(--bg)] px-6">
      <div className="w-full max-w-[440px] rounded-2xl border border-[var(--border)] bg-[var(--code-bg)] p-8 shadow-sm">
        <h1 className="mb-1.5 text-2xl font-bold text-[var(--text-h)]">
          Information Overview
        </h1>
        <p className="mb-6 text-sm text-[var(--text)]">
          Please provide your personal details below.
        </p>

        <div className="mb-5 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-h)]">
              Gender
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className={`h-12 w-full appearance-none rounded-xl border bg-[var(--bg)] px-3 text-[15px] outline-none ${
                touched && !gender ? 'border-red-500' : 'border-[var(--border)]'
              } ${gender ? 'text-[var(--text-h)]' : 'text-[var(--text)]'}`}
            >
              <option value="" disabled>Select gender</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="non-binary">Non-binary</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-h)]">
              Date of Birth
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className={`h-12 w-full rounded-xl border bg-[var(--bg)] px-3 text-[15px] outline-none ${
                touched && !dob ? 'border-red-500' : 'border-[var(--border)]'
              } ${dob ? 'text-[var(--text-h)]' : 'text-[var(--text)]'}`}
            />
          </div>
        </div>

        <div className="mb-7">
          <label className="mb-1.5 block text-sm font-medium text-[var(--text-h)]">
            Location
          </label>
          <div
            className={`flex h-12 items-center gap-3 rounded-xl border bg-[var(--bg)] px-3 ${
              touched && !location.trim() ? 'border-red-500' : 'border-[var(--border)]'
            }`}
          >
            <span className="text-[var(--text)]"><PinIcon /></span>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Search city or zip code"
              className="h-full flex-1 bg-transparent text-[15px] text-[var(--text-h)] outline-none placeholder:text-[var(--text)]"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className={`h-12 w-full rounded-xl text-[15px] font-semibold text-white transition-opacity ${
            isComplete ? 'bg-[var(--accent)] hover:opacity-90' : 'bg-[var(--accent)] opacity-70'
          }`}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}