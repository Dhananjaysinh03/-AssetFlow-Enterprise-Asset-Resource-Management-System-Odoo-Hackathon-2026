import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  DashboardIcon,
  OrgIcon,
  AssetIcon,
  AllocationIcon,
  BookingIcon,
  LogoutIcon,
  MaintenanceIcon,
  AuditIcon,
  ReportsIcon,
  LogsIcon,
} from './icons';

function initials(name = '') {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function NavBar({ isOpen }) {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const isManagerOrAdmin = user?.role === 'Admin' || user?.role === 'Asset_Manager';

  const linkClass = ({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`;

  return (
    <aside className={`nav-sidebar${isOpen ? ' is-open' : ''}`}>
      <div className="nav-brand">
        <div className="nav-brand-mark">AF</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>AssetFlow</div>
        </div>
      </div>

      <nav className="nav-links">
        <NavLink to="/dashboard" className={linkClass}>
          <span className="nav-icon"><DashboardIcon /></span> Dashboard
        </NavLink>
        {isAdmin && (
          <NavLink to="/org-setup" className={linkClass}>
            <span className="nav-icon"><OrgIcon /></span> Organization Setup
          </NavLink>
        )}
        <NavLink to="/assets" className={linkClass}>
          <span className="nav-icon"><AssetIcon /></span> Asset Directory
        </NavLink>
        <NavLink to="/allocations" className={linkClass}>
          <span className="nav-icon"><AllocationIcon /></span> Allocation & Transfer
        </NavLink>
        <NavLink to="/bookings" className={linkClass}>
          <span className="nav-icon"><BookingIcon /></span> Resource Booking
        </NavLink>
        <NavLink to="/maintenance" className={linkClass}>
          <span className="nav-icon"><MaintenanceIcon /></span> Maintenance Board
        </NavLink>
        {isManagerOrAdmin && (
          <NavLink to="/audits" className={linkClass}>
            <span className="nav-icon"><AuditIcon /></span> Audit Cycles
          </NavLink>
        )}
        {isManagerOrAdmin && (
          <NavLink to="/reports" className={linkClass}>
            <span className="nav-icon"><ReportsIcon /></span> Reports & Analytics
          </NavLink>
        )}
        <NavLink to="/logs" className={linkClass}>
          <span className="nav-icon"><LogsIcon /></span> Activity Logs
        </NavLink>
      </nav>

      <div className="nav-footer">
        <div className="nav-user">
          <div className="nav-user-avatar">{initials(user?.name)}</div>
          <div className="nav-user-meta">
            <div className="nav-user-name">{user?.name}</div>
            <div className="nav-user-role">{user?.role?.replace(/_/g, ' ')}</div>
          </div>
        </div>
        <button className="btn btn-ghost btn-block" onClick={logout}>
          <LogoutIcon /> Log out
        </button>
      </div>
    </aside>
  );
}
