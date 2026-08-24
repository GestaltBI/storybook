import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveStory, formatFigure, interpolate, ABSENT } from '../dist/index.js';
import { StructureDirectory } from '@gestaltbi/stream';

const structure = {
  columns: [
    { column: 'month', type: 'date', tags: ['uatu:dimension', 'uatu:dimension:time'] },
    { column: 'region', type: 'string', tags: ['uatu:dimension'] },
    { column: 'revenue', type: 'number', tags: ['uatu:measure'] },
    { column: 'cost', type: 'number', tags: ['uatu:measure'] },
  ],
};

const ctx = () => ({
  columnDirectory: new StructureDirectory(structure),
  opContext: {
    columnDirectory: new StructureDirectory(structure),
    fetcher: () => ({ subscribe: () => {} }),
    getFilter: () => ({}),
  },
});

const months = (values) =>
  values.map((v, i) => ({
    month: `2013-${String(i + 1).padStart(2, '0')}-01`,
    region: i % 2 ? 'North' : 'South',
    ...v,
  }));

// ------------------------------------------------------------------ figures ---

test('figures reduce a column the way the story asked', () => {
  const rows = months([{ revenue: 10 }, { revenue: 30 }, { revenue: 20 }]);
  const story = {
    id: 's', title: 'T',
    chapters: [{
      id: 'c', title: 'C', prose: [],
      figures: [
        { id: 'first', label: 'First', measure: 'revenue', reduce: 'first' },
        { id: 'last', label: 'Last', measure: 'revenue', reduce: 'last' },
        { id: 'sum', label: 'Sum', measure: 'revenue', reduce: 'sum' },
        { id: 'avg', label: 'Avg', measure: 'revenue', reduce: 'avg' },
        { id: 'min', label: 'Min', measure: 'revenue', reduce: 'min' },
        { id: 'max', label: 'Max', measure: 'revenue', reduce: 'max' },
        { id: 'delta', label: 'Delta', measure: 'revenue', reduce: 'delta' },
        { id: 'count', label: 'Count', reduce: 'count' },
      ],
    }],
  };
  const out = resolveStory(story, rows, ctx());
  const f = Object.fromEntries(out.chapters[0].figures.map((x) => [x.id, x.value]));
  assert.equal(f.first, 10);
  assert.equal(f.last, 20);
  assert.equal(f.sum, 60);
  assert.equal(f.avg, 20);
  assert.equal(f.min, 10);
  assert.equal(f.max, 30);
  assert.equal(f.delta, 10);
  assert.equal(f.count, 3);
});

test('figures read the frame in date order, not file order', () => {
  const rows = [
    { month: '2013-03-01', revenue: 3 },
    { month: '2013-01-01', revenue: 1 },
    { month: '2013-02-01', revenue: 2 },
  ];
  const story = {
    id: 's', title: 'T',
    chapters: [{ id: 'c', title: 'C', prose: [], figures: [{ id: 'last', label: 'L', measure: 'revenue', reduce: 'last' }] }],
  };
  assert.equal(resolveStory(story, rows, ctx()).chapters[0].figures[0].value, 3);
});

test('growth from zero is null, not infinity', () => {
  const rows = months([{ revenue: 0 }, { revenue: 50 }]);
  const story = {
    id: 's', title: 'T',
    chapters: [{ id: 'c', title: 'C', prose: [], figures: [{ id: 'g', label: 'G', measure: 'revenue', reduce: 'growth' }] }],
  };
  const fig = resolveStory(story, rows, ctx()).chapters[0].figures[0];
  assert.equal(fig.value, null);
  assert.equal(fig.formatted, ABSENT);
});

test('a measure with nothing in it is absent, never zero', () => {
  const rows = months([{ revenue: null }, { revenue: '' }]);
  const story = {
    id: 's', title: 'T',
    chapters: [{ id: 'c', title: 'C', prose: [], figures: [{ id: 's', label: 'S', measure: 'revenue', reduce: 'sum' }] }],
  };
  assert.equal(resolveStory(story, rows, ctx()).chapters[0].figures[0].formatted, ABSENT);
});

// -------------------------------------------------------------------- prose ---

test('prose quotes the figures it names', () => {
  const rows = months([{ revenue: 1000 }, { revenue: 3000 }]);
  const story = {
    id: 's', title: 'T',
    chapters: [{
      id: 'c', title: 'C',
      prose: ['Revenue reached {{last}}.'],
      takeaway: 'Ended at {{last}}.',
      figures: [{ id: 'last', label: 'L', measure: 'revenue', reduce: 'last', format: 'currency' }],
    }],
  };
  const c = resolveStory(story, rows, ctx()).chapters[0];
  assert.match(c.prose[0], /Revenue reached \$3,000/);
  assert.match(c.takeaway, /\$3,000/);
});

test('a token nobody computed is left standing rather than blanked', () => {
  assert.equal(interpolate('a {{nope}} b', new Map()), 'a {{nope}} b');
});

test('formatting keeps a sentence readable', () => {
  assert.equal(formatFigure(null), ABSENT);
  assert.equal(formatFigure(0.1234, 'percent'), '12.3%');
  assert.equal(formatFigure(1234567, 'compact'), '1.2M');
  assert.equal(formatFigure(45, 'currency'), '$45.00');
  assert.match(formatFigure(2500000, 'currency'), /2\.5M/);
});

// ------------------------------------------------------------------- panels ---

