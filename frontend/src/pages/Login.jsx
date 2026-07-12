import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { validate, hasErrors, isEmail, isRequired } from '../utils/validators';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onChange = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const fieldErrors = validate(values, {
      email: [isEmail],
      password: [isRequired],
    });
    setErrors(fieldErrors);
    if (hasErrors(fieldErrors)) return;

    setSubmitting(true);
    try {
      await login(values.email, values.password);
      const redirectTo = location.state?.from || '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setServerError(err.body?.error || 'Login failed. Check your email and password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-mark">AF</div>
          <h2>AssetFlow - login</h2>
        </div>

        {serverError && <div className="banner banner-danger">{serverError}</div>}

        <form onSubmit={onSubmit} noValidate>
          <div className={`field${errors.email ? ' has-error' : ''}`}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="name@company.com"
              value={values.email}
              onChange={onChange('email')}
              autoComplete="username"
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          <div className={`field${errors.password ? ' has-error' : ''}`}>
            <div className="flex justify-between items-center">
              <label htmlFor="password">Password</label>
              <Link to="/forgot-password" className="text-sm">Forgot password?</Link>
            </div>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={values.password}
              onChange={onChange('password')}
              autoComplete="current-password"
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <div className="banner banner-info mt-4 text-center">
          Sign up creates an employee account. Admin roles are assigned later.
        </div>

        <div className="auth-footer-link">
          New here? <Link to="/signup">Create an account</Link>
        </div>
      </div>
    </div>
  );
}
