import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import type { AuthActionType } from '../../types';
import { SignInScreen, SignUpScreen } from '../../screens';
import {
  authActions,
  selectAuthModal,
  signInWithGoogleThunk,
  startAppleSignInPlaceholderThunk,
  useAppDispatch,
  useAppSelector,
} from '../../store';
import { AuthButton } from './AuthButton';

const actionCopy: Record<AuthActionType, string> = {
  persistentProfileFeature:
    'Sign in to unlock saved profile progress and other persistent features.',
  suggestEdit: 'Sign in to suggest an edit so we can attribute and track your changes.',
  uploadPost: 'Sign in to upload or post content tied to your account.',
  userPlaceState:
    'Sign in to save places and keep your discovered, visited, and collected progress in sync.',
};

export function AuthPromptModal() {
  const dispatch = useAppDispatch();
  const modal = useAppSelector(selectAuthModal);

  const handleClose = React.useCallback(() => {
    dispatch(authActions.authFlowClosed());
  }, [dispatch]);

  const handleOpenSignIn = React.useCallback(() => {
    dispatch(authActions.authViewSet('signIn'));
  }, [dispatch]);

  const handleOpenSignUp = React.useCallback(() => {
    dispatch(authActions.authViewSet('signUp'));
  }, [dispatch]);

  const handleGoogleSignIn = React.useCallback(() => {
    dispatch(signInWithGoogleThunk());
  }, [dispatch]);

  const handleApplePlaceholder = React.useCallback(() => {
    dispatch(startAppleSignInPlaceholderThunk());
  }, [dispatch]);

  const actionMessage = modal.actionType ? actionCopy[modal.actionType] : actionCopy.persistentProfileFeature;

  return (
    <Modal
      animationType="fade"
      onRequestClose={handleClose}
      transparent
      visible={modal.view !== null}
    >
      <Pressable
        className="flex-1 items-center justify-center bg-black/45 px-5"
        onPress={handleClose}
      >
        <Pressable
          className="w-full max-w-[420px]"
          onPress={event => event.stopPropagation()}
        >
          {modal.view === 'signIn' ? (
            <SignInScreen
              onClose={handleClose}
              onSwitchToSignUp={handleOpenSignUp}
              variant="modal"
            />
          ) : null}

          {modal.view === 'signUp' ? (
            <SignUpScreen
              onClose={handleClose}
              onSwitchToSignIn={handleOpenSignIn}
              variant="modal"
            />
          ) : null}

          {modal.view === 'prompt' ? (
            <View className="gap-4 rounded-3xl bg-white p-6">
              <View className="gap-1">
                <Text className="text-2xl font-bold text-neutral-950">
                  Sign in when you need it
                </Text>
                <Text className="text-sm leading-5 text-neutral-500">
                  {actionMessage}
                </Text>
              </View>

              <View className="gap-3">
                <AuthButton label="Sign in" onPress={handleOpenSignIn} />
                <AuthButton
                  label="Create account"
                  onPress={handleOpenSignUp}
                  variant="secondary"
                />
                <AuthButton
                  label="Continue with Google"
                  onPress={handleGoogleSignIn}
                  variant="ghost"
                />
                <AuthButton
                  label="Continue with Apple"
                  onPress={handleApplePlaceholder}
                  variant="ghost"
                />
              </View>

              <AuthButton
                label="Keep browsing as guest"
                onPress={handleClose}
                variant="secondary"
              />
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
