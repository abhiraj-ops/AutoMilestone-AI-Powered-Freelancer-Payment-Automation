function badge(status) {
  const map = {
    pending: 'bg-gray-700 text-gray-200',
    submitted: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700/40',
    approved: 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/40',
    'needs-revision': 'bg-red-900/30 text-red-300 border border-red-700/40',
    paid: 'bg-emerald-600 text-white',
  };
  return `inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status] || 'bg-gray-800 text-gray-300'}`;
}

export default function MilestoneCard({ milestone }) {
  if (!milestone) return null;
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="font-semibold text-white">{milestone.title}</h4>
        <div className="flex items-center gap-2">
          {milestone.ai_score != null && <span className="text-xs text-gray-400">AI {milestone.ai_score}/100</span>}
          <span className={badge(milestone.status)}>{milestone.status}</span>
        </div>
      </div>
      <p className="mt-1 text-sm text-gray-300">${Number(milestone.amount).toFixed(2)}</p>
      {milestone.ai_feedback && <p className="mt-2 text-xs text-gray-400">{milestone.ai_feedback}</p>}
      {milestone.deliverable_text && (
        <p className="mt-2 text-xs text-gray-500 line-clamp-3 whitespace-pre-wrap">{milestone.deliverable_text}</p>
      )}
      {milestone.payout_batch_id && <p className="mt-2 text-xs text-emerald-400">Batch: {milestone.payout_batch_id}</p>}
    </div>
  );
}
