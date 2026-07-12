import { useEffect, useState } from 'react';
import { auditsApi, assetsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

const STATUS_CONFIG = {
  Verified:  { bg: '#E1F3EE', fg: '#1E7A63', icon: '✓' },
  Missing:   { bg: '#FBEAE8', fg: '#A93226', icon: '✕' },
  Damaged:   { bg: '#FCF3E3', fg: '#B7791F', icon: '⚠' },
};

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return <span style={{ color: 'var(--color-text-faint)', fontStyle: 'italic', fontSize: 13 }}>Pending</span>;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
      background: cfg.bg, color: cfg.fg,
    }}>
      <span style={{ fontSize: 11 }}>{cfg.icon}</span> {status}
    </span>
  );
}

function ProgressBar({ records, total }) {
  const verified = records?.filter(r => r.status === 'Verified').length || 0;
  const missing  = records?.filter(r => r.status === 'Missing').length || 0;
  const damaged  = records?.filter(r => r.status === 'Damaged').length || 0;
  const done = verified + missing + damaged;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
        <span>{done} of {total} assets checked</span>
        <span style={{ fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: 'var(--color-surface-sunken)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-accent)', borderRadius: 4, transition: 'width .4s' }} />
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12 }}>
        <span style={{ color: '#1E7A63' }}>✓ {verified} Verified</span>
        <span style={{ color: '#A93226' }}>✕ {missing} Missing</span>
        <span style={{ color: '#B7791F' }}>⚠ {damaged} Damaged</span>
      </div>
    </div>
  );
}

