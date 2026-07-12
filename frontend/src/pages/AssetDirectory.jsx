import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { assetsApi, categoriesApi, departmentsApi } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import { validate, hasErrors, isRequired, isNonNegativeNumber } from '../utils/validators';

const STATUSES = ['AVAILABLE', 'ALLOCATED', 'RESERVED', 'UNDER_MAINTENANCE', 'LOST', 'RETIRED', 'DISPOSED'];

const emptyForm = {
  name: '',
  categoryId: '',
  serialNumber: '',
  acquisitionDate: '',
  acquisitionCost: '',
  condition: 'Good',
  location: '',
  departmentId: '',
  isBookable: false,
};

export default function AssetDirectory() {
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({ search: '', category: '', status: '', department: '' });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [qrModalAsset, setQrModalAsset] = useState(null);

  useEffect(() => {
    categoriesApi.list().then(setCategories).catch(() => setCategories([]));
    departmentsApi.list().then(setDepartments).catch(() => setDepartments([]));
  }, []);

  const load = () => {
    assetsApi
      .list({
        search: filters.search || undefined,
        category: filters.category || undefined,
        status: filters.status || undefined,
        department: filters.department || undefined,
      })
      .then(setAssets)
      .catch(() => setAssets([]));
  };

  useEffect(() => {
    const t = setTimeout(load, 250); // debounce search typing
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const onSubmit = async (e) => {
    e.preventDefault();
    const fieldErrors = validate(form, {
      name: [isRequired],
      categoryId: [isRequired],
      acquisitionCost: [isNonNegativeNumber],
    });
    setErrors(fieldErrors);
    if (hasErrors(fieldErrors)) return;

    setSubmitting(true);
    setBanner(null);
    try {
      const created = await assetsApi.create({
        ...form,
        acquisitionCost: form.acquisitionCost === '' ? null : Number(form.acquisitionCost),
        acquisitionDate: form.acquisitionDate || null,
        departmentId: form.departmentId || null,
      });
      setBanner({ type: 'success', text: `Asset ${created.tag || ''} registered.` });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setBanner({ type: 'danger', text: err.body?.error || 'Could not register asset.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Asset Directory</h1>
          <p>Register and track every asset centrally.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Close' : 'Register Asset'}
        </button>
      </div>

      {banner && <div className={`banner banner-${banner.type}`}>{banner.text}</div>}

      {showForm && (
        <div className="card card-padded mt-4" style={{ marginBottom: 24 }}>
          <h3>Register new asset</h3>
          <form onSubmit={onSubmit} noValidate className="mt-4">
            <div className="form-row">
              <div className={`field${errors.name ? ' has-error' : ''}`}>
                <label>Asset name</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Dell Latitude 5440" />
                {errors.name && <span className="field-error">{errors.name}</span>}
              </div>
              <div className={`field${errors.categoryId ? ' has-error' : ''}`}>
                <label>Category</label>
                <select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
                  <option value="">Select category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.categoryId && <span className="field-error">{errors.categoryId}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="field">
                <label>Serial number</label>
                <input value={form.serialNumber} onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))} />
              </div>
              <div className="field">
                <label>Location</label>
                <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Building A, Floor 2" />
              </div>
            </div>

            <div className="form-row">
              <div className="field">
                <label>Acquisition date</label>
                <input type="date" value={form.acquisitionDate} onChange={(e) => setForm((f) => ({ ...f, acquisitionDate: e.target.value }))} />
              </div>
              <div className={`field${errors.acquisitionCost ? ' has-error' : ''}`}>
                <label>Acquisition cost (reporting only)</label>
                <input type="number" min="0" value={form.acquisitionCost} onChange={(e) => setForm((f) => ({ ...f, acquisitionCost: e.target.value }))} />
                {errors.acquisitionCost && <span className="field-error">{errors.acquisitionCost}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="field">
                <label>Department</label>
                <select value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}>
                  <option value="">Unassigned</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Condition</label>
                <select value={form.condition} onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}>
                  <option>New</option><option>Good</option><option>Fair</option><option>Poor</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 mt-2" style={{ marginBottom: 16 }}>
              <input type="checkbox" checked={form.isBookable} onChange={(e) => setForm((f) => ({ ...f, isBookable: e.target.checked }))} />
              This is a shared/bookable resource (room, vehicle, equipment)
            </label>

            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Registering…' : 'Register asset'}
            </button>
          </form>
        </div>
      )}

      <div className="card card-padded" style={{ marginBottom: 20 }}>
        <div className="form-row" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Search</label>
            <input placeholder="Tag, serial, or name" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Category</label>
            <select value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}>
              <option value="">All</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Status</label>
            <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
              <option value="">All</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Department</label>
            <select value={filters.department} onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))}>
              <option value="">All</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Tag</th><th>Name</th><th>Category</th><th>Status</th><th>Location</th><th>Bookable</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {assets.length === 0 && (
                <tr><td colSpan={6}><div className="empty-state"><h3>No assets found</h3><p>Try adjusting your filters, or register your first asset above.</p></div></td></tr>
              )}
              {assets.map((a) => (
                <tr key={a.id}>
                  <td className="cell-mono">{a.tag}</td>
                  <td>{a.name}</td>
                  <td className="text-secondary">{a.category?.name || a.categoryName}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td className="text-secondary">{a.location || '—'}</td>
                  <td className="text-secondary">{a.isBookable ? 'Yes' : 'No'}</td>
                  <td>
                    <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => setQrModalAsset(a)}>QR Code</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {qrModalAsset && (
        <div className="modal-backdrop" onClick={() => setQrModalAsset(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="modal-header">
              <h2>Asset QR Code</h2>
              <button className="icon-btn" onClick={() => setQrModalAsset(null)}>✕</button>
            </div>
            <div className="modal-body flex flex-col items-center py-6">
              <QRCodeSVG value={qrModalAsset.tag} size={200} level="H" includeMargin={true} />
              <h3 className="mt-4 mb-1">{qrModalAsset.name}</h3>
              <div className="cell-mono text-secondary">{qrModalAsset.tag}</div>
              <p className="mt-4 text-secondary text-sm">
                Print this QR code and attach it to the asset. 
                Scan it with the QR Scanner page to view details instantly.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary w-full" onClick={() => window.print()}>Print Label</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
