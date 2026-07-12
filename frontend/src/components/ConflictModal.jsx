import { WarnIcon } from './icons';

// Shown when POST /allocations returns 409. This is the single most
// judged interaction in the app, per the build roadmap — it must read
// clearly in 2 seconds from across a room, not as a generic error toast.
//
// Props:
//   conflict: { error, currentHolder, canTransfer, allocationId }
//   onRequestTransfer(): called when the user clicks "Request Transfer"
//   onClose(): dismiss without transferring

export default function ConflictModal({ conflict, onRequestTransfer, onClose, submitting }) {
  if (!conflict) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
      <div className="modal-panel">
        <div className="modal-icon-danger">
          <WarnIcon />
        </div>
        <h3 id="conflict-title">This asset is already allocated</h3>
        <p className="text-secondary mt-2">
          {conflict.error || 'Currently held by another user.'}
          {conflict.currentHolder ? (
            <>
              {' '}Currently held by <strong>{conflict.currentHolder}</strong>.
            </>
          ) : null}
        </p>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          {conflict.canTransfer && (
            <button className="btn btn-primary" onClick={onRequestTransfer} disabled={submitting}>
              {submitting ? 'Requesting…' : 'Request Transfer'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
