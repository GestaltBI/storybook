import type { Chapter, Story } from './types.js';

/**
 * Every column a story reads.
 *
 * A story is written against one dataset's vocabulary. Pointing it at another
 * one does not throw — figures come back absent and checks skip — but the
 * result is a report full of em dashes, which reads like a bug. A host can ask
 * this first and say "this story was written for a different dataset" instead.
 */
export function requiredColumns(story: Story): string[] {
  const out = new Set<string>();
  if (story.date) out.add(story.date);
  for (const chapter of story.chapters ?? []) {
    for (const c of columnsOf(chapter)) out.add(c);
  }
  return [...out].sort();
}

/** The subset of {@link requiredColumns} the host cannot supply. */
export function missingColumns(story: Story, present: string[] | Set<string>): string[] {
  const have = present instanceof Set ? present : new Set(present);
  return requiredColumns(story).filter((c) => !have.has(c));
}

function columnsOf(chapter: Chapter): string[] {
  const out: string[] = [];

  for (const f of chapter.figures ?? []) {
    if (f.measure) out.push(f.measure);
  }

  const panel: any = chapter.panel;
  if (panel) {
    if (panel.kind === 'series') {
      if (panel.date) out.push(panel.date);
      for (const s of panel.series ?? []) out.push(s.measure);
    }
    if (panel.kind === 'table') {
      for (const c of panel.columns ?? []) out.push(c.column);
    }
    if (panel.kind === 'pivot') {
      const o = panel.options ?? {};
      out.push(...(o.rows ?? []), ...(o.columns ?? []));
      if (o.measure) out.push(o.measure);
      if (o.numerator) out.push(o.numerator);
      if (o.denominator) out.push(o.denominator);
    }
    if (panel.kind === 'correlate') {
      const o = panel.options ?? {};
      out.push(...(o.measures ?? []), ...(o.dimensions ?? []));
      for (const [a, b] of o.pairs ?? []) out.push(a, b);
    }
  }

  // Checks name their columns under different keys depending on the predicate.
  for (const check of (chapter.checks ?? []) as any[]) {
    for (const key of ['measure', 'by', 'a', 'b', 'cohortDate', 'orderBy']) {
      if (typeof check?.[key] === 'string') out.push(check[key]);
    }
  }

  return out;
}
