import { useState } from 'react';

const PinIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="10" r="2.4" />
  </svg>
);

/**
 * PersonalInfo — "Information Overview" step.
 * Sits between the landing/begin-assessment page and the camera step:
 *   begin assessment -> personal info (this page) -> camera -> questionnaire
 *
 * Wire-up (react-router example):
 *   <Route path="/personal-info" element={
 *     <PersonalInfo onSaved={(data) => { saveAnswers(data); navigate('/camera'); }} />
 *   } />
 */
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
    <div
      className="min-h-screen w-full flex items-center justify-center px-6"
      style={{ background: 'var(--bg)', fontFamily: 'var(--sans)' }}
    >
      <div
        className="w-full max-w-[440px] rounded-2xl border p-8"
        style={{ background: 'var(--code-bg)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
      >
        <h1
          className="text-2xl font-bold mb-1.5"
          style={{ color: 'var(--text-h)', fontFamily: 'var(--heading)' }}
        >
          Information Overview
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text)' }}>
          Please provide your personal details below.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-5">
          {/* Gender */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-h)' }}>
              Gender
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full h-12 rounded-xl border px-3 text-[15px] outline-none appearance-none"
              style={{
                borderColor: touched && !gender ? '#d64545' : 'var(--border)',
                background: 'var(--bg)',
                color: gender ? 'var(--text-h)' : 'var(--text)',
              }}
            >
              <option value="" disabled>Select gender</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="non-binary">Non-binary</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>

          {/* Date of birth */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-h)' }}>
              Date of Birth
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full h-12 rounded-xl border px-3 text-[15px] outline-none"
              style={{
                borderColor: touched && !dob ? '#d64545' : 'var(--border)',
                background: 'var(--bg)',
                color: dob ? 'var(--text-h)' : 'var(--text)',
              }}
            />
          </div>
        </div>

        {/* Location */}
        <div className="mb-7">
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-h)' }}>
            Location
          </label>
          <div
            className="flex items-center gap-3 h-12 rounded-xl border px-3"
            style={{
              borderColor: touched && !location.trim() ? '#d64545' : 'var(--border)',
              background: 'var(--bg)',
            }}
          >
            <span style={{ color: 'var(--text)' }}><PinIcon /></span>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Search city or zip code"
              className="flex-1 h-full bg-transparent outline-none text-[15px]"
              style={{ color: 'var(--text-h)' }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="w-full h-12 rounded-xl font-semibold text-[15px] text-white transition-opacity"
          style={{ background: '#1a3fd6', opacity: isComplete ? 1 : 0.7 }}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}