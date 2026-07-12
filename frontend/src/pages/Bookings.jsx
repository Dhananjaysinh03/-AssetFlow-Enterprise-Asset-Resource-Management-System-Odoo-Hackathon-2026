import { useEffect, useState } from 'react';
import { assetsApi, bookingsApi, ApiError } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import { validate, hasErrors, isRequired } from '../utils/validators';

export default function Bookings() {
  const [bookableAssets, setBookableAssets] = useState([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [bookings, setBookings] = useState([]);

  const [form, setForm] = useState({ startTime: '', endTime: '' });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    assetsApi.list({ status: '' }).then((all) => {
      const bookable = all.filter((a) => a.isBookable);
      setBookableAssets(bookable);
      if (bookable.length && !selectedAssetId) setSelectedAssetId(bookable[0].id);
    }).catch(() => setBookableAssets([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBookings = (assetId) => {
    if (!assetId) return;
    bookingsApi.list(assetId).then(setBookings).catch(() => setBookings([]));
  };

  useEffect(() => { loadBookings(selectedAssetId); }, [selectedAssetId]);

  const onSubmit = async (e) => {
    e.preventDefault();
    const fieldErrors = validate(form, { startTime: [isRequired], endTime: [isRequired] });
    if (!fieldErrors.startTime && !fieldErrors.endTime && form.endTime <= form.startTime) {
      fieldErrors.endTime = 'End time must be after start time.';
    }
    setErrors(fieldErrors);
    if (hasErrors(fieldErrors)) return;
    if (!selectedAssetId) {
      setBanner({ type: 'danger', text: 'Select a bookable resource first.' });
      return;
    }

    setSubmitting(true);
    setBanner(null);
    try {
      await bookingsApi.create({
        assetId: selectedAssetId,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
      });
      setBanner({ type: 'success', text: 'Booking confirmed — no conflicting slot.' });
      setForm({ startTime: '', endTime: '' });
      loadBookings(selectedAssetId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // The overlap-rejection demo moment — show exactly what it conflicts with.
        const c = err.body?.conflictingBooking;
        const range = c ? ` (${new Date(c.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}–${new Date(c.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : '';
        setBanner({ type: 'danger', text: `${err.body?.error || 'This slot overlaps an existing booking.'}${range}` });
      } else {
        setBanner({ type: 'danger', text: err.body?.error || 'Could not create booking.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onCancel = async (booking) => {
    try {
      await bookingsApi.cancel(booking.id);
      loadBookings(selectedAssetId);
    } catch (err) {
      setBanner({ type: 'danger', text: err.body?.error || 'Could not cancel booking.' });
    }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Resource Booking</h1>
          <p>Time-slot booking for shared resources. Overlapping requests are rejected automatically.</p>
        </div>
      </div>

      {banner && <div className={`banner banner-${banner.type}`}>{banner.text}</div>}

      <div className="card card-padded" style={{ marginBottom: 24 }}>
        <div className="form-row">
          <div className="field">
            <label>Resource</label>
            <select value={selectedAssetId} onChange={(e) => setSelectedAssetId(e.target.value)}>
              {bookableAssets.length === 0 && <option value="">No bookable resources yet</option>}
              {bookableAssets.map((a) => (
                <option key={a.id} value={a.id}>{a.tag} — {a.name}</option>
              ))}
            </select>
            <span className="field-hint">Mark an asset "shared/bookable" in the Asset Directory to see it here.</span>
          </div>
        </div>

        <h3 className="mt-4">Request a slot</h3>
        <form onSubmit={onSubmit} noValidate className="mt-4">
          <div className="form-row">
            <div className={`field${errors.startTime ? ' has-error' : ''}`}>
              <label>Start time</label>
              <input type="datetime-local" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
              {errors.startTime && <span className="field-error">{errors.startTime}</span>}
            </div>
            <div className={`field${errors.endTime ? ' has-error' : ''}`}>
              <label>End time</label>
              <input type="datetime-local" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
              {errors.endTime && <span className="field-error">{errors.endTime}</span>}
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={submitting || !selectedAssetId}>
            {submitting ? 'Checking availability…' : 'Book slot'}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="card-header"><h3>Existing bookings for this resource</h3></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Start</th><th>End</th><th>Booked by</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {bookings.length === 0 && (
                <tr><td colSpan={5}><div className="empty-state">No bookings yet for this resource.</div></td></tr>
              )}
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>{new Date(b.startTime).toLocaleString()}</td>
                  <td>{new Date(b.endTime).toLocaleString()}</td>
                  <td className="text-secondary">{b.bookedByName || '—'}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td>
                    {(b.status === 'UPCOMING' || b.status === 'ONGOING') && (
                      <button className="btn btn-ghost btn-sm" onClick={() => onCancel(b)}>Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
