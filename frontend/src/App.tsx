import React, { useState } from 'react';
import axios from 'axios';
import { Network, Search, Mail, Phone, Hash, Fingerprint, Loader2 } from 'lucide-react';

interface ContactResponse {
  contact: {
    primaryContactId: number;
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
  };
}

function App() {
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ContactResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email && !phoneNumber) {
      setError('Please provide either an email or a phone number.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload: any = {};
      if (email.trim()) payload.email = email.trim();
      if (phoneNumber.trim()) payload.phoneNumber = phoneNumber.trim();

      const { data } = await axios.post<ContactResponse>('https://bitespeed-gw7e.onrender.com/api/identify', payload);
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to connect to the Identity service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>Identity Lens</h1>
        <p className="subtitle">Real-time cross-platform identity reconciliation</p>
      </header>

      <main className="main-content">
        <section className="panel form-panel">
          <h2><Search size={24} color="#a5b4fc" /> Lookup Identity</h2>
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleIdentify}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                placeholder="e.g. josh@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                type="text"
                id="phone"
                placeholder="e.g. 1234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>

            <div className="helper-text">Provide email and/or phone number</div>

            <button type="submit" disabled={loading || (!email && !phoneNumber)} className={loading ? 'loading' : ''}>
              {loading ? (
                <>
                  <Loader2 className="spinner" size={18} /> Reconciling...
                </>
              ) : (
                'Identify Contact'
              )}
            </button>
          </form>
        </section>

        <section className="panel result-panel">
          {result ? (
            <div className="result-card" key={result.contact.primaryContactId}>
              <h2><Network size={24} color="#10b981" /> Identity Cluster</h2>

              <div className="meta-info">
                <span className="badge">Primary ID: {result.contact.primaryContactId}</span>
              </div>

              <div className="data-section">
                <h3><Mail size={18} /> Emails Linked</h3>
                <div className="data-list">
                  {result.contact.emails.length > 0 ? result.contact.emails.map((em, idx) => (
                    <span key={idx} className={`data-item ${idx === 0 ? 'primary' : ''}`}>
                      {em}
                    </span>
                  )) : <span className="data-item">None</span>}
                </div>
              </div>

              <div className="data-section">
                <h3><Phone size={18} /> Phone Numbers Linked</h3>
                <div className="data-list">
                  {result.contact.phoneNumbers.length > 0 ? result.contact.phoneNumbers.map((ph, idx) => (
                    <span key={idx} className={`data-item ${idx === 0 ? 'primary' : ''}`}>
                      {ph}
                    </span>
                  )) : <span className="data-item">None</span>}
                </div>
              </div>

              <div className="data-section">
                <h3><Hash size={18} /> Secondary IDs</h3>
                <div className="data-list">
                  {result.contact.secondaryContactIds.length > 0 ? (
                    result.contact.secondaryContactIds.map(id => (
                      <span key={id} className="data-item">#{id}</span>
                    ))
                  ) : (
                    <span className="data-item">No secondary contacts</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <Fingerprint size={64} color="rgba(255,255,255,0.1)" />
              <p>Enter details to view the reconciled identity cluster</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
