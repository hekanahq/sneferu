/**
 * The curated font catalogue. Themes name fonts in `theme.json` `tokens.fonts`;
 * only these families are accepted. The files are served by the platform (not
 * bundled with a theme) from `<fontBase><file>`.
 *
 * `file` is `<slug>-<subset>-<weight>.woff2`; a variable font has one file per
 * subset and writes its weight range with an underscore (`200_1000`). These names
 * are a contract with whatever hosts the files.
 */

export interface FontFile { file: string; weight: string; style: 'normal'; subset: 'arabic' | 'latin'; unicodeRange: string }
export interface FontEntry {
  family: string;
  scripts: ('arabic' | 'latin')[];
  generic: 'sans-serif' | 'monospace' | 'serif';
  /** The family spec for a Google Fonts css2 URL (`family=<google>`), used by `sneferu dev` only. */
  google: string;
  files: FontFile[];
}

/** Google's unicode-range for the `arabic` and `latin` subsets. */
export const ARABIC_RANGE = 'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC';
export const LATIN_RANGE = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';

export const DEFAULT_ARABIC_FONT = 'Cairo';

type Subset = 'arabic' | 'latin';
const RANGE: Record<Subset, string> = { arabic: ARABIC_RANGE, latin: LATIN_RANGE };

/** `weights`: a `[min, max]` range (variable font) or a list of static weights. */
function entry(family: string, generic: FontEntry['generic'], subsets: Subset[], weights: [number, number] | number[], variable: boolean, google: string): FontEntry {
  const slug = family.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const list = variable ? [`${weights[0]} ${weights[1]}`] : weights.map(String);
  const files: FontFile[] = [];
  for (const subset of subsets) {
    for (const weight of list) files.push({ file: `${slug}-${subset}-${weight.replace(' ', '_')}.woff2`, weight, style: 'normal', subset, unicodeRange: RANGE[subset] });
  }
  return { family, scripts: subsets, generic, google, files };
}

const AL: Subset[] = ['arabic', 'latin'];
const LA: Subset[] = ['latin'];
const list = [
  entry('Cairo', 'sans-serif', AL, [200, 1000], true, 'Cairo:wght@200..1000'),
  entry('IBM Plex Sans Arabic', 'sans-serif', AL, [300, 400, 500, 600, 700], false, 'IBM+Plex+Sans+Arabic:wght@300;400;500;600;700'),
  entry('Tajawal', 'sans-serif', AL, [400, 500, 700, 800], false, 'Tajawal:wght@400;500;700;800'),
  entry('Almarai', 'sans-serif', AL, [400, 700, 800], false, 'Almarai:wght@400;700;800'),
  entry('Readex Pro', 'sans-serif', AL, [160, 700], true, 'Readex+Pro:wght@160..700'),
  entry('Noto Kufi Arabic', 'sans-serif', AL, [100, 900], true, 'Noto+Kufi+Arabic:wght@100..900'),
  entry('Rubik', 'sans-serif', AL, [300, 900], true, 'Rubik:wght@300..900'),
  entry('Baloo Bhaijaan 2', 'sans-serif', AL, [400, 800], true, 'Baloo+Bhaijaan+2:wght@400..800'),
  entry('Amiri', 'serif', AL, [400, 700], false, 'Amiri:wght@400;700'),
  entry('Noto Naskh Arabic', 'serif', AL, [400, 700], true, 'Noto+Naskh+Arabic:wght@400..700'),
  entry('El Messiri', 'sans-serif', AL, [400, 700], true, 'El+Messiri:wght@400..700'),
  entry('Reem Kufi', 'sans-serif', AL, [400, 700], true, 'Reem+Kufi:wght@400..700'),
  entry('Lalezar', 'sans-serif', AL, [400], false, 'Lalezar:wght@400'),
  entry('Changa', 'sans-serif', AL, [200, 800], true, 'Changa:wght@200..800'),
  entry('Markazi Text', 'serif', AL, [400, 700], true, 'Markazi+Text:wght@400..700'),
  entry('Inter', 'sans-serif', LA, [100, 900], true, 'Inter:wght@100..900'),
  entry('Martian Mono', 'monospace', LA, [100, 800], true, 'Martian+Mono:wght@100..800'),
  entry('Space Grotesk', 'sans-serif', LA, [300, 700], true, 'Space+Grotesk:wght@300..700'),
  entry('JetBrains Mono', 'monospace', LA, [100, 800], true, 'JetBrains+Mono:wght@100..800'),
  entry('Playfair Display', 'serif', LA, [400, 900], true, 'Playfair+Display:wght@400..900'),
  entry('Cormorant Garamond', 'serif', LA, [300, 700], true, 'Cormorant+Garamond:wght@300..700'),
  entry('Fraunces', 'serif', LA, [100, 900], true, 'Fraunces:wght@100..900'),
  entry('Oswald', 'sans-serif', LA, [200, 700], true, 'Oswald:wght@200..700'),
  entry('Bebas Neue', 'sans-serif', LA, [400], false, 'Bebas+Neue:wght@400'),
  entry('Nunito', 'sans-serif', LA, [200, 1000], true, 'Nunito:wght@200..1000'),
  entry('Fredoka', 'sans-serif', LA, [300, 700], true, 'Fredoka:wght@300..700'),
  entry('DM Sans', 'sans-serif', LA, [100, 1000], true, 'DM+Sans:wght@100..1000'),
  entry('Manrope', 'sans-serif', LA, [200, 800], true, 'Manrope:wght@200..800'),
];

/** Key = the family name exactly as written in theme.json. */
export const FONTS: Readonly<Record<string, FontEntry>> = Object.freeze(Object.fromEntries(list.map((e) => [e.family, e])));
