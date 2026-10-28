import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Search } from 'lucide-preact';
import { getIcon } from './icons';
import { normalize } from '../lib/text';

interface Item {
  id: string;
  name: string;
  description: string;
  keywords: string;
  category: string;
  categoryName: string;
  icon: string;
  url: string;
}

const T = {
  es: { button: 'Buscar herramienta…', short: 'Buscar', placeholder: 'Buscá una herramienta…', empty: 'Sin resultados', hint: 'para abrir' },
  en: { button: 'Search tools…', short: 'Search', placeholder: 'Search for a tool…', empty: 'No results', hint: 'to open' },
};

export default function SearchDialog({ items, lang }: { items: Item[]; lang: 'es' | 'en' }) {
  const t = T[lang];
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [isMac, setIsMac] = useState(false);

  const results = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    if (!words.length) return items;
    return items
      .map((item) => {
        const name = normalize(item.name);
        const haystack = normalize(`${item.name} ${item.keywords} ${item.categoryName} ${item.description}`);
        if (!words.every((w) => haystack.includes(w))) return null;
        const score = words.reduce((s, w) => s + (name.includes(w) ? 2 : 0), 0);
        return { item, score };
      })
      .filter((r): r is { item: Item; score: number } => r !== null)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.item);
  }, [query, items]);

  const open = () => {
    setQuery('');
    setActive(0);
    dialog.current?.showModal();
    requestAnimationFrame(() => input.current?.focus());
  };

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => setActive(0), [query]);

  const onInputKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && results[active]) {
      window.location.href = results[active].url;
    }
  };

  useEffect(() => {
    dialog.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  return (
    <>
      <button type="button" class="search-trigger" onClick={open} aria-haspopup="dialog">
        <Search aria-hidden="true" />
        <span class="search-trigger-label">{t.button}</span>
        <span class="search-trigger-short">{t.short}</span>
        <kbd>{isMac ? '⌘' : 'Ctrl'} K</kbd>
      </button>

      <dialog
        ref={dialog}
        class="search-dialog"
        aria-label={t.placeholder}
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        <div class="search-box">
          <div class="search-input-row">
            <Search aria-hidden="true" />
            <input
              ref={input}
              type="search"
              value={query}
              onInput={(e) => setQuery(e.currentTarget.value)}
              onKeyDown={onInputKey}
              placeholder={t.placeholder}
              aria-label={t.placeholder}
              autocomplete="off"
              spellcheck={false}
            />
            <kbd>Esc</kbd>
          </div>
          <ul class="search-results" role="listbox">
            {results.length === 0 && <li class="search-empty">{t.empty}</li>}
            {results.map((item, i) => {
              const Icon = getIcon(item.icon);
              return (
                <li key={item.id} role="option" aria-selected={i === active} data-index={i}>
                  <a href={item.url} class={i === active ? 'is-active' : ''} onMouseEnter={() => setActive(i)} data-cat={item.category}>
                    <span class="icon-tile" style="--size:34px">
                      <Icon aria-hidden="true" />
                    </span>
                    <span class="search-result-text">
                      <span class="search-result-name">{item.name}</span>
                      <span class="search-result-cat">{item.categoryName}</span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </dialog>

      <style>{`
        .search-trigger {
          display: inline-flex; align-items: center; gap: 8px;
          height: 36px; padding: 0 8px 0 12px; min-width: 240px;
          border: 1px solid var(--border); border-radius: 10px;
          background: var(--surface); color: var(--text-3);
          font-size: 13.5px; cursor: pointer; transition: border-color .15s;
        }
        .search-trigger:hover { border-color: var(--border-strong); }
        .search-trigger svg { width: 16px; height: 16px; }
        .search-trigger kbd { margin-left: auto; }
        .search-trigger-short { display: none; }
        @media (max-width: 720px) {
          .search-trigger { min-width: 0; padding: 0 10px; }
          .search-trigger-label, .search-trigger kbd { display: none; }
          .search-trigger-short { display: inline; }
        }
        .search-dialog {
          padding: 0; border: 0; background: transparent;
          width: min(620px, calc(100vw - 24px)); max-height: min(560px, calc(100dvh - 120px));
          margin: 12vh auto auto; overflow: visible;
        }
        .search-dialog::backdrop { background: rgb(10 10 14 / .45); backdrop-filter: blur(3px); }
        .search-box {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 16px; box-shadow: var(--shadow-lg); overflow: hidden;
          display: flex; flex-direction: column; max-height: inherit;
        }
        .search-input-row {
          display: flex; align-items: center; gap: 10px; padding: 0 16px;
          border-bottom: 1px solid var(--border);
        }
        .search-input-row svg { width: 18px; height: 18px; color: var(--text-3); flex: none; }
        .search-input-row input {
          flex: 1; height: 56px; border: 0; outline: 0; background: transparent; font-size: 16px; min-width: 0;
        }
        .search-input-row input::-webkit-search-cancel-button { display: none; }
        .search-results { list-style: none; margin: 0; padding: 8px; overflow-y: auto; max-height: 440px; }
        .search-results a {
          display: flex; align-items: center; gap: 12px; padding: 8px 10px; border-radius: 10px;
        }
        .search-results a.is-active { background: var(--surface-2); }
        .search-result-text { display: flex; flex-direction: column; min-width: 0; }
        .search-result-name { font-weight: 560; font-size: 14.5px; }
        .search-result-cat { font-size: 12.5px; color: var(--text-3); }
        .search-empty { padding: 28px; text-align: center; color: var(--text-3); }
      `}</style>
    </>
  );
}
