import {
  Barcode, Binary, Braces, Calculator, CaseSensitive, CircleDollarSign, Combine, FileImage,
  FileText, Files, Fingerprint, Image, KeyRound, Minimize2, Percent, QrCode, Receipt, Ruler,
  Scaling, Scissors, Sparkles, Store, Truck, WholeWord,
} from 'lucide-preact';

/** Íconos que se pueden nombrar desde el registro de herramientas (src/data/tools.ts). */
export const ICONS = {
  Barcode, Binary, Braces, Calculator, CaseSensitive, CircleDollarSign, Combine, FileImage,
  FileText, Files, Fingerprint, Image, KeyRound, Minimize2, Percent, QrCode, Receipt, Ruler,
  Scaling, Scissors, Sparkles, Store, Truck, WholeWord,
} as const;

export const getIcon = (name: string) => ICONS[name as keyof typeof ICONS] ?? Sparkles;
