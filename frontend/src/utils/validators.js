// Small dependency-free validators. A hackathon build under time pressure
// benefits more from zero-install-risk than from a schema library — these
// cover every form in the app (auth, org setup, assets, allocations, bookings).

export const isRequired = (value) => (value?.toString().trim() ? null : 'This field is required.');

export const isEmail = (value) => {
  if (!value) return 'Email is required.';
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(value) ? null : 'Enter a valid email address.';
};

export const minLength = (min) => (value) =>
  value && value.length >= min ? null : `Must be at least ${min} characters.`;

export const isNonNegativeNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null; // optional field
  const n = Number(value);
  if (Number.isNaN(n)) return 'Must be a number.';
  return n >= 0 ? null : 'Must be zero or greater.';
};

export const isFutureOrPresentDateTime = (value) => {
  if (!value) return 'Please choose a date and time.';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Invalid date.';
  return null;
};

// Runs a { field: [validatorFns] } map against a values object and
// returns a { field: errorMessage } map containing only failing fields.
export function validate(values, rules) {
  const errors = {};
  for (const field of Object.keys(rules)) {
    for (const rule of rules[field]) {
      const message = rule(values[field]);
      if (message) {
        errors[field] = message;
        break;
      }
    }
  }
  return errors;
}

export const hasErrors = (errors) => Object.keys(errors).length > 0;

export const isStrongPassword = (value) => {
  if (!value) return 'Password is required.';
  if (value.length < 8) return 'Must be at least 8 characters.';
  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  const hasSpecial = /[^A-Za-z0-9]/.test(value);
  if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
    return 'Password must contain uppercase, lowercase, a number, and a special character.';
  }
  return null;
};
