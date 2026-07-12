import { useState } from 'react';
import NavBar from './NavBar';
import { MenuIcon } from './icons';

// Wraps every authenticated page. Handles the mobile nav toggle so the
// sidebar collapses off-canvas below 880px instead of squeezing content.
export default function AppShell({ children }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="app-shell">
      <NavBar isOpen={navOpen} />
      <div className="app-main">
        <div
          className="btn btn-ghost btn-sm"
          style={{ display: 'none', margin: 12 }}
          id="mobile-nav-toggle"
        >
          <MenuIcon />
        </div>
        {/* Mobile toggle button, shown only under 880px via inline media query workaround */}
        <button
          className="btn btn-secondary btn-sm mobile-only-toggle"
          onClick={() => setNavOpen((v) => !v)}
          style={{
            display: 'none',
            position: 'fixed',
            top: 12,
            left: 12,
            zIndex: 60,
          }}
        >
          <MenuIcon />
        </button>
        <style>{`
          @media (max-width: 880px) {
            .mobile-only-toggle { display: inline-flex !important; }
          }
        `}</style>
        {children}
      </div>
    </div>
  );
}
