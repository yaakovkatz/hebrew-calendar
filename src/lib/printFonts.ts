import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { FrankRuhlLibre_400Regular } from '@expo-google-fonts/frank-ruhl-libre/400Regular';
import { Heebo_400Regular } from '@expo-google-fonts/heebo/400Regular';
import type { PrintFonts } from './printCalendar';

/** The bundled TTF as base64, copied to local storage first so it also works in release builds. */
async function readBase64(module: number): Promise<string> {
  const asset = await Asset.fromModule(module).downloadAsync();
  if (!asset.localUri) throw new Error('font not available');
  const b64 = await new File(asset.localUri).base64();
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
