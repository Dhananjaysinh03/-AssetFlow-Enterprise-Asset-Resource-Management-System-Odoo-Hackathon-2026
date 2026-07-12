// Minimal inline SVG icons — no icon library dependency, keeps the
// bundle offline-safe and avoids version-mismatch risk under time pressure.

const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export const DashboardIcon = () => (
  <svg {...base}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>
);

export const OrgIcon = () => (
  <svg {...base}><circle cx="12" cy="6" r="2.5" /><circle cx="5" cy="18" r="2.5" /><circle cx="19" cy="18" r="2.5" /><path d="M12 8.5v4M12 12.5 5 15.8M12 12.5l7 3.3" /></svg>
);

export const AssetIcon = () => (
  <svg {...base}><path d="M21 8 12 3 3 8l9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></svg>
);

export const AllocationIcon = () => (
  <svg {...base}><path d="M17 3 21 7l-4 4" /><path d="M21 7H9a4 4 0 0 0-4 4v1" /><path d="M7 21 3 17l4-4" /><path d="M3 17h12a4 4 0 0 0 4-4v-1" /></svg>
);

export const BookingIcon = () => (
  <svg {...base}><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9.5h18M8 3v3M16 3v3" /></svg>
);

export const LogoutIcon = () => (
  <svg {...base}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></svg>
);

export const WarnIcon = () => (
  <svg {...base}><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>
);

export const MenuIcon = () => (
  <svg {...base}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
);

export const MaintenanceIcon = () => (
  <svg {...base}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
);

export const AuditIcon = () => (
  <svg {...base}><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="m9 14 2 2 4-4" /></svg>
);

export const ReportsIcon = () => (
  <svg {...base}><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
);

export const LogsIcon = () => (
  <svg {...base}><path d="M12 6h9M12 12h9M12 18h9M3 6h.01M3 12h.01M3 18h.01" /></svg>
);

export const ScannerIcon = () => (
  <svg {...base}><path d="M4 8V4h4M16 4h4v4M4 16v4h4M16 20h4v-4M8 12h8" /></svg>
);

