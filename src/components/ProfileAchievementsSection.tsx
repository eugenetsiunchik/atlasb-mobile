import React from 'react';
import { Text, View } from 'react-native';
import {
  Camera,
  Compass,
  Map,
  MapPin,
  ScrollText,
  Trophy,
} from 'lucide-react-native';

import {
  selectAchievementCards,
  selectAchievementsSummary,
  useAppSelector,
} from '../store';
import type { AchievementIcon } from '../services/gamification';

type AchievementIconProps = {
  icon: AchievementIcon;
  unlocked: boolean;
};

function formatUnlockedAt(value: number | null) {
  if (!value) {
    return 'Locked';
  }

  return new Date(value).toLocaleDateString();
}

function AchievementBadgeIcon({ icon, unlocked }: AchievementIconProps) {
  const color = unlocked ? '#92400e' : '#6b7280';
  const strokeWidth = unlocked ? 2.3 : 2;

  switch (icon) {
    case 'camera':
      return <Camera color={color} size={18} strokeWidth={strokeWidth} />;
    case 'compass':
      return <Compass color={color} size={18} strokeWidth={strokeWidth} />;
    case 'map':
      return <Map color={color} size={18} strokeWidth={strokeWidth} />;
    case 'map-pin':
      return <MapPin color={color} size={18} strokeWidth={strokeWidth} />;
    case 'scroll':
      return <ScrollText color={color} size={18} strokeWidth={strokeWidth} />;
    case 'trophy':
      return <Trophy color={color} size={18} strokeWidth={strokeWidth} />;
  }

  return <Trophy color={color} size={18} strokeWidth={strokeWidth} />;
}

export function ProfileAchievementsSection() {
  const summary = useAppSelector(selectAchievementsSummary);
  const achievementCards = useAppSelector(selectAchievementCards);

  return (
    <View className="gap-4 rounded-3xl border border-neutral-200 bg-white p-5">
      <View className="gap-1">
        <Text className="text-lg font-semibold text-neutral-950">Achievements</Text>
        <Text className="text-sm leading-5 text-neutral-500">
          Config-driven milestones that can be unlocked on-device now and by Firebase
          Functions later.
        </Text>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1 rounded-2xl bg-amber-50 p-4">
          <Text className="text-xs uppercase tracking-wide text-amber-700">Unlocked</Text>
          <Text className="mt-1 text-xl font-bold text-amber-950">
            {summary.unlockedCount}/{summary.totalCount}
          </Text>
        </View>
        <View className="flex-1 rounded-2xl bg-sky-50 p-4">
          <Text className="text-xs uppercase tracking-wide text-sky-700">Achievement XP</Text>
          <Text className="mt-1 text-xl font-bold text-sky-950">+{summary.earnedXp}</Text>
        </View>
      </View>

      {summary.nextLockedAchievement ? (
        <View className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-4">
          <Text className="text-xs uppercase tracking-wide text-neutral-500">Next up</Text>
          <Text className="mt-1 text-sm font-semibold text-neutral-950">
            {summary.nextLockedAchievement.title}
          </Text>
          <Text className="mt-1 text-sm text-neutral-500">
            {summary.nextLockedAchievement.progress.label}
          </Text>
        </View>
      ) : null}

      <View className="gap-3">
        {achievementCards.map(card => (
          <View
            key={card.id}
            className={`rounded-2xl border p-4 ${
              card.isUnlocked
                ? 'border-amber-200 bg-amber-50'
                : 'border-neutral-200 bg-neutral-50'
            }`}
          >
            <View className="flex-row items-start gap-3">
              <View
                className={`h-10 w-10 items-center justify-center rounded-2xl ${
                  card.isUnlocked ? 'bg-amber-100' : 'bg-neutral-200'
                }`}
              >
                <AchievementBadgeIcon icon={card.icon} unlocked={card.isUnlocked} />
              </View>
              <View className="flex-1 gap-1">
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="flex-1 text-base font-semibold text-neutral-950">
                    {card.title}
                  </Text>
                  <Text
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      card.isUnlocked ? 'text-amber-700' : 'text-neutral-500'
                    }`}
                  >
                    +{card.xpReward} XP
                  </Text>
                </View>
                <Text className="text-sm leading-5 text-neutral-600">{card.description}</Text>
                <Text className="text-xs text-neutral-500">
                  {card.isUnlocked
                    ? `Unlocked ${formatUnlockedAt(card.unlockedAtMs)}`
                    : card.progress.label}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
