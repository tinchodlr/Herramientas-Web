import { useEffect, useRef, useState } from 'preact/hooks';
import { LogIn, LogOut, MailCheck, UserRound, X } from 'lucide-preact';
import {
  OPEN_LOGIN_EVENT, authErrorKey, getCloudState, resendVerification, resetPassword, resumeCloud, signInEmail, signInGoogle, signOutCloud, signUpEmail,
  startCloud, subscribeCloud, type AuthErrorKey, type CloudState,
} from '../lib/cloud';

type Lang = 'es' | 'en';
type Mode = 'login' | 'register' | 'reset';

const T = {
  es: {
    enter: 'Entrar',
    account: 'Mi cuenta',
    title: { login: 'Iniciá sesión', register: 'Creá tu cuenta', reset: 'Recuperar contraseña' },
    lead: 'Guardá tus presupuestos, remitos, perfiles de impresión 3D, etiquetas y links, y usalos desde cualquier dispositivo. Es gratis.',
    google: 'Continuar con Google',
    or: 'o con tu email',
    email: 'Email',
    password: 'Contraseña',
    passwordHint: 'Mínimo 6 caracteres.',
    submit: { login: 'Entrar', register: 'Crear cuenta', reset: 'Enviarme el enlace' },
    forgot: 'Olvidé mi contraseña',
    toRegister: '¿No tenés cuenta? Creala',
    toLogin: '¿Ya tenés cuenta? Iniciá sesión',
    back: 'Volver',
    resetSent: 'Si ese email tiene una cuenta, te enviamos un enlace para elegir una contraseña nueva. Revisá también la carpeta de spam.',
    registered: 'Cuenta creada. Te enviamos un mail para confirmar tu dirección.',
    verified: 'Email verificado',
    unverified: 'Email sin verificar',
    resend: 'Reenviar mail de verificación',
    resent: 'Listo, te lo reenviamos.',
    signOut: 'Cerrar sesión',
    signOutNote: 'Al cerrar sesión se borra la copia guardada en este navegador. Tus datos siguen en tu cuenta.',
    synced: 'Tus datos se guardan en tu cuenta y se sincronizan entre dispositivos.',
    close: 'Cerrar',
    loading: 'Un momento…',
    errors: {
      invalidCredential: 'El email o la contraseña no son correctos.',
      emailInUse: 'Ya existe una cuenta con ese email. Probá iniciar sesión.',
      weakPassword: 'La contraseña es muy débil: usá al menos 6 caracteres.',
      invalidEmail: 'Ese email no parece válido.',
      tooMany: 'Demasiados intentos. Esperá unos minutos y probá de nuevo.',
      network: 'No hay conexión. Revisá tu internet.',
      popupClosed: 'Se cerró la ventana de Google antes de terminar.',
      popupBlocked: 'El navegador bloqueó la ventana de Google. Permití las ventanas emergentes.',
      unauthorizedDomain: 'Este sitio todavía no está autorizado para iniciar sesión.',
      generic: 'No se pudo completar. Probá de nuevo.',
    } satisfies Record<AuthErrorKey, string>,
  },
  en: {
    enter: 'Sign in',
    account: 'My account',
    title: { login: 'Sign in', register: 'Create your account', reset: 'Reset password' },
    lead: 'Save your quotes, delivery notes, 3D printing profiles, shipping labels and links, and use them from any device. It is free.',
    google: 'Continue with Google',
    or: 'or with your email',
    email: 'Email',
    password: 'Password',
    passwordHint: 'At least 6 characters.',
    submit: { login: 'Sign in', register: 'Create account', reset: 'Email me the link' },
    forgot: 'Forgot my password',
    toRegister: 'No account? Create one',
    toLogin: 'Already have an account? Sign in',
    back: 'Back',
    resetSent: 'If that email has an account, we sent a link to choose a new password. Check your spam folder too.',
    registered: 'Account created. We sent you an email to confirm your address.',
    verified: 'Email verified',
    unverified: 'Email not verified',
    resend: 'Resend verification email',
    resent: 'Done, we sent it again.',
    signOut: 'Sign out',
    signOutNote: 'Signing out removes the copy stored in this browser. Your data stays in your account.',
    synced: 'Your data is saved to your account and synced across devices.',
    close: 'Close',
    loading: 'One moment…',
    errors: {
      invalidCredential: 'The email or password is not correct.',
      emailInUse: 'An account with that email already exists. Try signing in.',
      weakPassword: 'That password is too weak: use at least 6 characters.',
      invalidEmail: 'That email does not look valid.',
      tooMany: 'Too many attempts. Wait a few minutes and try again.',
      network: 'No connection. Check your internet.',
      popupClosed: 'The Google window was closed before finishing.',
      popupBlocked: 'Your browser blocked the Google window. Allow pop-ups.',
      unauthorizedDomain: 'This site is not yet authorized for sign-in.',
      generic: 'Could not complete that. Please try again.',
    } satisfies Record<AuthErrorKey, string>,
  },
};

