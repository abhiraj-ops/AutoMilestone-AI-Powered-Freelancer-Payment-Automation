import { useEffect, useState } from 'react';
import api from '../lib/api';
import CreateProject from '../components/CreateProject';
import MilestoneCard from '../components/MilestoneCard';
import PayButton from '../components/PayButton';
import { useToast, ToastList } from '../hooks/useToast';

function statusBadge(status) {
  const map = {
    draft: 'bg-gray-700 text-gray-200',
    active: 'bg-indigo-900/50 text-indigo-300 border border-indigo-700/50',
  };
  return `inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status] || 'bg-gray-800 text-gray-300'}`;
}

export default function ClientDashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const { toasts, toast, dismiss } = useToast();

  async function fetchProjects() {
    setLoading(true);
    try {
      const res = await api.get('/api/projects?limit=50');
      setProjects(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      toast(e?.response?.data?.error || 'Failed to load projects.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchProjects(); }, []);

  const handleCreated = (project) => {
    toast('Project created successfully!', 'success');
    fetchProjects();
    setExpanded(project?.id || null);
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <ToastList toasts={toasts} onDismiss={dismiss} />
      <h1 className="text-2xl font-bold text-white">Client Dashboard</h1>
      <p className="mt-1 text-sm text-gray-400">Create a milestone-funded project, fund it via PayPal, and watch AI verify submissions.</p>
      <div className="mt-8 grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <CreateProject onCreated={handleCreated} />
        </div>
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">All Projects ({projects.length})</h2>
            <button onClick={fetchProjects} disabled={loading} className="text-xs font-medium text-indigo-400 hover:text-indigo-300 disabled:opacity-50">
              {loading ? 'Refreshing…' : '↻ Refresh'}
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-gray-800 bg-gray-900 h-28" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-800 bg-gray-900 p-8 text-center text-sm text-gray-500">
              No projects yet. Create your first project on the left.
            </div>
          ) : (
            projects.map((p) => {
              const milestones = p.milestones || [];
              const isOpen = expanded === p.id;
              return (
                <div key={p.id} className="rounded-2xl border border-gray-800 bg-gray-900">
                  <button onClick={() => setExpanded(isOpen ? null : p.id)} className="w-full text-left px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white">{p.title}</h3>
                          <span className={statusBadge(p.status)}>{p.status}</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-400">{p.freelancer_email} · ${Number(p.total_amount).toFixed(2)}</p>
                        <p className="mt-1 text-xs text-gray-500">{p.created_at}</p>
                      </div>
                      <span className="text-gray-500">{isOpen ? '▾' : '▸'}</span>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-gray-800 px-5 py-4 space-y-4">
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{p.description}</p>
                      {p.status === 'draft' && (
                        <div className="rounded-xl border border-gray-800 bg-gray-950 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Fund this project via PayPal</p>
                          <PayButton amount={p.total_amount} projectId={p.id} onSuccess={fetchProjects} />
                        </div>
                      )}
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Milestones ({milestones.length})</p>
                      {milestones.length === 0 && <p className="text-sm text-gray-500">No milestones attached.</p>}
                      <div className="grid gap-3">
                        {milestones.map((m) => (
                          <MilestoneCard key={m.id} milestone={m} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
