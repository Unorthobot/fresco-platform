'use client';

import { useState } from 'react';

export default function SetStudioPage() {
  const [secret, setSecret] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/set-studio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret }),
    });
    const data = await res.json();
    setResult(JSON.stringify(data));
    setLoading(false);
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 400, margin: '100px auto', padding: 24 }}>
      <h1 style={{ fontSize: 20, marginBottom: 24 }}>Set account to Studio</h1>
      <input
        type="password"
        placeholder="Admin secret"
        value={secret}
        onChange={e => setSecret(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        style={{ width: '100%', padding: '10px 12px', fontSize: 16, border: '1px solid #ccc', borderRadius: 4, marginBottom: 12, boxSizing: 'border-box' }}
      />
      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{ width: '100%', padding: '10px 0', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 4, fontSize: 16, cursor: 'pointer' }}
      >
        {loading ? 'Setting…' : 'Set to Studio'}
      </button>
      {result && (
        <p style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 4, fontSize: 14, wordBreak: 'break-all' }}>
          {result}
        </p>
      )}
    </div>
  );
}
