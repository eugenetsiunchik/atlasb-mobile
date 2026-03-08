import React from 'react';
import { Text, View } from 'react-native';

import { AuthButton, AuthTextField } from '../../components';
import {
  selectAuthError,
  selectAuthSubmitting,
  signInWithEmailThunk,
  signInWithGoogleThunk,
  startAppleSignInPlaceholderThunk,
  useAppDispatch,
  useAppSelector,
} from '../../store';

type SignInScreenProps = {
  onClose?: () => void;
  onSwitchToSignUp?: () => void;
  variant?: 'modal' | 'screen';
};

export function SignInScreen({
  onClose,
  onSwitchToSignUp,
  variant = 'screen',
}: SignInScreenProps) {
  const dispatch = useAppDispatch();
  const authError = useAppSelector(selectAuthError);
  const isSubmitting = useAppSelector(selectAuthSubmitting);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleSignIn = React.useCallback(() => {
    dispatch(
      signInWithEmailThunk({
        email,
        password,
      }),
    );
  }, [dispatch, email, password]);

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
        <Text className="text-2xl font-bold text-neutral-950">Sign in</Text>
        <Text className="text-sm leading-5 text-neutral-500">
          Sign in only when you want to post, suggest edits, or use profile features.
        </Text>
      </View>

      {authError ? (
        <View className="rounded-2xl bg-rose-50 px-4 py-3">
          <Text className="text-sm text-rose-700">{authError}</Text>
        </View>
      ) : null}

      <View className="gap-3">
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
          placeholder="Enter your password"
          secureTextEntry
          value={password}
        />
      </View>

      <View className="gap-3">
        <AuthButton
          disabled={!email.trim() || !password}
          label="Sign in with email"
          loading={isSubmitting}
          onPress={handleSignIn}
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
          Need an account?
        </Text>
        <AuthButton
          label="Create account"
          onPress={onSwitchToSignUp ?? (() => {})}
          variant="ghost"
        />
        {onClose ? (
          <AuthButton label="Not now" onPress={onClose} variant="secondary" />
        ) : null}
      </View>
    </View>
  );
}