test('a series panel keeps gaps as gaps', () => {
  const rows = months([{ revenue: 1 }, { revenue: null }, { revenue: 3 }]);
  const story = {
    id: 's', title: 'T',
    chapters: [{
      id: 'c', title: 'C', prose: [],
      panel: { kind: 'series', series: [{ measure: 'revenue', label: 'Revenue' }] },
    }],
  };
  const panel = resolveStory(story, rows, ctx()).chapters[0].panel;
  assert.equal(panel.kind, 'series');
  assert.deepEqual(panel.series[0].data, [1, null, 3]);
  assert.deepEqual(panel.labels, ['2013-01', '2013-02', '2013-03']);
});

test('a pivot panel hands back the op’s grid and its columns', () => {
  const rows = months([{ revenue: 10 }, { revenue: 20 }, { revenue: 30 }, { revenue: 40 }]);
  const story = {
    id: 's', title: 'T',
    chapters: [{
      id: 'c', title: 'C', prose: [],
      panel: { kind: 'pivot', options: { rows: ['region'], columns: [], measure: 'revenue', type: 'sum' } },
    }],
  };
  const panel = resolveStory(story, rows, ctx()).chapters[0].panel;
  assert.equal(panel.kind, 'pivot');
  assert.equal(panel.rows.length, 2);
  assert.equal(panel.rowKey, 'region');
});

test('a correlate panel hands back ranked associations', () => {
  const rows = months([{ revenue: 1, cost: 2 }, { revenue: 2, cost: 4 }, { revenue: 3, cost: 6 }]);
  const story = {
    id: 's', title: 'T',
    chapters: [{
      id: 'c', title: 'C', prose: [],
      panel: { kind: 'correlate', options: { include: ['measure-measure'] } },
    }],
  };
  const panel = resolveStory(story, rows, ctx()).chapters[0].panel;
  assert.equal(panel.kind, 'correlate');
  assert.ok(Math.abs(panel.associations[0].coefficient - 1) < 1e-9);
});

// ------------------------------------------------------------------- claims ---

test('a chapter reports the verdicts on its own claims', () => {
  const rows = months([{ revenue: 5, cost: 1 }, { revenue: 6, cost: 2 }]);
  const story = {
    id: 's', title: 'T',
    chapters: [{
      id: 'c', title: 'C', prose: [],
      checks: [{ id: 'covers', type: 'covers', measure: 'revenue', by: 'cost' }],
    }],
  };
  const out = resolveStory(story, rows, ctx());
  assert.equal(out.chapters[0].status, 'pass');
  assert.equal(out.status, 'pass');
});

test('a claim the data contradicts fails, and the story says so', () => {
  const rows = months([{ revenue: 1, cost: 9 }, { revenue: 2, cost: 9 }]);
  const story = {
    id: 's', title: 'T',
    chapters: [{
      id: 'c', title: 'C', prose: [],
      checks: [{ id: 'covers', type: 'covers', measure: 'revenue', by: 'cost' }],
    }],
  };
  const out = resolveStory(story, rows, ctx());
  assert.equal(out.chapters[0].status, 'fail');
  assert.equal(out.status, 'fail');
  assert.equal(out.chapters[0].verdicts[0].status, 'fail');
});

test('a story that asserts nothing has no status to report', () => {
  const out = resolveStory({ id: 's', title: 'T', chapters: [{ id: 'c', title: 'C', prose: ['hi'] }] }, months([{}]), ctx());
  assert.equal(out.status, 'none');
});

test('an empty frame resolves rather than throwing', () => {
  const story = {
    id: 's', title: 'T',
    chapters: [{
      id: 'c', title: 'C', prose: ['{{sum}} over {{rows}}'],
      figures: [
        { id: 'sum', label: 'S', measure: 'revenue', reduce: 'sum' },
        { id: 'rows', label: 'R', reduce: 'count' },
      ],
    }],
  };
  const out = resolveStory(story, [], ctx());
  assert.equal(out.n, 0);
  // Everything measured is absent — but a *count* of an empty frame is a real
  // zero, not a gap, and must not be dressed up as one.
  const [sum, rows] = out.chapters[0].figures;
  assert.equal(sum.formatted, ABSENT);
  assert.equal(rows.value, 0);
  assert.equal(rows.formatted, '0');
});

// ------------------------------------------------------------ pivot format ---

const rateStructure = {
  columns: [
    { column: 'month', type: 'date', tags: ['uatu:dimension:time'] },
    { column: 'cat', type: 'string', tags: ['uatu:dimension'] },
    { column: 'hit', type: 'number', tags: ['uatu:measure'] },
    { column: 'all', type: 'number', tags: ['uatu:measure'] },
  ],
};
const rateRows = [
  { month: '2020-01-01', cat: 'A', hit: 1, all: 4 },
  { month: '2020-01-01', cat: 'B', hit: 3, all: 4 },
];
const rateStory = (format) => ({
  id: 's',
  title: 'S',
  date: 'month',
  chapters: [
    {
      id: 'c',
      title: 'C',
      prose: [],
      panel: {
        kind: 'pivot',
        format,
        options: { rows: ['cat'], measure: 'rate', type: 'ratio', numerator: 'hit', denominator: 'all' },
      },
    },
  ],
});
const ratePanel = (format) =>
  resolveStory(rateStory(format), rateRows, { columnDirectory: new StructureDirectory(rateStructure) }).chapters[0].panel;

test('a pivot panel carries how its cells should be printed', () => {
  // A rate rendered raw is 0.1881408827463219, which nobody can read.
  assert.equal(ratePanel('percent').format, 'percent');
  assert.equal(ratePanel(undefined).format, undefined, 'absent when the story does not say');
});

test('the measure names the value column, so a host can label it', () => {
  const panel = ratePanel('percent');
  assert.deepEqual(panel.columns, ['rate']);
  assert.equal(
    panel.rows.find((r) => r.cat === 'B').rate,
    0.75,
    'a group’s rate is the rate of the group, not the average of its members’ rates',
  );
});
