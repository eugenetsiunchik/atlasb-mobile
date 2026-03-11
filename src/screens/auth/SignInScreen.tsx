import React from 'react';
import { View } from 'react-native';

import { AppText, AuthButton, AuthTextField, Card } from '../../components';
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
    <Card className={variant === 'screen' ? 'gap-4 shadow-sm' : 'gap-4'}>
      <View className="gap-1">
        <AppText className="text-2xl" variant="display">
          Sign in
        </AppText>
        <AppText tone="muted">
          Sign in only when you want to post, suggest edits, or use profile features.
        </AppText>
      </View>

      {authError ? (
        <Card className="rounded-2xl px-4 py-3" variant="muted">
          <AppText className="text-rose-700">{authError}</AppText>
        </Card>
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
        <AppText className="text-center" tone="muted">
          Need an account?
        </AppText>
        <AuthButton
          label="Create account"
          onPress={onSwitchToSignUp ?? (() => {})}
          variant="ghost"
        />
        {onClose ? (
          <AuthButton label="Not now" onPress={onClose} variant="secondary" />
        ) : null}
      </View>
    </Card>
  );
}
