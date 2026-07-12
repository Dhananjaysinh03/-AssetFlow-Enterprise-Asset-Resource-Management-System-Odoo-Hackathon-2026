import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api/client';
import KpiCard from '../components/KpiCard';

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    dashboardApi
      .kpis()
      .then(setKpis)
      .catch((err) => setError(err.body?.error || 'Could not load dashboard data.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // Light polling keeps the KPI numbers "live" through a demo without
    // needing a websocket layer — refresh is cheap and this is a hackathon build.
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Real-time snapshot of assets, allocations, and bookings.</p>
        </div>
        <div className="flex gap-3">
          <Link className="btn btn-secondary" to="/assets">Register Asset</Link>
          <Link className="btn btn-secondary" to="/bookings">Book Resource</Link>
          <Link className="btn btn-primary" to="/allocations">Allocate Asset</Link>
        </div>
      </div>

      {error && <div className="banner banner-danger">{error}</div>}

      {loading && !kpis ? (
        <p className="text-secondary">Loading KPIs…</p>
      ) : (
        <div className="kpi-grid">
          <KpiCard label="Assets Available" value={kpis?.assetsAvailable} tone="accent" />
          <KpiCard label="Assets Allocated" value={kpis?.assetsAllocated} />
          <KpiCard label="Active Bookings" value={kpis?.activeBookings} />
          <KpiCard label="Upcoming Returns" value={kpis?.upcomingReturns} />
          <KpiCard label="Overdue Returns" value={kpis?.overdueReturns} tone="danger" />
          <KpiCard label="Maintenance Today" value={kpis?.maintenanceToday ?? 0} />
        </div>
      )}

      <div className="card card-padded">
        <h3>Quick tips</h3>
        <p className="text-secondary mt-2">
          Overdue returns are computed live from each allocation's expected return date — try
          allocating an asset with a past return date to see this KPI update.
        </p>
      </div>
    </div>
  );
}
