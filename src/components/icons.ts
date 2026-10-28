import {
  ArrowLeftRight, Barcode, Box, Binary, Braces, Calculator, CaseSensitive, CircleDollarSign, ClipboardList, Combine,
  FileImage, FileText, Files, Fingerprint, HandCoins, IdCard, Image, KeyRound, MessageCircle, Minimize2,
  PackageCheck, Percent, QrCode, Receipt, Ruler, ScanBarcode, Scaling, Scissors, Sparkles, Store, Table, Truck,
  Type, WholeWord,
} from 'lucide-preact';

/** Íconos que se pueden nombrar desde el registro de herramientas (src/data/tools.ts). */
export const ICONS = {
  ArrowLeftRight, Barcode, Box, Binary, Braces, Calculator, CaseSensitive, CircleDollarSign, ClipboardList, Combine,
  FileImage, FileText, Files, Fingerprint, HandCoins, IdCard, Image, KeyRound, MessageCircle, Minimize2,
  PackageCheck, Percent, QrCode, Receipt, Ruler, ScanBarcode, Scaling, Scissors, Sparkles, Store, Table, Truck,
  Type, WholeWord,
} as const;

export const getIcon = (name: string) => ICONS[name as keyof typeof ICONS] ?? Sparkles;
