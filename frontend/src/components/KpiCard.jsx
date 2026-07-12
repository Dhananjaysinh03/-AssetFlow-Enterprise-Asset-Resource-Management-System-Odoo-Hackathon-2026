export default function KpiCard({ label, value, tone }) {
  const valueClass = tone === 'danger' ? 'kpi-value is-danger' : tone === 'accent' ? 'kpi-value is-accent' : 'kpi-value';
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className={valueClass}>{value ?? '—'}</div>
    </div>
  );
}
