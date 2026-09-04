// Login Page – with language selector
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n';
import { Button, LanguageSelector } from '../../components/ui';
import type { UserRole } from '../../types';
import './PublicPages.css';

export function LoginPage() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleRoleLogin = (role: UserRole) => {
    login(role);
    navigate(`/${role}`);
  };

  const roles: { role: UserRole; icon: string; label: string; desc: string }[] = [
    { role: 'farmer', icon: '👨‍🌾', label: t.roles.farmer, desc: t.login.farmerDesc },
    { role: 'officer', icon: '👩‍💼', label: t.roles.officer, desc: t.login.officerDesc },
    { role: 'expert', icon: '🔬', label: t.roles.expert, desc: t.login.expertDesc },
  ];

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Language selector at top-right of card */}
        <div className="login-card__lang">
          <LanguageSelector variant="login" />
        </div>

        <div className="login-card__header">
          <div className="login-card__logo">
            <Shield size={28} />
            <span>{t.login.title}</span>
          </div>
          <p className="login-card__subtitle">{t.login.subtitle}</p>
        </div>

        <form className="login-card__form" onSubmit={e => e.preventDefault()}>
          <div className="form-group">
            <label htmlFor="login-email">{t.login.email}</label>
            <input type="email" id="login-email" placeholder="you@example.com" />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">{t.login.password}</label>
            <input type="password" id="login-password" placeholder="••••••••" />
          </div>
          <Button variant="primary" size="lg">{t.login.signIn}</Button>
        </form>

        <div className="login-card__divider">{t.login.demoAccess}</div>

        <div className="login-card__roles">
          {roles.map(r => (
            <button
              key={r.role}
              className="login-card__role"
              onClick={() => handleRoleLogin(r.role)}
            >
              <span className="login-card__role-icon">{r.icon}</span>
              <div className="login-card__role-info">
                <strong>{r.label}</strong>
                <span>{r.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
