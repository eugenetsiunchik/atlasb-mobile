import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Badge, Card } from '../components';
import {
  getQuestObjectiveSummary,
  getQuestTargetLabels,
  selectAllMapPlaces,
  selectQuestCardById,
  useAppSelector,
} from '../store';
import { getBottomTabContentPadding } from '../utils';

type QuestDetailsScreenProps = {
  onBack: () => void;
  questId: string;
};

function formatCompletedAt(value: number | null) {
  if (!value) {
    return 'In progress';
  }

  return new Date(value).toLocaleDateString();
}

export function QuestDetailsScreen({ onBack, questId }: QuestDetailsScreenProps) {
  const { bottom } = useSafeAreaInsets();
  const quest = useAppSelector(state => selectQuestCardById(state, questId));
  const places = useAppSelector(selectAllMapPlaces);

  const visitedPlaceNames = React.useMemo(() => {
    if (!quest) {
      return [];
    }

    return places
      .filter(place => quest.progress.matchedPlaceIds.includes(place.id))
      .map(place => place.name)
      .sort((left, right) => left.localeCompare(right));
  }, [places, quest]);

  if (!quest) {
    return (
      <View className="flex-1 gap-4 p-4">
        <Pressable onPress={onBack}>
          <AppText tone="accent" variant="label">
            Back to quests
          </AppText>
        </Pressable>
        <AppText tone="muted">This quest is no longer available.</AppText>
      </View>
    );
  }

  const targetLabels = getQuestTargetLabels(quest);

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={[
        styles.contentContainer,
        { paddingBottom: getBottomTabContentPadding(bottom) },
      ]}
    >
      <Pressable onPress={onBack}>
        <AppText tone="accent" variant="label">
          Back to quests
        </AppText>
      </Pressable>

      <View className="gap-2">
        <Badge
          label={quest.isCompleted ? 'Completed' : 'Active quest'}
          variant={quest.isCompleted ? 'completed' : 'active'}
        />
        <AppText variant="display">{quest.title}</AppText>
        <AppText className="leading-6" tone="muted">
          {quest.description}
        </AppText>
      </View>

      <Card className="gap-3">
        <AppText tone="subtle" variant="caption">
          OBJECTIVE
        </AppText>
        <AppText variant="heading">{getQuestObjectiveSummary(quest)}</AppText>
        <AppText tone="muted">{quest.progress.progressLabel}</AppText>
      </Card>

      <View className="flex-row gap-3">
        <Card className="flex-1 p-4" variant="info">
          <AppText className="text-sky-700" variant="caption">
            REWARD XP
          </AppText>
          <AppText className="mt-1 text-sky-950" variant="stat">
            +{quest.reward.xp}
          </AppText>
        </Card>
        <Card className="flex-1 p-4" variant="warning">
          <AppText className="text-amber-700" variant="caption">
            ACHIEVEMENT
          </AppText>
          <AppText className="mt-1 text-amber-950" variant="label">
            {quest.reward.achievementUnlocks[0]?.title ?? 'Reward badge'}
          </AppText>
        </Card>
      </View>

      <Card className="gap-2">
        <AppText tone="subtle" variant="caption">
          COMPLETION
        </AppText>
        <AppText className="font-medium">{formatCompletedAt(quest.progress.completedAtMs)}</AppText>
        <AppText tone="muted">
          {quest.progress.rewardAppliedAtMs
            ? 'Rewards have been applied to your profile.'
            : 'Rewards unlock automatically after completion.'}
        </AppText>
      </Card>

      {targetLabels.length > 0 ? (
        <Card className="gap-3">
          <AppText variant="heading">Targets</AppText>
          {targetLabels.map(target => {
            const completed = quest.progress.matchedTargetIds.includes(target.id);

            return (
              <Card
                key={target.id}
                className="rounded-2xl px-4 py-3"
                variant={completed ? 'success' : 'muted'}
              >
                <AppText className={completed ? 'text-emerald-900 font-medium' : 'font-medium'}>
                  {target.label}
                </AppText>
              </Card>
            );
          })}
        </Card>
      ) : null}

      <Card className="gap-3">
        <AppText variant="heading">Visited places</AppText>
        {visitedPlaceNames.length > 0 ? (
          visitedPlaceNames.map(placeName => (
            <AppText key={placeName} className="text-foreground-muted">
              {placeName}
            </AppText>
          ))
        ) : (
          <AppText tone="muted">
            Visit places on the map and your quest progress will update here.
          </AppText>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    gap: 16,
    padding: 16,
  },
});
