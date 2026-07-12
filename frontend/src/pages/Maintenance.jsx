import { useEffect, useState } from 'react';
import { maintenanceApi, assetsApi, employeesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

// ── Column config ─────────────────────────────────────────
const COLUMNS = [
  { key: 'Pending',            label: 'Pending',           icon: '🕐', accent: '#B7791F', bg: '#FCF3E3', border: '#F6C04A' },
  { key: 'Approved',           label: 'Approved',          icon: '✅', accent: '#2B4C7E', bg: '#E7EDF6', border: '#93B1D7' },
  { key: 'Technician_Assigned',label: 'Tech Assigned',     icon: '👷', accent: '#6B4B9E', bg: '#F0EAFA', border: '#B39DDB' },
  { key: 'In_Progress',        label: 'In Progress',       icon: '⚙️', accent: '#C0392B', bg: '#FBEAE8', border: '#F1948A' },
  { key: 'Resolved',           label: 'Resolved',          icon: '✓',  accent: '#1E7A63', bg: '#E1F3EE', border: '#81C784' },
];

// ── Priority badge ────────────────────────────────────────
const PRIORITY = {
  Low:      { fg: '#1E7A63', bg: '#E1F3EE' },
  Medium:   { fg: '#B7791F', bg: '#FCF3E3' },
  High:     { fg: '#A93226', bg: '#FBEAE8' },
  Critical: { fg: '#fff',    bg: '#A93226' },
};

function PriorityBadge({ p }) {
  const cfg = PRIORITY[p] || PRIORITY.Medium;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: cfg.bg, color: cfg.fg, letterSpacing: 0.3 }}>
      {p?.toUpperCase()}
    </span>
  );
}

// ── Avatar ────────────────────────────────────────────────
function Avatar({ name, size = 26 }) {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const hue = name ? (name.charCodeAt(0) * 37 + name.charCodeAt(1 % name.length) * 17) % 360 : 200;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `hsl(${hue},55%,48%)`, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700
    }}>
      {initials}
    </div>
  );
}

