import { everpix } from './stories/everpix.js';
import type { Story } from './types.js';

/**
 * Stories shipped with the package.
 *
 * A host can ignore this entirely and hand `resolveStory` something it loaded
 * from its own config repo — a story is data, not code.
 */
export const stories: Story[] = [everpix];

export const storyById = (id: string): Story | undefined => stories.find((s) => s.id === id);
