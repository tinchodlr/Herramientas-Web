/** Datos que una herramienta le pasa a otra al abrirla en una pestaña nueva (por ejemplo, de un presupuesto a una etiqueta de envío). */
export interface HandoffClient {
  name: string;
  taxId: string;
  phone: string;
  street: string;
  floor: string;
  barrio: string;
  city: string;
  cp: string;
}

export interface Handoff {
  to: 'delivery' | 'receipt' | 'label';
  /** Número del presupuesto de origen. */
  number: string;
  client: HandoffClient;
  items: { desc: string; qty: string; price: string }[];
  total: number;
  currency: string;
}

const KEY = 'handoff';
/** Pasado este tiempo el traspaso se descarta, para que no aparezca en una visita posterior. */
const MAX_AGE_MS = 5 * 60 * 1000;

export const EMPTY_HANDOFF_CLIENT: HandoffClient = { name: '', taxId: '', phone: '', street: '', floor: '', barrio: '', city: '', cp: '' };

export function sendHandoff(data: Handoff) {
  try {
    // localStorage y no sessionStorage: la pestaña nueva no hereda el almacenamiento de sesión.
    localStorage.setItem(KEY, JSON.stringify({ ...data, sentAt: Date.now() }));
  } catch {}
}

/** Devuelve lo que se mandó para esta herramienta (una sola vez) o null. */
export function takeHandoff(to: Handoff['to']): Handoff | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Handoff & { sentAt?: number };
    if (data.to !== to) return null;
    localStorage.removeItem(KEY);
    if (!data.sentAt || Date.now() - data.sentAt > MAX_AGE_MS) return null;
    return { ...data, client: { ...EMPTY_HANDOFF_CLIENT, ...data.client } };
  } catch {
    return null;
  }
}

/** Calle, piso, barrio, localidad y CP en una sola línea. */
export const addressLine = (c: HandoffClient) => [c.street, c.floor, c.barrio, [c.cp, c.city].filter(Boolean).join(' ')].map((x) => x.trim()).filter(Boolean).join(', ');
