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
import { resolveStory, everpix } from '@gestaltbi/storybook';
import { StructureDirectory } from '@gestaltbi/stream';

const directory = new StructureDirectory(structure);
const report = resolveStory(everpix, rows, {
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

## The Everpix story

`everpix` reads the fourteen months
[Everpix published](https://github.com/everpix/Everpix-Intelligence) when it
shut down in November 2013: a photo service people loved, with retention most
consumer startups would envy, that closed anyway. Six chapters — the product
worked, the funnel leaked, storage is a ratchet, revenue never caught cost, what
would have had to be true, and a last pass over what the numbers say about each
other.

## Development

```sh
npm install
npm test          # builds, then runs the suite
```

## License

MIT
