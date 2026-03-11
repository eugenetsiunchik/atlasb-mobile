import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Badge, Card } from '../components';
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
    <Pressable onPress={onPress}>
      <Card className="gap-3" variant={quest.isCompleted ? 'success' : 'default'}>
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <AppText variant="heading">{quest.title}</AppText>
            <AppText tone="muted">{quest.description}</AppText>
          </View>
          <Badge
            label={quest.isCompleted ? 'Completed' : 'Active'}
            variant={quest.isCompleted ? 'completed' : 'active'}
          />
        </View>

        <Card className="gap-2 rounded-2xl p-4" variant="muted">
          <AppText tone="subtle" variant="caption">
            OBJECTIVE
          </AppText>
          <AppText className="font-medium">{getQuestObjectiveSummary(quest)}</AppText>
          <AppText tone="muted">{quest.progress.progressLabel}</AppText>
        </Card>

        <View className="flex-row gap-3">
          <Card className="flex-1 rounded-2xl p-4" variant="info">
            <AppText className="text-sky-700" variant="caption">
              QUEST XP
            </AppText>
            <AppText className="mt-1 text-sky-950" variant="heading">
              +{quest.reward.xp}
            </AppText>
          </Card>
          <Card className="flex-1 rounded-2xl p-4" variant="warning">
            <AppText className="text-amber-700" variant="caption">
              ACHIEVEMENT
            </AppText>
            <AppText className="mt-1 text-amber-950" variant="label">
              {quest.reward.achievementUnlocks[0]?.title ?? 'None'}
            </AppText>
          </Card>
        </View>
      </Card>
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
      contentContainerStyle={styles.contentContainer}
    >
      <View className="gap-1">
        <AppText variant="sectionTitle">Quests</AppText>
        <AppText tone="muted">
          Explore curated routes and earn quest rewards as your visited places sync.
        </AppText>
      </View>

      {!isAuthenticated ? (
        <Card className="gap-2" variant="dashed">
          <AppText variant="heading">Guest mode</AppText>
          <AppText tone="muted">
            You can browse quests now. Sign in when you want Firestore-backed progress and rewards.
          </AppText>
        </Card>
      ) : null}

      <View className="flex-row gap-3">
        <Card className="flex-1 p-4" variant="inverse">
          <AppText className="text-slate-300" variant="caption">
            ACTIVE
          </AppText>
          <AppText className="mt-1 text-white text-2xl" variant="display">
            {summary.activeCount}
          </AppText>
        </Card>
        <Card className="flex-1 p-4" variant="success">
          <AppText className="text-emerald-700" variant="caption">
            COMPLETED
          </AppText>
          <AppText className="mt-1 text-emerald-950 text-2xl" variant="display">
            {summary.completedCount}
          </AppText>
        </Card>
      </View>

      {summary.totalXp > 0 ? (
        <Card className="p-4" variant="info">
          <AppText className="text-sky-700" variant="caption">
            QUEST XP EARNED
          </AppText>
          <AppText className="mt-1 text-sky-950" variant="stat">
            +{summary.totalXp}
          </AppText>
        </Card>
      ) : null}

      {questsStatus === 'loading' ? (
        <AppText tone="muted">Loading quests...</AppText>
      ) : null}

      {questsError ? (
        <AppText className="text-red-600">{questsError}</AppText>
      ) : null}

      {progressError && progressStatus === 'error' ? (
        <AppText className="text-red-600">{progressError}</AppText>
      ) : null}

      <View className="gap-3">
        {activeQuests.map(quest => (
          <QuestCard key={quest.id} onPress={() => onOpenQuest(quest.id)} quest={quest} />
        ))}
        {activeQuests.length === 0 && questsStatus === 'ready' ? (
          <Card>
            <AppText variant="heading">No active quests</AppText>
            <AppText className="mt-1" tone="muted">
              New quest definitions can be added from Firestore without changing the app shell.
            </AppText>
          </Card>
        ) : null}
      </View>

      {completedQuests.length > 0 ? (
        <View className="gap-3">
          <AppText variant="heading">Completed</AppText>
          {completedQuests.map(quest => (
            <QuestCard key={quest.id} onPress={() => onOpenQuest(quest.id)} quest={quest} />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    gap: 16,
    padding: 16,
    paddingBottom: 32,
  },
});
