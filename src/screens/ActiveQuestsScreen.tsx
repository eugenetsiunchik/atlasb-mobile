import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  getQuestObjectiveSummary,
  selectActiveQuestCards,
  selectCompletedQuestCards,
  selectQuestProgressError,
  selectQuestProgressStatus,
  selectQuestsError,
  selectQuestsStatus,
  selectQuestSummary,
  useAppSelector,
  selectIsAuthenticated,
} from '../store';

type ActiveQuestsScreenProps = {
  onOpenQuest: (questId: string) => void;
};

function QuestCard({
  onPress,
  quest,
}: {
  onPress: () => void;
  quest: ReturnType<typeof selectActiveQuestCards>[number] | ReturnType<typeof selectCompletedQuestCards>[number];
}) {
  return (
    <Pressable
      className={`gap-3 rounded-3xl border p-5 ${
        quest.isCompleted ? 'border-emerald-200 bg-emerald-50' : 'border-neutral-200 bg-white'
      }`}
      onPress={onPress}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-lg font-semibold text-neutral-950">{quest.title}</Text>
          <Text className="text-sm leading-5 text-neutral-600">{quest.description}</Text>
        </View>
        <View
          className={`rounded-full px-3 py-1 ${
            quest.isCompleted ? 'bg-emerald-100' : 'bg-amber-100'
          }`}
        >
          <Text
            className={`text-xs font-semibold uppercase tracking-wide ${
              quest.isCompleted ? 'text-emerald-800' : 'text-amber-800'
            }`}
          >
            {quest.isCompleted ? 'Completed' : 'Active'}
          </Text>
        </View>
      </View>

      <View className="gap-2 rounded-2xl bg-neutral-50 p-4">
        <Text className="text-xs uppercase tracking-wide text-neutral-500">Objective</Text>
        <Text className="text-sm font-medium text-neutral-900">
          {getQuestObjectiveSummary(quest)}
        </Text>
        <Text className="text-sm text-neutral-500">{quest.progress.progressLabel}</Text>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1 rounded-2xl bg-sky-50 p-4">
          <Text className="text-xs uppercase tracking-wide text-sky-700">Quest XP</Text>
          <Text className="mt-1 text-lg font-bold text-sky-950">+{quest.reward.xp}</Text>
        </View>
        <View className="flex-1 rounded-2xl bg-amber-50 p-4">
          <Text className="text-xs uppercase tracking-wide text-amber-700">Achievement</Text>
          <Text className="mt-1 text-sm font-semibold text-amber-950">
            {quest.reward.achievementUnlocks[0]?.title ?? 'None'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function ActiveQuestsScreen({ onOpenQuest }: ActiveQuestsScreenProps) {
  const questsStatus = useAppSelector(selectQuestsStatus);
  const questsError = useAppSelector(selectQuestsError);
  const progressStatus = useAppSelector(selectQuestProgressStatus);
  const progressError = useAppSelector(selectQuestProgressError);
  const summary = useAppSelector(selectQuestSummary);
  const activeQuests = useAppSelector(selectActiveQuestCards);
  const completedQuests = useAppSelector(selectCompletedQuestCards);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        gap: 16,
        padding: 16,
        paddingBottom: 32,
      }}
    >
      <View className="gap-1">
        <Text className="text-[22px] font-bold text-neutral-900">Quests</Text>
        <Text className="text-sm text-neutral-500">
          Explore curated routes and earn quest rewards as your visited places sync.
        </Text>
      </View>

      {!isAuthenticated ? (
        <View className="gap-2 rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 p-5">
          <Text className="text-base font-semibold text-neutral-950">Guest mode</Text>
          <Text className="text-sm leading-5 text-neutral-500">
            You can browse quests now. Sign in when you want Firestore-backed progress and rewards.
          </Text>
        </View>
      ) : null}

      <View className="flex-row gap-3">
        <View className="flex-1 rounded-3xl bg-neutral-900 p-4">
          <Text className="text-xs uppercase tracking-wide text-neutral-300">Active</Text>
          <Text className="mt-1 text-2xl font-bold text-white">{summary.activeCount}</Text>
        </View>
        <View className="flex-1 rounded-3xl bg-emerald-50 p-4">
          <Text className="text-xs uppercase tracking-wide text-emerald-700">Completed</Text>
          <Text className="mt-1 text-2xl font-bold text-emerald-950">
            {summary.completedCount}
          </Text>
        </View>
      </View>

      {summary.totalXp > 0 ? (
        <View className="rounded-3xl bg-sky-50 p-4">
          <Text className="text-xs uppercase tracking-wide text-sky-700">Quest XP earned</Text>
          <Text className="mt-1 text-xl font-bold text-sky-950">+{summary.totalXp}</Text>
        </View>
      ) : null}

      {questsStatus === 'loading' ? (
        <Text className="text-sm text-neutral-500">Loading quests...</Text>
      ) : null}

      {questsError ? (
        <Text className="text-sm text-red-600">{questsError}</Text>
      ) : null}

      {progressError && progressStatus === 'error' ? (
        <Text className="text-sm text-red-600">{progressError}</Text>
      ) : null}

      <View className="gap-3">
        {activeQuests.map(quest => (
          <QuestCard key={quest.id} onPress={() => onOpenQuest(quest.id)} quest={quest} />
        ))}
        {activeQuests.length === 0 && questsStatus === 'ready' ? (
          <View className="rounded-3xl border border-neutral-200 bg-white p-5">
            <Text className="text-base font-semibold text-neutral-950">No active quests</Text>
            <Text className="mt-1 text-sm text-neutral-500">
              New quest definitions can be added from Firestore without changing the app shell.
            </Text>
          </View>
        ) : null}
      </View>

      {completedQuests.length > 0 ? (
        <View className="gap-3">
          <Text className="text-base font-semibold text-neutral-950">Completed</Text>
          {completedQuests.map(quest => (
            <QuestCard key={quest.id} onPress={() => onOpenQuest(quest.id)} quest={quest} />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
