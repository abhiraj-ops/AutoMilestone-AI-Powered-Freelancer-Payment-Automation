import { useEffect, useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || '';

export default function PaymentFeed() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchPayments() {
    try {
      const res = await axios.get(`${API}/api/payments`);
      setPayments(res.data || []);
      setError(null);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load payments.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPayments();
    const id = setInterval(fetchPayments, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        <h2 className="font-bold text-white">Live Payment Feed</h2>
        <span className="ml-auto text-xs text-gray-500">Updates every 10s</span>
      </div>

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

      {loading ? (
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-800 bg-gray-950 h-14" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">No payments yet. Approved milestones will appear here once payouts are triggered.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-950 px-4 py-3">
              <span className={`h-2.5 w-2.5 rounded-full ${p.status === 'completed' ? 'bg-emerald-500' : 'bg-yellow-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-white">{p.milestone_title}</p>
                <p className="truncate text-xs text-gray-500">{p.project_title} · {p.paid_at}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-400">${Number(p.amount).toFixed(2)}</p>
                <p className="text-xs text-gray-400">{p.status}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
