import type { FigureFormat } from './types.js';

/**
 * Locale and currency for every number in a story.
 */
export interface FormatOptions {
  locale?: string;
  currency?: string;
}

/** Absence prints as an em dash. A gap in the data is not a zero. */
export const ABSENT = '—';

const compact = (n: number, locale: string): string =>
  new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(n);

/**
 * Turn a number into the string a sentence can carry.
 *
 * Deliberately conservative: a story is read, not audited, so figures round to
 * what a person would say out loud. The unrounded value stays on the figure for
 * anything that needs it.
 */
export function formatFigure(value: number | null, format: FigureFormat = 'number', o: FormatOptions = {}): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return ABSENT;
  const locale = o.locale ?? 'en';
  const currency = o.currency ?? 'USD';

  switch (format) {
    case 'currency': {
      // Money in a sentence wants magnitude, not cents.
      const abs = Math.abs(value);
      if (abs >= 10000) {
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency,
          notation: 'compact',
          maximumFractionDigits: 1,
        }).format(value);
      }
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: abs < 100 ? 2 : 0,
      }).format(value);
    }
    case 'percent':
      return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(value);
    case 'integer':
      return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
    case 'compact':
      return compact(value, locale);
    case 'date': {
      const d = new Date(value);
      return Number.isFinite(+d) ? d.toISOString().slice(0, 10) : ABSENT;
    }
    default:
      return new Intl.NumberFormat(locale, { maximumFractionDigits: Math.abs(value) < 10 ? 2 : 0 }).format(value);
  }
}

/**
 * Replace `{{id}}` with a figure.
 *
 * An unknown token is left standing rather than blanked: a story quoting a
 * figure nobody computed is a bug in the story, and it should be visible.
 */
export function interpolate(text: string, figures: Map<string, string>): string {
  return (text ?? '').replace(/\{\{\s*([\w:.-]+)\s*\}\}/g, (whole, id) => figures.get(id) ?? whole);
}
