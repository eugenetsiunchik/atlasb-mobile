import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { AuthButton, ProfileAchievementsSection } from '../components';
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
          <Text className="text-[22px] font-bold text-neutral-900">Profile</Text>
          <Text className="text-sm text-neutral-500">
            Browse as a guest by default. Sign in only when you want persistent features.
          </Text>
        </View>

        <View className="gap-4 rounded-3xl border border-neutral-200 bg-white p-5">
          <View className="gap-1">
            <Text className="text-lg font-semibold text-neutral-950">
              Continue as guest
            </Text>
            <Text className="text-sm leading-5 text-neutral-500">
              Maps and browsing stay open to everyone. Posting, edit suggestions, and saved
              progress require an account.
            </Text>
          </View>

          <View className="gap-3">
            <AuthButton label="Sign in" onPress={handleOpenSignIn} />
            <AuthButton
              label="Create account"
              onPress={handleOpenSignUp}
              variant="secondary"
            />
          </View>
        </View>

        <View className="gap-3 rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 p-5">
          <Text className="text-base font-semibold text-neutral-950">
            Persistent profile features
          </Text>
          <Text className="text-sm leading-5 text-neutral-500">
            Save your identity, level, and progress only when you decide to authenticate.
          </Text>
          <AuthButton
            label="Unlock profile features"
            onPress={handleProtectedProfileFeature}
            variant="ghost"
          />
        </View>

        {authInitializing ? (
          <Text className="text-xs text-neutral-400">Checking your saved auth state...</Text>
        ) : null}
      </View>
    );
  }

  const createdAt = profile?.createdAt?.toDate?.() ?? null;
  const profileInitial = profile?.displayName?.charAt(0)?.toUpperCase() || 'A';

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
        <Text className="text-[22px] font-bold text-neutral-900">Profile</Text>
        <Text className="text-sm text-neutral-500">
          Your account is active, but the rest of the app still stays guest-friendly.
        </Text>
      </View>

      <View className="gap-4 rounded-3xl border border-neutral-200 bg-white p-5">
        <View className="flex-row items-center gap-4">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-sky-100">
            <Text className="text-xl font-bold text-sky-800">{profileInitial}</Text>
          </View>
          <View className="flex-1 gap-1">
            <Text className="text-lg font-semibold text-neutral-950">
              {profile?.displayName || currentUser?.displayName || 'Atlasb user'}
            </Text>
            <Text className="text-sm text-neutral-500">
              {currentUser?.email || 'Signed in'}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-neutral-100 p-4">
            <Text className="text-xs uppercase tracking-wide text-neutral-500">Level</Text>
            <Text className="mt-1 text-xl font-bold text-neutral-950">
              {profile?.level ?? 1}
            </Text>
          </View>
          <View className="flex-1 rounded-2xl bg-neutral-100 p-4">
            <Text className="text-xs uppercase tracking-wide text-neutral-500">XP</Text>
            <Text className="mt-1 text-xl font-bold text-neutral-950">
              {profile?.xp ?? 0}
            </Text>
          </View>
        </View>

        <View className="gap-1 rounded-2xl bg-neutral-50 p-4">
          <Text className="text-xs uppercase tracking-wide text-neutral-500">Member since</Text>
          <Text className="text-sm font-medium text-neutral-900">
            {formatCreatedAt(createdAt)}
          </Text>
        </View>

        <AuthButton label="Sign out" onPress={handleSignOut} variant="danger" />
      </View>

      <ProfileAchievementsSection />
    </ScrollView>
  );
}