// ── Ticket Card ───────────────────────────────────────────
function TicketCard({ req, isManagerOrAdmin, onApprove, onAssign, onResolve, col }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <div
      onClick={() => setExpanded(e => !e)}
      style={{
        background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
        border: `1px solid var(--color-border)`,
        borderLeft: `3px solid ${col.accent}`,
        padding: '14px 14px 12px',
        cursor: 'pointer', transition: 'box-shadow .15s, transform .15s',
        boxShadow: 'var(--shadow-sm)',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'none'; }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <code style={{ fontSize: 11, fontWeight: 700, color: col.accent, background: col.bg, padding: '2px 6px', borderRadius: 4 }}>
          {req.asset?.assetTag || 'N/A'}
        </code>
        <PriorityBadge p={req.priority} />
      </div>

      {/* Asset name */}
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6, lineHeight: 1.3 }}>
        {req.asset?.name || 'Unknown Asset'}
      </div>

      {/* Description */}
      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 10px', lineHeight: 1.5,
        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: expanded ? 'unset' : 2, WebkitBoxOrient: 'vertical' }}>
        {req.issueDescription}
      </p>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Avatar name={req.requester?.name} size={22} />
          <span style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>{req.requester?.name}</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>{date}</span>
      </div>

      {/* Technician row */}
      {req.assignedTo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '6px 8px', background: 'var(--color-surface-sunken)', borderRadius: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--color-text-faint)', fontWeight: 600 }}>TECH</span>
          <Avatar name={req.assignedTo?.name} size={20} />
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 500 }}>{req.assignedTo?.name}</span>
        </div>
      )}

      {/* Action buttons — only for manager/admin, stop propagation */}
      {isManagerOrAdmin && (
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
          {req.status === 'Pending' && (
            <button
              onClick={() => onApprove(req.id)}
              style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700,
                background: '#2B4C7E', color: '#fff', transition: 'opacity .15s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              ✓ Approve
            </button>
          )}
          {req.status === 'Approved' && (
            <button
              onClick={() => onAssign(req.id)}
              style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700,
                background: '#6B4B9E', color: '#fff', transition: 'opacity .15s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              👷 Assign Tech
            </button>
          )}
          {['Approved','Technician_Assigned','In_Progress'].includes(req.status) && (
            <button
              onClick={() => onResolve(req.id)}
              style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700,
                background: '#1E7A63', color: '#fff', transition: 'opacity .15s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              ✓ Resolve
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
export default function Maintenance() {
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'Admin' || user?.role === 'Asset_Manager';

  const [requests, setRequests]   = useState([]);
  const [assets, setAssets]       = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [banner, setBanner]       = useState(null);
  const [loading, setLoading]     = useState(true);

  // Modals
  const [showCreate, setShowCreate]     = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [priority, setPriority]         = useState('Medium');
  const [submitting, setSubmitting]     = useState(false);

  const [assignId, setAssignId]         = useState(null);
  const [selectedTechId, setSelectedTechId] = useState('');

  const [resolveId, setResolveId]       = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const flash = (type, text) => { setBanner({ type, text }); setTimeout(() => setBanner(null), 4000); };

  const loadData = () => {
    setLoading(true);
    Promise.all([maintenanceApi.list(), assetsApi.list(), employeesApi.list()])
      .then(([reqs, asts, emps]) => {
        setRequests(reqs);
        setAssets(asts);
        setTechnicians(emps.filter(e => ['Asset_Manager', 'Admin', 'Employee'].includes(e.role)));
      })
      .catch(err => flash('danger', err.body?.error || 'Could not load maintenance data.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!selectedAssetId || !issueDescription.trim()) { flash('danger', 'Please select an asset and describe the issue.'); return; }
    setSubmitting(true);
    try {
      await maintenanceApi.create({ assetId: selectedAssetId, issueDescription, priority });
      flash('success', 'Maintenance request submitted successfully!');
      setShowCreate(false); setSelectedAssetId(''); setIssueDescription(''); setPriority('Medium');
      loadData();
    } catch (err) { flash('danger', err.body?.error || 'Could not submit request.'); }
    finally { setSubmitting(false); }
  };

  const handleApprove = async (id) => {
    try { await maintenanceApi.approve(id); flash('success', 'Request approved!'); loadData(); }
    catch (err) { flash('danger', err.body?.error || 'Action failed.'); }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedTechId) return;
    try { await maintenanceApi.assign(assignId, selectedTechId); flash('success', 'Technician assigned!'); setAssignId(null); setSelectedTechId(''); loadData(); }
    catch (err) { flash('danger', err.body?.error || 'Action failed.'); }
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    if (!resolutionNotes.trim()) return;
    try { await maintenanceApi.resolve(resolveId, resolutionNotes); flash('success', 'Request resolved! Asset is available again.'); setResolveId(null); setResolutionNotes(''); loadData(); }
    catch (err) { flash('danger', err.body?.error || 'Action failed.'); }
  };

  const totalOpen = requests.filter(r => r.status !== 'Resolved').length;
  const critical  = requests.filter(r => r.priority === 'Critical' && r.status !== 'Resolved').length;

  return (
    <div className="page-content">

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1>Maintenance Board</h1>
          <p>Track and manage the full asset repair pipeline — from request to resolution.</p>
        </div>
        <div style={{ display: 'flex', align: 'center', gap: 10 }}>
          {critical > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FBEAE8', border: '1px solid #F1948A', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, color: '#A93226' }}>
              🚨 {critical} Critical
            </div>
          )}
          <button
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            Raise Repair Request
          </button>
        </div>
      </div>

      {/* ── Banner ── */}
      {banner && (
        <div className={`banner banner-${banner.type}`} style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{banner.text}</span>
          <button onClick={() => setBanner(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'inherit', opacity: 0.7 }}>×</button>
        </div>
      )}

      {/* ── KPI strip ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {COLUMNS.map(col => {
          const count = requests.filter(r => r.status === col.key).length;
          return (
            <div key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 8, background: col.bg, border: `1px solid ${col.border}`, flex: '1 1 140px' }}>
              <span style={{ fontSize: 18 }}>{col.icon}</span>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: col.accent, lineHeight: 1 }}>{count}</div>
                <div style={{ fontSize: 11, color: col.accent, fontWeight: 600, opacity: 0.8 }}>{col.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Kanban Board ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-secondary)' }}>
          <div style={{ width: 36, height: 36, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Loading board…
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, alignItems: 'start' }}>
          {COLUMNS.map(col => {
            const list = requests.filter(r => r.status === col.key);
            return (
              <div key={col.key} style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>

                {/* Column header */}
                <div style={{ padding: '12px 14px', background: col.bg, borderBottom: `2px solid ${col.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 15 }}>{col.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: col.accent }}>{col.label}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, background: col.accent, color: '#fff', borderRadius: 10, padding: '2px 8px', minWidth: 22, textAlign: 'center' }}>
                    {list.length}
                  </span>
                </div>

                {/* Cards */}
                <div style={{ padding: '10px 10px', background: 'var(--color-surface-sunken)', minHeight: 200, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {list.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '28px 12px', color: 'var(--color-text-faint)', fontSize: 12 }}>
                      <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.5 }}>—</div>
                      No tickets
                    </div>
                  ) : (
                    list.map(req => (
                      <TicketCard
                        key={req.id}
                        req={req}
                        col={col}
                        isManagerOrAdmin={isManagerOrAdmin}
                        onApprove={handleApprove}
                        onAssign={setAssignId}
                        onResolve={setResolveId}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ CREATE MODAL ══ */}
      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18 }}>Raise Repair Request</h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>Describe the issue and our team will handle it.</p>
              </div>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--color-text-faint)', lineHeight: 1 }}>×</button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="field">
                <label>Asset to Repair</label>
                <select value={selectedAssetId} onChange={e => setSelectedAssetId(e.target.value)}>
                  <option value="">-- Select Asset --</option>
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>{a.name} · {a.assetTag}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Issue Description</label>
                <textarea rows="3" value={issueDescription} onChange={e => setIssueDescription(e.target.value)} placeholder="Describe the fault, error, or damage in detail…" style={{ resize: 'vertical' }} />
              </div>

              {/* Priority visual selector */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 10, color: 'var(--color-text-secondary)' }}>Priority Level</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {['Low', 'Medium', 'High', 'Critical'].map(p => {
                    const cfg = PRIORITY[p];
                    const sel = priority === p;
                    return (
                      <button
                        key={p} type="button"
                        onClick={() => setPriority(p)}
                        style={{
                          padding: '10px 6px', borderRadius: 8, cursor: 'pointer',
                          border: `2px solid ${sel ? cfg.fg : 'var(--color-border)'}`,
                          background: sel ? cfg.bg : 'var(--color-surface-sunken)',
                          color: sel ? cfg.fg : 'var(--color-text-secondary)',
                          fontWeight: 700, fontSize: 12, transition: 'all .15s'
                        }}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, fontWeight: 700 }} disabled={submitting}>
                  {submitting ? 'Submitting…' : '🔧 Submit Repair Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ ASSIGN MODAL ══ */}
      {assignId && (
        <div className="modal-backdrop" onClick={() => setAssignId(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18 }}>Assign Technician</h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>Choose a team member to handle this repair.</p>
              </div>
              <button onClick={() => setAssignId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--color-text-faint)', lineHeight: 1 }}>×</button>
            </div>
            <form onSubmit={handleAssign} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {technicians.map(t => (
                  <button
                    key={t.id} type="button"
                    onClick={() => setSelectedTechId(t.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                      borderRadius: 8, border: `2px solid ${selectedTechId === t.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: selectedTechId === t.id ? 'var(--color-primary-tint)' : 'var(--color-surface-sunken)',
                      cursor: 'pointer', textAlign: 'left', transition: 'all .15s'
                    }}
                  >
                    <Avatar name={t.name} size={36} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>{t.role.replace(/_/g, ' ')}</div>
                    </div>
                    {selectedTechId === t.id && (
                      <div style={{ marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</div>
                    )}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setAssignId(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, fontWeight: 700 }} disabled={!selectedTechId}>Assign Technician</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ RESOLVE MODAL ══ */}
      {resolveId && (
        <div className="modal-backdrop" onClick={() => setResolveId(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18 }}>Mark as Resolved</h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>Asset will return to Available status.</p>
              </div>
              <button onClick={() => setResolveId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--color-text-faint)', lineHeight: 1 }}>×</button>
            </div>
            <form onSubmit={handleResolve} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="field">
                <label>Resolution Notes</label>
                <textarea rows="4" value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} placeholder="Describe what was repaired, replaced, or resolved…" style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setResolveId(null)}>Cancel</button>
                <button type="submit" style={{ flex: 2, fontWeight: 700, background: '#1E7A63', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '10px', cursor: 'pointer', fontSize: 14 }} disabled={!resolutionNotes.trim()}>
                  ✓ Complete Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
