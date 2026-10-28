import type { ComponentChildren } from 'preact';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-preact';
import { COMMON, type Lang } from './ui';

export const moveItem = <T,>(list: T[], from: number, to: number) => {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
};

/** Lista de archivos con botones para subir, bajar y quitar cada uno. */
export function FileOrderList<T extends { id: number }>(props: {
  lang: Lang;
  items: T[];
  onChange: (items: T[]) => void;
  render: (item: T) => { thumb?: ComponentChildren; name: string; sub: ComponentChildren };
}) {
  const c = COMMON[props.lang];
  return (
    <div class="file-list">
      {props.items.map((item, i) => {
        const r = props.render(item);
        return (
          <div class="file-item" key={item.id}>
            <span class="order-num">{i + 1}</span>
            {r.thumb}
            <div class="meta">
              <div class="name" title={r.name}>
                {r.name}
              </div>
              <div class="sub">{r.sub}</div>
            </div>
            <button type="button" class="btn btn-sm btn-ghost btn-icon" disabled={i === 0} onClick={() => props.onChange(moveItem(props.items, i, i - 1))} aria-label={`${c.moveUp}: ${r.name}`}>
              <ArrowUp aria-hidden="true" />
            </button>
            <button
              type="button"
              class="btn btn-sm btn-ghost btn-icon"
              disabled={i === props.items.length - 1}
              onClick={() => props.onChange(moveItem(props.items, i, i + 1))}
              aria-label={`${c.moveDown}: ${r.name}`}
            >
              <ArrowDown aria-hidden="true" />
            </button>
            <button type="button" class="btn btn-sm btn-ghost btn-icon btn-danger" onClick={() => props.onChange(props.items.filter((x) => x.id !== item.id))} aria-label={`${c.remove}: ${r.name}`}>
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        );
      })}
      <style>{`.order-num { width: 22px; text-align: center; font-weight: 650; font-size: 13px; color: var(--text-3); flex: none; }`}</style>
    </div>
  );
}
