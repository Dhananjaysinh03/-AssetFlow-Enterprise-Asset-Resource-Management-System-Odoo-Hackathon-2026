import { useEffect, useState } from 'react';
import { allocationsApi, assetsApi, employeesApi } from '../api/client';
import { ApiError } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import ConflictModal from '../components/ConflictModal';
import { validate, hasErrors, isRequired } from '../utils/validators';

export default function Allocations() {
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [allocations, setAllocations] = useState([]);

  const [form, setForm] = useState({ assetId: '', holderUserId: '', expectedReturn: '' });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Conflict modal state: holds the 409 payload plus which asset triggered it.
  const [conflict, setConflict] = useState(null);
  const [transferSubmitting, setTransferSubmitting] = useState(false);

  const loadAll = () => {
    assetsApi.list().then(setAssets).catch(() => setAssets([]));
    employeesApi.list().then(setEmployees).catch(() => setEmployees([]));
    allocationsApi.list().then(setAllocations).catch(() => setAllocations([]));
  };

  useEffect(() => { loadAll(); }, []);

  const bookableAssets = assets; // any asset can be allocated; booking is separate (shared resources)

  const onAllocate = async (e) => {
    e.preventDefault();
    const fieldErrors = validate(form, { assetId: [isRequired], holderUserId: [isRequired] });
    setErrors(fieldErrors);
    if (hasErrors(fieldErrors)) return;

    setSubmitting(true);
    setBanner(null);
    try {
      await allocationsApi.allocate({
        assetId: form.assetId,
        holderUserId: form.holderUserId,
        expectedReturn: form.expectedReturn || null,
      });
      setBanner({ type: 'success', text: 'Asset allocated successfully.' });
      setForm({ assetId: '', holderUserId: '', expectedReturn: '' });
      loadAll();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // This is the core demo moment: don't show a generic error,
        // surface who holds it and offer the transfer path.
        setConflict({ ...err.body, assetId: form.assetId });
      } else {
        setBanner({ type: 'danger', text: err.body?.error || 'Could not allocate asset.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onRequestTransfer = async () => {
    if (!conflict?.allocationId) {
      setBanner({ type: 'danger', text: 'Could not identify the existing allocation to transfer.' });
      setConflict(null);
      return;
    }
    setTransferSubmitting(true);
    try {
      await allocationsApi.requestTransfer(conflict.allocationId);
      setBanner({ type: 'success', text: 'Transfer request submitted for approval.' });
      setConflict(null);
      loadAll();
    } catch (err) {
      setBanner({ type: 'danger', text: err.body?.error || 'Could not submit transfer request.' });
    } finally {
      setTransferSubmitting(false);
    }
  };

  const onReturn = async (allocation) => {
    const note = window.prompt('Condition check-in note (optional):', '') ?? '';
    try {
      await allocationsApi.returnAsset(allocation.id, note);
      setBanner({ type: 'success', text: 'Asset marked as returned and set back to Available.' });
      loadAll();
    } catch (err) {
      setBanner({ type: 'danger', text: err.body?.error || 'Could not process return.' });
    }
  };

  const onApproveTransfer = async (allocation) => {
    try {
      await allocationsApi.approveTransfer(allocation.id);
      setBanner({ type: 'success', text: 'Transfer approved and re-allocated.' });
      loadAll();
    } catch (err) {
      setBanner({ type: 'danger', text: err.body?.error || 'Could not approve transfer.' });
    }
  };

  const isOverdue = (a) => a.status === 'ACTIVE' && a.expectedReturn && new Date(a.expectedReturn) < new Date();

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Asset Allocation & Transfer</h1>
          <p>Manage who holds what. Allocating an already-held asset is blocked, not silently overwritten.</p>
        </div>
      </div>

      {banner && <div className={`banner banner-${banner.type}`}>{banner.text}</div>}

      <div className="card card-padded" style={{ marginBottom: 24 }}>
        <h3>Allocate an asset</h3>
        <form onSubmit={onAllocate} noValidate className="mt-4">
          <div className="form-row">
            <div className={`field${errors.assetId ? ' has-error' : ''}`}>
              <label>Asset</label>
              <select value={form.assetId} onChange={(e) => setForm((f) => ({ ...f, assetId: e.target.value }))}>
                <option value="">Select asset</option>
                {bookableAssets.map((a) => (
                  <option key={a.id} value={a.id}>{a.tag} — {a.name}</option>
                ))}
              </select>
              {errors.assetId && <span className="field-error">{errors.assetId}</span>}
            </div>
            <div className={`field${errors.holderUserId ? ' has-error' : ''}`}>
              <label>Allocate to</label>
              <select value={form.holderUserId} onChange={(e) => setForm((f) => ({ ...f, holderUserId: e.target.value }))}>
                <option value="">Select employee</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
              {errors.holderUserId && <span className="field-error">{errors.holderUserId}</span>}
            </div>
          </div>
          <div className="field" style={{ maxWidth: 260 }}>
            <label>Expected return date (optional)</label>
            <input type="date" value={form.expectedReturn} onChange={(e) => setForm((f) => ({ ...f, expectedReturn: e.target.value }))} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Allocating…' : 'Allocate asset'}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="card-header"><h3>Current allocations</h3></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Asset</th><th>Held by</th><th>Allocated</th><th>Expected return</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {allocations.length === 0 && (
                <tr><td colSpan={6}><div className="empty-state">No active allocations yet.</div></td></tr>
              )}
              {allocations.map((a) => (
                <tr key={a.id}>
                  <td className="cell-mono">{a.assetTag || a.assetId}</td>
                  <td>{a.holderName || '—'}</td>
                  <td className="text-secondary">{a.allocatedAt ? new Date(a.allocatedAt).toLocaleDateString() : '—'}</td>
                  <td className={isOverdue(a) ? 'overdue-text' : 'text-secondary'}>
                    {a.expectedReturn ? new Date(a.expectedReturn).toLocaleDateString() : '—'}
                    {isOverdue(a) ? ' (overdue)' : ''}
                  </td>
                  <td><StatusBadge status={a.status} /></td>
                  <td className="flex gap-2">
                    {a.status === 'ACTIVE' && (
                      <button className="btn btn-ghost btn-sm" onClick={() => onReturn(a)}>Return</button>
                    )}
                    {a.status === 'TRANSFER_PENDING' && (
                      <button className="btn btn-secondary btn-sm" onClick={() => onApproveTransfer(a)}>Approve transfer</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConflictModal
        conflict={conflict}
        submitting={transferSubmitting}
        onClose={() => setConflict(null)}
        onRequestTransfer={onRequestTransfer}
      />
    </div>
  );
}
