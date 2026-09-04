// ============================================
// Public Layout – Header + Footer + Content
// ============================================
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Shield, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui';
import './PublicLayout.css';

const publicNavItems = [
  { label: 'Home', path: '/' },
  { label: 'How It Works', path: '/how-it-works' },
  { label: 'Interactive Demo', path: '/demo' },
  { label: 'About', path: '/about' },
  { label: 'Contact', path: '/contact' },
];

export function PublicLayout() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="public-layout">
      <header className="public-header">
        <div className="container public-header__inner">
          <Link to="/" className="public-header__logo">
            <Shield size={28} />
            <div className="public-header__logo-text">
              <span className="public-header__brand">CropShield AI</span>
              <span className="public-header__tagline">Crop Health Early-Warning System</span>
            </div>
          </Link>

          <nav className={`public-nav ${mobileMenuOpen ? 'public-nav--open' : ''}`}>
            {publicNavItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`public-nav__link ${location.pathname === item.path ? 'public-nav__link--active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="public-nav__actions">
              {isAuthenticated && user ? (
                <Link to={`/${user.role}`}>
                  <Button variant="primary" size="sm">Dashboard</Button>
                </Link>
              ) : (
                <Link to="/login">
                  <Button variant="primary" size="sm">Sign In</Button>
                </Link>
              )}
            </div>
          </nav>

          <button
            className="public-header__menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      <main className="public-main">
        <Outlet />
      </main>

      <footer className="public-footer">
        <div className="container public-footer__inner">
          <div className="public-footer__brand">
            <Shield size={20} />
            <span>CropShield AI</span>
          </div>
          <p className="public-footer__text">
            Proactive Crop Health Early-Warning & Decision Support System
          </p>
          <p className="public-footer__copy">
            © 2026 CropShield AI — Smart India Hackathon Prototype. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
