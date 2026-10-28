import type { Lang } from '../config';

type L<T = string> = Record<Lang, T>;

export type CategoryId = 'ecommerce' | 'generators' | 'calculators' | 'images' | 'pdf' | 'text';

export interface Category {
  id: CategoryId;
  icon: string;
  anchor: L;
  name: L;
  description: L;
}

export interface Tool {
  id: string;
  category: CategoryId;
  icon: string;
  slug: L;
  name: L;
  description: L;
  /** Palabras extra para el buscador (sinónimos, términos en inglés, etc.). */
  keywords: L;
  steps: L<string[]>;
  popular?: boolean;
}

export const CATEGORIES: Category[] = [
  {
    id: 'ecommerce',
    icon: 'Store',
    anchor: { es: 'vendedores', en: 'sellers' },
    name: { es: 'Para vendedores', en: 'For sellers' },
    description: {
      es: 'Costos y títulos de Mercado Libre, SKU, etiquetas de envío y presupuestos, remitos y recibos en PDF.',
      en: 'Mercado Libre fees and titles, SKUs, shipping labels, and quotes, delivery notes and receipts as PDF.',
    },
  },
  {
    id: 'generators',
    icon: 'Sparkles',
    anchor: { es: 'generadores', en: 'generators' },
    name: { es: 'Generadores', en: 'Generators' },
    description: {
      es: 'Códigos QR y de barras, links de WhatsApp, contraseñas seguras e identificadores únicos.',
      en: 'QR codes and barcodes, WhatsApp links, strong passwords and unique identifiers.',
    },
  },
  {
    id: 'calculators',
    icon: 'Calculator',
    anchor: { es: 'calculadoras', en: 'calculators' },
    name: { es: 'Calculadoras y conversores', en: 'Calculators & converters' },
    description: {
      es: 'Porcentajes, IVA, CUIT/CUIL y conversión de unidades al instante.',
      en: 'Percentages, VAT, CUIT/CUIL and unit conversion, instantly.',
    },
  },
  {
    id: 'images',
    icon: 'Image',
    anchor: { es: 'imagenes', en: 'images' },
    name: { es: 'Imágenes', en: 'Images' },
    description: {
      es: 'Convertí, comprimí y redimensioná imágenes sin subirlas a ningún servidor.',
      en: 'Convert, compress and resize images without uploading them anywhere.',
    },
  },
  {
    id: 'pdf',
    icon: 'FileText',
    anchor: { es: 'pdf', en: 'pdf' },
    name: { es: 'PDF', en: 'PDF' },
    description: {
      es: 'Uní, dividí y creá PDF desde imágenes, todo en tu navegador.',
      en: 'Merge, split and create PDFs from images, all in your browser.',
    },
  },
  {
    id: 'text',
    icon: 'Braces',
    anchor: { es: 'texto', en: 'text' },
    name: { es: 'Texto y desarrollo', en: 'Text & developer' },
    description: {
      es: 'JSON, CSV, Base64, contador de palabras y conversión de mayúsculas.',
      en: 'JSON, CSV, Base64, word counter and text case conversion.',
    },
  },
];