export default function Audits() {
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'Admin' || user?.role === 'Asset_Manager';

  const [cycles, setCycles]               = useState([]);
  const [assets, setAssets]               = useState([]);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [loading, setLoading]             = useState(true);
  const [banner, setBanner]               = useState(null);

  // Create Cycle Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [cycleName, setCycleName]             = useState('');
  const [startDate, setStartDate]             = useState('');
  const [endDate, setEndDate]                 = useState('');
  const [creating, setCreating]               = useState(false);

  // Verify Asset Modal
  const [verifyingAsset, setVerifyingAsset]       = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('Verified');
  const [verificationNotes, setVerificationNotes]   = useState('');
  const [verifying, setVerifying]                   = useState(false);

  const flash = (type, text) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 4000);
  };

  const loadData = () => {
    setLoading(true);
    Promise.all([auditsApi.listCycles(), assetsApi.list()])
      .then(([cycs, asts]) => {
        setCycles(cycs);
        setAssets(asts);
        if (selectedCycle) {
          const updated = cycs.find(c => c.id === selectedCycle.id);
          setSelectedCycle(updated || null);
        }
      })
      .catch(err => flash('danger', err.body?.error || 'Could not load audit data.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleCreateCycle = async (e) => {
    e.preventDefault();
    if (!cycleName || !startDate || !endDate) { flash('danger', 'Please fill in all fields.'); return; }
    setCreating(true);
    try {
      await auditsApi.createCycle({ name: cycleName, startDate: new Date(startDate), endDate: new Date(endDate), auditorIds: [] });
      flash('success', 'Audit cycle started!');
      setShowCreateModal(false);
      setCycleName(''); setStartDate(''); setEndDate('');
      loadData();
    } catch (err) {
      flash('danger', err.body?.error || 'Could not start audit cycle.');
    } finally { setCreating(false); }
  };

  const handleVerifyAsset = async (e) => {
    e.preventDefault();
    if (!selectedCycle || !verifyingAsset) return;
    setVerifying(true);
    try {
      await auditsApi.verifyAsset(selectedCycle.id, { assetId: verifyingAsset.id, status: verificationStatus, notes: verificationNotes });
      flash('success', `${verifyingAsset.name} marked as ${verificationStatus}.`);
      setVerifyingAsset(null); setVerificationNotes(''); setVerificationStatus('Verified');
      loadData();
    } catch (err) {
      flash('danger', err.body?.error || 'Verification failed.');
    } finally { setVerifying(false); }
  };

  const handleCloseCycle = async (id) => {
    if (!confirm('Closing this cycle will lock all records and update asset statuses for missing/damaged items. Continue?')) return;
    try {
      await auditsApi.closeCycle(id);
      flash('success', 'Audit cycle closed. Asset statuses updated.');
      setSelectedCycle(null); loadData();
    } catch (err) {
      flash('danger', err.body?.error || 'Failed to close cycle.');
    }
  };

  const totalAssets = assets.length;

  return (
    <div className="page-content">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1>Audit Cycles</h1>
          <p>Verify physical inventory matches digital ledger records.</p>
        </div>
        {isManagerOrAdmin && (
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', fontWeight: 600 }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            Start New Audit Cycle
          </button>
        )}
      </div>

      {/* ── Banner ── */}
      {banner && (
        <div className={`banner banner-${banner.type}`} style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{banner.text}</span>
          <button onClick={() => setBanner(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1, color: 'inherit', opacity: 0.7 }}>×</button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-secondary)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⟳</div>
          <p>Loading audit cycles…</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedCycle ? '280px 1fr' : '1fr', gap: 24, alignItems: 'start' }}>

          {/* ── Sidebar: Cycle List ── */}
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', padding: 20, boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <svg width="16" height="16" fill="none" stroke="var(--color-primary)" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)' }}>Audit Runs</span>
              <span style={{ marginLeft: 'auto', background: 'var(--color-primary-tint)', color: 'var(--color-primary)', borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{cycles.length}</span>
            </div>

            {cycles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-faint)', fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
                No audit cycles yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cycles.map(c => {
                  const isSelected = selectedCycle?.id === c.id;
                  const done = c.records?.filter(r => ['Verified','Missing','Damaged'].includes(r.status)).length || 0;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCycle(c)}
                      style={{
                        textAlign: 'left', padding: '12px 14px', borderRadius: 'var(--radius-md)',
                        border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        background: isSelected ? 'var(--color-primary-tint)' : 'transparent',
                        cursor: 'pointer', transition: 'all .2s', width: '100%',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: isSelected ? 'var(--color-primary)' : 'var(--color-text)', lineHeight: 1.3 }}>{c.name}</span>
                        <span style={{
                          flexShrink: 0, marginLeft: 8, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                          background: c.isClosed ? 'var(--color-surface-sunken)' : '#E1F3EE',
                          color: c.isClosed ? 'var(--color-text-secondary)' : '#1E7A63',
                        }}>
                          {c.isClosed ? 'Closed' : 'Active'}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>
                        Ends {new Date(c.endDate).toLocaleDateString()} · {done} checked
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Main: Workspace ── */}
          {selectedCycle && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Cycle Header Card */}
              <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{selectedCycle.name}</h2>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      Cycle started {new Date(selectedCycle.startDate).toLocaleDateString()} —&nbsp;
                      <span style={{ fontWeight: 600, color: selectedCycle.isClosed ? 'var(--color-text-secondary)' : 'var(--color-accent)' }}>
                        {selectedCycle.isClosed ? 'Closed' : 'Verification Ongoing'}
                      </span>
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button
                      onClick={() => setSelectedCycle(null)}
                      style={{ padding: '8px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 600 }}
                    >
                      ← Back
                    </button>
                    {!selectedCycle.isClosed && isManagerOrAdmin && (
                      <button
                        onClick={() => handleCloseCycle(selectedCycle.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
                          borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                          background: 'var(--color-danger)', color: '#fff', fontWeight: 700, fontSize: 13,
                          boxShadow: '0 2px 8px rgba(192,57,43,0.35)', transition: 'transform .1s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17a2 2 0 002-2v-1a2 2 0 00-4 0v1a2 2 0 002 2zm6-7V9a6 6 0 00-12 0v1a2 2 0 00-2 2v7a2 2 0 002 2h12a2 2 0 002-2v-7a2 2 0 00-2-2z"/></svg>
                        Finalize &amp; Close Cycle
                      </button>
                    )}
                    {selectedCycle.isClosed && (
                      <span style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-sunken)', color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 600 }}>
                        🔒 Cycle Locked
                      </span>
                    )}
                  </div>
                </div>
                <ProgressBar records={selectedCycle.records} total={totalAssets} />
              </div>

              {/* Asset Checklist */}
              <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="16" height="16" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Asset Checklist</h3>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-faint)' }}>{totalAssets} assets</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ minWidth: 700 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 90 }}>Tag</th>
                        <th>Asset Name</th>
                        <th style={{ width: 130 }}>Location</th>
                        <th style={{ width: 110 }}>Acq. Date</th>
                        <th style={{ width: 130, textAlign: 'center' }}>Audit Status</th>
                        {!selectedCycle.isClosed && <th style={{ width: 110, textAlign: 'center' }}>Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {assets.map(asset => {
                        const record = selectedCycle.records?.find(r => r.assetId === asset.id);
                        return (
                          <tr key={asset.id} style={{ transition: 'background .15s' }}>
                            <td>
                              <code style={{ fontSize: 12, background: 'var(--color-surface-sunken)', padding: '2px 6px', borderRadius: 4, color: 'var(--color-primary)' }}>
                                {asset.assetTag}
                              </code>
                            </td>
                            <td style={{ fontWeight: 500 }}>{asset.name}</td>
                            <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{asset.location || 'Central Office'}</td>
                            <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                              {asset.acquisitionDate ? new Date(asset.acquisitionDate).toLocaleDateString() : '—'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <StatusPill status={record?.status} />
                            </td>
                            {!selectedCycle.isClosed && (
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  onClick={() => { setVerifyingAsset(asset); setVerificationStatus(record?.status || 'Verified'); setVerificationNotes(record?.notes || ''); }}
                                  style={{
                                    padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                                    background: record ? 'var(--color-surface-sunken)' : 'var(--color-accent)',
                                    color: record ? 'var(--color-text-secondary)' : '#fff',
                                    transition: 'opacity .15s',
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                                >
                                  {record ? '↺ Re-verify' : '✓ Verify'}
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Discrepancy Summary */}
              {selectedCycle.records?.filter(r => r.status === 'Missing' || r.status === 'Damaged').length > 0 && (
                <div style={{ background: '#FFFBF0', border: '1px solid #F6C04A', borderRadius: 'var(--radius-md)', padding: '16px 20px' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#92600A', marginBottom: 10 }}>
                    ⚠ Discrepancy Report
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selectedCycle.records.filter(r => r.status === 'Missing' || r.status === 'Damaged').map(r => (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                        <StatusPill status={r.status} />
                        <span style={{ fontWeight: 500 }}>{r.asset?.name || r.assetId}</span>
                        {r.notes && <span style={{ color: 'var(--color-text-secondary)' }}>— {r.notes}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state when no cycle selected and there are cycles */}
          {!selectedCycle && cycles.length > 0 && (
            <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', padding: 48, textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
              <h3 style={{ margin: '0 0 8px', color: 'var(--color-text)' }}>Select an Audit Cycle</h3>
              <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: 14 }}>Click an audit run on the left to open its asset checklist workspace.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Create Cycle Modal ── */}
      {showCreateModal && (
        <div onClick={() => setShowCreateModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(28,37,48,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: 32, width: '100%', maxWidth: 480, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Start New Audit Cycle</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--color-text-faint)', lineHeight: 1 }}>×</button>
            </div>
            <form onSubmit={handleCreateCycle} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="field">
                <label>Cycle Name</label>
                <input type="text" placeholder="e.g. Q3 Electronics Audit" value={cycleName} onChange={e => setCycleName(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>Start Date</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div className="field">
                  <label>End Date</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, fontWeight: 700 }} disabled={creating}>
                  {creating ? 'Creating…' : '🚀 Start Audit Cycle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Verify Asset Modal ── */}
      {verifyingAsset && (
        <div onClick={() => setVerifyingAsset(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(28,37,48,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: 32, width: '100%', maxWidth: 480, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 17 }}>Verify Asset</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <code style={{ fontSize: 12, background: 'var(--color-primary-tint)', color: 'var(--color-primary)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>{verifyingAsset.assetTag}</code>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{verifyingAsset.name}</span>
                </div>
              </div>
              <button onClick={() => setVerifyingAsset(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--color-text-faint)', lineHeight: 1 }}>×</button>
            </div>

            {/* Status selection — large visual buttons */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 10, color: 'var(--color-text-secondary)' }}>Verification Status</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { val: 'Verified', icon: '✓', label: 'Verified', desc: 'Present & Good', bg: '#E1F3EE', fg: '#1E7A63', border: '#1E7A63' },
                  { val: 'Missing',  icon: '?', label: 'Missing',  desc: 'Cannot Locate', bg: '#FBEAE8', fg: '#A93226', border: '#A93226' },
                  { val: 'Damaged',  icon: '⚠', label: 'Damaged',  desc: 'Needs Repair',  bg: '#FCF3E3', fg: '#B7791F', border: '#B7791F' },
                ].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setVerificationStatus(opt.val)}
                    style={{
                      padding: '12px 8px', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: `2px solid`,
                      borderColor: verificationStatus === opt.val ? opt.border : 'var(--color-border)',
                      background: verificationStatus === opt.val ? opt.bg : 'var(--color-surface-sunken)',
                      color: verificationStatus === opt.val ? opt.fg : 'var(--color-text-secondary)',
                      fontWeight: 700, textAlign: 'center', transition: 'all .15s',
                    }}
                  >
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{opt.icon}</div>
                    <div style={{ fontSize: 12 }}>{opt.label}</div>
                    <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.8 }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleVerifyAsset} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field">
                <label>Audit Notes <span style={{ color: 'var(--color-text-faint)', fontWeight: 400 }}>(optional)</span></label>
                <textarea
                  rows={3}
                  value={verificationNotes}
                  onChange={e => setVerificationNotes(e.target.value)}
                  placeholder="Location spotted, condition details, or notes…"
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setVerifyingAsset(null)}>Cancel</button>
                <button
                  type="submit"
                  disabled={verifying}
                  style={{
                    flex: 2, padding: '10px 0', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                    fontWeight: 700, fontSize: 14, color: '#fff', transition: 'opacity .15s',
                    background: verificationStatus === 'Verified' ? '#1E7A63' : verificationStatus === 'Missing' ? 'var(--color-danger)' : '#B7791F',
                  }}
                >
                  {verifying ? 'Submitting…' : `Submit as ${verificationStatus}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
