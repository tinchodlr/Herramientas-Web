import QRCode from 'qrcode';

/** Matriz del QR (sincrónico): sirve para dibujarlo o para saber cuántos módulos ocupa. */
export const qrMatrix = (text: string) => QRCode.create(text, { errorCorrectionLevel: 'M' }).modules;

/** SVG del QR en negro, sin margen, que escala al tamaño de su contenedor. */
export function qrSvg(text: string) {
  const { size, data } = qrMatrix(text);
  let d = '';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) if (data[y * size + x]) d += `M${x} ${y}h1v1h-1z`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" width="100%" height="100%"><path d="${d}" fill="#000"/></svg>`;
}
