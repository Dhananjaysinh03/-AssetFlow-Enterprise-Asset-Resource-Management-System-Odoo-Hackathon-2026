import { useEffect, useState } from 'react';
import { maintenanceApi, assetsApi, employeesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

export default function Maintenance() {
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'Admin' || user?.role === 'Asset_Manager';

  const [requests, setRequests] = useState([]);
  const [assets, setAssets] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  // New Request Form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [priority, setPriority] = useState('Medium');

  // Technician Assignment Form
  const [assigningRequestId, setAssigningRequestId] = useState(null);
  const [selectedTechId, setSelectedTechId] = useState('');

  // Resolution Form
  const [resolvingRequestId, setResolvingRequestId] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const loadData = () => {
    setLoading(true);
    setError('');
    Promise.all([
      maintenanceApi.list(),
      assetsApi.list({ status: 'Available' }), // Only let them request maintenance for available assets (or any, but available/allocated makes sense)
      employeesApi.list(),
    ])
      .then(([reqs, asts, emps]) => {
        setRequests(reqs);
        setAssets(asts);
        // Filter technicians/employees
        setTechnicians(emps.filter(e => e.role === 'Asset_Manager' || e.role === 'Admin' || e.role === 'Employee'));
      })
      .catch((err) => setError(err.body?.error || 'Could not load maintenance data.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!selectedAssetId || !issueDescription) {
      setError('Please select an asset and describe the issue.');
      return;
    }

    maintenanceApi.create({
      assetId: selectedAssetId,
      issueDescription,
      priority,
    })
      .then(() => {
        setSuccess('Maintenance request submitted successfully!');
        setShowCreateModal(false);
        setSelectedAssetId('');
        setIssueDescription('');
        setPriority('Medium');
        loadData();
      })
      .catch(err => setError(err.body?.error || 'Could not submit request.'));
  };

  const handleApprove = (id) => {
    maintenanceApi.approve(id)
      .then(() => {
        setSuccess('Request approved! Asset is now Under Maintenance.');
        loadData();
      })
      .catch(err => setError(err.body?.error || 'Action failed.'));
  };

  const handleAssign = (e) => {
    e.preventDefault();
    if (!selectedTechId) return;

    maintenanceApi.assign(assigningRequestId, selectedTechId)
      .then(() => {
        setSuccess('Technician assigned successfully!');
        setAssigningRequestId(null);
        setSelectedTechId('');
        loadData();
      })
      .catch(err => setError(err.body?.error || 'Action failed.'));
  };

  const handleResolve = (e) => {
    e.preventDefault();
    if (!resolutionNotes) return;

    maintenanceApi.resolve(resolvingRequestId, resolutionNotes)
      .then(() => {
        setSuccess('Request resolved! Asset is now Available again.');
        setResolvingRequestId(null);
        setResolutionNotes('');
        loadData();
      })
      .catch(err => setError(err.body?.error || 'Action failed.'));
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Maintenance Board</h1>
          <p>Request repairs and manage the asset maintenance pipeline.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          ➕ Raise Repair Request
        </button>
      </div>

      {error && <div className="banner banner-danger mb-4">{error}</div>}
      {success && <div className="banner banner-success mb-4">{success}</div>}

      {loading ? (
        <p className="text-secondary">Loading requests...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {/* Kanban Columns */}
          {['Pending', 'Approved', 'Technician_Assigned', 'In_Progress', 'Resolved'].map((colStatus) => {
            const list = requests.filter(r => r.status === colStatus);
            return (
              <div key={colStatus} className="card" style={{ padding: '16px', background: 'var(--bg-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '12px' }}>
                  <h4 style={{ textTransform: 'capitalize' }}>
                    {colStatus.replace(/_/g, ' ')}
                  </h4>
                  <span className="badge" style={{ background: 'var(--bg-tertiary)' }}>{list.length}</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '200px' }}>
                  {list.length === 0 ? (
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '20px' }}>
                      No requests
                    </p>
                  ) : (
                    list.map((req) => (
                      <div key={req.id} className="card card-padded" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px' }}>{req.asset.assetTag}</span>
                          <span className={`status-${req.priority.toLowerCase()}`} style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(0,0,0,0.2)' }}>
                            {req.priority}
                          </span>
                        </div>
                        <p style={{ fontSize: '13px', marginBottom: '10px' }}>{req.issueDescription}</p>
                        
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                          <div>By: {req.requester.name}</div>
                          {req.assignedTo && <div>Tech: {req.assignedTo.name}</div>}
                        </div>

                        {/* Manager & Admin Pipeline Controls */}
                        {isManagerOrAdmin && (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                            {req.status === 'Pending' && (
                              <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleApprove(req.id)}>
                                Approve Repair
                              </button>
                            )}
                            {req.status === 'Approved' && (
                              <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => setAssigningRequestId(req.id)}>
                                Assign Technician
                              </button>
                            )}
                            {(req.status === 'Approved' || req.status === 'Technician_Assigned' || req.status === 'In_Progress') && (
                              <button className="btn btn-success" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => setResolvingRequestId(req.id)}>
                                Resolve
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Raise Repair Request</h3>
            <form onSubmit={handleCreate} style={{ marginTop: '16px' }}>
              <div className="form-group">
                <label>Select Asset</label>
                <select className="form-control" value={selectedAssetId} onChange={e => setSelectedAssetId(e.target.value)}>
                  <option value="">-- Choose Asset --</option>
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.assetTag})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Issue Description</label>
                <textarea className="form-control" rows="3" value={issueDescription} onChange={e => setIssueDescription(e.target.value)} placeholder="Describe the problem..."></textarea>
              </div>

              <div className="form-group">
                <label>Priority</label>
                <select className="form-control" value={priority} onChange={e => setPriority(e.target.value)}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assigningRequestId && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Assign Technician</h3>
            <form onSubmit={handleAssign} style={{ marginTop: '16px' }}>
              <div className="form-group">
                <label>Technician / Handler</label>
                <select className="form-control" value={selectedTechId} onChange={e => setSelectedTechId(e.target.value)}>
                  <option value="">-- Choose Member --</option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.role.replace(/_/g, ' ')})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button type="button" className="btn btn-secondary" onClick={() => setAssigningRequestId(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Assign</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {resolvingRequestId && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Mark Request Resolved</h3>
            <form onSubmit={handleResolve} style={{ marginTop: '16px' }}>
              <div className="form-group">
                <label>Resolution Notes</label>
                <textarea className="form-control" rows="3" value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} placeholder="Describe how the issue was fixed..."></textarea>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button type="button" className="btn btn-secondary" onClick={() => setResolvingRequestId(null)}>Cancel</button>
                <button type="submit" className="btn btn-success">Complete Resolution</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