export const TOOLS: Tool[] = [
  // ── Para vendedores ─────────────────────────────────────────────
  {
    id: 'ml-calc',
    category: 'ecommerce',
    icon: 'CircleDollarSign',
    popular: true,
    slug: { es: 'calculadora-costos-mercado-libre', en: 'mercado-libre-fee-calculator' },
    name: { es: 'Calculadora de costos de Mercado Libre', en: 'Mercado Libre fee calculator' },
    description: {
      es: 'Calculá cuánto te queda por cada venta en Mercado Libre Argentina: comisión, cargo fijo, cuotas, envío, impuestos y margen real. También te dice a qué precio publicar.',
      en: 'Find out how much you keep from each Mercado Libre Argentina sale: commission, fixed fee, installments, shipping, taxes and real margin. It also suggests a listing price.',
    },
    keywords: {
      es: 'mercadolibre meli comision cargo por vender ganancia margen precio publicar clasica premium',
      en: 'mercadolibre meli commission fees profit margin price classic premium',
    },
    steps: {
      es: [
        'Ingresá el precio de venta, el tipo de publicación y el costo de tu producto.',
        'Ajustá la comisión de tu categoría, el envío y los impuestos que pagás.',
        'Mirá cuánto recibís, tu ganancia y el precio sugerido para el margen que buscás.',
      ],
      en: [
        'Enter the sale price, listing type and your product cost.',
        'Adjust your category commission, shipping and the taxes you pay.',
        'See what you receive, your profit and the suggested price for your target margin.',
      ],
    },
  },
  {
    id: 'sku',
    category: 'ecommerce',
    icon: 'Barcode',
    popular: true,
    slug: { es: 'generador-de-sku', en: 'sku-generator' },
    name: { es: 'Generador de SKU', en: 'SKU generator' },
    description: {
      es: 'Creá códigos SKU ordenados para tus productos y todas sus variantes (color, talle) con un formato propio. Exportá la lista a CSV o Excel.',
      en: 'Create consistent SKU codes for your products and all their variants (color, size) with your own format. Export the list to CSV or Excel.',
    },
    keywords: {
      es: 'sku codigo producto inventario stock variantes talle color',
      en: 'sku product code inventory stock variants size color',
    },
    steps: {
      es: [
        'Definí el formato: marca, categoría, número y variantes.',
        'Cargá tus productos con sus colores y talles separados por comas.',
        'Copiá o descargá los SKU generados en CSV.',
      ],
      en: [
        'Define the format: brand, category, number and variants.',
        'Add your products with their colors and sizes separated by commas.',
        'Copy or download the generated SKUs as CSV.',
      ],
    },
  },
  {
    id: 'shipping-label',
    category: 'ecommerce',
    icon: 'Truck',
    popular: true,
    slug: { es: 'generador-de-etiquetas-de-envio', en: 'shipping-label-generator' },
    name: { es: 'Generador de etiquetas de envío', en: 'Shipping label generator' },
    description: {
      es: 'Armá etiquetas de envío con QR de la dirección y del WhatsApp del cliente. Imprimilas en A4 (3 u 2 por hoja), en impresora térmica 10×15 u 8×14, o descargalas en ZPL para Zebra.',
      en: 'Make shipping labels with QR codes for the address and the customer’s WhatsApp. Print them on A4 (3 or 2 per sheet), on a 4×6 or 8×14 thermal printer, or download ZPL for Zebra.',
    },
    keywords: {
      es: 'etiqueta envio rotulo paquete correo flex moto mensajeria termica zebra zpl qr whatsapp imprimir destinatario remitente',
      en: 'shipping label parcel package courier thermal zebra zpl qr whatsapp print recipient sender',
    },
    steps: {
      es: [
        'Completá tus datos de remitente y tu logo (quedan guardados en tu navegador).',
        'Cargá un destinatario o pegá varios envíos desde Excel.',
        'Elegí el formato: hoja A4, impresora térmica o ZPL, e imprimí.',
      ],
      en: [
        'Fill in your sender details and logo (they are saved in your browser).',
        'Add one recipient or paste several shipments from Excel.',
        'Choose the format: A4 sheet, thermal printer or ZPL, and print.',
      ],
    },
  },

  // ── Generadores ─────────────────────────────────────────────────
  {
    id: 'qr',
    category: 'generators',
    icon: 'QrCode',
    popular: true,
    slug: { es: 'generador-de-codigos-qr', en: 'qr-code-generator' },
    name: { es: 'Generador de códigos QR', en: 'QR code generator' },
    description: {
      es: 'Generá códigos QR para enlaces, WhatsApp, WiFi, email o contactos. Personalizá colores, agregá tu logo y descargalo en PNG o SVG.',
      en: 'Create QR codes for links, WhatsApp, WiFi, email or contacts. Customize colors, add your logo and download as PNG or SVG.',
    },
    keywords: {
      es: 'qr codigo enlace link whatsapp wifi vcard contacto',
      en: 'qr code link url whatsapp wifi vcard contact',
    },
    steps: {
      es: [
        'Elegí el tipo de QR y completá los datos.',
        'Personalizá colores, tamaño y, si querés, tu logo.',
        'Descargalo en PNG para usar en redes o en SVG para imprenta.',
      ],
      en: [
        'Pick the QR type and fill in the data.',
        'Customize colors, size and optionally your logo.',
        'Download as PNG for social media or SVG for print.',
      ],
    },
  },
  {
    id: 'password',
    category: 'generators',
    icon: 'KeyRound',
    slug: { es: 'generador-de-contrasenas', en: 'password-generator' },
    name: { es: 'Generador de contraseñas', en: 'Password generator' },
    description: {
      es: 'Generá contraseñas seguras y aleatorias con el largo y los caracteres que elijas. Se crean en tu dispositivo y no se envían a ningún lado.',
      en: 'Generate strong random passwords with the length and characters you choose. They are created on your device and never sent anywhere.',
    },
    keywords: { es: 'contraseña clave password segura aleatoria', en: 'password strong random secure passphrase' },
    steps: {
      es: ['Elegí el largo y los tipos de caracteres.', 'Generá una o varias contraseñas.', 'Copiala con un clic.'],
      en: ['Choose the length and character types.', 'Generate one or many passwords.', 'Copy with one click.'],
    },
  },
  {
    id: 'uuid',
    category: 'generators',
    icon: 'Fingerprint',
    slug: { es: 'generador-de-uuid', en: 'uuid-generator' },
    name: { es: 'Generador de UUID', en: 'UUID generator' },
    description: {
      es: 'Generá UUID v4 (aleatorios) o v7 (ordenables por fecha) de a uno o en lote, con o sin guiones.',
      en: 'Generate UUID v4 (random) or v7 (time-ordered) one at a time or in bulk, with or without hyphens.',
    },
    keywords: { es: 'uuid guid identificador unico v4 v7', en: 'uuid guid unique identifier v4 v7' },
    steps: {
      es: ['Elegí la versión y la cantidad.', 'Ajustá el formato (mayúsculas, guiones).', 'Copiá la lista.'],
      en: ['Choose the version and quantity.', 'Adjust the format (uppercase, hyphens).', 'Copy the list.'],
    },
  },

  // ── Calculadoras y conversores ──────────────────────────────────
  {
    id: 'percent',
    category: 'calculators',
    icon: 'Percent',
    popular: true,
    slug: { es: 'calculadora-de-porcentajes', en: 'percentage-calculator' },
    name: { es: 'Calculadora de porcentajes', en: 'Percentage calculator' },
    description: {
      es: 'Calculá el porcentaje de un número, qué porcentaje representa un valor, aumentos, descuentos y la variación entre dos números.',
      en: 'Calculate a percentage of a number, what percent one value is of another, increases, discounts and the change between two numbers.',
    },
    keywords: {
      es: 'porcentaje por ciento descuento aumento variacion regla de tres',
      en: 'percentage percent discount increase change difference',
    },
    steps: {
      es: ['Elegí la cuenta que necesitás.', 'Escribí los números.', 'El resultado aparece al instante.'],
      en: ['Pick the calculation you need.', 'Type the numbers.', 'The result shows up instantly.'],
    },
  },
  {
    id: 'iva',
    category: 'calculators',
    icon: 'Receipt',
    slug: { es: 'calculadora-de-iva', en: 'vat-calculator' },
    name: { es: 'Calculadora de IVA', en: 'VAT calculator' },
    description: {
      es: 'Sumá o quitá el IVA a un precio con las alícuotas de Argentina (21 %, 10,5 %, 27 %) o una tasa personalizada.',
      en: 'Add or remove VAT from a price using Argentina rates (21%, 10.5%, 27%) or a custom rate.',
    },
    keywords: { es: 'iva impuesto neto bruto factura alicuota', en: 'vat tax net gross invoice sales tax' },
    steps: {
      es: ['Ingresá el monto.', 'Elegí si querés sumar o quitar el IVA y la alícuota.', 'Mirá el neto, el IVA y el total.'],
      en: ['Enter the amount.', 'Choose whether to add or remove VAT and the rate.', 'See the net, VAT and total.'],
    },
  },
  {
    id: 'units',
    category: 'calculators',
    icon: 'Ruler',
    slug: { es: 'conversor-de-unidades', en: 'unit-converter' },
    name: { es: 'Conversor de unidades', en: 'Unit converter' },
    description: {
      es: 'Convertí longitud, peso, volumen, temperatura, superficie, velocidad y datos entre todas sus unidades.',
      en: 'Convert length, weight, volume, temperature, area, speed and data between all their units.',
    },
    keywords: {
      es: 'convertir unidades metros pulgadas kilos libras litros celsius fahrenheit',
      en: 'convert units meters inches kilograms pounds liters celsius fahrenheit',
    },
    steps: {
      es: ['Elegí la magnitud.', 'Escribí el valor y su unidad.', 'Mirá la equivalencia en todas las unidades.'],
      en: ['Pick the quantity.', 'Type the value and its unit.', 'See the equivalent in every unit.'],
    },
  },

  // ── Imágenes ────────────────────────────────────────────────────
  {
    id: 'webp',
    category: 'images',
    icon: 'FileImage',
    popular: true,
    slug: { es: 'convertir-imagenes-a-webp', en: 'convert-images-to-webp' },
    name: { es: 'Convertir imágenes a WebP', en: 'Convert images to WebP' },
    description: {
      es: 'Convertí JPG, PNG y otras imágenes a WebP de a muchas por vez. Más livianas para tu web o tienda, sin subirlas a ningún servidor.',
      en: 'Convert JPG, PNG and other images to WebP in bulk. Lighter files for your site or store, without uploading them anywhere.',
    },
    keywords: { es: 'webp convertir jpg png imagen optimizar', en: 'webp convert jpg png image optimize' },
    steps: {
      es: ['Arrastrá tus imágenes.', 'Ajustá la calidad y, si querés, el tamaño máximo.', 'Descargalas una por una o todas en un .zip.'],
      en: ['Drop your images.', 'Adjust quality and optionally the maximum size.', 'Download them one by one or all in a .zip.'],
    },
  },
  {
    id: 'img-compress',
    category: 'images',
    icon: 'Minimize2',
    slug: { es: 'comprimir-imagenes', en: 'compress-images' },
    name: { es: 'Comprimir imágenes', en: 'Compress images' },
    description: {
      es: 'Reducí el peso de tus fotos JPG, PNG o WebP manteniendo buena calidad. Ideal para publicaciones, mails y tiendas online.',
      en: 'Reduce the size of your JPG, PNG or WebP photos while keeping good quality. Great for listings, emails and online stores.',
    },
    keywords: { es: 'comprimir reducir peso imagen foto optimizar', en: 'compress reduce size image photo optimize' },
    steps: {
      es: ['Arrastrá tus imágenes.', 'Elegí el formato y la calidad.', 'Compará el ahorro y descargá.'],
      en: ['Drop your images.', 'Choose the format and quality.', 'Compare the savings and download.'],
    },
  },
  {
    id: 'img-resize',
    category: 'images',
    icon: 'Scaling',
    slug: { es: 'redimensionar-imagenes', en: 'resize-images' },
    name: { es: 'Redimensionar imágenes', en: 'Resize images' },
    description: {
      es: 'Cambiá el tamaño de varias imágenes a la vez indicando el ancho o alto máximo, sin deformarlas.',
      en: 'Resize many images at once by setting the maximum width or height, without distortion.',
    },
    keywords: { es: 'redimensionar cambiar tamaño achicar imagen ancho alto', en: 'resize scale shrink image width height' },
    steps: {
      es: ['Arrastrá tus imágenes.', 'Indicá el ancho y alto máximos.', 'Descargá las imágenes redimensionadas.'],
      en: ['Drop your images.', 'Set the maximum width and height.', 'Download the resized images.'],
    },
  },

  // ── PDF ─────────────────────────────────────────────────────────
  {
    id: 'pdf-merge',
    category: 'pdf',
    icon: 'Combine',
    popular: true,
    slug: { es: 'unir-pdf', en: 'merge-pdf' },
    name: { es: 'Unir PDF', en: 'Merge PDF' },
    description: {
      es: 'Juntá varios archivos PDF en uno solo y elegí el orden. Tus documentos no salen de tu computadora.',
      en: 'Combine several PDF files into one and choose the order. Your documents never leave your computer.',
    },
    keywords: { es: 'unir juntar combinar pdf', en: 'merge combine join pdf' },
    steps: {
      es: ['Agregá tus PDF.', 'Ordenalos con las flechas.', 'Descargá el PDF unido.'],
      en: ['Add your PDFs.', 'Reorder them with the arrows.', 'Download the merged PDF.'],
    },
  },
  {
    id: 'pdf-split',
    category: 'pdf',
    icon: 'Scissors',
    slug: { es: 'dividir-pdf', en: 'split-pdf' },
    name: { es: 'Dividir PDF', en: 'Split PDF' },
    description: {
      es: 'Extraé páginas de un PDF o separalo en un archivo por página. Elegí rangos como 1-3, 5, 8-10.',
      en: 'Extract pages from a PDF or split it into one file per page. Pick ranges like 1-3, 5, 8-10.',
    },
    keywords: { es: 'dividir separar extraer paginas pdf', en: 'split extract pages pdf separate' },
    steps: {
      es: ['Elegí un PDF.', 'Indicá las páginas o elegí separar todas.', 'Descargá el resultado.'],
      en: ['Pick a PDF.', 'Enter the pages or choose to split all.', 'Download the result.'],
    },
  },
  {
    id: 'img-to-pdf',
    category: 'pdf',
    icon: 'Files',
    slug: { es: 'imagenes-a-pdf', en: 'images-to-pdf' },
    name: { es: 'Imágenes a PDF', en: 'Images to PDF' },
    description: {
      es: 'Convertí fotos JPG, PNG o WebP en un único PDF, con tamaño de hoja, orientación y márgenes a elección.',
      en: 'Turn JPG, PNG or WebP photos into a single PDF with your choice of page size, orientation and margins.',
    },
    keywords: { es: 'imagen foto jpg png a pdf convertir escanear', en: 'image photo jpg png to pdf convert scan' },
    steps: {
      es: ['Agregá tus imágenes.', 'Ordenalas y elegí el tamaño de hoja.', 'Descargá el PDF.'],
      en: ['Add your images.', 'Reorder them and choose the page size.', 'Download the PDF.'],
    },
  },

  // ── Texto y desarrollo ──────────────────────────────────────────
  {
    id: 'json',
    category: 'text',
    icon: 'Braces',
    slug: { es: 'formateador-json', en: 'json-formatter' },
    name: { es: 'Formateador y validador JSON', en: 'JSON formatter & validator' },
    description: {
      es: 'Formateá, minificá y validá JSON. Te marca la línea exacta del error y puede ordenar las claves.',
      en: 'Format, minify and validate JSON. It points to the exact line of any error and can sort keys.',
    },
    keywords: { es: 'json formatear validar minificar embellecer', en: 'json format validate minify beautify pretty print' },
    steps: {
      es: ['Pegá tu JSON.', 'Formatealo, minificalo u ordená las claves.', 'Copiá o descargá el resultado.'],
      en: ['Paste your JSON.', 'Format, minify or sort the keys.', 'Copy or download the result.'],
    },
  },
  {
    id: 'base64',
    category: 'text',
    icon: 'Binary',
    slug: { es: 'codificar-decodificar-base64', en: 'base64-encoder-decoder' },
    name: { es: 'Codificar y decodificar Base64', en: 'Base64 encoder & decoder' },
    description: {
      es: 'Pasá texto a Base64 y viceversa con soporte completo de acentos y emojis. También convierte archivos a Data URL.',
      en: 'Convert text to Base64 and back with full support for accents and emoji. It also turns files into Data URLs.',
    },
    keywords: { es: 'base64 codificar decodificar data url', en: 'base64 encode decode data url' },
    steps: {
      es: ['Escribí o pegá el texto.', 'Elegí codificar o decodificar.', 'Copiá el resultado.'],
      en: ['Type or paste the text.', 'Choose encode or decode.', 'Copy the result.'],
    },
  },
  {
    id: 'word-count',
    category: 'text',
    icon: 'WholeWord',
    slug: { es: 'contador-de-palabras', en: 'word-counter' },
    name: { es: 'Contador de palabras y caracteres', en: 'Word & character counter' },
    description: {
      es: 'Contá palabras, caracteres, oraciones y párrafos, con tiempo de lectura y palabras más repetidas.',
      en: 'Count words, characters, sentences and paragraphs, with reading time and most repeated words.',
    },
    keywords: { es: 'contar palabras caracteres letras texto', en: 'count words characters letters text' },
    steps: {
      es: ['Pegá o escribí tu texto.', 'Mirá los conteos en vivo.', 'Revisá las palabras más usadas.'],
      en: ['Paste or type your text.', 'Watch the counts update live.', 'Check the most used words.'],
    },
  },
  {
    id: 'case',
    category: 'text',
    icon: 'CaseSensitive',
    slug: { es: 'convertir-mayusculas-minusculas', en: 'text-case-converter' },
    name: { es: 'Convertir mayúsculas y minúsculas', en: 'Text case converter' },
    description: {
      es: 'Pasá un texto a MAYÚSCULAS, minúsculas, Tipo Título, tipo oración, camelCase, snake_case o slug para URLs.',
      en: 'Convert text to UPPERCASE, lowercase, Title Case, Sentence case, camelCase, snake_case or URL slug.',
    },
    keywords: { es: 'mayusculas minusculas titulo slug camelcase', en: 'uppercase lowercase title case slug camelcase' },
    steps: {
      es: ['Pegá tu texto.', 'Elegí el formato.', 'Copiá el resultado.'],
      en: ['Paste your text.', 'Choose the format.', 'Copy the result.'],
    },
  },
  {
    id: 'csv-json',
    category: 'text',
    icon: 'Table',
    slug: { es: 'convertidor-csv-json', en: 'csv-json-converter' },
    name: { es: 'Convertidor CSV ↔ JSON', en: 'CSV ↔ JSON converter' },
    description: {
      es: 'Pasá un CSV a JSON o un JSON a CSV. Detecta el separador, respeta las comillas y los códigos con ceros adelante, y el CSV sale listo para abrir en Excel.',
      en: 'Turn a CSV into JSON or JSON into CSV. It detects the delimiter, respects quotes and leading-zero codes, and the CSV opens cleanly in Excel.',
    },
    keywords: {
      es: 'csv json convertir excel planilla tabla separador punto y coma exportar importar',
      en: 'csv json convert excel spreadsheet table delimiter semicolon export import',
    },
    steps: {
      es: ['Pegá el contenido o cargá el archivo.', 'Ajustá el separador y las opciones.', 'Copiá o descargá el resultado.'],
      en: ['Paste the content or load the file.', 'Adjust the delimiter and options.', 'Copy or download the result.'],
    },
  },

  // ── Documentos, identificación y mensajería ─────────────────────
  {
    id: 'quote',
    category: 'ecommerce',
    icon: 'ClipboardList',
    popular: true,
    slug: { es: 'generador-de-presupuestos-pdf', en: 'quote-generator-pdf' },
    name: { es: 'Generador de presupuestos en PDF', en: 'Quote generator (PDF)' },
    description: {
      es: 'Armá presupuestos con tu logo, renglones, descuento e IVA discriminado, y descargalos en PDF. Es un documento no fiscal (con la “X”): no reemplaza a la factura.',
      en: 'Build quotes with your logo, line items, discount and itemized VAT, and download them as PDF. It is a non-fiscal document (marked “X”): it does not replace an invoice.',
    },
    keywords: {
      es: 'presupuesto cotizacion proforma pdf documento no fiscal x iva descuento cliente',
      en: 'quote quotation estimate proforma pdf non fiscal document vat discount customer',
    },
    steps: {
      es: [
        'Cargá tus datos y tu logo una sola vez: quedan en tu navegador.',
        'Completá el cliente y los renglones, con descuento e IVA si corresponde.',
        'Descargá el PDF: el número del próximo presupuesto se suma solo.',
      ],
      en: [
        'Enter your details and logo once: they stay in your browser.',
        'Fill in the customer and line items, with discount and VAT if needed.',
        'Download the PDF: the next quote number is incremented automatically.',
      ],
    },
  },
  {
    id: 'delivery-note',
    category: 'ecommerce',
    icon: 'PackageCheck',
    slug: { es: 'generador-de-remitos-pdf', en: 'delivery-note-generator-pdf' },
    name: { es: 'Generador de remitos en PDF', en: 'Delivery note generator (PDF)' },
    description: {
      es: 'Creá remitos con el detalle de la mercadería, con o sin precios y con lugar para firma, aclaración y DNI de quien recibe. Documento no fiscal en PDF.',
      en: 'Create delivery notes listing the goods, with or without prices and with space for the receiver’s signature, name and ID. Non-fiscal PDF document.',
    },
    keywords: {
      es: 'remito entrega mercaderia envio pdf documento no fiscal firma comprobante',
      en: 'delivery note dispatch goods shipment pdf non fiscal document signature proof',
    },
    steps: {
      es: ['Cargá tus datos y los del cliente.', 'Agregá los renglones; si querés, mostrá los precios.', 'Descargá el PDF e imprimilo para la firma.'],
      en: ['Enter your details and the customer’s.', 'Add the lines; show prices if you want.', 'Download the PDF and print it for signing.'],
    },
  },
  {
    id: 'receipt',
    category: 'ecommerce',
    icon: 'HandCoins',
    slug: { es: 'generador-de-recibos-pdf', en: 'receipt-generator-pdf' },
    name: { es: 'Generador de recibos en PDF', en: 'Receipt generator (PDF)' },
    description: {
      es: 'Armá recibos de pago con el importe escrito en letras, forma de pago y lugar para la firma. Documento no fiscal en PDF, con tus datos y logo.',
      en: 'Make payment receipts with the amount written out in words, payment method and a signature line. Non-fiscal PDF document with your details and logo.',
    },
    keywords: {
      es: 'recibo pago cobro importe en letras comprobante pdf documento no fiscal efectivo transferencia',
      en: 'receipt payment amount in words proof pdf non fiscal document cash transfer',
    },
    steps: {
      es: ['Completá quién paga, el importe y el concepto.', 'Elegí la forma de pago.', 'Descargá el PDF: el importe sale escrito en letras.'],
      en: ['Fill in who pays, the amount and what it is for.', 'Choose the payment method.', 'Download the PDF: the amount is written in words.'],
    },
  },
  {
    id: 'ml-title',
    category: 'ecommerce',
    icon: 'Type',
    slug: { es: 'generador-de-titulos-mercado-libre', en: 'mercado-libre-title-generator' },
    name: { es: 'Generador de títulos para Mercado Libre', en: 'Mercado Libre title generator' },
    description: {
      es: 'Armá títulos de hasta 60 caracteres con producto, marca, modelo y características, sin palabras promocionales. También revisa los títulos que ya tenés y te propone una versión corregida.',
      en: 'Build titles of up to 60 characters from product, brand, model and features, without promotional words. It also reviews your existing titles and suggests a corrected version.',
    },
    keywords: {
      es: 'titulo mercadolibre meli publicacion 60 caracteres seo palabras clave mayusculas',
      en: 'title mercadolibre meli listing 60 characters seo keywords uppercase',
    },
    steps: {
      es: ['Escribí producto, marca, modelo y características.', 'Elegí entre las variantes que entran en 60 caracteres.', 'Copiá el título o pegá los tuyos para revisarlos.'],
      en: ['Enter product, brand, model and features.', 'Pick one of the variants that fit in 60 characters.', 'Copy the title, or paste yours to review them.'],
    },
  },
  {
    id: 'barcode',
    category: 'generators',
    icon: 'ScanBarcode',
    popular: true,
    slug: { es: 'generador-de-codigos-de-barras', en: 'barcode-generator' },
    name: { es: 'Generador de códigos de barras', en: 'Barcode generator' },
    description: {
      es: 'Generá códigos de barras Code 128, EAN-13, EAN-8, UPC-A, Code 39 e ITF-14, de a uno o en lote, y descargalos en PNG o SVG. Calcula solo el dígito verificador.',
      en: 'Generate Code 128, EAN-13, EAN-8, UPC-A, Code 39 and ITF-14 barcodes, one at a time or in bulk, and download them as PNG or SVG. The check digit is calculated for you.',
    },
    keywords: {
      es: 'codigo de barras ean13 ean8 upc code128 code39 itf14 producto etiqueta lectora gtin',
      en: 'barcode ean13 ean8 upc code128 code39 itf14 product label scanner gtin',
    },
    steps: {
      es: ['Elegí el formato del código.', 'Escribí uno o pegá varios, uno por línea.', 'Descargalos en PNG o SVG, o todos en un .zip.'],
      en: ['Choose the barcode format.', 'Type one or paste several, one per line.', 'Download them as PNG or SVG, or all in a .zip.'],
    },
  },
  {
    id: 'wa-link',
    category: 'generators',
    icon: 'MessageCircle',
    popular: true,
    slug: { es: 'generador-de-link-de-whatsapp', en: 'whatsapp-link-generator' },
    name: { es: 'Generador de link de WhatsApp', en: 'WhatsApp link generator' },
    description: {
      es: 'Creá un link wa.me con tu número y un mensaje ya escrito, más el QR y un botón HTML para tu web. Acomoda solo los números argentinos (código de área, sin 0 ni 15).',
      en: 'Create a wa.me link with your number and a pre-written message, plus the QR and an HTML button for your site. Argentine numbers are formatted for you (area code, no 0 or 15).',
    },
    keywords: {
      es: 'whatsapp wa.me link enlace mensaje predeterminado boton chat qr contacto',
      en: 'whatsapp wa.me link message prefilled button chat qr contact',
    },
    steps: {
      es: ['Elegí el país y escribí el número.', 'Si querés, agregá un mensaje o elegí una plantilla.', 'Copiá el link, el botón HTML o descargá el QR.'],
      en: ['Pick the country and type the number.', 'Optionally add a message or choose a template.', 'Copy the link, the HTML button or download the QR.'],
    },
  },
  {
    id: 'cuit',
    category: 'calculators',
    icon: 'IdCard',
    slug: { es: 'validador-y-calculadora-cuit-cuil', en: 'cuit-cuil-validator-calculator' },
    name: { es: 'Validador y calculadora de CUIT/CUIL', en: 'CUIT/CUIL validator & calculator' },
    description: {
      es: 'Verificá si un CUIT o CUIL tiene bien el dígito verificador (de a uno o en lista) o calculalo a partir del DNI. No consulta a ARCA: comprueba que el número esté bien formado.',
      en: 'Check whether a CUIT or CUIL has a correct check digit (one or a list) or calculate it from the ID number. It does not query ARCA: it checks that the number is well formed.',
    },
    keywords: {
      es: 'cuit cuil dni validar verificar digito verificador calcular afip arca monotributo identificacion tributaria',
      en: 'cuit cuil dni validate verify check digit calculate afip arca tax id argentina',
    },
    steps: {
      es: ['Pegá uno o varios CUIT/CUIL para validarlos.', 'O elegí “Calcular”, escribí el DNI y el tipo.', 'Copiá el número con o sin guiones.'],
      en: ['Paste one or more CUIT/CUIL to validate them.', 'Or choose “Calculate”, enter the ID number and the type.', 'Copy the number with or without hyphens.'],
    },
  },
];

export const getTool = (id: string) => TOOLS.find((t) => t.id === id)!;
export const getCategory = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)!;
export const toolsByCategory = (id: CategoryId) => TOOLS.filter((t) => t.category === id);
