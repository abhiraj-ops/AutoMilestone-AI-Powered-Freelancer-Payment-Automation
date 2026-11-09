import { Link } from 'react-router-dom';
import PaymentFeed from '../components/PaymentFeed';

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <div className="text-center">
        <p className="text-sm font-semibold tracking-widest text-indigo-400 uppercase">Milestone payments, automated</p>
        <h1 className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white">
          AI verifies the work. PayPal sends the money.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-400">
          AutoMilestone securely holds project funds, lets freelancers submit deliverables, and a Gemini AI agent reviews them against the brief — releasing instant PayPal payouts when the work scores 75/100 or higher. No manual approvals needed.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/client" className="w-full sm:w-auto rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500 transition">
            I'm a Client
          </Link>
          <Link to="/freelancer" className="w-full sm:w-auto rounded-xl bg-gray-800 border border-gray-700 px-6 py-3 font-semibold text-white hover:bg-gray-700 transition">
            I'm a Freelancer
          </Link>
        </div>
      </div>

      <div className="mt-16 grid md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <div className="h-10 w-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-xl">🤖</div>
          <h3 className="mt-4 font-bold text-white">AI Verification</h3>
          <p className="mt-2 text-sm text-gray-400">Gemini 2.0 Flash scores every submission against the original brief on a 0–100 scale, with actionable feedback and a clear approved / needs-revision verdict.</p>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <div className="h-10 w-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center text-xl">💸</div>
          <h3 className="mt-4 font-bold text-white">Instant Payouts</h3>
          <p className="mt-2 text-sm text-gray-400">Score ≥ 75 triggers an automatic PayPal Payout from the platform balance — no waiting, no approval queue, no back-and-forth.</p>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <div className="h-10 w-10 rounded-xl bg-gray-700/40 text-gray-300 flex items-center justify-center text-xl">🔁</div>
          <h3 className="mt-4 font-bold text-white">Revision Loop</h3>
          <p className="mt-2 text-sm text-gray-400">Below 75? The freelancer gets exact missing items and can revise and resubmit instantly — milestones stay open until they pass.</p>
        </div>
      </div>

      <div className="mt-16">
        <PaymentFeed />
      </div>

      <p className="mt-10 text-center text-xs text-gray-500">
        AutoMilestone · Node.js + React + Gemini 2.0 Flash + PayPal Sandbox · Locale to production with your own keys in <code className="text-gray-300">backend/.env</code>
      </p>
    </div>
  );
}
