import {
  byDate,
  Correlate,
  Pivot,
  resolveTimeColumn,
  runChecks,
  type ColumnDirectory,
  type OpContext,
  type Verdict,
} from '@gestaltbi/stream';

import { formatFigure, interpolate, type FormatOptions } from './format.js';
import type {
  Chapter,
  Figure,
  FigureSpec,
  Panel,
  ResolvedChapter,
  ResolvedPanel,
  ResolvedStory,
  Story,
} from './types.js';

export interface ResolveOptions extends FormatOptions {
  columnDirectory?: ColumnDirectory;
  /** Context handed to the stream ops a panel runs. */
  opContext?: OpContext;
  /** Overrides the story's own date column. */
  date?: string;
}

const num = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Run a story against a frame.
 *
 * The output is everything a host needs to render and nothing about how: no
 * colours, no components, no markup. A narrative is a sequence of claims, the
 * figures behind them, and the verdicts on whether the data still supports
 * them — which is the part that survives the data changing underneath.
 */
export function resolveStory(story: Story, rows: any[], o: ResolveOptions = {}): ResolvedStory {
  const frame = Array.isArray(rows) ? rows : [];
  const dateColumn = o.date ?? story.date ?? resolveTimeColumn(o.columnDirectory, frame);
  const ordered = dateColumn ? frame.map((_, i) => i).sort(byDate(frame, dateColumn)).map((i) => frame[i]) : frame;

  const chapters = (story.chapters ?? []).map((c) => resolveChapter(c, ordered, dateColumn, o));
  const status = worst(chapters.map((c) => c.status));

  return {
    id: story.id,
    title: story.title,
    subtitle: story.subtitle,
    standfirst: story.standfirst ?? [],
    chapters,
    credits: story.credits ?? [],
    status,
    n: frame.length,
  };
}

function resolveChapter(
  chapter: Chapter,
  rows: any[],
  dateColumn: string | undefined,
  o: ResolveOptions,
): ResolvedChapter {
  const figures = (chapter.figures ?? []).map((spec) => resolveFigure(spec, rows, o));
  const lookup = new Map(figures.map((f) => [f.id, f.formatted]));

  const verdicts: Verdict[] = chapter.checks?.length
    ? runChecks(chapter.checks, rows, { columnDirectory: o.columnDirectory, orderBy: dateColumn })
    : [];

  return {
    id: chapter.id,
    title: chapter.title,
    prose: (chapter.prose ?? []).map((p) => interpolate(p, lookup)),
    takeaway: chapter.takeaway ? interpolate(chapter.takeaway, lookup) : undefined,
    figures,
    panel: chapter.panel ? resolvePanel(chapter.panel, rows, figures, dateColumn, o) : undefined,
    verdicts,
    status: statusOf(verdicts),
  };
}

// ----------------------------------------------------------------- figures ---

function resolveFigure(spec: FigureSpec, rows: any[], o: ResolveOptions): Figure {
  const value = reduce(spec, rows);
  return { ...spec, value, formatted: formatFigure(value, spec.format, o) };
}

/** Reduce a column to one number, in the order the story was resolved in. */
function reduce(spec: FigureSpec, rows: any[]): number | null {
  if (spec.reduce === 'count') return rows.length;
  if (!spec.measure) return null;

  const values = rows.map((r) => num(r[spec.measure as string])).filter((v): v is number => v !== null);
  if (!values.length) return null;

  switch (spec.reduce) {
    case 'first':
      return values[0];
    case 'last':
      return values[values.length - 1];
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'avg':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    case 'delta':
      return values[values.length - 1] - values[0];
    case 'growth': {
      const first = values[0];
      // Growth from nothing is not a number, however tempting infinity looks.
      return first === 0 ? null : (values[values.length - 1] - first) / Math.abs(first);
    }
    default:
      return null;
  }
}

// ------------------------------------------------------------------ panels ---

function resolvePanel(
  panel: Panel,
  rows: any[],
  figures: Figure[],
  dateColumn: string | undefined,
  o: ResolveOptions,
): ResolvedPanel | undefined {
  switch (panel.kind) {
    case 'figures':
      return { kind: 'figures', figures };

    case 'series': {
      const date = panel.date ?? dateColumn;
      const labels = rows.map((r, i) => stamp(r, date, i));
      return {
        kind: 'series',
        labels,
        stack: panel.stack ?? false,
        series: panel.series.map((s) => ({
          label: s.label,
          type: s.type ?? 'line',
          axis: s.axis ?? 0,
          data: rows.map((r) => num(r[s.measure])),
        })),
      };
    }

    case 'pivot': {
      const op = new Pivot(panel.options, o.opContext as OpContext);
      const out = op.run([rows, {}]);
      return {
        kind: 'pivot',
        columns: op.getColumns(),
        rows: out,
        omitted: op.getOmitted(),
        rowKey: panel.options.rows?.[0] ?? '',
      };
    }

    case 'correlate': {
      const op = new Correlate(panel.options, o.opContext as OpContext);
      return { kind: 'correlate', associations: op.run([rows, {}]) };
    }

    case 'table':
      return {
        kind: 'table',
        columns: panel.columns.map((c) => ({ column: c.column, label: c.label ?? c.column, format: c.format })),
        rows,
      };

    default:
      return undefined;
  }
}

/** Axis label for a row: its date if there is one, else its position. */
function stamp(row: any, date: string | undefined, index: number): string {
  if (!date) return String(index + 1);
  const v = row[date];
  const d = new Date(v);
  return Number.isFinite(+d) ? d.toISOString().slice(0, 7) : String(v ?? index + 1);
}

// ----------------------------------------------------------------- verdicts ---

const statusOf = (verdicts: Verdict[]): ResolvedChapter['status'] => {
  if (!verdicts.length) return 'none';
  if (verdicts.some((v) => v.status === 'fail')) return 'fail';
  if (verdicts.some((v) => v.status === 'warn')) return 'warn';
  if (verdicts.some((v) => v.status === 'pass')) return 'pass';
  return 'none';
};

const worst = (all: Array<ResolvedChapter['status']>): ResolvedStory['status'] => {
  if (all.includes('fail')) return 'fail';
  if (all.includes('warn')) return 'warn';
  if (all.includes('pass')) return 'pass';
  return 'none';
};
