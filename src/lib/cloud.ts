/**
 * Cuentas y guardado en la nube (Firebase Auth + Firestore).
 *
 * Firebase se carga recién cuando hace falta: quien nunca inicia sesión no descarga nada extra.
 * Los datos de cada persona viven en `users/{uid}/…` y las reglas de Firestore solo dejan
 * leer y escribir al propio usuario (ver firestore.rules).
 */
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

// Son valores públicos: identifican el proyecto, no dan acceso. La seguridad está en las reglas.
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBLy14Jr5JsYVB4d1rwARvBwlz2JhsYepc',
  authDomain: 'herramientas-hub.firebaseapp.com',
  projectId: 'herramientas-hub',
  storageBucket: 'herramientas-hub.firebasestorage.app',
  messagingSenderId: '593809024370',
  appId: '1:593809024370:web:3d472429504f9146fc29eb',
};

export interface CloudUser {
  uid: string;
  email: string;
  name: string;
  photo: string;
  verified: boolean;
  password: boolean; // se registró con email y contraseña (puede reenviar la verificación)
}

export type CloudStatus = 'off' | 'loading' | 'in' | 'out';
export interface CloudState {
  status: CloudStatus;
  user: CloudUser | null;
  /** Código del último error al sincronizar con la nube ('' si todo va bien). */
  syncError: string;
}

const HINT = 'cloud-hint';
const REGISTRY = 'cloud-keys';
/** Un documento de Firestore admite 1 MiB: por las dudas no se sincroniza nada que se acerque. */
const MAX_CHARS = 900_000;

let state: CloudState = { status: 'off', user: null, syncError: '' };
const subs = new Set<(s: CloudState) => void>();
const emit = (next: CloudState) => {
  state = next;
  subs.forEach((fn) => fn(state));
};

export const getCloudState = () => state;
export function subscribeCloud(fn: (s: CloudState) => void) {
  subs.add(fn);
  return () => void subs.delete(fn);
}

const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
  del: (k: string) => {
    try {
      localStorage.removeItem(k);
    } catch {}
  },
};

// ───────── Carga perezosa de Firebase ─────────

interface Fb {
  auth: Auth;
  db: Firestore;
  A: typeof import('firebase/auth');
  F: typeof import('firebase/firestore');
}
let fbPromise: Promise<Fb> | null = null;
let listening = false;

function loadFirebase() {
  fbPromise ??= (async () => {
    const [{ initializeApp }, A, F] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')]);
    const app = initializeApp(FIREBASE_CONFIG);
    return { auth: A.getAuth(app), db: F.getFirestore(app), A, F };
  })();
  return fbPromise;
}

const toUser = (u: import('firebase/auth').User): CloudUser => ({
  uid: u.uid,
  email: u.email ?? '',
  name: u.displayName ?? '',
  photo: u.photoURL ?? '',
  verified: u.emailVerified,
  password: u.providerData.some((p) => p.providerId === 'password'),
});

/** Carga Firebase y empieza a escuchar la sesión. Se puede llamar las veces que haga falta. */
export async function startCloud() {
  if (listening) return;
  listening = true;
  emit({ ...state, status: 'loading' });
  try {
    const { auth, A } = await loadFirebase();
    A.onAuthStateChanged(auth, (u) => {
      if (u) {
        store.set(HINT, '1');
        emit({ status: 'in', user: toUser(u), syncError: '' });
      } else {
        store.del(HINT);
        emit({ status: 'out', user: null, syncError: '' });
      }
    });
  } catch {
    listening = false;
    emit({ status: 'out', user: null, syncError: '' });
  }
}

/** Si esta persona ya inició sesión antes en este navegador, retoma la sesión sin que haga nada. */
export const resumeCloud = () => {
  if (store.get(HINT)) void startCloud();
};

// ───────── Cuenta ─────────

export type AuthErrorKey =
  | 'invalidCredential' | 'emailInUse' | 'weakPassword' | 'invalidEmail' | 'tooMany' | 'network' | 'popupClosed' | 'popupBlocked' | 'unauthorizedDomain' | 'generic';

