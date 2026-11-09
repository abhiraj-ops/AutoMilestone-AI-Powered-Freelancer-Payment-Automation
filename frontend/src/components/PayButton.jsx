import { useState } from 'react';
import api from '../lib/api';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;

export default function PayButton({ amount, projectId, onSuccess }) {
  const [captured, setCaptured] = useState(false);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  if (!clientId) {
    return (
      <div className="rounded-xl border border-yellow-800/50 bg-yellow-950/30 p-3 text-xs text-yellow-200">
        Set <code>VITE_PAYPAL_CLIENT_ID</code> in <code>frontend/.env</code> to enable PayPal checkout.
      </div>
    );
  }

  async function createOrderHandler() {
    setError(null);
    const res = await api.post('/api/paypal/create-order', { amount, projectId });
    if (!res.data || !res.data.id) throw new Error('Failed to create order');
    return res.data.id;
  }

  async function onApproveHandler(data) {
    setProcessing(true);
    try {
      await api.post('/api/paypal/capture-order', { orderID: data.orderID, projectId });
      setCaptured(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err?.response?.data?.error || 'Capture failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  function onErrorHandler() {
    setError('PayPal error. Please try again.');
  }

  if (captured) return <p className="text-sm font-semibold text-emerald-400">✓ Project funded &amp; active via PayPal.</p>;

  return (
    <div>
      <PayPalScriptProvider options={{ clientId, currency: 'USD', intent: 'capture' }}>
        <PayPalButtons style={{ layout: 'horizontal', label: 'pay' }} createOrder={createOrderHandler} onApprove={onApproveHandler} onError={onErrorHandler} />
      </PayPalScriptProvider>
      {processing && <p className="mt-2 text-xs text-gray-400 animate-pulse">Capturing payment…</p>}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
