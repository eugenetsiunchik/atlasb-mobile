import React from 'react';
import { Text, View } from 'react-native';

import { AuthButton } from '../../components/auth/AuthButton';
import { AuthTextField } from '../../components/auth/AuthTextField';
import {
  selectAuthError,
  selectAuthSubmitting,
  signInWithGoogleThunk,
  signUpWithEmailThunk,
  startAppleSignInPlaceholderThunk,
  useAppDispatch,
  useAppSelector,
} from '../../store';

type SignUpScreenProps = {
  onClose?: () => void;
  onSwitchToSignIn?: () => void;
  variant?: 'modal' | 'screen';
};

export function SignUpScreen({
  onClose,
  onSwitchToSignIn,
  variant = 'screen',
}: SignUpScreenProps) {
  const dispatch = useAppDispatch();
  const authError = useAppSelector(selectAuthError);
  const isSubmitting = useAppSelector(selectAuthSubmitting);
  const [displayName, setDisplayName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleSignUp = React.useCallback(() => {
    dispatch(
      signUpWithEmailThunk({
        displayName,
        email,
        password,
      }),
    );
  }, [dispatch, displayName, email, password]);

  const handleGoogleSignIn = React.useCallback(() => {
    dispatch(signInWithGoogleThunk());
  }, [dispatch]);

  const handleApplePlaceholder = React.useCallback(() => {
    dispatch(startAppleSignInPlaceholderThunk());
  }, [dispatch]);

  return (
    <View
      className={`gap-4 rounded-3xl border border-neutral-200 bg-white p-6 ${
        variant === 'screen' ? 'shadow-sm' : ''
      }`}
    >
      <View className="gap-1">
        <Text className="text-2xl font-bold text-neutral-950">Create account</Text>
        <Text className="text-sm leading-5 text-neutral-500">
          Create an account when you want progress, posting, and edit suggestions to persist.
        </Text>
      </View>

      {authError ? (
        <View className="rounded-2xl bg-rose-50 px-4 py-3">
          <Text className="text-sm text-rose-700">{authError}</Text>
        </View>
      ) : null}

      <View className="gap-3">
        <AuthTextField
          label="Display name"
          onChangeText={setDisplayName}
          placeholder="Atlasb explorer"
          value={displayName}
        />
        <AuthTextField
          keyboardType="email-address"
          label="Email"
          onChangeText={setEmail}
          placeholder="you@example.com"
          value={email}
        />
        <AuthTextField
          label="Password"
          onChangeText={setPassword}
          placeholder="Create a password"
          secureTextEntry
          value={password}
        />
      </View>

      <View className="gap-3">
        <AuthButton
          disabled={!email.trim() || !password || !displayName.trim()}
          label="Create account"
          loading={isSubmitting}
          onPress={handleSignUp}
        />
        <AuthButton
          label="Continue with Google"
          onPress={handleGoogleSignIn}
          variant="secondary"
        />
        <AuthButton
          label="Continue with Apple"
          onPress={handleApplePlaceholder}
          variant="ghost"
        />
      </View>

      <View className="gap-2">
        <Text className="text-center text-sm text-neutral-500">
          Already have an account?
        </Text>
        <AuthButton
          label="Go to sign in"
          onPress={onSwitchToSignIn ?? (() => {})}
          variant="ghost"
        />
        {onClose ? (
          <AuthButton label="Not now" onPress={onClose} variant="secondary" />
        ) : null}
      </View>
    </View>
  );
}
