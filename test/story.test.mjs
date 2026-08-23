import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolveStory, requiredColumns, missingColumns, ABSENT } from '../dist/index.js';
import { StructureDirectory } from '@gestaltbi/stream';

/**
 * A story the way a config repo would write one — plain data, no imports.
 *
 * The library ships no stories of its own: a narrative is about one dataset, so
 * it belongs with that dataset. This one exists to hold the resolver honest.
 */
const story = {
  id: 'demo',
  title: 'A quarter of trading',
  subtitle: 'Three months, and what they cost',
  source: 'clean',
  date: 'month',
  standfirst: ['Everything below is computed from the frame in front of it.'],
  chapters: [
    {
      id: 'takings',
      title: 'What came in',
      figures: [
        { id: 'total', label: 'Revenue', measure: 'revenue', reduce: 'sum', format: 'currency' },
        { id: 'best', label: 'Best month', measure: 'revenue', reduce: 'max', format: 'currency' },
        { id: 'growth', label: 'Growth', measure: 'revenue', reduce: 'growth', format: 'percent' },
      ],
      prose: ['Revenue totalled {{total}}, peaking at {{best}}, up {{growth}} across the quarter.'],
      takeaway: 'The quarter grew.',
      panel: { kind: 'figures' },
      checks: [
        { id: 'revenue-rises', type: 'monotonic', label: 'Revenue rose every month', measure: 'revenue', direction: 'increasing' },
      ],
    },
    {
      id: 'margin',
      title: 'What it cost',
      figures: [{ id: 'cost', label: 'Cost', measure: 'cost', reduce: 'sum', format: 'currency' }],
      prose: ['Against {{cost}} of cost.'],
      panel: { kind: 'series', series: [{ measure: 'revenue', label: 'Revenue' }, { measure: 'cost', label: 'Cost' }] },
      checks: [
        { id: 'revenue-covers-cost', type: 'covers', label: 'Revenue covered cost', measure: 'revenue', by: 'cost' },
      ],
    },
    {
      id: 'mix',
      title: 'Where it came from',
      prose: ['By region.'],
      panel: { kind: 'pivot', options: { rows: ['region'], measure: 'revenue', type: 'sum' } },
    },
  ],
};

const structure = {
  columns: [
    { column: 'month', type: 'date', tags: ['uatu:dimension:time'] },
    { column: 'region', type: 'string', tags: ['uatu:dimension'] },
    { column: 'revenue', type: 'number', tags: ['uatu:measure'] },
    { column: 'cost', type: 'number', tags: ['uatu:measure'] },
  ],
};

const ctx = () => {
  const dir = new StructureDirectory(structure);
  return {
    columnDirectory: dir,
    opContext: { columnDirectory: dir, fetcher: () => ({ subscribe: () => {} }), getFilter: () => ({}) },
  };
};

/** Revenue rises; cost overtakes it in the last month. */
const frame = () =>
  [
    { month: '2013-01-01', region: 'North', revenue: 100, cost: 40 },
    { month: '2013-02-01', region: 'South', revenue: 150, cost: 60 },
    { month: '2013-03-01', region: 'North', revenue: 200, cost: 260 },
  ];

describe('a story written as data', () => {
  test('every token the prose quotes is a figure its chapter computes', () => {
    for (const c of story.chapters) {
      const known = new Set((c.figures ?? []).map((f) => f.id));
      const text = [...(c.prose ?? []), c.takeaway ?? ''].join(' ');
      for (const [, id] of text.matchAll(/\{\{\s*([\w:.-]+)\s*\}\}/g)) {
        assert.ok(known.has(id), `chapter "${c.id}" quotes {{${id}}} but never computes it`);
      }
    }
  });

  test('resolves every chapter against the frame', () => {
    const out = resolveStory(story, frame(), ctx());
    assert.equal(out.n, 3);
    assert.equal(out.chapters.length, 3);
    for (const c of out.chapters) {
      for (const f of c.figures) assert.notEqual(f.formatted, ABSENT, `${c.id}/${f.id} resolved to nothing`);
    }
  });

  test('the prose carries numbers, not placeholders', () => {
    const out = resolveStory(story, frame(), ctx());
    const prose = out.chapters[0].prose.join(' ');
    assert.ok(!prose.includes('{{'), 'a token survived resolution');
    assert.match(prose, /\$450/); // 100 + 150 + 200
    assert.match(prose, /100%/); // 100 -> 200
  });

  test('a claim the data supports passes', () => {
    const out = resolveStory(story, frame(), ctx());
    const takings = out.chapters.find((c) => c.id === 'takings');
    assert.equal(takings.status, 'pass');
  });

  test('a claim the data contradicts fails, and drags the story down with it', () => {
    const out = resolveStory(story, frame(), ctx());
    const margin = out.chapters.find((c) => c.id === 'margin');
    assert.equal(margin.status, 'fail');
    assert.ok(margin.verdicts.some((v) => v.id === 'revenue-covers-cost' && v.status === 'fail'));
    // A story is only as honest as its worst chapter.
    assert.equal(out.status, 'fail');
  });

  test('a chapter that asserts nothing reports nothing', () => {
    const out = resolveStory(story, frame(), ctx());
    assert.equal(out.chapters.find((c) => c.id === 'mix').status, 'none');
  });

  test('panels come back as data, with no styling on them', () => {
    const out = resolveStory(story, frame(), ctx());
    const series = out.chapters.find((c) => c.id === 'margin').panel;
    assert.equal(series.kind, 'series');
    assert.deepEqual(series.labels, ['2013-01', '2013-02', '2013-03']);
    assert.deepEqual(series.series[0].data, [100, 150, 200]);

    const pivot = out.chapters.find((c) => c.id === 'mix').panel;
    assert.equal(pivot.kind, 'pivot');
    assert.equal(pivot.rows.find((r) => r.region === 'North').revenue, 300);
  });

  test('declares the columns it needs, and notices when they are absent', () => {
    const needed = requiredColumns(story);
    assert.deepEqual(needed, ['cost', 'month', 'region', 'revenue']);
    assert.deepEqual(missingColumns(story, structure.columns.map((c) => c.column)), []);
    assert.deepEqual(missingColumns(story, ['revenue']), ['cost', 'month', 'region']);
  });

  test('survives being pointed at the wrong data instead of throwing', () => {
    const out = resolveStory(story, [{ unrelated: 1 }], ctx());
    assert.equal(out.n, 1);
    assert.ok(out.chapters.every((c) => c.figures.every((f) => f.formatted === ABSENT)));
  });

  test('round-trips through JSON, because that is how a config repo ships one', () => {
    const asJson = JSON.parse(JSON.stringify(story));
    const a = resolveStory(story, frame(), ctx());
    const b = resolveStory(asJson, frame(), ctx());
    assert.deepEqual(b.chapters.map((c) => c.prose), a.chapters.map((c) => c.prose));
    assert.equal(b.status, a.status);
  });
});
