import { h } from './render.mjs';

export const meta = {
  pkg: '@gestaltbi/storybook',
  repo: 'https://github.com/GestaltBI/storybook',
  npm: 'https://www.npmjs.com/package/@gestaltbi/storybook',
  tagline: 'An interactive report as data: prose, the figures it quotes, and the claims it rests on.',
  blurb: `A story is a JSON document, not a component. It says what to compute, what to say about it, and what
would have to be true for the saying to hold. \`resolveStory\` runs it against a real frame and returns
everything a host needs to render — and nothing about how.

Which means the numbers in the finished report are computed from the data every time it is read, and a
claim the data no longer supports says so, next to the paragraph that made it.`,
};

export const sections = [
  {
    title: 'A story is data',
    body: [
      h.code(
        'ts',
        `import { resolveStory } from '@gestaltbi/storybook';

const resolved = resolveStory(story, rows, {
  columnDirectory: directory,   // from @gestaltbi/stream
  opContext: context,           // needed only by pivot and correlate panels
  locale: 'it',
  currency: 'EUR',
});

resolved.status     // 'pass' | 'warn' | 'fail' | 'none'
resolved.chapters   // prose with the numbers already in it, panels, verdicts`,
      ),
      h.p(
        `The output carries no colours, no components and no markup. A host renders \`ResolvedStory\` however
         it renders anything else, which is why the same story reads the same in a browser, a PDF job or a test.`,
      ),
    ].join('\n'),
  },

  {
    title: 'Figures, and the {{token}} rule',
    body: [
      h.p(
        `Prose never contains a number. It contains a token naming a figure the chapter declares, and the
         resolver substitutes the value it computed from the frame.`,
      ),
      h.code(
        'json',
        `{
  "id": "volume",
  "title": "How much moved",
  "figures": [
    { "id": "qty", "label": "Units sold", "measure": "sold_quant", "reduce": "sum", "format": "integer" }
  ],
  "prose": ["Across the period the business shifted {{qty}} units."],
  "takeaway": "Volume is the place to start."
}`,
      ),
      h.p(
        `This is the whole discipline of the format. A sentence written this way stays true when the filter
         moves, when next month lands, and when somebody points it at a different period — because the author
         committed to *what to measure*, never to what it came to.`,
      ),
      h.table(
        ['reduce', 'what it takes'],
        [
          ['`sum` / `avg` / `min` / `max`', 'over every row in the frame'],
          ['`first` / `last`', 'in the order of the story’s date column'],
          ['`delta`', 'last minus first'],
          ['`growth`', 'last over first, minus one'],
          ['`count`', 'rows — the one reduce that needs no measure'],
        ],
      ),
      h.note(
        `An absent figure formats as an em dash, never as zero: a gap in the data is not a value of nothing.
         An unknown token is left standing in the prose rather than blanked, because a story quoting a figure
         nobody computed is a bug in the story and should be visible.`,
      ),
    ].join('\n'),
  },

  {
    title: 'Panels',
    body: [
      h.p(`What is drawn beside the prose. Five kinds, each resolved to plain data.`),
      h.table(
        ['kind', 'renders'],
        [
          ['`figures`', 'the chapter’s own figures as metric cards'],
          ['`series`', 'one row per period, one line or bar per measure'],
          ['`pivot`', 'a cross-tab — dimensions down the side, dimensions across the top'],
          ['`correlate`', 'ranked associations between columns'],
          ['`table`', 'named columns, straight through'],
        ],
      ),
      h.code(
        'json',
        `{
  "kind": "pivot",
  "format": "percent",
  "options": {
    "rows": ["category"],
    "measure": "calc:fail_rate",
    "type": "ratio", "numerator": "failed", "denominator": "resolved",
    "totals": true
  }
}`,
      ),
      h.p(
        `\`format\` says how the cells should be printed — a rate rendered raw is \`0.1881408827463219\`, which
         is correct and unreadable. The host formats; the story only says what with, the same division of
         labour as \`FigureSpec.format\`.`,
      ),
      h.note(
        `\`series\` maps rows one-to-one and does not group: point it at a frame with one row per period.
         \`pivot\` and \`correlate\` group the frame themselves, so they want it **before** any roll-up —
         after an aggregate the dimensions they need no longer exist.`,
      ),
    ].join('\n'),
  },

  {
    title: 'A report that can be contradicted',
    body: [
      h.p(
        `A narrative that its own data cannot argue with is marketing. Chapters carry
         [checks](https://github.com/GestaltBI/stream) from \`@gestaltbi/stream\`; they run every time the story
         is resolved, and a failure is reported next to the paragraph that made the claim.`,
      ),
      h.code(
        'json',
        `"checks": [
  { "id": "covers", "type": "covers", "label": "Revenue covered infrastructure, every month",
    "measure": "recognized_revenue", "by": "aws_cost" }
]`,
      ),
      h.p(
        `A chapter's \`status\` is the worst verdict in it, and the story's is the worst of its chapters —
         \`none\` when it asserts nothing at all. In the published Everpix report two checks fail on purpose:
         revenue never covered AWS, and the accrual margin was never positive. That is the report proving its
         own thesis rather than asserting it.`,
      ),
    ].join('\n'),
  },

  {
    title: 'Fitting a story to a dataset',
    body: [
      h.p(
        `A story is written against one dataset's vocabulary. Pointing it at another does not throw — figures
         come back absent, checks skip — but the result is a page of em dashes, which reads like a bug rather
         than a mismatch. Ask first.`,
      ),
      h.code(
        'ts',
        `import { missingColumns } from '@gestaltbi/storybook';

const missing = missingColumns(story, declaredColumns);
if (missing.length) {
  // "This story was written for a different dataset", and name them.
}`,
      ),
      h.p(
        `\`requiredColumns\` walks figures, every panel kind and every check, so it sees a column named in a
         pivot's denominator as readily as one in a paragraph.`,
      ),
    ].join('\n'),
  },

  {
    title: 'Where stories come from',
    body: [
      h.p(
        `This package ships none. A story belongs with the data it reads, so a GestaltBI config repo keeps
         \`story.json\` beside \`processing.json\` and owns its narrative outright — see
         [Kickstarter Intelligence](https://github.com/sirmmo/kickstarter-intelligence) for a hand-written one.`,
      ),
      h.p(
        `[@gestaltbi/inference](https://gestaltbi.github.io/inference/) writes them too: \`composeStory\` asks a
         model for this format, grounds it against the dataset profile, and hands back a \`Story\` ready to
         resolve. The model chooses what to compute and never learns what it came to — which is the same
         \`{{token}}\` rule, enforced from the other side.`,
      ),
    ].join('\n'),
  },
];
