import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function CountdownBadge({ targetDate, onExpire }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('EXPIRED');
        if (!isExpired) {
          setIsExpired(true);
          if (onExpire) onExpire();
        }
      } else {
        const mins = Math.floor((diff / (1000 * 60)) % 60);
        const secs = Math.floor((diff / 1000) % 60);
        const hrs = Math.floor(diff / (1000 * 60 * 60));
        setTimeLeft(`${hrs > 0 ? `${hrs}h ` : ''}${mins}m ${secs}s`);
      }
    };
    calc();
    const timer = setInterval(calc, 1000);
    return () => clearInterval(timer);
  }, [targetDate, isExpired, onExpire]);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '0.85rem',
        fontWeight: '600',
        letterSpacing: '0.3px',
        backgroundColor: isExpired ? '#fef2f2' : '#ecfdf5',
        color: isExpired ? '#dc2626' : '#059669',
        border: `1px solid ${isExpired ? '#fecaca' : '#a7f3d0'}`,
      }}
    >
      <span>⏱</span> {timeLeft}
    </span>
  );
}

export default function App() {
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState({ servingsSaved: 0, servingsMissed: 0 });
  const [form, setForm] = useState({ title: '', totalServings: '', pickupPoint: '', bestBefore: '' });
  const [claimData, setClaimData] = useState({});
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [resPosts, resStats] = await Promise.all([
        fetch(`${API_BASE}/api/posts`),
        fetch(`${API_BASE}/api/stats`)
      ]);
      setPosts(await resPosts.json());
      setStats(await resStats.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setForm({ title: '', totalServings: '', pickupPoint: '', bestBefore: '' });
      setSuccessMsg('Surplus food posted successfully!');
      fetchData();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClaim = async (postId) => {
    setErrorMsg('');
    setSuccessMsg('');
    const input = claimData[postId] || {};
    try {
      const res = await fetch(`${API_BASE}/api/posts/${postId}/claims`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regNo: input.regNo, quantity: input.qty })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setClaimData(prev => ({ ...prev, [postId]: { regNo: '', qty: '' } }));
      setSuccessMsg(`Successfully claimed ${input.qty} serving(s)!`);
      fetchData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to delete all listings and reset metrics?')) return;
    try {
      await fetch(`${API_BASE}/api/reset`, { method: 'POST' });
      setSuccessMsg('All entries deleted and metrics reset.');
      fetchData();
    } catch (err) {
      setErrorMsg('Failed to reset data.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', padding: '32px 16px' }}>
      <div style={{ maxWidth: '850px', margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '2rem' }}>🍲</span>
              <h1 style={{ fontSize: '1.85rem', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>FoodBridge</h1>
            </div>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.95rem' }}>Campus surplus food redistribution network</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={handleReset}
              style={{
                padding: '4px 12px',
                background: '#fee2e2',
                color: '#991b1b',
                border: '1px solid #fecaca',
                borderRadius: '16px',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Clear All Entries
            </button>
            <span style={{ padding: '4px 12px', background: '#dbeafe', color: '#1e40af', borderRadius: '16px', fontSize: '0.8rem', fontWeight: '600' }}>
              Live Feed
            </span>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
              ✓
            </div>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#059669', lineHeight: 1 }}>{stats.servingsSaved}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px', fontWeight: '500' }}>Servings Rescued</div>
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
              ✕
            </div>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#dc2626', lineHeight: 1 }}>{stats.servingsMissed}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px', fontWeight: '500' }}>Servings Expired</div>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div style={{ padding: '12px 16px', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠️</span> {errorMsg}
          </div>
        )}
        {successMsg && (
          <div style={{ padding: '12px 16px', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>✅</span> {successMsg}
          </div>
        )}

        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: '700', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📢</span> List Surplus Food
          </h2>
          <form onSubmit={handleCreatePost} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Item Description</label>
              <input
                type="text"
                placeholder="e.g. 25 Sandwiches"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Total Portions</label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 25"
                value={form.totalServings}
                onChange={e => setForm({ ...form, totalServings: e.target.value })}
                required
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Pickup Location</label>
              <input
                type="text"
                placeholder="e.g. AB3 Food Court"
                value={form.pickupPoint}
                onChange={e => setForm({ ...form, pickupPoint: e.target.value })}
                required
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Best Before (Date & Time)</label>
              <input
                type="datetime-local"
                value={form.bestBefore}
                onChange={e => setForm({ ...form, bestBefore: e.target.value })}
                required
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              style={{
                gridColumn: '1 / -1',
                padding: '12px',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.95rem',
                marginTop: '6px',
                boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
                transition: 'background 0.2s',
              }}
            >
              {submitting ? 'Publishing...' : 'Publish Food Listing'}
            </button>
          </form>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '16px' }}>Active Food Rescues</h2>
          {posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', background: '#ffffff', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
              No surplus food listed right now. Check back soon or list some above!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {posts.map(post => {
                const isExpiredNow = new Date(post.bestBefore).getTime() <= Date.now();
                const isClosed = post.status === 'CLOSED' || isExpiredNow;
                const percentLeft = Math.round((post.remainingServings / post.totalServings) * 100);

                return (
                  <div
                    key={post.id}
                    style={{
                      background: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      padding: '20px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      opacity: isClosed ? 0.65 : 1,
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: '700', margin: 0 }}>{post.title}</h3>
                      <CountdownBadge targetDate={post.bestBefore} onExpire={fetchData} />
                    </div>

                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.88rem', color: '#475569', marginBottom: '14px', flexWrap: 'wrap' }}>
                      <span>📍 <strong>Pickup:</strong> {post.pickupPoint}</span>
                      <span>📦 <strong>Remaining:</strong> {post.remainingServings} of {post.totalServings} portions</span>
                    </div>

                    <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginBottom: '16px' }}>
                      <div
                        style={{
                          width: `${percentLeft}%`,
                          height: '100%',
                          backgroundColor: percentLeft > 30 ? '#10b981' : '#f59e0b',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>

                    {!isClosed ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                        <input
                          type="text"
                          placeholder="Your Reg No (e.g. 22BCE1001)"
                          value={claimData[post.id]?.regNo || ''}
                          onChange={e => setClaimData({
                            ...claimData,
                            [post.id]: { ...claimData[post.id], regNo: e.target.value }
                          })}
                          style={{ flex: 2, minWidth: '150px', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                        />
                        <input
                          type="number"
                          min="1"
                          max={post.remainingServings}
                          placeholder="Qty"
                          value={claimData[post.id]?.qty || ''}
                          onChange={e => setClaimData({
                            ...claimData,
                            [post.id]: { ...claimData[post.id], qty: e.target.value }
                          })}
                          style={{ flex: 1, minWidth: '70px', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                        />
                        <button
                          onClick={() => handleClaim(post.id)}
                          style={{
                            padding: '8px 18px',
                            background: '#059669',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                          }}
                        >
                          Claim Portions
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '4px', background: '#fee2e2', color: '#b91c1c', fontSize: '0.8rem', fontWeight: '700' }}>
                        POST CLOSED (EXPIRED OR CLAIMED OUT)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}