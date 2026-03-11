import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  getQuestObjectiveSummary,
  getQuestTargetLabels,
  selectAllMapPlaces,
  selectQuestCardById,
  useAppSelector,
} from '../store';

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
          <Text className="text-sm font-semibold text-sky-700">Back to quests</Text>
        </Pressable>
        <Text className="text-base text-neutral-500">This quest is no longer available.</Text>
      </View>
    );
  }

  const targetLabels = getQuestTargetLabels(quest);

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        gap: 16,
        padding: 16,
        paddingBottom: 32,
      }}
    >
      <Pressable onPress={onBack}>
        <Text className="text-sm font-semibold text-sky-700">Back to quests</Text>
      </Pressable>

      <View className="gap-2">
        <View
          className={`self-start rounded-full px-3 py-1 ${
            quest.isCompleted ? 'bg-emerald-100' : 'bg-amber-100'
          }`}
        >
          <Text
            className={`text-xs font-semibold uppercase tracking-wide ${
              quest.isCompleted ? 'text-emerald-800' : 'text-amber-800'
            }`}
          >
            {quest.isCompleted ? 'Completed' : 'Active quest'}
          </Text>
        </View>
        <Text className="text-[24px] font-bold text-neutral-950">{quest.title}</Text>
        <Text className="text-sm leading-6 text-neutral-600">{quest.description}</Text>
      </View>

      <View className="gap-3 rounded-3xl border border-neutral-200 bg-white p-5">
        <Text className="text-xs uppercase tracking-wide text-neutral-500">Objective</Text>
        <Text className="text-base font-semibold text-neutral-950">
          {getQuestObjectiveSummary(quest)}
        </Text>
        <Text className="text-sm text-neutral-500">{quest.progress.progressLabel}</Text>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1 rounded-3xl bg-sky-50 p-4">
          <Text className="text-xs uppercase tracking-wide text-sky-700">Reward XP</Text>
          <Text className="mt-1 text-xl font-bold text-sky-950">+{quest.reward.xp}</Text>
        </View>
        <View className="flex-1 rounded-3xl bg-amber-50 p-4">
          <Text className="text-xs uppercase tracking-wide text-amber-700">Achievement</Text>
          <Text className="mt-1 text-sm font-semibold text-amber-950">
            {quest.reward.achievementUnlocks[0]?.title ?? 'Reward badge'}
          </Text>
        </View>
      </View>

      <View className="gap-2 rounded-3xl border border-neutral-200 bg-white p-5">
        <Text className="text-xs uppercase tracking-wide text-neutral-500">Completion</Text>
        <Text className="text-sm font-medium text-neutral-900">
          {formatCompletedAt(quest.progress.completedAtMs)}
        </Text>
        <Text className="text-sm text-neutral-500">
          {quest.progress.rewardAppliedAtMs
            ? 'Rewards have been applied to your profile.'
            : 'Rewards unlock automatically after completion.'}
        </Text>
      </View>

      {targetLabels.length > 0 ? (
        <View className="gap-3 rounded-3xl border border-neutral-200 bg-white p-5">
          <Text className="text-base font-semibold text-neutral-950">Targets</Text>
          {targetLabels.map(target => {
            const completed = quest.progress.matchedTargetIds.includes(target.id);

            return (
              <View
                key={target.id}
                className={`rounded-2xl border px-4 py-3 ${
                  completed ? 'border-emerald-200 bg-emerald-50' : 'border-neutral-200 bg-neutral-50'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    completed ? 'text-emerald-900' : 'text-neutral-900'
                  }`}
                >
                  {target.label}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      <View className="gap-3 rounded-3xl border border-neutral-200 bg-white p-5">
        <Text className="text-base font-semibold text-neutral-950">Visited places</Text>
        {visitedPlaceNames.length > 0 ? (
          visitedPlaceNames.map(placeName => (
            <Text key={placeName} className="text-sm text-neutral-600">
              {placeName}
            </Text>
          ))
        ) : (
          <Text className="text-sm text-neutral-500">
            Visit places on the map and your quest progress will update here.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
