import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText, AuthButton, Badge, Card, ProfileAchievementsSection } from '../components';
import { requireAuthForAction } from '../services/auth';
import {
  authActions,
  selectAuthInitializing,
  selectAuthProfile,
  selectCurrentUser,
  selectIsAuthenticated,
  signOutThunk,
  useAppDispatch,
  useAppSelector,
} from '../store';

function formatCreatedAt(value: Date | null) {
  if (!value) {
    return 'Just joined';
  }

  return value.toLocaleDateString();
}

export function ProfileScreen() {
  const dispatch = useAppDispatch();
  const authInitializing = useAppSelector(selectAuthInitializing);
  const currentUser = useAppSelector(selectCurrentUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const profile = useAppSelector(selectAuthProfile);

  const handleOpenSignIn = React.useCallback(() => {
    dispatch(
      authActions.authPromptOpened({
        actionType: null,
        source: 'profile',
        view: 'signIn',
      }),
    );
  }, [dispatch]);

  const handleOpenSignUp = React.useCallback(() => {
    dispatch(
      authActions.authPromptOpened({
        actionType: null,
        source: 'profile',
        view: 'signUp',
      }),
    );
  }, [dispatch]);

  const handleProtectedProfileFeature = React.useCallback(() => {
    requireAuthForAction('persistentProfileFeature');
  }, []);

  const handleSignOut = React.useCallback(() => {
    dispatch(signOutThunk());
  }, [dispatch]);

  if (!isAuthenticated) {
    return (
      <View className="flex-1 gap-4 p-4">
        <View className="gap-1">
          <AppText variant="sectionTitle">Profile</AppText>
          <AppText tone="muted">
            Browse as a guest by default. Sign in only when you want persistent features.
          </AppText>
        </View>

        <Card className="gap-4">
          <View className="gap-1">
            <AppText variant="heading">Continue as guest</AppText>
            <AppText tone="muted">
              Maps and browsing stay open to everyone. Posting, edit suggestions, and saved
              progress require an account.
            </AppText>
          </View>

          <View className="gap-3">
            <AuthButton label="Sign in" onPress={handleOpenSignIn} />
            <AuthButton
              label="Create account"
              onPress={handleOpenSignUp}
              variant="secondary"
            />
          </View>
        </Card>

        <Card className="gap-3" variant="dashed">
          <Badge label="Optional" variant="muted" />
          <AppText variant="heading">Persistent profile features</AppText>
          <AppText tone="muted">
            Save your identity, level, and progress only when you decide to authenticate.
          </AppText>
          <AuthButton
            label="Unlock profile features"
            onPress={handleProtectedProfileFeature}
            variant="ghost"
          />
        </Card>

        {authInitializing ? (
          <AppText className="text-slate-400" variant="caption">
            Checking your saved auth state...
          </AppText>
        ) : null}
      </View>
    );
  }

  const createdAt = profile?.createdAt?.toDate?.() ?? null;
  const profileInitial = profile?.displayName?.charAt(0)?.toUpperCase() || 'A';

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={styles.contentContainer}
    >
      <View className="gap-1">
        <AppText variant="sectionTitle">Profile</AppText>
        <AppText tone="muted">
          Your account is active, but the rest of the app still stays guest-friendly.
        </AppText>
      </View>

      <Card className="gap-4">
        <View className="flex-row items-center gap-4">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-accent/30">
            <AppText className="text-accent-strong" variant="stat">
              {profileInitial}
            </AppText>
          </View>
          <View className="flex-1 gap-1">
            <AppText variant="heading">
              {profile?.displayName || currentUser?.displayName || 'Atlasb user'}
            </AppText>
            <AppText tone="muted">
              {currentUser?.email || 'Signed in'}
            </AppText>
          </View>
        </View>

        <View className="flex-row gap-3">
          <Card className="flex-1 rounded-2xl p-4" variant="muted">
            <AppText tone="subtle" variant="caption">
              LEVEL
            </AppText>
            <AppText className="mt-1" variant="stat">
              {profile?.level ?? 1}
            </AppText>
          </Card>
          <Card className="flex-1 rounded-2xl p-4" variant="muted">
            <AppText tone="subtle" variant="caption">
              XP
            </AppText>
            <AppText className="mt-1" variant="stat">
              {profile?.xp ?? 0}
            </AppText>
          </Card>
        </View>

        <Card className="gap-1 rounded-2xl p-4" variant="muted">
          <AppText tone="subtle" variant="caption">
            MEMBER SINCE
          </AppText>
          <AppText className="font-medium">{formatCreatedAt(createdAt)}</AppText>
        </Card>

        <AuthButton label="Sign out" onPress={handleSignOut} variant="danger" />
      </Card>

      <ProfileAchievementsSection />
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
