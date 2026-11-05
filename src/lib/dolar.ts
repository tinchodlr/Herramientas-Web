/** Cotización del dólar del día (oficial y blue), desde la API pública y gratuita DolarAPI. */
export interface Quote {
  buy: number;
  sell: number;
  /** Momento de la última actualización que informa la fuente. */
  updated: Date;
}

export interface Dollar {
  oficial: Quote;
  blue: Quote;
}

const URL = 'https://dolarapi.com/v1/dolares';

export async function fetchDollar(): Promise<Dollar> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 9000);
  try {
    const res = await fetch(URL, { signal: ctl.signal });
    if (!res.ok) throw new Error(String(res.status));
    const list = (await res.json()) as { casa: string; compra: number; venta: number; fechaActualizacion: string }[];
    const pick = (casa: string): Quote => {
      const x = list.find((i) => i.casa === casa);
      if (!x || !(x.venta > 0)) throw new Error(`sin ${casa}`);
      return { buy: Number(x.compra) || x.venta, sell: x.venta, updated: new Date(x.fechaActualizacion) };
    };
    return { oficial: pick('oficial'), blue: pick('blue') };
  } finally {
    clearTimeout(timer);
  }
}