export default function AccountButton({ lang }: { lang: Lang }) {
  const t = T[lang];
  const dialog = useRef<HTMLDialogElement>(null);
  const [cloud, setCloud] = useState<CloudState>(getCloudState());
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const open = () => {
    setError('');
    setInfo('');
    setMode('login');
    setPassword('');
    dialog.current?.showModal();
    void startCloud();
  };
  const close = () => dialog.current?.close();

  useEffect(() => {
    setCloud(getCloudState());
    resumeCloud();
    const off = subscribeCloud(setCloud);
    window.addEventListener(OPEN_LOGIN_EVENT, open);
    return () => {
      off();
      window.removeEventListener(OPEN_LOGIN_EVENT, open);
    };
  }, []);

  const run = async (fn: () => Promise<void>, onOk?: () => void) => {
    setBusy(true);
    setError('');
    setInfo('');
    try {
      await fn();
      onOk?.();
    } catch (e) {
      setError(t.errors[authErrorKey(e)]);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: Event) => {
    e.preventDefault();
    if (mode === 'login') void run(() => signInEmail(email, password), close);
    else if (mode === 'register') void run(() => signUpEmail(email, password, lang), () => (setInfo(t.registered), setTimeout(close, 1800)));
    else void run(() => resetPassword(email, lang), () => setInfo(t.resetSent));
  };

  const user = cloud.status === 'in' ? cloud.user : null;
  const initial = (user?.name || user?.email || '?').trim().charAt(0).toUpperCase();

  return (
    <>
      <button type="button" class={`btn btn-sm ${user ? 'btn-ghost acct-user' : ''}`} onClick={open} aria-haspopup="dialog" title={user ? user.email : t.enter}>
        {user ? (
          user.photo ? <img class="acct-avatar" src={user.photo} alt="" referrerpolicy="no-referrer" /> : <span class="acct-avatar acct-initial" aria-hidden="true">{initial}</span>
        ) : (
          <UserRound aria-hidden="true" />
        )}
        <span class="acct-label">{user ? t.account : t.enter}</span>
      </button>

      <dialog
        ref={dialog}
        class="acct-dialog"
        aria-label={user ? t.account : t.title[mode]}
        onClick={(e) => {
          if (e.target === dialog.current) close();
        }}
      >
        <div class="acct-box">
          <button type="button" class="btn btn-icon btn-ghost acct-x" aria-label={t.close} onClick={close}>
            <X aria-hidden="true" />
          </button>

          {user ? (
            <div class="stack">
              <h2 class="acct-title">{t.account}</h2>
              <div class="acct-me">
                {user.photo ? <img class="acct-avatar big" src={user.photo} alt="" referrerpolicy="no-referrer" /> : <span class="acct-avatar big acct-initial" aria-hidden="true">{initial}</span>}
                <div>
                  <strong>{user.name || user.email}</strong>
                  {user.name && <div class="muted small">{user.email}</div>}
                </div>
              </div>
              <p class="muted small" style="margin:0">{t.synced}</p>
              {user.password && (
                <div class="small">
                  <span class={`acct-chip ${user.verified ? 'ok' : 'warn'}`}>
                    <MailCheck aria-hidden="true" />
                    {user.verified ? t.verified : t.unverified}
                  </span>
                  {!user.verified && (
                    <button type="button" class="link-btn" style="margin-left:8px" onClick={() => void run(() => resendVerification(lang), () => setInfo(t.resent))}>
                      {t.resend}
                    </button>
                  )}
                </div>
              )}
              {info && <div class="alert alert-success" role="status">{info}</div>}
              {error && <div class="alert alert-danger" role="alert">{error}</div>}
              <p class="hint" style="margin:0">{t.signOutNote}</p>
              <div class="btn-row">
                <button type="button" class="btn" disabled={busy} onClick={() => void run(() => signOutCloud())}>
                  <LogOut aria-hidden="true" />
                  {t.signOut}
                </button>
              </div>
            </div>
          ) : (
            <form class="stack" onSubmit={submit}>
              <h2 class="acct-title">{t.title[mode]}</h2>
              {mode !== 'reset' && <p class="muted small" style="margin:0">{t.lead}</p>}

              {mode !== 'reset' && (
                <>
                  <button type="button" class="btn acct-google" disabled={busy} onClick={() => void run(signInGoogle, close)}>
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
                      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z" />
                      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.8V6.5H1.4a12 12 0 0 0 0 11l4-3.1Z" />
                      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.5l4 3.1C6.3 6.900 8.900 4.800 12 4.800Z" />
                    </svg>
                    {t.google}
                  </button>
                  <div class="acct-or"><span>{t.or}</span></div>
                </>
              )}

              <div class="field">
                <label for="acct-email">{t.email}</label>
                <input id="acct-email" class="input" type="email" required autocomplete="email" value={email} onInput={(e) => setEmail(e.currentTarget.value)} />
              </div>
              {mode !== 'reset' && (
                <div class="field">
                  <label for="acct-pass">{t.password}</label>
                  <input
                    id="acct-pass"
                    class="input"
                    type="password"
                    required
                    minLength={6}
                    autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onInput={(e) => setPassword(e.currentTarget.value)}
                  />
                  {mode === 'register' && <span class="hint">{t.passwordHint}</span>}
                </div>
              )}

              {info && <div class="alert alert-success" role="status">{info}</div>}
              {error && <div class="alert alert-danger" role="alert">{error}</div>}

              <button type="submit" class="btn btn-primary" disabled={busy}>
                {busy ? <>{t.loading}</> : (
                  <>
                    <LogIn aria-hidden="true" />
                    {t.submit[mode]}
                  </>
                )}
              </button>

              <div class="acct-links small">
                {mode === 'login' && (
                  <>
                    <button type="button" class="link-btn" onClick={() => (setMode('reset'), setError(''), setInfo(''))}>{t.forgot}</button>
                    <button type="button" class="link-btn" onClick={() => (setMode('register'), setError(''), setInfo(''))}>{t.toRegister}</button>
                  </>
                )}
                {mode === 'register' && <button type="button" class="link-btn" onClick={() => (setMode('login'), setError(''), setInfo(''))}>{t.toLogin}</button>}
                {mode === 'reset' && <button type="button" class="link-btn" onClick={() => (setMode('login'), setError(''), setInfo(''))}>{t.back}</button>}
              </div>
            </form>
          )}
        </div>
      </dialog>

      <style>{`
        .acct-user { padding-left: 6px; }
        .acct-avatar { width: 24px; height: 24px; border-radius: 50%; object-fit: cover; flex: none; }
        .acct-avatar.big { width: 44px; height: 44px; font-size: 18px; }
        .acct-initial { display: inline-flex; align-items: center; justify-content: center; background: var(--accent); color: var(--accent-text); font-weight: 700; font-size: 12px; }
        @media (max-width: 720px) { .acct-label { display: none; } }
        .acct-dialog {
          padding: 0; border: 0; background: transparent; color: var(--text);
          width: min(420px, calc(100vw - 24px)); max-height: calc(100dvh - 24px);
          margin: auto; overflow: visible;
        }
        .acct-dialog::backdrop { background: rgb(10 10 14 / .45); backdrop-filter: blur(3px); }
        .acct-box {
          position: relative; background: var(--surface); border: 1px solid var(--border);
          border-radius: 16px; box-shadow: var(--shadow-lg); padding: 24px; max-height: calc(100dvh - 24px); overflow-y: auto;
        }
        .acct-x { position: absolute; top: 10px; right: 10px; }
        .acct-title { margin: 0; font-size: 20px; letter-spacing: -0.02em; padding-right: 36px; }
        .acct-me { display: flex; align-items: center; gap: 12px; }
        .acct-google { width: 100%; justify-content: center; gap: 10px; }
        .acct-or { display: flex; align-items: center; gap: 12px; color: var(--text-3); font-size: 12.5px; }
        .acct-or::before, .acct-or::after { content: ''; flex: 1; height: 1px; background: var(--border); }
        .acct-links { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 16px; }
        .acct-chip { display: inline-flex; align-items: center; gap: 6px; padding: 2px 10px; border-radius: 99px; font-weight: 560; font-size: 12.5px; }
        .acct-chip svg { width: 14px; height: 14px; }
        .acct-chip.ok { background: var(--success-soft); color: var(--success); }
        .acct-chip.warn { background: var(--warning-soft); color: var(--warning); }
      `}</style>
    </>
  );
}
