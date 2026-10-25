export type LicenseEntry = { name: string; license: string; url: string };

// What the app ships with. Tapping a row opens the license's canonical text.
export const LICENSES: LicenseEntry[] = [
  { name: 'לוח יהודי', license: 'GPL-3.0-or-later', url: 'https://www.gnu.org/licenses/gpl-3.0.html' },
  { name: '@hebcal/core', license: 'GPL-2.0-or-later', url: 'https://www.gnu.org/licenses/old-licenses/gpl-2.0.html' },
  { name: 'Frank Ruhl Libre', license: 'SIL OFL 1.1', url: 'https://openfontlicense.org/open-font-license-official-text/' },
  { name: 'Heebo', license: 'SIL OFL 1.1', url: 'https://openfontlicense.org/open-font-license-official-text/' },
  { name: 'React Native / Expo', license: 'MIT', url: 'https://opensource.org/license/mit' },
];
