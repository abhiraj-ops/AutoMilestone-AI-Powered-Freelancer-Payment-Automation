import { useState } from 'react';
import api from '../lib/api';
import { useToast, ToastList } from '../hooks/useToast';

const emptyForm = { client_email: '', freelancer_email: '', title: '', description: '' };
const emptyMilestone = { title: '', amount: '' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CreateProject({ onCreated }) {
  const [form, setForm] = useState(emptyForm);
  const [milestones, setMilestones] = useState([{ ...emptyMilestone }]);
  const [submitting, setSubmitting] = useState(false);
  const { toasts, toast, dismiss } = useToast();

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setMilestone = (i, k, v) => setMilestones((arr) => arr.map((m, idx) => (idx === i ? { ...m, [k]: v } : m)));
  const addMilestone = () => { if (milestones.length < 20) setMilestones((arr) => [...arr, { ...emptyMilestone }]); };
  const removeMilestone = (i) => { if (milestones.length === 1) return; setMilestones((arr) => arr.filter((_, idx) => idx !== i)); };

  const totalFromMilestones = milestones.reduce((s, m) => s + (Number(m.amount) || 0), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.client_email.trim() || !form.freelancer_email.trim() || !form.title.trim() || !form.description.trim()) {
      toast('All project fields are required.');
      return;
    }
    if (!EMAIL_RE.test(form.client_email.trim()) || !EMAIL_RE.test(form.freelancer_email.trim())) {
      toast('Please enter valid email addresses.');
      return;
    }
    if (form.title.trim().length > 200 || form.description.trim().length > 5000) {
      toast('Title (max 200) or description (max 5000) too long.');
      return;
    }
    const cleanMilestones = milestones.filter((m) => m.title.trim() && Number(m.amount) > 0);
    if (cleanMilestones.length === 0) {
      toast('Add at least one milestone with title and positive amount.');
      return;
    }
    if (totalFromMilestones > 100000) {
      toast('Total exceeds $100,000 maximum.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        client_email: form.client_email.trim(),
        freelancer_email: form.freelancer_email.trim(),
        title: form.title.trim(),
        description: form.description.trim(),
        total_amount: totalFromMilestones,
        milestones: cleanMilestones.map((m) => ({ title: m.title.trim().slice(0, 200), amount: Number(m.amount) })),
      };
      const res = await api.post('/api/projects', payload);
      setForm(emptyForm);
      setMilestones([{ ...emptyMilestone }]);
      if (onCreated) onCreated(res.data);
    } catch (err) {
      toast(err?.response?.data?.error || 'Failed to create project. Please check inputs.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    'w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-indigo-500 focus:outline-none';

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <ToastList toasts={toasts} onDismiss={dismiss} />
      <h2 className="font-bold text-white">Create Project</h2>
      <p className="mt-1 text-xs text-gray-400">Total is calculated from milestone amounts.</p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3" noValidate>
        <input className={inputCls} type="email" maxLength={254} placeholder="Client email" value={form.client_email} onChange={(e) => setField('client_email', e.target.value)} disabled={submitting} required />
        <input className={inputCls} type="email" maxLength={254} placeholder="Freelancer email" value={form.freelancer_email} onChange={(e) => setField('freelancer_email', e.target.value)} disabled={submitting} required />
        <input className={inputCls} maxLength={200} placeholder="Project title" value={form.title} onChange={(e) => setField('title', e.target.value)} disabled={submitting} required />
        <textarea className={inputCls} rows={4} maxLength={5000} placeholder="Project description / brief (Gemini uses this to verify work)" value={form.description} onChange={(e) => setField('description', e.target.value)} disabled={submitting} required />

        <div className="space-y-2 pt-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Milestones</p>
          {milestones.map((m, i) => (
            <div key={i} className="grid grid-cols-5 gap-2">
              <input
                className={`${inputCls} col-span-3`}
                maxLength={200}
                placeholder={`Milestone ${i + 1} title`}
                value={m.title}
                onChange={(e) => setMilestone(i, 'title', e.target.value)}
                disabled={submitting}
              />
              <input
                className={`${inputCls} col-span-1`}
                type="number" min="0.01" max="100000" step="0.01"
                placeholder="USD"
                value={m.amount}
                onChange={(e) => setMilestone(i, 'amount', e.target.value)}
                disabled={submitting}
              />
              <button type="button" onClick={() => removeMilestone(i)} disabled={submitting || milestones.length === 1} className="rounded-xl bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 disabled:opacity-40">✕</button>
            </div>
          ))}
          <button type="button" onClick={addMilestone} disabled={submitting || milestones.length >= 20} className="text-sm font-medium text-indigo-400 hover:text-indigo-300 disabled:opacity-50">
            + Add milestone
          </button>
        </div>

        <div className="rounded-xl bg-gray-950 border border-gray-800 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-400">Total amount</span>
          <span className="font-bold text-white">${totalFromMilestones.toFixed(2)}</span>
        </div>

        <button type="submit" disabled={submitting} className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
          {submitting ? 'Creating…' : 'Create Project'}
        </button>
      </form>
    </div>
  );
}
