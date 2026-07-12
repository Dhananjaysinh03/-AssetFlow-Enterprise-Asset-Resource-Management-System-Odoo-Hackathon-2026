import { useEffect, useState, useRef } from 'react';
import { dashboardApi, allocationsApi, maintenanceApi, bookingsApi } from '../api/client';

const PALETTE = [
  '#2B4C7E', '#3FA796', '#B7791F', '#6B4B9E',
  '#C0392B', '#1E7A63', '#2980B9', '#8E44AD'
];

// ── Animated Donut (CSS border-radius trick) ──────────────
function DonutChart({ slices, total, size = 180 }) {
  if (!slices.length || total === 0) {
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--color-surface-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>No data</span>
      </div>
    );
  }

  // Build conic-gradient
  let cumPct = 0;
  const stops = slices.map((s, i) => {
    const pct = (s.value / total) * 100;
    const from = cumPct;
    cumPct += pct;
    return `${s.color} ${from}% ${cumPct}%`;
  }).join(', ');

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: `conic-gradient(${stops})`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }} />
      {/* Hole */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: size * 0.55, height: size * 0.55,
        borderRadius: '50%', background: 'var(--color-surface)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.06)'
      }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1 }}>{total}</span>
        <span style={{ fontSize: 10, color: 'var(--color-text-faint)', marginTop: 3 }}>Total</span>
      </div>
    </div>
  );
}

// ── Horizontal Progress Bar ───────────────────────────────
function HBar({ label, value, max, color, rank }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
      {rank !== undefined && (
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-faint)', minWidth: 20, textAlign: 'right' }}>#{rank}</span>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>{label}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
        </div>
        <div style={{ height: 8, background: 'var(--color-surface-sunken)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct}%`, background: color,
            borderRadius: 4, transition: 'width 0.8s cubic-bezier(.4,0,.2,1)'
          }} />
        </div>
      </div>
    </div>
  );
}

