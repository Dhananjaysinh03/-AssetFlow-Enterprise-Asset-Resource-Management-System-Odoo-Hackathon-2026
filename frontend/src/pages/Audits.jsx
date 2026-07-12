import { useEffect, useState } from 'react';
import { auditsApi, assetsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Audits() {
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'Admin' || user?.role === 'Asset_Manager';

  const [cycles, setCycles] = useState([]);
  const [assets, setAssets] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create Cycle Form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [cycleName, setCycleName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Asset verification Form
  const [verifyingAsset, setVerifyingAsset] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('Verified');
  const [verificationNotes, setVerificationNotes] = useState('');

  const loadData = () => {
    setLoading(true);
    setError('');
    Promise.all([
      auditsApi.listCycles(),
      assetsApi.list()
    ])
      .then(([cycs, asts]) => {
        setCycles(cycs);
        setAssets(asts);
        if (selectedCycle) {
          // Refresh active selected cycle details
          const updated = cycs.find(c => c.id === selectedCycle.id);
          setSelectedCycle(updated || null);
        }
      })
      .catch((err) => setError(err.body?.error || 'Could not load audit data.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCycle = (e) => {
    e.preventDefault();
    if (!cycleName || !startDate || !endDate) {
      setError('Please fill in all fields.');
      return;
    }

    auditsApi.createCycle({
      name: cycleName,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    })
      .then(() => {
        setSuccess('New audit cycle initialized successfully!');
        setShowCreateModal(false);
        setCycleName('');
        setStartDate('');
        setEndDate('');
        loadData();
      })
      .catch(err => setError(err.body?.error || 'Could not start audit cycle.'));
  };

  const handleVerifyAsset = (e) => {
    e.preventDefault();
    if (!selectedCycle || !verifyingAsset) return;

    auditsApi.verifyAsset(selectedCycle.id, {
      assetId: verifyingAsset.id,
      status: verificationStatus,
      notes: verificationNotes
    })
      .then(() => {
        setSuccess(`Verified ${verifyingAsset.name} successfully.`);
        setVerifyingAsset(null);
        setVerificationNotes('');
        setVerificationStatus('Verified');
        loadData();
      })
      .catch(err => setError(err.body?.error || 'Verification failed.'));
  };

  const handleCloseCycle = (id) => {
    if (!confirm('Are you sure you want to close this audit cycle? This will lock all checklist responses and report missing items.')) return;

    auditsApi.closeCycle(id)
      .then(() => {
        setSuccess('Audit cycle closed. Asset tags and records finalized.');
        setSelectedCycle(null);
        loadData();
      })
      .catch(err => setError(err.body?.error || 'Failed to close cycle.'));
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Audit Cycles</h1>
          <p>Verify physical inventory matches digital ledger records.</p>
        </div>
        {isManagerOrAdmin && (
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            ➕ Start New Audit Cycle
          </button>
        )}
      </div>

      {error && <div className="banner banner-danger mb-4">{error}</div>}
      {success && <div className="banner banner-success mb-4">{success}</div>}

      {loading ? (
        <p className="text-secondary">Loading audits...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedCycle ? '300px 1fr' : '1fr', gap: '24px' }}>
          
          {/* List of Audit Cycles */}
          <div className="card card-padded" style={{ background: 'var(--bg-secondary)', height: 'fit-content' }}>
            <h3>Audit Runs</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
              {cycles.length === 0 ? (
                <p className="text-secondary">No audit cycles configured.</p>
              ) : (
                cycles.map((c) => (
                  <div 
                    key={c.id} 
                    onClick={() => setSelectedCycle(c)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      background: selectedCycle?.id === c.id ? 'var(--bg-tertiary)' : 'transparent',
                      border: `1px solid ${selectedCycle?.id === c.id ? 'var(--accent-color)' : 'var(--border-color)'}`,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600 }}>{c.name}</span>
                      <span className={`status-${c.isClosed ? 'resolved' : 'pending'}`} style={{ fontSize: '11px' }}>
                        {c.isClosed ? 'Closed' : 'Active'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Ends: {new Date(c.endDate).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Cycle Details Workspace */}
          {selectedCycle && (
            <div className="card card-padded" style={{ background: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
                <div>
                  <h2>{selectedCycle.name} Workspace</h2>
                  <p className="text-secondary" style={{ fontSize: '12px' }}>
                    Cycle started {new Date(selectedCycle.startDate).toLocaleDateString()} — {selectedCycle.isClosed ? 'Closed' : 'Verification Ongoing'}
                  </p>
                </div>
                {!selectedCycle.isClosed && isManagerOrAdmin && (
                  <button className="btn btn-danger" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={() => handleCloseCycle(selectedCycle.id)}>
                    🔒 Finalize & Close Cycle
                  </button>
                )}
              </div>

              {/* Verified Checklist */}
              <h3>Asset Checklist</h3>
              <table className="table" style={{ marginTop: '12px' }}>
                <thead>
                  <tr>
                    <th>Tag</th>
                    <th>Asset Name</th>
                    <th>Acquisition Date</th>
                    <th>Location</th>
                    <th>Audit Status</th>
                    {!selectedCycle.isClosed && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => {
                    // Find if there is a record for this asset in this cycle
                    const record = selectedCycle.records?.find(r => r.assetId === asset.id);
                    return (
                      <tr key={asset.id}>
                        <td><code>{asset.assetTag}</code></td>
                        <td>{asset.name}</td>
                        <td>{asset.acquisitionDate ? new Date(asset.acquisitionDate).toLocaleDateString() : '-'}</td>
                        <td>{asset.location || 'Central office'}</td>
                        <td>
                          {record ? (
                            <span className={`status-${record.status.toLowerCase()}`}>{record.status}</span>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Pending count</span>
                          )}
                        </td>
                        {!selectedCycle.isClosed && (
                          <td>
                            <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => setVerifyingAsset(asset)}>
                              🔍 {record ? 'Re-verify' : 'Verify'}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Cycle Modal */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Start New Audit Cycle</h3>
            <form onSubmit={handleCreateCycle} style={{ marginTop: '16px' }}>
              <div className="form-group">
                <label>Cycle Name</label>
                <input type="text" className="form-control" placeholder="e.g. Q3 Electronics Audit" value={cycleName} onChange={e => setCycleName(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Start Date</label>
                <input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>

              <div className="form-group">
                <label>End Date</label>
                <input type="date" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Start Audit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verify Asset Modal */}
      {verifyingAsset && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Verify Asset: {verifyingAsset.name} ({verifyingAsset.assetTag})</h3>
            <form onSubmit={handleVerifyAsset} style={{ marginTop: '16px' }}>
              <div className="form-group">
                <label>Verification Status</label>
                <select className="form-control" value={verificationStatus} onChange={e => setVerificationStatus(e.target.value)}>
                  <option value="Verified">Verified (Present & Good Condition)</option>
                  <option value="Missing">Missing (Cannot Locate)</option>
                  <option value="Damaged">Damaged (Needs repair)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Audit Notes</label>
                <textarea className="form-control" rows="3" value={verificationNotes} onChange={e => setVerificationNotes(e.target.value)} placeholder="Condition details, location spotted, or notes..."></textarea>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button type="button" className="btn btn-secondary" onClick={() => setVerifyingAsset(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Verification</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
