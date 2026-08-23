import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolveStory, everpix, storyById, ABSENT } from '../dist/index.js';
import { StructureDirectory } from '@gestaltbi/stream';

/**
 * A frame shaped like the Everpix config repo, with the shape of its real
 * history: users climbing, conversion low overall but high among big libraries,
 * storage only ever rising, and cost outrunning revenue every single month.
 */
const structure = {
  columns: [
    { column: 'uatu:date', type: 'date', tags: ['uatu:dimension', 'uatu:dimension:time'] },
    ...[
      'everpix:users', 'everpix:subscribers', 'everpix:new_users', 'everpix:recognized_revenue',
      'everpix:aws_cost', 'everpix:storage_tib', 'everpix:new_photos', 'everpix:sub_rate',
      'everpix:sub_rate_10k', 'everpix:free_active', 'everpix:sub_active', 'everpix:press',
      'everpix:calc:margin_accrual', 'everpix:calc:cum_recognized', 'everpix:calc:cum_aws',
      'everpix:calc:cum_margin',
    ].map((column) => ({ column, type: 'number', tags: ['uatu:measure'] })),
  ],
};

const ctx = () => {
  const dir = new StructureDirectory(structure);
  return {
    columnDirectory: dir,
    opContext: { columnDirectory: dir, fetcher: () => ({ subscribe: () => {} }), getFilter: () => ({}) },
  };
};

const frame = () => {
  let cumR = 0;
  let cumA = 0;
  return Array.from({ length: 14 }, (_, i) => {
    const revenue = 600 + i * 1800;
    const cost = 1200 + i * 2200; // cost outruns revenue, every month
    cumR += revenue;
    cumA += cost;
    return {
      'uatu:date': new Date(Date.UTC(2012, 8 + i, 1)).toISOString().slice(0, 10),
      'everpix:users': 3800 + i * 4000,
      'everpix:subscribers': 200 + i * 480,
      'everpix:new_users': 2000 + i * 200,
      'everpix:recognized_revenue': revenue,
      'everpix:aws_cost': cost,
      'everpix:storage_tib': 8 + i * 16, // a ratchet
      'everpix:new_photos': 9 + i * 8,
      'everpix:sub_rate': 0.1 + i * 0.001,
      'everpix:sub_rate_10k': 0.78,
      'everpix:free_active': 0.06,
      'everpix:sub_active': 0.78,
      'everpix:press': i === 0 ? 3 : 1,
      'everpix:calc:margin_accrual': revenue - cost,
      'everpix:calc:cum_recognized': cumR,
      'everpix:calc:cum_aws': cumA,
      'everpix:calc:cum_margin': cumR - cumA,
    };
  });
};

describe('the Everpix story', () => {
  test('is registered by id', () => {
    assert.equal(storyById('everpix'), everpix);
    assert.equal(storyById('nope'), undefined);
  });

  test('every chapter has prose and an id', () => {
    for (const c of everpix.chapters) {
      assert.ok(c.id && c.title, 'chapter needs an identity');
      assert.ok(Array.isArray(c.prose));
    }
  });

  test('every token the prose quotes is a figure the chapter computes', () => {
    for (const c of everpix.chapters) {
      const known = new Set((c.figures ?? []).map((f) => f.id));
      const text = [...(c.prose ?? []), c.takeaway ?? ''].join(' ');
      for (const [, id] of text.matchAll(/\{\{\s*([\w:.-]+)\s*\}\}/g)) {
        assert.ok(known.has(id), `chapter "${c.id}" quotes {{${id}}} but never computes it`);
      }
    }
  });

  test('resolves against an Everpix-shaped frame', () => {
    const out = resolveStory(everpix, frame(), ctx());
    assert.equal(out.n, 14);
    assert.equal(out.chapters.length, 6);
    // Nothing quoted should come back absent on a complete frame.
    for (const c of out.chapters) {
      for (const f of c.figures) {
        assert.notEqual(f.formatted, ABSENT, `${c.id}/${f.id} resolved to nothing`);
      }
    }
  });

  test('the margin claims fail — which is the finding, not a bug', () => {
    const out = resolveStory(everpix, frame(), ctx());
    const margin = out.chapters.find((c) => c.id === 'margin');
    assert.equal(margin.status, 'fail');
    assert.ok(margin.verdicts.some((v) => v.id === 'revenue-covers-cost' && v.status === 'fail'));
    assert.ok(margin.verdicts.some((v) => v.id === 'margin-positive' && v.status === 'fail'));
    // A story is only as honest as its worst chapter.
    assert.equal(out.status, 'fail');
  });

  test('the claims that did hold are reported as holding', () => {
    const out = resolveStory(everpix, frame(), ctx());
    const storage = out.chapters.find((c) => c.id === 'storage');
    assert.equal(storage.status, 'pass');

    const funnel = out.chapters.find((c) => c.id === 'funnel');
    assert.equal(funnel.status, 'pass');
  });

  test('the prose carries real numbers, not placeholders', () => {
    const out = resolveStory(everpix, frame(), ctx());
    const product = out.chapters.find((c) => c.id === 'product');
    assert.ok(!product.prose.join(' ').includes('{{'), 'a token survived resolution');
    assert.match(product.prose[0], /78%/);
  });
});

test('a story declares the columns it needs', async () => {
  const { requiredColumns, missingColumns } = await import('../dist/index.js');
  const needed = requiredColumns(everpix);
  assert.ok(needed.includes('everpix:recognized_revenue'));
  assert.ok(needed.includes('everpix:aws_cost'));
  assert.ok(needed.includes('uatu:date'));

  // Everything the story reads is described by the structure it was written for.
  const declared = structure.columns.map((c) => c.column);
  assert.deepEqual(missingColumns(everpix, declared), []);

  // Pointed at an unrelated dataset it says so, rather than rendering dashes.
  assert.ok(missingColumns(everpix, ['smartbi:customer']).length > 5);
});