export function authErrorKey(e: unknown): AuthErrorKey {
  const code = (e as { code?: string })?.code ?? '';
  if (/invalid-credential|wrong-password|user-not-found|invalid-login/.test(code)) return 'invalidCredential';
  if (code.includes('email-already-in-use')) return 'emailInUse';
  if (code.includes('weak-password')) return 'weakPassword';
  if (code.includes('invalid-email')) return 'invalidEmail';
  if (code.includes('too-many-requests')) return 'tooMany';
  if (code.includes('network')) return 'network';
  if (code.includes('popup-closed') || code.includes('cancelled-popup')) return 'popupClosed';
  if (code.includes('popup-blocked')) return 'popupBlocked';
  if (code.includes('unauthorized-domain')) return 'unauthorizedDomain';
  return 'generic';
}

async function ready() {
  await startCloud();
  return loadFirebase();
}

export async function signInEmail(email: string, password: string) {
  const { auth, A } = await ready();
  await A.signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signUpEmail(email: string, password: string, lang: 'es' | 'en') {
  const { auth, A } = await ready();
  auth.languageCode = lang;
  const cred = await A.createUserWithEmailAndPassword(auth, email.trim(), password);
  try {
    await A.sendEmailVerification(cred.user);
  } catch {}
}

export async function signInGoogle() {
  const { auth, A } = await ready();
  await A.signInWithPopup(auth, new A.GoogleAuthProvider());
}

export async function resetPassword(email: string, lang: 'es' | 'en') {
  const { auth, A } = await ready();
  auth.languageCode = lang;
  await A.sendPasswordResetEmail(auth, email.trim());
}

export async function resendVerification(lang: 'es' | 'en') {
  const { auth, A } = await ready();
  auth.languageCode = lang;
  if (auth.currentUser) await A.sendEmailVerification(auth.currentUser);
}

/** Cierra la sesión y borra de este navegador lo que se había copiado de la cuenta (queda en la nube). */
export async function signOutCloud() {
  const { auth, A } = await ready();
  await A.signOut(auth);
  wipeLocalCopies();
  location.reload();
}

export function wipeLocalCopies() {
  try {
    const keys: string[] = JSON.parse(store.get(REGISTRY) ?? '[]');
    keys.forEach((k) => store.del(k));
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && /^(lib:|ts:|lib-synced:)/.test(k)) localStorage.removeItem(k);
    }
  } catch {}
  store.del(REGISTRY);
  store.del(HINT);
}

/** Cualquier parte del sitio puede pedir que se abra el diálogo de ingreso. */
export const OPEN_LOGIN_EVENT = 'open-login';
export const openLogin = () => window.dispatchEvent(new CustomEvent(OPEN_LOGIN_EVENT));

// ───────── Valores sueltos (configuración de cada herramienta) ─────────

const rememberKey = (key: string) => {
  try {
    const keys: string[] = JSON.parse(store.get(REGISTRY) ?? '[]');
    if (!keys.includes(key)) store.set(REGISTRY, JSON.stringify([...keys, key]));
  } catch {}
};

export const localStamp = (key: string) => Number(store.get(`ts:${key}`)) || 0;
export const setLocalStamp = (key: string, t: number) => {
  store.set(`ts:${key}`, String(t));
  rememberKey(key);
};

const uid = () => state.user?.uid;

