import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function Countdown({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Expired');
        setIsExpired(true);
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
  }, [targetDate]);

  return (
    <span style={{ fontWeight: 'bold', color: isExpired ? '#dc2626' : '#16a34a' }}>
      ⏱ {timeLeft}
    </span>
  );
}

export default function App() {
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState({ servingsSaved: 0, servingsMissed: 0 });
  const [form, setForm] = useState({ title: '', totalServings: '', pickupPoint: '', bestBefore: '' });
  const [claimData, setClaimData] = useState({});
  const [errorMsg, setErrorMsg] = useState('');

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
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setForm({ title: '', totalServings: '', pickupPoint: '', bestBefore: '' });
      fetchData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleClaim = async (postId) => {
    setErrorMsg('');
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
      fetchData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>FoodBridge</h1>

      <div style={{ display: 'flex', gap: '16px', padding: '16px', background: '#f4f4f5', borderRadius: '6px', marginBottom: '20px' }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{stats.servingsSaved}</div>
          <div>Servings Saved</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{stats.servingsMissed}</div>
          <div>Servings Missed</div>
        </div>
      </div>

      {errorMsg && (
        <div style={{ padding: '10px', background: '#fee2e2', color: '#991b1b', marginBottom: '16px', borderRadius: '4px' }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleCreatePost} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '30px' }}>
        <input
          type="text"
          placeholder="Food item"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          required
          style={{ padding: '8px' }}
        />
        <input
          type="number"
          min="1"
          placeholder="Total Servings"
          value={form.totalServings}
          onChange={e => setForm({ ...form, totalServings: e.target.value })}
          required
          style={{ padding: '8px' }}
        />
        <input
          type="text"
          placeholder="Pickup Location"
          value={form.pickupPoint}
          onChange={e => setForm({ ...form, pickupPoint: e.target.value })}
          required
          style={{ padding: '8px' }}
        />
        <input
          type="datetime-local"
          value={form.bestBefore}
          onChange={e => setForm({ ...form, bestBefore: e.target.value })}
          required
          style={{ padding: '8px' }}
        />
        <button type="submit" style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', gridColumn: '1 / -1' }}>
          List Surplus Food
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {posts.map(post => {
          const isClosed = post.status === 'CLOSED';
          return (
            <div key={post.id} style={{ border: '1px solid #ddd', padding: '14px', borderRadius: '6px', opacity: isClosed ? 0.6 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>{post.title}</h3>
                <Countdown targetDate={post.bestBefore} />
              </div>
              <p style={{ margin: '6px 0' }}>Pickup: {post.pickupPoint}</p>
              <p style={{ margin: '6px 0' }}>Available: {post.remainingServings} / {post.totalServings}</p>
              
              {!isClosed ? (
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <input
                    type="text"
                    placeholder="Reg No"
                    value={claimData[post.id]?.regNo || ''}
                    onChange={e => setClaimData({
                      ...claimData,
                      [post.id]: { ...claimData[post.id], regNo: e.target.value }
                    })}
                    style={{ padding: '6px' }}
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
                    style={{ padding: '6px', width: '70px' }}
                  />
                  <button
                    onClick={() => handleClaim(post.id)}
                    style={{ padding: '6px 12px', background: '#16a34a', color: '#fff', border: 'none', cursor: 'pointer' }}
                  >
                    Claim
                  </button>
                </div>
              ) : (
                <div style={{ color: '#dc2626', fontWeight: 'bold', marginTop: '6px' }}>CLOSED</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}