// ── Vertical Column Chart ─────────────────────────────────
function ColumnChart({ data }) {
  if (!data.length) return <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-faint)', fontSize: 13 }}>No data available</div>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 180, padding: '0 8px' }}>
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        const color = PALETTE[i % PALETTE.length];
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color }}>{d.value}</span>
            <div style={{
              width: '100%', height: `${pct}%`, minHeight: 4, background: color,
              borderRadius: '4px 4px 0 0', transition: 'height 0.8s ease',
              maxWidth: 52, opacity: 0.9
            }} />
            <span style={{ fontSize: 10, color: 'var(--color-text-faint)', textAlign: 'center', maxWidth: 52, lineHeight: 1.3, wordBreak: 'break-word' }}>
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color, bg }) {
  return (
    <div style={{ background: bg, border: `1px solid ${color}30`, borderRadius: 'var(--radius-md)', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', marginTop: 4 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Legend Dot ────────────────────────────────────────────
function LegendItem({ color, label, value, pct }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
      <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: 'var(--color-text)', flex: 1 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{value}</span>
      <span style={{ fontSize: 11, color: 'var(--color-text-faint)', minWidth: 32, textAlign: 'right' }}>{pct}%</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
export default function Reports() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [tab, setTab]       = useState('overview'); // overview | maintenance | bookings

  useEffect(() => {
    dashboardApi.reports()
      .then(r => {
        // normalise field names
        if (r.mostUsedAssets) {
          r.mostUsedAssets = r.mostUsedAssets.map(a => ({
            ...a,
            bookingCount: a.bookingCount ?? a.bookingsCount ?? 0
          }));
        }
        if (Array.isArray(r.categoryMaintenanceFrequency)) {
          r.categoryMaintenanceFreq = {};
          r.categoryMaintenanceFrequency.forEach(item => {
            r.categoryMaintenanceFreq[item.category] = item.count;
          });
        } else if (!r.categoryMaintenanceFreq) {
          r.categoryMaintenanceFreq = {};
        }
        setData(r);
      })
      .catch(err => setError(err.body?.error || 'Could not load reports.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 40, height: 40, border: '4px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>Loading analytics…</p>
    </div>
  );
  if (error) return <div className="page-content"><div className="banner banner-danger">{error}</div></div>;

  const {
    departmentAllocations = [],
    categoryMaintenanceFreq = {},
    mostUsedAssets = []
  } = data || {};

  const maintEntries  = Object.entries(categoryMaintenanceFreq).sort((a, b) => b[1] - a[1]);
  const totalAlloc    = departmentAllocations.reduce((s, d) => s + d.allocatedCount, 0);
  const totalMaint    = maintEntries.reduce((s, [, c]) => s + c, 0);
  const totalBookings = mostUsedAssets.reduce((s, a) => s + a.bookingCount, 0);
  const maxAlloc      = Math.max(...departmentAllocations.map(d => d.allocatedCount), 1);
  const maxBook       = Math.max(...mostUsedAssets.map(a => a.bookingCount), 1);

  const TABS = [
    { key: 'overview',     label: '📊 Overview' },
    { key: 'departments',  label: '🏢 Departments' },
    { key: 'maintenance',  label: '🔧 Maintenance' },
    { key: 'bookings',     label: '📅 Bookings' },
  ];

  return (
    <div className="page-content">

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1>Reports &amp; Analytics</h1>
          <p>Live insights across asset lifecycle, maintenance patterns, and resource utilisation.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-accent)', fontWeight: 600, background: 'var(--color-accent-tint)', padding: '6px 14px', borderRadius: 20 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-accent)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          Live data
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <KpiCard icon="📦" label="Assets Allocated" value={totalAlloc} sub="currently checked out" color="#2B4C7E" bg="#E7EDF6" />
        <KpiCard icon="🔧" label="Maintenance Tickets" value={totalMaint} sub="across all categories" color="#B7791F" bg="#FCF3E3" />
        <KpiCard icon="📅" label="Resource Bookings" value={totalBookings} sub="total sessions recorded" color="#1E7A63" bg="#E1F3EE" />
        <KpiCard icon="🏢" label="Departments Active" value={departmentAllocations.length} sub="with asset allocations" color="#6B4B9E" bg="#F0EAFA" />
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--color-surface-sunken)', padding: 4, borderRadius: 'var(--radius-md)', width: 'fit-content' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: tab === t.key ? 'var(--color-surface)' : 'transparent',
              color: tab === t.key ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              boxShadow: tab === t.key ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ OVERVIEW TAB ══ */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

            {/* Donut: Dept Allocations */}
            <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>Allocation Distribution</h3>
              <p style={{ margin: '0 0 20px', fontSize: 12, color: 'var(--color-text-secondary)' }}>Assets checked out per department</p>
              {departmentAllocations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-faint)' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
                  <p style={{ margin: 0, fontSize: 13 }}>No allocations recorded yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                  <DonutChart
                    slices={departmentAllocations.map((d, i) => ({ value: d.allocatedCount, color: PALETTE[i % PALETTE.length] }))}
                    total={totalAlloc}
                  />
                  <div style={{ flex: 1, minWidth: 160 }}>
                    {departmentAllocations.map((d, i) => (
                      <LegendItem
                        key={i}
                        color={PALETTE[i % PALETTE.length]}
                        label={d.department}
                        value={d.allocatedCount}
                        pct={totalAlloc > 0 ? Math.round((d.allocatedCount / totalAlloc) * 100) : 0}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Column: Maintenance by Category */}
            <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>Repair Tickets by Category</h3>
              <p style={{ margin: '0 0 20px', fontSize: 12, color: 'var(--color-text-secondary)' }}>Which asset types need the most maintenance</p>
              <ColumnChart data={maintEntries.map(([label, value]) => ({ label, value }))} />
            </div>
          </div>

          {/* Resource Bookings Summary */}
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>Top Booked Resources</h3>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)' }}>Most frequently booked shared assets (rooms, vehicles, equipment)</p>
              </div>
              <span style={{ fontSize: 12, background: 'var(--color-accent-tint)', color: 'var(--color-accent)', padding: '4px 12px', borderRadius: 20, fontWeight: 700 }}>
                {totalBookings} sessions total
              </span>
            </div>
            {mostUsedAssets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-faint)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
                <p style={{ margin: 0, fontSize: 13 }}>No bookings recorded yet</p>
              </div>
            ) : (
              mostUsedAssets.map((a, i) => (
                <HBar key={i} rank={i + 1} label={a.assetName} value={a.bookingCount} max={maxBook} color={PALETTE[i % PALETTE.length]} />
              ))
            )}
          </div>
        </div>
      )}

      {/* ══ DEPARTMENTS TAB ══ */}
      {tab === 'departments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Donut */}
            <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>Asset Distribution</h3>
              <p style={{ margin: '0 0 20px', fontSize: 12, color: 'var(--color-text-secondary)' }}>Share of allocated assets by department</p>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <DonutChart
                  slices={departmentAllocations.map((d, i) => ({ value: d.allocatedCount, color: PALETTE[i % PALETTE.length] }))}
                  total={totalAlloc} size={200}
                />
              </div>
            </div>

            {/* Table */}
            <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--color-border)', fontWeight: 700, fontSize: 15 }}>Dept-wise Breakdown</div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th style={{ textAlign: 'right' }}>Allocated</th>
                    <th style={{ textAlign: 'right' }}>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentAllocations.length === 0 ? (
                    <tr><td colSpan={3}><div className="empty-state"><h3>No data</h3></div></td></tr>
                  ) : (
                    departmentAllocations
                      .sort((a, b) => b.allocatedCount - a.allocatedCount)
                      .map((d, i) => (
                        <tr key={i}>
                          <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                            {d.department}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>{d.allocatedCount}</td>
                          <td style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: 12, background: 'var(--color-primary-tint)', color: 'var(--color-primary)', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                              {totalAlloc > 0 ? Math.round((d.allocatedCount / totalAlloc) * 100) : 0}%
                            </span>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Full-width bars */}
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700 }}>Allocation Volume by Department</h3>
            {departmentAllocations.map((d, i) => (
              <HBar key={i} label={d.department} value={d.allocatedCount} max={maxAlloc} color={PALETTE[i % PALETTE.length]} />
            ))}
          </div>
        </div>
      )}

      {/* ══ MAINTENANCE TAB ══ */}
      {tab === 'maintenance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>Tickets by Category</h3>
              <p style={{ margin: '0 0 20px', fontSize: 12, color: 'var(--color-text-secondary)' }}>Column chart — ticket volume per asset type</p>
              <ColumnChart data={maintEntries.map(([label, value]) => ({ label, value }))} />
            </div>
            <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>Maintenance Share</h3>
              <p style={{ margin: '0 0 20px', fontSize: 12, color: 'var(--color-text-secondary)' }}>Percentage of total tickets per category</p>
              {maintEntries.length === 0
                ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-faint)', fontSize: 13 }}>No maintenance tickets yet</div>
                : maintEntries.map(([cat, count], i) => (
                  <HBar key={i} label={cat} value={count} max={Math.max(...maintEntries.map(([, c]) => c), 1)} color={PALETTE[i % PALETTE.length]} />
                ))
              }
            </div>
          </div>

          {/* Detailed table */}
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)', fontWeight: 700, fontSize: 15 }}>Full Maintenance Report</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Tickets</th>
                  <th>Share</th>
                  <th style={{ textAlign: 'center' }}>Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {maintEntries.length === 0 ? (
                  <tr><td colSpan={5}><div className="empty-state"><h3>No maintenance data</h3><p>No repair tickets submitted yet.</p></div></td></tr>
                ) : (
                  maintEntries.map(([cat, count], i) => {
                    const share = totalMaint > 0 ? Math.round((count / totalMaint) * 100) : 0;
                    const risk = share >= 40 ? { label: 'High', bg: '#FBEAE8', fg: '#A93226' }
                               : share >= 20 ? { label: 'Medium', bg: '#FCF3E3', fg: '#B7791F' }
                               :               { label: 'Low', bg: '#E1F3EE', fg: '#1E7A63' };
                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 700, color: 'var(--color-text-faint)' }}>#{i + 1}</td>
                        <td style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 2, background: PALETTE[i % PALETTE.length] }} />
                          {cat}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>{count}</td>
                        <td style={{ minWidth: 140 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: 'var(--color-surface-sunken)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${share}%`, height: '100%', background: PALETTE[i % PALETTE.length], borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, minWidth: 32 }}>{share}%</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: risk.bg, color: risk.fg }}>{risk.label}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ BOOKINGS TAB ══ */}
      {tab === 'bookings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>Booking Volume</h3>
              <p style={{ margin: '0 0 20px', fontSize: 12, color: 'var(--color-text-secondary)' }}>Sessions per bookable resource</p>
              <ColumnChart data={mostUsedAssets.map(a => ({ label: a.assetName.split(' ')[0], value: a.bookingCount }))} />
            </div>
            <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>Utilisation Share</h3>
              <p style={{ margin: '0 0 20px', fontSize: 12, color: 'var(--color-text-secondary)' }}>Relative usage share per resource</p>
              {mostUsedAssets.length === 0
                ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-faint)', fontSize: 13 }}>No bookings yet</div>
                : mostUsedAssets.map((a, i) => (
                  <HBar key={i} rank={i + 1} label={a.assetName} value={a.bookingCount} max={maxBook} color={PALETTE[i % PALETTE.length]} />
                ))
              }
            </div>
          </div>

          {/* Bookings table */}
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)', fontWeight: 700, fontSize: 15 }}>Resource Utilisation Report</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Resource</th>
                  <th style={{ textAlign: 'right' }}>Sessions</th>
                  <th>Utilisation</th>
                  <th style={{ textAlign: 'center' }}>Demand</th>
                </tr>
              </thead>
              <tbody>
                {mostUsedAssets.length === 0 ? (
                  <tr><td colSpan={5}><div className="empty-state"><h3>No bookings</h3><p>Book a shared resource to see data here.</p></div></td></tr>
                ) : (
                  mostUsedAssets.map((a, i) => {
                    const share = totalBookings > 0 ? Math.round((a.bookingCount / totalBookings) * 100) : 0;
                    const demand = share >= 35 ? { label: 'High', bg: '#FBEAE8', fg: '#A93226' }
                                 : share >= 15 ? { label: 'Medium', bg: '#FCF3E3', fg: '#B7791F' }
                                 :               { label: 'Low', bg: '#E1F3EE', fg: '#1E7A63' };
                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 700, color: 'var(--color-text-faint)' }}>#{i + 1}</td>
                        <td style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 2, background: PALETTE[i % PALETTE.length] }} />
                          {a.assetName}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-accent)' }}>{a.bookingCount}</td>
                        <td style={{ minWidth: 140 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: 'var(--color-surface-sunken)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${share}%`, height: '100%', background: PALETTE[i % PALETTE.length], borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, minWidth: 32 }}>{share}%</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: demand.bg, color: demand.fg }}>{demand.label}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>
    </div>
  );
}
