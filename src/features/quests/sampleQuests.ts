import type { QuestDefinition } from './types';
import { QUEST_CONFIG_VERSION } from './types';

export const SAMPLE_QUESTS: readonly QuestDefinition[] = Object.freeze([
  {
    configVersion: QUEST_CONFIG_VERSION,
    description:
      'Follow a classic route through some of Belarus\' most storied fortresses and palace complexes.',
    id: 'castles-of-belarus',
    imageUrl: null,
    objective: {
      places: [
        {
          id: 'mir-castle',
          label: 'Mir Castle',
          matcher: {
            nameIncludes: 'mir',
            region: 'Hrodna',
          },
        },
        {
          id: 'nesvizh-castle',
          label: 'Nesvizh Castle',
          matcher: {
            nameIncludes: 'nesvizh',
            region: 'Minsk',
          },
        },
        {
          id: 'lida-castle',
          label: 'Lida Castle',
          matcher: {
            nameIncludes: 'lida',
            region: 'Hrodna',
          },
        },
      ],
      type: 'visitSpecificPlaces',
    },
    reward: {
      achievementUnlocks: [
        {
          achievementId: 'quest-castles-of-belarus-complete',
          category: 'quest',
          configVersion: QUEST_CONFIG_VERSION,
          description: 'Completed the Castles of Belarus quest.',
          icon: 'map',
          title: 'Castle Conqueror',
          unlockedAtMs: 0,
          xpReward: 80,
        },
      ],
      xp: 150,
    },
    sortOrder: 1,
    status: 'active',
    title: 'Castles of Belarus',
    type: 'visitSpecificPlaces',
  },
  {
    configVersion: QUEST_CONFIG_VERSION,
    description:
      'Track down places connected to UNESCO heritage and scientific landmarks across Belarus.',
    id: 'unesco-related-places',
    imageUrl: null,
    objective: {
      places: [
        {
          id: 'mir-unesco',
          label: 'Mir Castle Complex',
          matcher: {
            nameIncludes: 'mir',
          },
        },
        {
          id: 'nesvizh-unesco',
          label: 'Nesvizh Palace and Residence',
          matcher: {
            nameIncludes: 'nesvizh',
          },
        },
        {
          id: 'belovezhskaya-pushcha',
          label: 'Belovezhskaya Pushcha',
          matcher: {
            nameIncludes: 'belovezh',
          },
        },
        {
          id: 'struve-arc',
          label: 'Struve Geodetic Arc',
          matcher: {
            nameIncludes: 'struve',
          },
        },
      ],
      themeLabel: 'UNESCO-related places',
      type: 'completeThemedCollection',
    },
    reward: {
      achievementUnlocks: [
        {
          achievementId: 'quest-unesco-related-places-complete',
          category: 'quest',
          configVersion: QUEST_CONFIG_VERSION,
          description: 'Completed the UNESCO-related places quest.',
          icon: 'scroll',
          title: 'World Heritage Wanderer',
          unlockedAtMs: 0,
          xpReward: 90,
        },
      ],
      xp: 175,
    },
    sortOrder: 2,
    status: 'active',
    title: 'UNESCO-related places',
    type: 'completeThemedCollection',
  },
  {
    configVersion: QUEST_CONFIG_VERSION,
    description:
      'Slow down in Minsk and uncover lesser-known places that reward curious wandering.',
    id: 'minsk-hidden-gems',
    imageUrl: null,
    objective: {
      region: 'Minsk',
      requiredCount: 3,
      type: 'visitPlacesInRegion',
    },
    reward: {
      achievementUnlocks: [
        {
          achievementId: 'quest-minsk-hidden-gems-complete',
          category: 'quest',
          configVersion: QUEST_CONFIG_VERSION,
          description: 'Completed the Minsk hidden gems quest.',
          icon: 'compass',
          title: 'Minsk Insider',
          unlockedAtMs: 0,
          xpReward: 70,
        },
      ],
      xp: 120,
    },
    sortOrder: 3,
    status: 'active',
    title: 'Minsk hidden gems',
    type: 'visitPlacesInRegion',
  },
]);
