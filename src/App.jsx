import React, { useState, useEffect } from 'react';
import apiClient from './api/client';
import './styles/global.css';

const App = () => {
  const [token, setToken] = useState(localStorage.getItem('access'));
  const [user, setUser] = useState(null); // State to store profile data
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ open: false, data: null });
  const [authForm, setAuthForm] = useState({ username: '', password: '' });

  useEffect(() => {
    if (token) {
      fetchProfile();
      fetchAll();
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      const res = await apiClient.get('/auth/profile/');
      setUser(res.data);
    } catch (err) {
      console.error("Profile fetch error:", err);
      // If profile fails, token might be expired
      if (err.response?.status === 401) handleLogout();
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/');
      setTransactions(res.data.transactions || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await apiClient.post('/auth/login/', authForm);
      localStorage.setItem('access', res.data.access);
      localStorage.setItem('refresh', res.data.refresh);
      setToken(res.data.access);
      // fetchProfile and fetchAll will be triggered by the useEffect [token]
    } catch {
      alert("Invalid Credentials");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
    setTransactions([]);
  };

  const openDetail = async (id = null) => {
    if (id) {
      try {
        const res = await apiClient.get(`/${id}/`);
        setModal({ open: true, data: res.data.transaction });
      } catch (err) {
        alert("Could not load details");
      }
    } else {
      setModal({ open: true, data: { amount: '', item: '' } });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (modal.data.id) {
        await apiClient.patch(`/${modal.data.id}/`, modal.data);
      } else {
        await apiClient.post('/', modal.data);
      }
      setModal({ open: false, data: null });
      fetchAll();
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Operation failed";
      alert("Error: " + JSON.stringify(errorMsg));
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await apiClient.delete(`/${modal.data.id}/`);
      setModal({ open: false, data: null });
      fetchAll();
    } catch {
      alert("Delete failed.");
    }
  };

  const formatCurrency = (val) => {
    const num = parseFloat(val);
    return `₹${isNaN(num) ? "0.00" : num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const options = { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true 
    };
    let formatted = date.toLocaleString('en-US', options);
    const day = date.getDate();
    let suffix = 'th';
    if ([1, 21, 31].includes(day)) suffix = 'st';
    else if ([2, 22].includes(day)) suffix = 'nd';
    else if ([3, 23].includes(day)) suffix = 'rd';
    return formatted.replace(day, `${day}${suffix}`);
  };

  if (!token) return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2 style={{ textAlign: 'center', fontWeight: '400', marginTop: 0 }}>Login</h2>
        <form onSubmit={handleLogin}>
          <input placeholder="Username" onChange={e => setAuthForm({ ...authForm, username: e.target.value })} required />
          <input type="password" placeholder="Password" onChange={e => setAuthForm({ ...authForm, password: e.target.value })} required />
          <button className="btn-save" type="submit" style={{ width: '100%' }}>Login</button>
        </form>
      </div>
    </div>
  );

  return (
    <div id="root">
      <nav className="navbar">
        <div className="nav-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
             <button className="btn-add" onClick={() => openDetail()}>+ Add</button>
          </div>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div className="container">
        <div className="total-section">
          <div className="total-label">Total Balance</div>
          <h1 className="total-amount">{formatCurrency(total)}</h1>
        </div>

        <div className="list-container">
          {loading ? (
            <p style={{ textAlign: 'center', color: '#888' }}>Loading...</p>
          ) : transactions.length > 0 ? (
            transactions.map(t => (
              <div key={t.id} className="card" onClick={() => openDetail(t.id)}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="item-name">{t.item}</span>
                  <span className="item-date">
                    by {user?.username} at {formatDate(t.datetime || t.created_at || t.date)}
                  </span>
                </div>
                <span className="item-amount">{formatCurrency(t.amount)}</span>
              </div>
            ))
          ) : (
            <p style={{ textAlign: 'center', color: '#999' }}>No transactions found.</p>
          )}
        </div>
      </div>

      {modal.open && (
        <div className="modal-backdrop" onClick={() => setModal({ open: false, data: null })}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: '5px' }}>
              {modal.data.id ? 'Edit Transaction' : 'New Transaction'}
            </h3>
            {modal.data.id && (
              <p style={{ fontSize: '0.75rem', color: '#999', margin: '0 0 1.5rem' }}>
                Recorded by {user?.username} on: {formatDate(modal.data.datetime || modal.data.created_at)}
              </p>
            )}
            <form onSubmit={handleSave}>
              <label style={{ fontSize: '0.8rem', color: '#999' }}>Item Name</label>
              <input 
                type="text" 
                value={modal.data.item || ''} 
                onChange={e => setModal({ ...modal, data: { ...modal.data, item: e.target.value } })} 
                required 
              />
              <label style={{ fontSize: '0.8rem', color: '#999' }}>Amount (₹)</label>
              <input 
                type="number" 
                step="0.01" 
                value={modal.data.amount} 
                onChange={e => setModal({ ...modal, data: { ...modal.data, amount: e.target.value } })} 
                required 
              />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" style={{ border: 'none', color: '#999' }} onClick={() => setModal({ open: false, data: null })}>Cancel</button>
                {modal.data.id && <button type="button" className="btn-delete" onClick={handleDelete}>Delete</button>}
                <button type="submit" className="btn-save">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;