const codeOf = (e: unknown) => ((e as { code?: string })?.code ?? 'unknown').replace(/^firestore\//, '');
export function setSyncError(code: string) {
  if (state.syncError !== code) emit({ ...state, syncError: code });
}

/** Explica en palabras un error de sincronización. */
export function syncErrorText(code: string, lang: 'es' | 'en') {
  const es = lang === 'es';
  if (code === 'permission-denied')
    return es
      ? 'Firebase no deja guardar tus datos en la nube: falta publicar las reglas de seguridad de Firestore.'
      : 'Firebase is not allowing your data to be saved: the Firestore security rules still need to be published.';
  if (code === 'unavailable' || code === 'network-request-failed')
    return es ? 'No hay conexión con el servidor. Se sincroniza cuando vuelva.' : 'No connection to the server. It will sync when it is back.';
  if (code === 'not-found' || code === 'failed-precondition')
    return es ? 'La base de datos de Firestore todavía no está creada o disponible.' : 'The Firestore database is not created or available yet.';
  return es ? `No se pudo sincronizar con la nube (${code}).` : `Could not sync with the cloud (${code}).`;
}

/** Escribe y lee un documento de prueba. Devuelve '' si todo anda, o el código del error. */
export async function testSync(): Promise<string> {
  const id = uid();
  if (!id) return 'signed-out';
  try {
    const { db, F } = await loadFirebase();
    const ref = F.doc(db, 'users', id, 'kv', '_ping');
    await F.setDoc(ref, { v: 'ok', t: Date.now() });
    const snap = await F.getDoc(ref);
    if (!snap.exists()) throw Object.assign(new Error('missing'), { code: 'not-found' });
    setSyncError('');
    return '';
  } catch (e) {
    const code = codeOf(e);
    setSyncError(code);
    return code;
  }
}

export async function kvPull(key: string): Promise<{ v: string; t: number } | null> {
  const id = uid();
  if (!id) return null;
  try {
    const { db, F } = await loadFirebase();
    const snap = await F.getDoc(F.doc(db, 'users', id, 'kv', key));
    const d = snap.data();
    setSyncError('');
    return d && typeof d.v === 'string' ? { v: d.v, t: Number(d.t) || 0 } : null;
  } catch (e) {
    setSyncError(codeOf(e));
    throw e;
  }
}

export async function kvPush(key: string, v: string, t: number) {
  const id = uid();
  if (!id || v.length > MAX_CHARS) return;
  try {
    const { db, F } = await loadFirebase();
    await F.setDoc(F.doc(db, 'users', id, 'kv', key), { v, t });
    setSyncError('');
  } catch (e) {
    setSyncError(codeOf(e));
    throw e;
  }
}

// ───────── Colecciones de elementos guardados (perfiles, presupuestos, etiquetas…) ─────────

export interface SavedItem<T = unknown> {
  id: string;
  name: string;
  data: T;
  t: number;
}

const cacheKey = (col: string) => `lib:${col}`;
export function readCache<T>(col: string): SavedItem<T>[] {
  try {
    const list = JSON.parse(store.get(cacheKey(col)) ?? '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
export function writeCache<T>(col: string, items: SavedItem<T>[]) {
  store.set(cacheKey(col), JSON.stringify(items));
  rememberKey(cacheKey(col));
}

export const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`);

/**
 * Escucha en vivo los elementos de una colección. La primera vez que esta cuenta se conecta desde
 * este navegador, sube lo que ya había guardado sin cuenta. Devuelve la función para dejar de escuchar.
 */
export function watchItems<T>(col: string, onChange: (items: SavedItem<T>[]) => void): () => void {
  const id = uid();
  if (!id) return () => {};
  let off = () => {};
  let cancelled = false;
  void loadFirebase().then(({ db, F }) => {
    if (cancelled) return;
    const q = F.query(F.collection(db, 'users', id, 'items'), F.where('col', '==', col));
    const flag = `lib-synced:${id}:${col}`;
    off = F.onSnapshot(
      q,
      (snap) => {
        setSyncError('');
        const remote: SavedItem<T>[] = [];
        snap.forEach((d) => {
          const x = d.data();
          try {
            remote.push({ id: d.id, name: String(x.name ?? ''), data: JSON.parse(x.d), t: Number(x.t) || 0 });
          } catch {}
        });
        if (!store.get(flag)) {
          store.set(flag, '1');
          const known = new Set(remote.map((r) => r.id));
          for (const mine of readCache<T>(col)) if (!known.has(mine.id)) void pushItem(col, mine);
          const merged = [...remote, ...readCache<T>(col).filter((m) => !known.has(m.id))];
          writeCache(col, merged);
          onChange(merged);
          return;
        }
        remote.sort((a, b) => b.t - a.t);
        writeCache(col, remote);
        onChange(remote);
      },
      (err) => setSyncError(codeOf(err)),
    );
  });
  return () => {
    cancelled = true;
    off();
  };
}

export async function pushItem<T>(col: string, item: SavedItem<T>) {
  const id = uid();
  if (!id) return;
  const d = JSON.stringify(item.data);
  if (d.length > MAX_CHARS) throw new Error('too-big');
  try {
    const { db, F } = await loadFirebase();
    await F.setDoc(F.doc(db, 'users', id, 'items', item.id), { col, name: item.name, d, t: item.t });
    setSyncError('');
  } catch (e) {
    setSyncError(codeOf(e));
    throw e;
  }
}

export async function removeItem(itemId: string) {
  const id = uid();
  if (!id) return;
  try {
    const { db, F } = await loadFirebase();
    await F.deleteDoc(F.doc(db, 'users', id, 'items', itemId));
    setSyncError('');
  } catch (e) {
    setSyncError(codeOf(e));
    throw e;
  }
}
