import { useEffect, useState } from 'react';
import { departmentsApi, categoriesApi, employeesApi } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import { validate, hasErrors, isRequired } from '../utils/validators';

const ROLES = ['Employee', 'Department_Head', 'Asset_Manager', 'Admin'];

export default function OrgSetup() {
  const [tab, setTab] = useState('departments');

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Organization Setup</h1>
          <p>Master data everything else depends on. Admin only.</p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn${tab === 'departments' ? ' is-active' : ''}`} onClick={() => setTab('departments')}>
          Departments
        </button>
        <button className={`tab-btn${tab === 'categories' ? ' is-active' : ''}`} onClick={() => setTab('categories')}>
          Asset Categories
        </button>
        <button className={`tab-btn${tab === 'employees' ? ' is-active' : ''}`} onClick={() => setTab('employees')}>
          Employee Directory
        </button>
      </div>

      {tab === 'departments' && <DepartmentsTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'employees' && <EmployeesTab />}
    </div>
  );
}

// ---------------- Departments ----------------

function DepartmentsTab() {
  const [departments, setDepartments] = useState([]);
  const [values, setValues] = useState({ name: '', parentDepartmentId: '' });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = () => departmentsApi.list().then(setDepartments).catch(() => setDepartments([]));
  useEffect(() => { load(); }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    const fieldErrors = validate(values, { name: [isRequired] });
    setErrors(fieldErrors);
    if (hasErrors(fieldErrors)) return;

    setSubmitting(true);
    setBanner(null);
    try {
      await departmentsApi.create({ name: values.name, parentDepartmentId: values.parentDepartmentId || null });
      setValues({ name: '', parentDepartmentId: '' });
      setBanner({ type: 'success', text: `Department "${values.name}" created.` });
      load();
    } catch (err) {
      setBanner({ type: 'danger', text: err.body?.error || 'Could not create department.' });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (dept) => {
    await departmentsApi.update(dept.id, { isActive: !dept.isActive });
    load();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="card card-padded">
        <h3>New department</h3>
        {banner && <div className={`banner banner-${banner.type} mt-4`}>{banner.text}</div>}
        <form onSubmit={onSubmit} noValidate className="mt-4">
          <div className="form-row">
            <div className={`field${errors.name ? ' has-error' : ''}`}>
              <label>Department name</label>
              <input value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} placeholder="Engineering" />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>
            <div className="field">
              <label>Parent department (optional)</label>
              <select value={values.parentDepartmentId} onChange={(e) => setValues((v) => ({ ...v, parentDepartmentId: e.target.value }))}>
                <option value="">None</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create department'}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Parent</th><th>Head</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {departments.length === 0 && (
                <tr><td colSpan={5}><div className="empty-state">No departments yet.</div></td></tr>
              )}
              {departments.map((d) => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td className="text-secondary">{d.parentDepartment?.name || '—'}</td>
                  <td className="text-secondary">{d.manager?.name || '—'}</td>
                  <td><StatusBadge status={d.isActive ? 'Active' : 'Inactive'} /></td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleStatus(d)}>
                      {d.isActive ? 'Deactivate' : 'Activate'}
                    </button>
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

// ---------------- Categories ----------------

function CategoriesTab() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => categoriesApi.list().then(setCategories).catch(() => setCategories([]));
  useEffect(() => { load(); }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Category name is required.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await categoriesApi.create({ name });
      setName('');
      load();
    } catch (err) {
      setError(err.body?.error || 'Could not create category.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="card card-padded">
        <h3>New asset category</h3>
        {error && <div className="banner banner-danger mt-4">{error}</div>}
        <form onSubmit={onSubmit} noValidate className="mt-4 flex gap-3" style={{ alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>Category name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Electronics" />
          </div>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Adding…' : 'Add category'}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Category</th></tr></thead>
            <tbody>
              {categories.length === 0 && (
                <tr><td><div className="empty-state">No categories yet.</div></td></tr>
              )}
              {categories.map((c) => (
                <tr key={c.id}><td>{c.name}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------- Employee Directory ----------------

function EmployeesTab() {
  const [employees, setEmployees] = useState([]);
  const [banner, setBanner] = useState(null);

  const load = () => employeesApi.list().then(setEmployees).catch(() => setEmployees([]));
  useEffect(() => { load(); }, []);

  const changeRole = async (emp, role) => {
    if (role === emp.role) return;
    try {
      await employeesApi.setRole(emp.id, role);
      setBanner({ type: 'success', text: `${emp.name} is now ${role.replace(/_/g, ' ')}.` });
      load();
    } catch (err) {
      setBanner({ type: 'danger', text: err.body?.error || 'Could not update role.' });
    }
  };

  const toggleStatus = async (emp) => {
    await employeesApi.setStatus(emp.id, !emp.isActive);
    load();
  };

  return (
    <div className="flex flex-col gap-4">
      {banner && <div className={`banner banner-${banner.type}`}>{banner.text}</div>}
      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Department</th><th>Role</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {employees.length === 0 && (
                <tr><td colSpan={6}><div className="empty-state">No employees yet.</div></td></tr>
              )}
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td>{emp.name}</td>
                  <td className="text-secondary">{emp.email}</td>
                  <td className="text-secondary">{emp.department?.name || '—'}</td>
                  <td>
                    <select value={emp.role} onChange={(e) => changeRole(emp, e.target.value)}>
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </td>
                  <td><StatusBadge status={emp.isActive ? 'Active' : 'Inactive'} /></td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleStatus(emp)}>
                      {emp.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-secondary text-sm">
        This is the only screen where roles are assigned — signup always creates a plain Employee account.
      </p>
    </div>
  );
}
