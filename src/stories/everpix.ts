import type { Story } from '../types.js';

/**
 * Everpix, September 2012 to October 2013.
 *
 * Everpix built a photo service people genuinely loved, could not convert
 * enough of them, and shut down with the product working. The company published
 * its own numbers on the way out — which is why this can be a story told from
 * data rather than from memory.
 *
 * Written against the column codes of the `sirmmo/Everpix-Intelligence` config
 * repo. Every claim below carries checks, so if the frame changes underneath —
 * a different period, a reprocessed file — the narrative says where it no
 * longer holds rather than quietly reading as though it does.
 */
export const everpix: Story = {
  id: 'everpix',
  title: 'Everpix: a good product is not a business',
  subtitle: 'Fourteen months of a company that worked, measured, and closed anyway',
  // The process in the sirmmo/Everpix-Intelligence config that yields the
  // monthly frame with the derived columns on it. A story is written against a
  // config repo, so naming its process here is the story's job, not the host's.
  source: 'enhance',
  date: 'uatu:date',

  standfirst: [
    'In November 2013 Everpix shut down. It had a photo service its users described as the best they had ever paid for, a retention curve most consumer startups would envy, and no way to keep the lights on.',
    'The company then did something unusual: it published its own numbers. What follows reads them in order. Every figure quoted comes from the data loaded right now, and every claim is checked against it.',
  ],

  chapters: [
    {
      id: 'product',
      title: 'The product worked',
      figures: [
        { id: 'sub_active', label: 'Subscribers active monthly', measure: 'everpix:sub_active', reduce: 'avg', format: 'percent', note: 'Share of paying users opening the app in a 30-day window' },
        { id: 'free_active', label: 'Free users active monthly', measure: 'everpix:free_active', reduce: 'avg', format: 'percent' },
        { id: 'photos', label: 'Photos synced', measure: 'everpix:new_photos', reduce: 'sum', format: 'compact', unit: 'M' },
      ],
      prose: [
        'Start where the doubt usually is: did anybody want it? On average {{sub_active}} of paying subscribers opened Everpix in any given month. That is not a normal consumer number — it is the number of a utility, something people rely on rather than visit.',
        'Free users behaved differently: {{free_active}} came back. The gap between those two figures is the whole story in miniature. The people who paid, stayed. The people who did not pay, drifted — and there were far more of them.',
        'Across the period the service absorbed {{photos}} million photos. Whatever else went wrong, it was not that the product failed to do its job.',
      ],
      takeaway: 'Engagement among paying users was exceptional. Engagement among free users was not.',
      panel: { kind: 'figures' },
      checks: [
        {
          id: 'subscribers-more-engaged',
          type: 'covers',
          label: 'Subscribers were more active than free users, every month',
          measure: 'everpix:sub_active',
          by: 'everpix:free_active',
        },
      ],
    },

    {
      id: 'funnel',
      title: 'Growth was real. Conversion was not.',
      figures: [
        { id: 'users', label: 'Registered users', measure: 'everpix:users', reduce: 'last', format: 'integer' },
        { id: 'subs', label: 'Subscribers', measure: 'everpix:subscribers', reduce: 'last', format: 'integer' },
        { id: 'rate', label: 'Overall conversion', measure: 'everpix:sub_rate', reduce: 'last', format: 'percent' },
        { id: 'rate10k', label: 'Conversion, 10,000+ photo libraries', measure: 'everpix:sub_rate_10k', reduce: 'avg', format: 'percent', note: 'The people the product was built for' },
      ],
      prose: [
        'The top of the funnel filled up: {{users}} registered users by the end. The bottom did not. {{subs}} of them paid — a conversion rate of {{rate}}.',
        'But that average hides the finding that mattered. Among users with libraries over ten thousand photos — the people whose problem Everpix actually solved — conversion averaged {{rate10k}}. The product converted its audience. It simply kept being handed the wrong audience.',
        'Read those two rates together and the strategic error is legible: the money went into acquiring users in general, when the evidence said the business was in acquiring one specific kind.',
      ],
      takeaway: 'Everpix did not have a conversion problem. It had a targeting problem wearing a conversion problem’s clothes.',
      panel: {
        kind: 'series',
        series: [
          { measure: 'everpix:users', label: 'Registered users', type: 'area' },
          { measure: 'everpix:subscribers', label: 'Subscribers', type: 'area' },
        ],
      },
      checks: [
        {
          id: 'power-users-convert',
          type: 'ratio_bounds',
          label: 'Conversion among large libraries stayed above 50%',
          measure: 'everpix:sub_rate_10k',
          min: 0.5,
        },
        {
          id: 'users-only-grow',
          type: 'monotonic',
          label: 'Registered users never fell',
          measure: 'everpix:users',
          direction: 'increasing',
        },
      ],
    },

    {
      id: 'storage',
      title: 'Storage is a ratchet',
      figures: [
        { id: 'storage', label: 'Storage under management', measure: 'everpix:storage_tib', reduce: 'last', format: 'number', unit: 'TiB' },
        { id: 'storage_growth', label: 'Growth over the period', measure: 'everpix:storage_tib', reduce: 'growth', format: 'percent' },
        { id: 'aws', label: 'Infrastructure cost, total', measure: 'everpix:aws_cost', reduce: 'sum', format: 'currency' },
      ],
      prose: [
        'Here is the mechanic that decided the outcome. Everpix promised to keep your photos. Photos are not consumed and returned — they accumulate. Storage under management reached {{storage}} TiB, up {{storage_growth}} over the period, and it never once went down.',
        'A cost that only ratchets upward is a different kind of cost. Cancel a subscription and the revenue stops immediately; the obligation does not. Every month of growth wrote a cheque against every month that followed.',
        'Infrastructure took {{aws}} across the period — and unlike the revenue beside it, that figure was not a choice.',
      ],
      takeaway: 'The cost base grew with the promise, not with the revenue.',
      panel: {
        kind: 'series',
        series: [
          { measure: 'everpix:storage_tib', label: 'Storage (TiB)', type: 'area', axis: 0 },
          { measure: 'everpix:aws_cost', label: 'Infrastructure cost', type: 'line', axis: 1 },
        ],
      },
      checks: [
        {
          id: 'storage-never-falls',
          type: 'monotonic',
          label: 'Storage under management never fell',
          measure: 'everpix:storage_tib',
          direction: 'increasing',
        },
      ],
    },

    {
      id: 'margin',
      title: 'Revenue never caught cost',
      figures: [
        { id: 'revenue', label: 'Recognised revenue', measure: 'everpix:recognized_revenue', reduce: 'sum', format: 'currency' },
        { id: 'cost', label: 'Infrastructure cost', measure: 'everpix:aws_cost', reduce: 'sum', format: 'currency' },
        { id: 'margin', label: 'Gross margin over infrastructure', measure: 'everpix:calc:margin_accrual', reduce: 'sum', format: 'currency', note: 'Before a single salary' },
      ],
      prose: [
        'Put the two sides together. {{revenue}} recognised against {{cost}} of infrastructure, for a gross margin of {{margin}} across fourteen months.',
        'That figure is before salaries, before offices, before the cost of acquiring any of those users. The company was underwater on the servers alone — the one cost that scales automatically with success.',
        'Note the shape rather than the total: revenue and cost climb together, because both are driven by the same thing. Growth did not close the gap. Growth was the gap.',
      ],
      takeaway: 'The unit economics never worked, and growing faster would have made them worse.',
      panel: {
        kind: 'series',
        series: [
          { measure: 'everpix:recognized_revenue', label: 'Recognised revenue', type: 'bar' },
          { measure: 'everpix:aws_cost', label: 'Infrastructure cost', type: 'bar' },
          { measure: 'everpix:calc:margin_accrual', label: 'Gross margin', type: 'line' },
        ],
      },
      checks: [
        {
          id: 'revenue-covers-cost',
          type: 'covers',
          label: 'Revenue covered infrastructure, every month',
          measure: 'everpix:recognized_revenue',
          by: 'everpix:aws_cost',
        },
        {
          id: 'margin-positive',
          type: 'sign',
          label: 'Gross margin over infrastructure was positive',
          measure: 'everpix:calc:margin_accrual',
          expect: '>0',
        },
      ],
    },

    {
      id: 'end',
      title: 'What would have had to be true',
      figures: [
        { id: 'cum_margin', label: 'Cumulative margin', measure: 'everpix:calc:cum_margin', reduce: 'last', format: 'currency' },
        { id: 'months', label: 'Months observed', reduce: 'count', format: 'integer' },
        { id: 'press', label: 'Press articles', measure: 'everpix:press', reduce: 'sum', format: 'integer' },
      ],
      prose: [
        'Over {{months}} months the cumulative margin over infrastructure reached {{cum_margin}}. {{press}} press articles were written. Both numbers are real, and only one of them pays for storage.',
        'Everpix did not fail because nobody noticed, and it did not fail because the product was weak. It failed because the thing it charged for grew more slowly than the thing it paid for, and no amount of growth was going to reverse that ordering.',
        'The checks on these chapters run against whatever data is loaded. If you point this report at a company where revenue does cover cost, the claims above will fail — loudly, and in the right place. That is the difference between a report and a slide.',
      ],
      takeaway: 'A good product is not a business. The arithmetic has to work too.',
      panel: {
        kind: 'series',
        series: [
          { measure: 'everpix:calc:cum_recognized', label: 'Cumulative revenue', type: 'line' },
          { measure: 'everpix:calc:cum_aws', label: 'Cumulative infrastructure', type: 'line' },
          { measure: 'everpix:calc:cum_margin', label: 'Cumulative margin', type: 'area' },
        ],
      },
    },

    {
      id: 'relationships',
      title: 'What the numbers say about each other',
      prose: [
        'One last pass, without a hypothesis. Score every pair of columns and rank them, and the structure of the business shows up without being asked for.',
        'Expect the derived pairs to sit at the top — a cumulative total against its own components is one fact written twice, and reading it as a discovery is the classic way to fool yourself. What is worth your attention is anything strong that you did not put there by construction.',
      ],
      takeaway: 'Ranked relationships are a place to start looking, never a place to stop.',
      panel: {
        kind: 'correlate',
        options: { method: 'spearman', minCoefficient: 0.5, limit: 18, include: ['measure-measure'] },
      },
    },
  ],

  credits: [
    { label: 'Everpix Intelligence — the company’s own published data', href: 'https://github.com/everpix/Everpix-Intelligence' },
    { label: 'Config repo used by this report', href: 'https://github.com/sirmmo/Everpix-Intelligence' },
  ],
};
