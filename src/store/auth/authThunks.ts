import { createAsyncThunk } from '@reduxjs/toolkit';

import {
  signInWithEmail,
  signInWithGoogle,
  signOut,
  signUpWithEmail,
  startAppleSignInPlaceholder,
} from '../../services/auth';

type SignInWithEmailPayload = {
  email: string;
  password: string;
};

type SignUpWithEmailPayload = SignInWithEmailPayload & {
  displayName: string;
};

export const signInWithEmailThunk = createAsyncThunk(
  'auth/signInWithEmail',
  async (payload: SignInWithEmailPayload) => {
    const user = await signInWithEmail(payload);

    return { uid: user.uid };
  },
);

export const signUpWithEmailThunk = createAsyncThunk(
  'auth/signUpWithEmail',
  async (payload: SignUpWithEmailPayload) => {
    const user = await signUpWithEmail(payload);

    return { uid: user.uid };
  },
);

export const signInWithGoogleThunk = createAsyncThunk(
  'auth/signInWithGoogle',
  async () => {
    const user = await signInWithGoogle();

    return { uid: user.uid };
  },
);

export const signOutThunk = createAsyncThunk('auth/signOut', async () => {
  await signOut();
});

export const startAppleSignInPlaceholderThunk = createAsyncThunk(
  'auth/startAppleSignInPlaceholder',
  async () => {
    await startAppleSignInPlaceholder();
  },
);
