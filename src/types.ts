import type { Check, CorrelateOptions, PivotOptions, Verdict } from '@gestaltbi/stream';

/**
 * How a column is reduced to the single number a sentence can carry.
 *
 * `delta` and `growth` compare the last observation to the first, in the order
 * of the story's date column — which is why the resolver needs one.
 */
export type Reduce = 'last' | 'first' | 'sum' | 'avg' | 'min' | 'max' | 'delta' | 'growth' | 'count';

/**
 * How a number should be printed. `currency` and the story's locale decide
 * the symbol and the rounding.
 */
export type FigureFormat = 'currency' | 'percent' | 'number' | 'compact' | 'integer' | 'date';

/** A number the prose is allowed to quote. */
export interface FigureSpec {
  /** Referenced from prose as `{{id}}`. */
  id: string;
  label: string;
  /** Column to reduce. Omit for `reduce: 'count'`. */
  measure?: string;
  reduce: Reduce;
  format?: FigureFormat;
  /** Shown beside the value on a metric card. */
  unit?: string;
  /** One line under the card: what the reader should take from it. */
  note?: string;
}

/**
 * One line or bar on a `series` panel.
 */
export interface SeriesSpec {
  measure: string;
  label: string;
  type?: 'line' | 'bar' | 'area';
  /** Put a series on the right-hand axis when it is in different units. */
  axis?: 0 | 1;
}

/** What is drawn beside the prose. */
export type Panel =
  | { kind: 'figures' }
  | { kind: 'series'; date?: string; series: SeriesSpec[]; stack?: boolean }
  | { kind: 'pivot'; options: PivotOptions; format?: FigureFormat }
  | { kind: 'correlate'; options: CorrelateOptions }
  | { kind: 'table'; columns: Array<{ column: string; label?: string; format?: FigureFormat }> };

/**
 * One idea: what it says, the numbers it quotes, what is drawn beside it,
 * and the claims it rests on.
 */
export interface Chapter {
  id: string;
  title: string;
  /** Paragraphs. `{{figureId}}` is replaced with the formatted figure. */
  prose: string[];
  /** The one line the reader should leave with. */
  takeaway?: string;
  /** Numbers this chapter computes; quotable from `prose` and `takeaway`. */
  figures?: FigureSpec[];
  panel?: Panel;
  /**
   * The claims the chapter rests on.
   *
   * A narrative that cannot be contradicted by its own data is marketing. These
   * run every time the story is resolved, and a failure is reported next to the
   * paragraph that made the claim.
   */
  checks?: Check[];
}

/**
 * A report, as data.
 *
 * Everything needed to render one and nothing about how: the chapters in
 * order, the process they read, and the column carrying time when the
 * structure does not say.
 */
export interface Story {
  id: string;
  title: string;
  subtitle?: string;
  /** Opening paragraphs, before the first chapter. */
  standfirst?: string[];
  /** Process name the chapters read from. The host resolves it. */
  source?: string;
  /** Column carrying time, when the structure does not say. */
  date?: string;
  chapters: Chapter[];
  credits?: Array<{ label: string; href?: string }>;
}

// --------------------------------------------------------------- resolved ---

/**
 * A figure once it has met the data: the value, and the string to print.
 */
export interface Figure extends FigureSpec {
  value: number | null;
  /** Ready to print. Null values render as an em dash, never as zero. */
  formatted: string;
}

/**
 * A panel with its data computed — still no markup, no colours, no
 * components.
 */
export type ResolvedPanel =
  | { kind: 'figures'; figures: Figure[] }
  | {
      kind: 'series';
      labels: string[];
      series: Array<{ label: string; type: string; axis: number; data: Array<number | null> }>;
      stack: boolean;
    }
  | {
      kind: 'pivot';
      columns: string[];
      rows: any[];
      omitted: number;
      rowKey: string;
      /** How the cells should be printed. A rate is unreadable raw. */
      format?: FigureFormat;
    }
  | { kind: 'correlate'; associations: any[] }
  | { kind: 'table'; columns: Array<{ column: string; label: string; format?: FigureFormat }>; rows: any[] };

/**
 * A chapter with its numbers in its sentences and its claims answered.
 */
export interface ResolvedChapter {
  id: string;
  title: string;
  prose: string[];
  takeaway?: string;
  figures: Figure[];
  panel?: ResolvedPanel;
  verdicts: Verdict[];
  /** Worst verdict in the chapter. `none` when it asserts nothing. */
  status: 'pass' | 'warn' | 'fail' | 'none';
}

/**
 * The whole report, resolved against a frame and ready to render.
 */
export interface ResolvedStory {
  id: string;
  title: string;
  subtitle?: string;
  standfirst: string[];
  chapters: ResolvedChapter[];
  credits: Array<{ label: string; href?: string }>;
  /** `fail` when any chapter's claims broke against this data. */
  status: 'pass' | 'warn' | 'fail' | 'none';
  /** Rows the story was resolved against. */
  n: number;
}
