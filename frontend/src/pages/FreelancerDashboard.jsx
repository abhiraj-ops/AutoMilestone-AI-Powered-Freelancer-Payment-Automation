import { useState } from 'react';
import axios from 'axios';
import AIVerifier from '../components/AIVerifier';
import { useToast, ToastList } from '../hooks/useToast';

const API = import.meta.env.VITE_API_URL || '';

function milestoneBadge(status) {
  const map = {
    pending: 'bg-gray-700 text-gray-200',
    submitted: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700/40',
    approved: 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/40',
    'needs-revision': 'bg-red-900/30 text-red-300 border border-red-700/40',
    paid: 'bg-emerald-600 text-white',
  };
  return `inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status] || 'bg-gray-800 text-gray-300'}`;
}

export default function FreelancerDashboard() {
  const [projectId, setProjectId] = useState('');
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(null);
  const [drafts, setDrafts] = useState({});
  const { toasts, toast, dismiss } = useToast();

  async function loadProject(e) {
    if (e) e.preventDefault();
    const id = projectId.trim();
    if (!id) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/projects/${id}`);
      setProject(res.data);
      const d = {};
      (res.data.milestones || []).forEach((m) => { d[m.id] = m.deliverable_text || ''; });
      setDrafts(d);
    } catch (err) {
      toast(err?.response?.data?.error || 'Failed to load project.');
      setProject(null);
    } finally {
      setLoading(false);
    }
  }

  async function submitMilestone(milestoneId) {
    const text = (drafts[milestoneId] || '').trim();
    if (!text) {
      toast('Deliverable text cannot be empty.');
      return;
    }
    setSubmitting(milestoneId);
    try {
      const res = await axios.post(`${API}/api/milestones/${milestoneId}/submit`, { deliverable_text: text });
      setProject((prev) => ({
        ...prev,
        milestones: prev.milestones.map((m) => (m.id === milestoneId ? res.data : m)),
      }));
      toast('Deliverable submitted. Now run AI verification.', 'success');
    } catch (err) {
      toast(err?.response?.data?.error || 'Failed to submit.');
    } finally {
      setSubmitting(null);
    }
  }

  function handleVerified(updatedMilestone) {
    setProject((prev) => ({
      ...prev,
      milestones: prev.milestones.map((m) => (m.id === updatedMilestone.id ? updatedMilestone : m)),
    }));
  }

  const milestones = project?.milestones || [];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <ToastList toasts={toasts} onDismiss={dismiss} />
      <h1 className="text-2xl font-bold text-white">Freelancer Dashboard</h1>
      <p className="mt-1 text-sm text-gray-400">Enter a project ID to view milestones, submit work, and trigger AI verification.</p>

      <form onSubmit={loadProject} className="mt-6 flex flex-col sm:flex-row gap-3">
        <input
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          placeholder="Paste project ID (e.g. from Client Dashboard)"
          className="flex-1 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !projectId.trim()}
          className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading…' : 'Load Project'}
        </button>
      </form>

      {project && (
        <div className="mt-8 space-y-4">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <h2 className="text-lg font-bold text-white">{project.title}</h2>
              <span className="rounded-full bg-gray-800 border border-gray-700 px-3 py-1 text-xs font-semibold text-gray-300">{project.status}</span>
            </div>
            <p className="mt-2 text-sm text-gray-400">{project.description}</p>
            <p className="mt-3 text-xs text-gray-500">Total: ${Number(project.total_amount).toFixed(2)} · Freelancer: {project.freelancer_email}</p>
          </div>

          {milestones.map((m) => (
            <div key={m.id} className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white">{m.title}</h3>
                    <span className={milestoneBadge(m.status)}>{m.status}</span>
                    {m.ai_score != null && <span className="text-xs text-gray-400">AI: {m.ai_score}/100</span>}
                  </div>
                  <p className="mt-1 text-sm text-gray-300">${Number(m.amount).toFixed(2)}</p>
                </div>
                {m.status === 'paid' && (
                  <span className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white">✓ Paid ${Number(m.amount).toFixed(2)}</span>
                )}
              </div>

              {m.deliverable_text && (
                <div className="mt-4 rounded-xl bg-gray-950 border border-gray-800 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Latest deliverable</p>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{m.deliverable_text}</p>
                </div>
              )}

              {m.ai_feedback && (
                <div className="mt-3 rounded-xl bg-gray-950 border border-gray-800 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">AI Feedback</p>
                  <p className="text-sm text-gray-300">{m.ai_feedback}</p>
                </div>
              )}

              {m.status === 'pending' && (
                <div className="mt-4 space-y-3">
                  <textarea
                    value={drafts[m.id] || ''}
                    onChange={(e) => setDrafts((d) => ({ ...d, [m.id]: e.target.value }))}
                    rows={4}
                    placeholder="Paste your deliverable / summary of work here…"
                    className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    onClick={() => submitMilestone(m.id)}
                    disabled={submitting === m.id || !(drafts[m.id] || '').trim()}
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting === m.id ? 'Submitting…' : 'Submit Deliverable'}
                  </button>
                </div>
              )}

              {(m.status === 'submitted' || m.status === 'approved' || m.status === 'needs-revision') && (
                <div className="mt-4">
                  <AIVerifier milestoneId={m.id} milestoneAmount={m.amount} onResult={handleVerified} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
