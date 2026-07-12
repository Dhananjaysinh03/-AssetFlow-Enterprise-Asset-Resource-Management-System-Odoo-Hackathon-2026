import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { validate, hasErrors, isEmail, isRequired, isStrongPassword } from '../utils/validators';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onChange = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const fieldErrors = validate(values, {
      name: [isRequired],
      email: [isEmail],
      password: [isStrongPassword],
    });
    setErrors(fieldErrors);
    if (hasErrors(fieldErrors)) return;

    setSubmitting(true);
    try {
      await signup(values.name, values.email, values.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setServerError(err.body?.error || 'Could not create account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-mark">AF</div>
          <h2>Create account</h2>
        </div>

        <div className="banner banner-info">
          This creates a standard employee account. An admin can promote you later from the Employee Directory.
        </div>

        {serverError && <div className="banner banner-danger">{serverError}</div>}

        <form onSubmit={onSubmit} noValidate>
          <div className={`field${errors.name ? ' has-error' : ''}`}>
            <label htmlFor="name">Full name</label>
            <input id="name" value={values.name} onChange={onChange('name')} placeholder="Priya Sharma" />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          <div className={`field${errors.email ? ' has-error' : ''}`}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={values.email}
              onChange={onChange('email')}
              placeholder="name@company.com"
              autoComplete="username"
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          <div className={`field${errors.password ? ' has-error' : ''}`}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={values.password}
              onChange={onChange('password')}
              placeholder="Min 8 chars: uppercase, number, symbol"
              autoComplete="new-password"
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className="auth-footer-link">
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}
