import { useEffect, useState } from 'react';
import { dashboardApi } from '../api/client';

export default function Reports() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardApi.reports()
      .then(setReportData)
      .catch((err) => setError(err.body?.error || 'Could not load reports.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-content"><p className="text-secondary">Loading analytics reports...</p></div>;
  if (error) return <div className="page-content"><div className="banner banner-danger">{error}</div></div>;

  const { departmentAllocations = [], categoryMaintenanceFreq = {}, mostUsedAssets = [] } = reportData || {};

  // Find max values for percentage bar scaling
  const maxAllocated = Math.max(...departmentAllocations.map(d => d.allocatedCount), 1);
  const maintCategories = Object.entries(categoryMaintenanceFreq);
  const maxMaint = Math.max(...maintCategories.map(([, count]) => count), 1);
  const maxBookings = Math.max(...mostUsedAssets.map(a => a.bookingCount), 1);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Reports & Analytics</h1>
          <p>Visual trends across departments, maintenance, and resource bookings.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Row 1: Allocation Breakdown & Repair Frequency */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
          
          {/* Card: Allocations by Department */}
          <div className="card card-padded" style={{ background: 'var(--bg-secondary)' }}>
            <h3>Active Allocations by Department</h3>
            <p className="text-secondary mb-4" style={{ fontSize: '12px' }}>Current long-term hardware and asset checkouts.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {departmentAllocations.length === 0 ? (
                <p className="text-secondary">No allocations recorded.</p>
              ) : (
                departmentAllocations.map((d, idx) => {
                  const percent = (d.allocatedCount / maxAllocated) * 100;
                  return (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                        <span>{d.department}</span>
                        <span style={{ fontWeight: 600 }}>{d.allocatedCount} assets</span>
                      </div>
                      <div style={{ width: '100%', height: '10px', background: 'var(--bg-tertiary)', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', background: 'var(--accent-color)', borderRadius: '5px', transition: 'width 0.5s ease-out' }}></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Card: Repairs by Category */}
          <div className="card card-padded" style={{ background: 'var(--bg-secondary)' }}>
            <h3>Repair Frequencies by Category</h3>
            <p className="text-secondary mb-4" style={{ fontSize: '12px' }}>Total maintenance requests submitted per category.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {maintCategories.length === 0 ? (
                <p className="text-secondary">No maintenance history recorded.</p>
              ) : (
                maintCategories.map(([category, count], idx) => {
                  const percent = (count / maxMaint) * 100;
                  return (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                        <span>{category}</span>
                        <span style={{ fontWeight: 600 }}>{count} repairs</span>
                      </div>
                      <div style={{ width: '100%', height: '10px', background: 'var(--bg-tertiary)', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', background: 'var(--warning)', borderRadius: '5px', transition: 'width 0.5s ease-out' }}></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Row 2: Resource Utilization (Bookings) */}
        <div className="card card-padded" style={{ background: 'var(--bg-secondary)' }}>
          <h3>Top 5 Most Utilized Bookable Resources</h3>
          <p className="text-secondary mb-4" style={{ fontSize: '12px' }}>Shared conference rooms and resources ranked by total bookings.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {mostUsedAssets.length === 0 ? (
              <p className="text-secondary">No booking records recorded.</p>
            ) : (
              mostUsedAssets.map((asset, idx) => {
                const percent = (asset.bookingCount / maxBookings) * 100;
                return (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 500 }}>{asset.assetName}</span>
                      <span style={{ fontWeight: 600 }}>{asset.bookingCount} sessions</span>
                    </div>
                    <div style={{ width: '100%', height: '12px', background: 'var(--bg-tertiary)', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ width: `${percent}%`, height: '100%', background: 'var(--success)', borderRadius: '6px', transition: 'width 0.5s ease-out' }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
