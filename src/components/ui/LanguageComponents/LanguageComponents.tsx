// ============================================
// Language Selector & Listen Button Components
// ============================================
import { useState, useRef, useEffect } from 'react';
import { Globe, Volume2, VolumeX, ChevronDown } from 'lucide-react';
import { useLanguage, useSpeech, type SupportedLocale } from '../../../i18n';
import './LanguageComponents.css';

// =============================================
// LANGUAGE SELECTOR (dropdown)
// =============================================
export function LanguageSelector({ variant = 'header' }: { variant?: 'header' | 'standalone' | 'login' }) {
  const { locale, setLocale, locales, localeNames, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className={`lang-selector lang-selector--${variant}`} ref={ref}>
      <button
        className="lang-selector__trigger"
        onClick={() => setOpen(!open)}
        title={t.language.selectLanguage}
        aria-label={t.language.selectLanguage}
      >
        <Globe size={variant === 'login' ? 16 : 18} />
        <span className="lang-selector__current">{localeNames[locale].nativeName}</span>
        <ChevronDown size={14} className={`lang-selector__chevron ${open ? 'lang-selector__chevron--open' : ''}`} />
      </button>

      {open && (
        <div className="lang-selector__dropdown">
          <div className="lang-selector__dropdown-title">{t.language.selectLanguage}</div>
          {locales.map(code => (
            <button
              key={code}
              className={`lang-selector__option ${code === locale ? 'lang-selector__option--active' : ''}`}
              onClick={() => { setLocale(code); setOpen(false); }}
            >
              <span className="lang-selector__option-native">{localeNames[code].nativeName}</span>
              <span className="lang-selector__option-name">{localeNames[code].name}</span>
              {code === locale && <span className="lang-selector__check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================
// LISTEN BUTTON (Text-to-Speech)
// =============================================
export function ListenButton({
  text,
  label,
  size = 'md',
}: {
  /** The text to read aloud */
  text: string;
  /** Optional label override */
  label?: string;
  size?: 'sm' | 'md';
}) {
  const { t } = useLanguage();
  const { isSupported, isSpeaking, speak, stop } = useSpeech();

  if (!isSupported) {
    return (
      <button
        className={`listen-btn listen-btn--${size} listen-btn--disabled`}
        title={t.tts.unsupported}
        disabled
      >
        <VolumeX size={size === 'sm' ? 14 : 16} />
        <span>{label || t.actions.listen}</span>
      </button>
    );
  }

  const handleClick = () => {
    if (isSpeaking) {
      stop();
    } else {
      speak(text);
    }
  };

  return (
    <button
      className={`listen-btn listen-btn--${size} ${isSpeaking ? 'listen-btn--active' : ''}`}
      onClick={handleClick}
      title={isSpeaking ? t.tts.stop : t.tts.listen}
    >
      {isSpeaking ? <VolumeX size={size === 'sm' ? 14 : 16} /> : <Volume2 size={size === 'sm' ? 14 : 16} />}
      <span>{isSpeaking ? (label ? t.actions.stopListening : t.actions.stopListening) : (label || t.actions.listen)}</span>
    </button>
  );
}
