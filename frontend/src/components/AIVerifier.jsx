import { useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || '';

export default function AIVerifier({ milestoneId, milestoneAmount, onResult }) {
  const [state, setState] = useState('idle');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [flash, setFlash] = useState(false);

  async function runVerification() {
    setState('loading');
    setError(null);
    try {
      const res = await axios.post(`${API}/api/verify-milestone/${milestoneId}`);
      const data = res.data;
      setResult(data);

      if (data.payout_triggered) {
        setFlash(true);
        setTimeout(() => setFlash(false), 1200);
      }

      if (data.approved) {
        setState('approved');
      } else {
        setState('rejected');
      }

      if (onResult && data.milestone) {
        onResult(data.milestone);
      }
    } catch (err) {
      const message = err?.response?.data?.error || err.message || 'Verification failed.';
      setError(message);
      setState('idle');
    }
  }

  function reset() {
    setState('idle');
    setResult(null);
    setError(null);
  }

  if (state === 'loading') {
    return (
      <div className="rounded-xl border border-gray-700 bg-gray-950 p-5 flex items-center gap-3">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <span className="text-sm text-gray-300 animate-pulse">Gemini is analyzing your submission...</span>
      </div>
    );
  }

  if (state === 'approved' && result) {
    return (
      <div className={`rounded-xl border border-emerald-700/50 bg-gradient-to-br from-emerald-900/30 via-gray-950 to-gray-950 p-5 ${flash ? 'confetti-flash' : ''}`}>
        <p className="text-lg font-bold text-emerald-300">✅ AI Approved — Score: {result.score}/100</p>
        <p className="mt-2 text-sm text-gray-200">{result.feedback}</p>
        {result.payout_triggered && (
          <p className="mt-3 rounded-lg bg-emerald-600/20 border border-emerald-700/40 px-3 py-2 text-sm font-semibold text-emerald-200">
            💸 PayPal Payout Sent! ${Number(milestoneAmount).toFixed(2)}
          </p>
        )}
        {result.payout_error && (
          <p className="mt-2 text-xs text-red-300">Payout error: {result.payout_error}</p>
        )}
        <button onClick={reset} className="mt-3 text-xs font-medium text-emerald-300 hover:text-emerald-200 underline">Reset</button>
      </div>
    );
  }

  if (state === 'rejected' && result) {
    return (
      <div className="rounded-xl border border-red-800/50 bg-red-950/30 p-5">
        <p className="font-bold text-red-400">❌ Needs Revision — Score: {result.score}/100</p>
        <p className="mt-2 text-sm text-gray-200">{result.feedback}</p>
        {result.missing?.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Missing items</p>
            <ul className="mt-1 list-disc pl-5 text-sm text-gray-300 space-y-1">
              {result.missing.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        <button onClick={reset} className="mt-4 rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700">
          Revise and Resubmit
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={runVerification}
        className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-500 transition"
      >
        🤖 Run AI Verification
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
