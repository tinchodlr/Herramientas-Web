import { useRef } from 'preact/hooks';
import { ImageUp, Trash2 } from 'lucide-preact';

/** Achica el logo (máx. 360 px) y lo devuelve como PNG en base64, así queda liviano en localStorage. */
export async function logoToDataUrl(file: File) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 360 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

export function LogoPicker(props: { value: string; onChange: (dataUrl: string) => void; uploadLabel: string; removeLabel: string; ariaLabel: string }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div class="logo-row">
      <div class="logo-prev">{props.value ? <img src={props.value} alt="" /> : <ImageUp aria-hidden="true" />}</div>
      <div class="btn-row">
        <button type="button" class="btn btn-sm" onClick={() => input.current?.click()}>
          {props.uploadLabel}
        </button>
        {props.value && (
          <button type="button" class="btn btn-sm btn-ghost btn-danger" onClick={() => props.onChange('')}>
            <Trash2 aria-hidden="true" />
            {props.removeLabel}
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        aria-label={props.ariaLabel}
        onChange={async (e) => {
          const f = e.currentTarget.files?.[0];
          e.currentTarget.value = '';
          if (f) props.onChange(await logoToDataUrl(f));
        }}
      />
      <style>{`
        .logo-row { display: flex; align-items: center; gap: 12px; }
        .logo-prev {
          width: 56px; height: 56px; flex: none; display: grid; place-items: center; overflow: hidden;
          border: 1.5px dashed var(--border-strong); border-radius: 10px; background: #fff; color: #94a3b8;
        }
        .logo-prev img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .logo-prev svg { width: 22px; height: 22px; }
      `}</style>
    </div>
  );
}
