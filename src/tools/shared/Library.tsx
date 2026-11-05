import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Cloud, HardDrive, Save, Trash2 } from 'lucide-preact';
import {
  getCloudState, newId, openLogin, pushItem, readCache, removeItem, subscribeCloud, watchItems, writeCache, type CloudState, type SavedItem,
} from '../../lib/cloud';
import type { Lang } from '../../lib/format';

const T = {
  es: {
    load: 'Elegí uno guardado…',
    none: 'Todavía no guardaste ninguno.',
    name: 'Nombre para guardarlo',
    save: 'Guardar',
    update: 'Actualizar',
    saved: 'Guardado',
    remove: 'Eliminar',
    confirm: (n: string) => `¿Eliminar "${n}"?`,
    local: 'Se guarda solo en este navegador.',
    login: 'Iniciá sesión',
    localTail: 'para tenerlo en todos tus dispositivos.',
    cloud: 'Sincronizado con tu cuenta.',
    tooBig: 'Es demasiado grande para guardarlo en la cuenta.',
    failed: 'No se pudo sincronizar. Quedó guardado en este navegador.',
  },
  en: {
    load: 'Pick a saved one…',
    none: 'You have not saved any yet.',
    name: 'Name to save it as',
    save: 'Save',
    update: 'Update',
    saved: 'Saved',
    remove: 'Delete',
    confirm: (n: string) => `Delete "${n}"?`,
    local: 'Saved only in this browser.',
    login: 'Sign in',
    localTail: 'to keep it on all your devices.',
    cloud: 'Synced with your account.',
    tooBig: 'Too large to save to your account.',
    failed: 'Could not sync. It is saved in this browser.',
  },
};

/** Lista de elementos guardados: en este navegador y, con sesión iniciada, también en la cuenta. */
export function useLibrary<T>(col: string) {
  const [items, setItems] = useState<SavedItem<T>[]>([]);
  const [cloud, setCloud] = useState<CloudState>(getCloudState());

  useEffect(() => {
    setItems(readCache<T>(col));
    setCloud(getCloudState());
    return subscribeCloud(setCloud);
  }, [col]);

  useEffect(() => {
    if (cloud.status !== 'in') return;
    return watchItems<T>(col, setItems);
  }, [col, cloud.status, cloud.user?.uid]);

  const save = async (name: string, data: T) => {
    const clean = name.trim();
    const same = items.find((i) => i.name.toLowerCase() === clean.toLowerCase());
    const item: SavedItem<T> = { id: same?.id ?? newId(), name: clean, data, t: Date.now() };
    const next = [item, ...items.filter((i) => i.id !== item.id)];
    setItems(next);
    writeCache(col, next);
    if (getCloudState().status === 'in') await pushItem(col, item);
    return item;
  };

  const remove = async (id: string) => {
    const next = items.filter((i) => i.id !== id);
    setItems(next);
    writeCache(col, next);
    if (getCloudState().status === 'in') await removeItem(id);
  };

  const sorted = useMemo(() => [...items].sort((a, b) => a.name.localeCompare(b.name)), [items]);
  return { items: sorted, save, remove, loggedIn: cloud.status === 'in' };
}

interface BarProps<T> {
  col: string;
  lang: Lang;
  title: string;
  getData: () => T;
  onLoad: (data: T) => void;
  /** Nombre sugerido cuando todavía no se eligió ninguno. */
  suggestName?: () => string;
  class?: string;
}

export function LibraryBar<T>({ col, lang, title, getData, onLoad, suggestName, class: cls }: BarProps<T>) {
  const t = T[lang];
  const lib = useLibrary<T>(col);
  const [selected, setSelected] = useState('');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const flash = (msg: string) => {
    setNote(msg);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNote(''), 2600);
  };

  const current = lib.items.find((i) => i.id === selected);
  const exists = lib.items.some((i) => i.name.toLowerCase() === name.trim().toLowerCase());
  const id = `lib-${col}`;

  return (
    <div class={`lib ${cls ?? ''}`}>
      <div class="lib-head">
        <strong id={`${id}-t`}>{title}</strong>
        <span class={`lib-status ${lib.loggedIn ? 'is-cloud' : ''}`}>
          {lib.loggedIn ? <Cloud aria-hidden="true" /> : <HardDrive aria-hidden="true" />}
          {lib.loggedIn ? (
            t.cloud
          ) : (
            <>
              {t.local}{' '}
              <button type="button" class="link-btn" onClick={openLogin}>
                {t.login}
              </button>{' '}
              {t.localTail}
            </>
          )}
        </span>
      </div>
      <div class="lib-row">
        <select
          class="select"
          aria-labelledby={`${id}-t`}
          value={selected}
          disabled={lib.items.length === 0}
          onChange={(e) => {
            const item = lib.items.find((i) => i.id === e.currentTarget.value);
            setSelected(e.currentTarget.value);
            if (item) {
              setName(item.name);
              onLoad(item.data);
            }
          }}
        >
          <option value="">{lib.items.length ? t.load : t.none}</option>
          {lib.items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          class="btn btn-icon btn-ghost btn-danger"
          aria-label={t.remove}
          title={t.remove}
          disabled={!current}
          onClick={async () => {
            if (!current || !confirm(t.confirm(current.name))) return;
            await lib.remove(current.id).catch(() => flash(t.failed));
            setSelected('');
            setName('');
          }}
        >
          <Trash2 aria-hidden="true" />
        </button>
      </div>
      <form
        class="lib-row"
        onSubmit={async (e) => {
          e.preventDefault();
          const clean = name.trim() || suggestName?.() || '';
          if (!clean) return;
          try {
            const item = await lib.save(clean, getData());
            setSelected(item.id);
            setName(item.name);
            flash(t.saved);
          } catch (err) {
            flash((err as Error).message === 'too-big' ? t.tooBig : t.failed);
          }
        }}
      >
        <input class="input" aria-label={t.name} placeholder={suggestName?.() || t.name} value={name} onInput={(e) => setName(e.currentTarget.value)} />
        <button type="submit" class="btn btn-sm btn-primary" disabled={!name.trim() && !suggestName?.()}>
          <Save aria-hidden="true" />
          {exists ? t.update : t.save}
        </button>
      </form>
      {note && (
        <span class="hint" role="status">
          {note}
        </span>
      )}
    </div>
  );
}
