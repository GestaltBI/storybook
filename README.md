# @gestaltbi/storybook

Interactive data narratives. Bind prose to analyses so a report explains itself
from the data it runs on — and says where it no longer holds.

A dashboard shows you numbers and leaves the meaning to you. A slide deck states
the meaning and leaves the numbers behind. This is the thing in between: an
ordered argument where every figure quoted is computed from the frame in front
of it, and every claim carries a check that can contradict it.

Framework-agnostic, like [`@gestaltbi/stream`](https://github.com/GestaltBI/stream),
which it uses to run the analyses. It renders nothing: `resolveStory` hands back
prose, figures, panel data and verdicts, and the host decides what that looks
like.

## Install

```sh
npm install @gestaltbi/storybook @gestaltbi/stream
```

## Usage

```ts
import { resolveStory } from '@gestaltbi/storybook';
import { StructureDirectory } from '@gestaltbi/stream';

const story = await fetch('story.json').then((r) => r.json());
const directory = new StructureDirectory(structure);
const report = resolveStory(story, rows, {
  columnDirectory: directory,
  opContext: { columnDirectory: directory, fetcher, getFilter: () => ({}) },
  locale: 'en',
  currency: 'USD',
});

report.status;                     // 'pass' | 'warn' | 'fail' | 'none'
report.chapters[0].prose;          // paragraphs, figures already substituted
report.chapters[0].panel;          // data for the visual, no styling
report.chapters[0].verdicts;       // what the data said about the claims
```

## Concepts

- **Story** — a title, an opening, and an ordered list of chapters.
- **Chapter** — prose, the figures it is allowed to quote, one panel, and the
  checks its claims rest on.
- **Figure** — a column reduced to a single number (`last`, `sum`, `delta`,
  `growth`, …) with a format. Prose quotes it as `{{id}}`.
- **Panel** — what is drawn beside the prose: `figures`, `series`, `pivot`,
  `correlate`, `table`. The two analytical ones delegate straight to
  `@gestaltbi/stream`.
- **Check** — a `@gestaltbi/stream` predicate. This is the part that makes a
  narrative honest.

## Why the checks matter

A story written once and shown forever becomes a lie the moment the data moves
under it. Every chapter can declare what it is asserting:

```ts
checks: [
  { id: 'revenue-covers-cost', type: 'covers',
    measure: 'recognized_revenue', by: 'aws_cost' },
]
```

Resolve the story and that claim is evaluated against the current frame. If it
fails, the chapter comes back `fail`, with the offending periods named, and the
host shows it *next to the paragraph that made the claim*.

The bundled Everpix story is the demonstration: its margin chapter asserts that
revenue covered infrastructure, and against Everpix's real numbers that check
**fails every month**. The failure is the point of the chapter — and there is a
test pinning it.

## Writing a story

Nothing here is code. A story is data, so it can live in a config repo, be
edited by someone who does not write TypeScript, and be loaded at runtime:

```ts
const story = JSON.parse(await fetch('story.json').then((r) => r.text()));
resolveStory(story, rows, ctx);
```

Two rules the resolver enforces so a story cannot quietly mislead:

- A figure with nothing behind it formats as `—`, never as `0`. A gap in the
  data is not a zero.
- A token nobody computed is left standing as `{{id}}` rather than blanked. A
  story quoting a figure that does not exist is a bug in the story, and it
  should be visible.

`growth` from a base of zero returns null rather than infinity, for the same
reason.

## Knowing whether a story fits

A story is written against one dataset's vocabulary. Point it at another and
nothing throws — figures come back absent, checks skip — but the result is a
page of em dashes that reads like a bug. Ask first:

```ts
import { missingColumns } from '@gestaltbi/storybook';

const missing = missingColumns(story, structure.columns.map((c) => c.column));
if (missing.length) {
  // "this story was written for a different dataset"
}
```

## Where a story lives

**This package ships no stories.** A narrative is about one dataset — its
columns, its period, its argument — so it belongs with that dataset, not in a
library that knows nothing about either. Keeping one here would mean editing
prose required a release of something else.

So a story is a file next to the data it reads:

```
your-config-repo/
  structure.json
  processing.json
  story.json      ← here
```

`examples/story.example.json` is a complete one to copy, and
[sirmmo/Everpix-Intelligence](https://github.com/sirmmo/Everpix-Intelligence)
is a real one: six chapters over the fourteen months Everpix published when it
shut down, two of whose claims fail against its own numbers.

Nothing about that file is special to the GestaltBI client. `resolveStory` takes
a plain object, so any host can fetch one, resolve it, and render the result
however it likes.

## Development

```sh
npm install
npm test          # builds, then runs the suite
```

## License

MIT
