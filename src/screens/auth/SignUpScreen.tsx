import React from 'react';
import { View } from 'react-native';

import { AppText, AuthButton, AuthTextField, Card } from '../../components';
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
    <Card className={variant === 'screen' ? 'gap-4 shadow-sm' : 'gap-4'}>
      <View className="gap-1">
        <AppText className="text-2xl" variant="display">
          Create account
        </AppText>
        <AppText tone="muted">
          Create an account when you want progress, posting, and edit suggestions to persist.
        </AppText>
      </View>

      {authError ? (
        <Card className="rounded-2xl px-4 py-3" variant="muted">
          <AppText className="text-rose-700">{authError}</AppText>
        </Card>
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
        <AppText className="text-center" tone="muted">
          Already have an account?
        </AppText>
        <AuthButton
          label="Go to sign in"
          onPress={onSwitchToSignIn ?? (() => {})}
          variant="ghost"
        />
        {onClose ? (
          <AuthButton label="Not now" onPress={onClose} variant="secondary" />
        ) : null}
      </View>
    </Card>
  );
}
