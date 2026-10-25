import { Image } from 'react-native';
import { FrankRuhlLibre_400Regular } from '@expo-google-fonts/frank-ruhl-libre/400Regular';
import { Heebo_400Regular } from '@expo-google-fonts/heebo/400Regular';
import type { PrintFonts } from './printCalendar';

// expo-file-system and expo-asset are not direct dependencies, so the TTF bytes are
// read with fetch + FileReader from the bundled asset's URI. When that is not possible
// (for example a release build where the URI is a resource name) the PDF falls back
// to system Hebrew fonts. TODO: switch to expo-asset + expo-file-system once installed.
async function readBase64(asset: number): Promise<string> {
  const uri = Image.resolveAssetSource(asset)?.uri;
  if (!uri) throw new Error('no font uri');
  const res = await fetch(uri);
  if (!res.ok) throw new Error('font fetch failed');
  const blob = await res.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  if (!b64) throw new Error('empty font');
  return b64;
}

let cached: Promise<PrintFonts | null> | null = null;

/** The app's two fonts as base64 for the PDF, or null to use system fonts. Never throws. */
export function loadPrintFonts(): Promise<PrintFonts | null> {
  cached ??= Promise.all([readBase64(FrankRuhlLibre_400Regular), readBase64(Heebo_400Regular)])
    .then(([serif, sans]) => ({ serif, sans }))
    .catch(() => {
      cached = null;
      return null;
    });
  return cached;
}
