import React from 'react';
import { View } from 'react-native';
import {
  Camera,
  Compass,
  Map,
  MapPin,
  ScrollText,
  Trophy,
} from 'lucide-react-native';

import { AppText, Card } from './';
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
    <Card className="gap-4">
      <View className="gap-1">
        <AppText variant="heading">Achievements</AppText>
        <AppText tone="muted">
          Config-driven milestones that can be unlocked on-device now and by Firebase
          Functions later.
        </AppText>
      </View>

      <View className="flex-row gap-3">
        <Card className="flex-1 rounded-2xl p-4" variant="warning">
          <AppText className="text-amber-700" variant="caption">
            UNLOCKED
          </AppText>
          <AppText className="mt-1 text-amber-950" variant="stat">
            {summary.unlockedCount}/{summary.totalCount}
          </AppText>
        </Card>
        <Card className="flex-1 rounded-2xl p-4" variant="info">
          <AppText className="text-sky-700" variant="caption">
            ACHIEVEMENT XP
          </AppText>
          <AppText className="mt-1 text-sky-950" variant="stat">
            +{summary.earnedXp}
          </AppText>
        </Card>
      </View>

      {summary.nextLockedAchievement ? (
        <Card className="rounded-2xl p-4" variant="dashed">
          <AppText tone="subtle" variant="caption">
            NEXT UP
          </AppText>
          <AppText className="mt-1" variant="label">
            {summary.nextLockedAchievement.title}
          </AppText>
          <AppText className="mt-1" tone="muted">
            {summary.nextLockedAchievement.progress.label}
          </AppText>
        </Card>
      ) : null}

      <View className="gap-3">
        {achievementCards.map(card => (
          <Card
            key={card.id}
            className="rounded-2xl p-4"
            variant={card.isUnlocked ? 'warning' : 'muted'}
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
                  <AppText className="flex-1" variant="heading">
                    {card.title}
                  </AppText>
                  <AppText
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      card.isUnlocked ? 'text-amber-700' : 'text-neutral-500'
                    }`}
                    variant="caption"
                  >
                    +{card.xpReward} XP
                  </AppText>
                </View>
                <AppText className="text-foreground-muted">{card.description}</AppText>
                <AppText tone="muted" variant="caption">
                  {card.isUnlocked
                    ? `Unlocked ${formatUnlockedAt(card.unlockedAtMs)}`
                    : card.progress.label}
                </AppText>
              </View>
            </View>
          </Card>
        ))}
      </View>
    </Card>
  );
}
