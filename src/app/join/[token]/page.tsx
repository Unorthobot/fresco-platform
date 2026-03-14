'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const { data: session, status } = useSession();
  const router = useRouter();

  const [invite, setInvite] = useState<{ teamName: string; role: string } | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'joining' | 'done' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch(`/api/invites/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setState('error'); setErrorMsg(data.error); }
        else { setInvite(data.invite); setState('ready'); }
      })
      .catch(() => { setState('error'); setErrorMsg('Could not load invite'); });
  }, [token]);

  const handleAccept = async () => {
    if (!session) { signIn('google', { callbackUrl: `/join/${token}` }); return; }
    setState('joining');
    const res = await fetch(`/api/invites/${token}`, { method: 'POST' });
    const data = await res.json();
    if (data.ok) { setState('done'); setTimeout(() => router.push('/'), 2000); }
    else { setState('error'); setErrorMsg(data.error || 'Failed to join team'); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', fontFamily: 'var(--font-inter, sans-serif)' }}>
      <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 0, padding: '48px 40px', maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <img src="/fresco-logo.png" alt="Fresco" style={{ width: 36, height: 36, margin: '0 auto 24px' }} />

        {state === 'loading' && <p style={{ color: '#8a8a8a', fontSize: 15 }}>Loading invite…</p>}

        {state === 'error' && (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 500, color: '#1a1a1a', marginBottom: 12 }}>Invite unavailable</h1>
            <p style={{ color: '#8a8a8a', fontSize: 14, marginBottom: 24 }}>{errorMsg}</p>
            <a href="/" style={{ fontSize: 14, color: '#1a1a1a' }}>Go to Fresco →</a>
          </>
        )}

        {(state === 'ready' || state === 'joining') && invite && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 500, color: '#1a1a1a', marginBottom: 8 }}>You're invited</h1>
            <p style={{ color: '#6b6b6b', fontSize: 15, marginBottom: 32 }}>
              Join <strong style={{ color: '#1a1a1a' }}>{invite.teamName}</strong> on Fresco as a {invite.role}.
            </p>
            {status === 'unauthenticated' && (
              <p style={{ fontSize: 13, color: '#8a8a8a', marginBottom: 20 }}>You'll need to sign in to accept.</p>
            )}
            <button
              onClick={handleAccept}
              disabled={state === 'joining'}
              style={{ width: '100%', padding: '12px 0', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 0, fontSize: 15, fontWeight: 500, cursor: state === 'joining' ? 'wait' : 'pointer' }}
            >
              {state === 'joining' ? 'Joining…' : session ? 'Accept invite' : 'Sign in & accept'}
            </button>
          </>
        )}

        {state === 'done' && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 500, color: '#1a1a1a', marginBottom: 8 }}>You're in!</h1>
            <p style={{ color: '#6b6b6b', fontSize: 15 }}>Redirecting to Fresco…</p>
          </>
        )}
      </div>
    </div>
  );
}
