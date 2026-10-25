/** Joins the last two words with a no-break space, so no word is left alone on a line. */
export function noOrphan(text: string): string {
  const i = text.trimEnd().lastIndexOf(' ');
  return i > 0 ? `${text.slice(0, i)} ${text.slice(i + 1)}` : text;
}
