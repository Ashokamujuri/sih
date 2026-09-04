// ============================================
// Landing Page
// ============================================
import { Link } from 'react-router-dom';
import {
  Shield, Eye, AlertTriangle, Bug, BookOpen, CheckCircle, TrendingUp,
  ArrowRight, Sprout, CloudSun, Users, Cpu
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui';
import './LandingPage.css';

const pipeline = [
  { icon: <TrendingUp size={28} />, title: 'Predict', desc: 'AI-powered risk prediction using weather, crop and historical data' },
  { icon: <AlertTriangle size={28} />, title: 'Alert', desc: 'Proactive early-warning notifications to farmers and officers' },
  { icon: <Bug size={28} />, title: 'Detect', desc: 'Image-based disease and pest detection using deep learning' },
  { icon: <BookOpen size={28} />, title: 'Advise', desc: 'Expert-backed recommendations tailored to crop and region' },
  { icon: <CheckCircle size={28} />, title: 'Verify', desc: 'Expert verification of AI predictions for accuracy' },
  { icon: <Eye size={28} />, title: 'Monitor', desc: 'Continuous follow-up and regional trend monitoring' },
];

const features = [
  { icon: <Sprout size={24} />, title: 'Crop Health Monitoring', desc: 'Track the health of your crops in real-time with AI-powered analysis.' },
  { icon: <Bug size={24} />, title: 'Disease & Pest Detection', desc: 'Upload crop images for instant AI-based disease identification.' },
  { icon: <CloudSun size={24} />, title: 'Weather Integration', desc: 'Localized weather data and alerts for informed decision making.' },
  { icon: <AlertTriangle size={24} />, title: 'Early Warning Alerts', desc: 'Proactive alerts before diseases and pests become outbreaks.' },
  { icon: <Users size={24} />, title: 'Expert Verification', desc: 'Every AI prediction is verified by agricultural scientists.' },
  { icon: <Cpu size={24} />, title: 'Decision Support', desc: 'Actionable recommendations from diagnosis through treatment.' },
];

const stats = [
  { value: '50,000+', label: 'Farmers Connected' },
  { value: '94.2%', label: 'AI Accuracy Rate' },
  { value: '15+', label: 'States Covered' },
  { value: '24/7', label: 'Monitoring Active' },
];

export function LandingPage() {
  const { login } = useAuth();

  return (
    <div className="landing">
      {/* Hero */}
      <section className="landing-hero">
        <div className="container landing-hero__inner">
          <div className="landing-hero__content">
            <div className="landing-hero__badge">
              <Shield size={14} />
              <span>Smart India Hackathon 2026</span>
            </div>
            <h1 className="landing-hero__title">
              Proactive Crop Health
              <span className="landing-hero__highlight"> Early-Warning</span>
              <br />& Decision Support
            </h1>
            <p className="landing-hero__subtitle">
              An AI-powered platform that predicts crop diseases before they spread,
              alerts farmers in real-time, and provides expert-verified recommendations
              to protect India's agricultural backbone.
            </p>
            <div className="landing-hero__actions">
              <Link to="/demo">
                <Button variant="primary" size="lg" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)' }}>
                  🎬 Interactive Demo <ArrowRight size={18} />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg">
                  Launch Portal
                </Button>
              </Link>
              <Link to="/how-it-works">
                <Button variant="ghost" size="lg">How It Works</Button>
              </Link>
            </div>
            <div className="landing-hero__demo">
              <span className="text-sm text-muted">Quick demo access:</span>
              <div className="landing-hero__demo-btns">
                <Link to="/farmer" onClick={() => login('farmer')}>
                  <Button variant="ghost" size="sm">👨‍🌾 Farmer</Button>
                </Link>
                <Link to="/officer" onClick={() => login('officer')}>
                  <Button variant="ghost" size="sm">👩‍💼 Officer</Button>
                </Link>
                <Link to="/expert" onClick={() => login('expert')}>
                  <Button variant="ghost" size="sm">🔬 Expert</Button>
                </Link>
              </div>
            </div>
          </div>
          <div className="landing-hero__visual">
            <div className="landing-hero__card">
              <div className="landing-hero__card-header">
                <Shield size={20} />
                <span>CropShield AI Active</span>
              </div>
              <div className="landing-hero__card-stats">
                <div className="landing-hero__card-stat">
                  <span className="landing-hero__card-value landing-hero__card-value--danger">12</span>
                  <span>Active Alerts</span>
                </div>
                <div className="landing-hero__card-stat">
                  <span className="landing-hero__card-value landing-hero__card-value--success">847</span>
                  <span>Crops Monitored</span>
                </div>
                <div className="landing-hero__card-stat">
                  <span className="landing-hero__card-value landing-hero__card-value--info">94%</span>
                  <span>AI Accuracy</span>
                </div>
              </div>
              <div className="landing-hero__card-bar">
                <div className="landing-hero__card-bar-fill" />
              </div>
              <span className="landing-hero__card-status">System monitoring 15 states...</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pipeline */}
      <section className="landing-section landing-pipeline">
        <div className="container">
          <div className="landing-section__header">
            <h2>How CropShield Works</h2>
            <p className="text-muted">Our six-stage pipeline ensures comprehensive crop protection</p>
          </div>
          <div className="landing-pipeline__grid">
            {pipeline.map((step, i) => (
              <div className="landing-pipeline__step" key={step.title}>
                <div className="landing-pipeline__number">{i + 1}</div>
                <div className="landing-pipeline__icon">{step.icon}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="landing-stats">
        <div className="container">
          <div className="landing-stats__grid">
            {stats.map(s => (
              <div className="landing-stats__item" key={s.label}>
                <span className="landing-stats__value">{s.value}</span>
                <span className="landing-stats__label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="landing-section">
        <div className="container">
          <div className="landing-section__header">
            <h2>Platform Features</h2>
            <p className="text-muted">Everything needed for proactive crop health management</p>
          </div>
          <div className="landing-features__grid">
            {features.map(f => (
              <div className="landing-feature" key={f.title}>
                <div className="landing-feature__icon">{f.icon}</div>
                <h4>{f.title}</h4>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <div className="container landing-cta__inner">
          <h2>Ready to protect your crops?</h2>
          <p>Join thousands of farmers already using CropShield AI for proactive crop health management.</p>
          <Link to="/login">
            <Button variant="primary" size="lg">
              Start Using CropShield <ArrowRight size={18} />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
