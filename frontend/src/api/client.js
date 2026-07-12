// Thin fetch wrapper. Vite dev proxy forwards /api/* to the Express backend
// (see vite.config.js), so this works unchanged in dev; set VITE_API_BASE
// for a deployed build if frontend and backend aren't served together.

const BASE_URL = import.meta.env.VITE_API_BASE || '';

function getToken() {
  return sessionStorage.getItem('assetflow_token');
}

export function setToken(token) {
  if (token) sessionStorage.setItem('assetflow_token', token);
  else sessionStorage.removeItem('assetflow_token');
}

// Custom error that preserves the parsed JSON body (status, error message,
// and any extra fields like currentHolder / canTransfer / conflictingBooking)
// so callers can branch on it instead of re-parsing.
export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || `Request failed (${status})`);
    this.status = status;
    this.body = body || {};
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new ApiError(0, { error: 'Cannot reach the server. Is the backend running?' });
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json().catch(() => ({})) : null;

  if (!res.ok) {
    throw new ApiError(res.status, data);
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body, opts) => request(path, { method: 'POST', body, ...opts }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};

// ---- Auth ----
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }, { auth: false }),
  signup: (name, email, password) =>
    api.post('/auth/signup', { name, email, password }, { auth: false }),
  me: () => api.get('/auth/me'),
};

// ---- Org setup ----
export const departmentsApi = {
  list: () => api.get('/org/departments'),
  create: (payload) => api.post('/org/departments', payload),
  update: (id, payload) => api.put(`/org/departments/${id}`, payload),
};

export const categoriesApi = {
  list: () => api.get('/org/categories'),
  create: (payload) => api.post('/org/categories', payload),
  update: (id, payload) => api.put(`/org/categories/${id}`, payload),
};

export const employeesApi = {
  list: () => api.get('/org/employees'),
  setRole: (id, role) => api.put(`/org/employees/${id}`, { role }),
  setStatus: (id, isActive) => api.put(`/org/employees/${id}`, { isActive }),
};

// ---- Assets ----
export const assetsApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return api.get(`/assets${qs ? `?${qs}` : ''}`);
  },
  get: (id) => api.get(`/assets/${id}`),
  create: (payload) => api.post('/assets', payload),
  update: (id, payload) => api.patch(`/assets/${id}`, payload),
};

// ---- Allocations ----
export const allocationsApi = {
  list: () => api.get('/allocations'),
  allocate: (payload) => api.post('/allocations', payload),
  requestTransfer: (allocationId) => api.post(`/allocations/${allocationId}/transfer-request`),
  approveTransfer: (allocationId) => api.post(`/allocations/${allocationId}/transfer-approve`),
  returnAsset: (allocationId, conditionNote) =>
    api.post(`/allocations/${allocationId}/return`, { conditionNote }),
};

// ---- Bookings ----
export const bookingsApi = {
  list: (assetId) => api.get(`/bookings${assetId ? `?assetId=${assetId}` : ''}`),
  create: (payload) => api.post('/bookings', payload),
  cancel: (id) => api.patch(`/bookings/${id}/cancel`),
};

// ---- Dashboard ----
export const dashboardApi = {
  kpis: () => api.get('/dashboard/kpi'),
  reports: () => api.get('/dashboard/reports'),
};

// ---- Maintenance ----
export const maintenanceApi = {
  list: () => api.get('/maintenance'),
  create: (payload) => api.post('/maintenance', payload),
  approve: (id) => api.put(`/maintenance/${id}/approve`),
  assign: (id, assignedToId) => api.put(`/maintenance/${id}/assign`, { assignedToId }),
  resolve: (id, resolutionNotes) => api.put(`/maintenance/${id}/resolve`, { resolutionNotes }),
};

// ---- Audits ----
export const auditsApi = {
  listCycles: () => api.get('/audits/cycles'),
  createCycle: (payload) => api.post('/audits/cycles', payload),
  verifyAsset: (cycleId, payload) => api.post(`/audits/cycles/${cycleId}/records`, payload),
  closeCycle: (cycleId) => api.post(`/audits/cycles/${cycleId}/close`),
};

// ---- Activity & Notifications ----
export const activityApi = {
  listLogs: () => api.get('/activity/logs'),
  listNotifications: () => api.get('/activity/notifications'),
  readNotification: (id) => api.patch(`/activity/notifications/${id}/read`),
};
