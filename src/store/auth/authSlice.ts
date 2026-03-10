import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type {
  AuthActionType,
  AuthModalState,
  AuthPromptSource,
  AuthStatus,
  AuthenticatedUser,
  UserProfile,
} from '../../types';
import {
  signInWithEmailThunk,
  signInWithGoogleThunk,
  signOutThunk,
  signUpWithEmailThunk,
  startAppleSignInPlaceholderThunk,
} from './authThunks';

type AuthState = {
  currentUser: AuthenticatedUser | null;
  error: string | null;
  initializing: boolean;
  modal: AuthModalState;
  profile: UserProfile | null;
  status: AuthStatus;
  submitting: boolean;
};

const initialState: AuthState = {
  currentUser: null,
  error: null,
  initializing: true,
  modal: {
    actionType: null,
    source: null,
    view: null,
  },
  profile: null,
  status: 'guest',
  submitting: false,
};

function setAuthenticatedState(
  state: AuthState,
  user: AuthenticatedUser | null,
  profile: UserProfile | null,
) {
  state.currentUser = user;
  state.profile = profile;
  state.status = user ? 'authenticated' : 'guest';
}

function resetModalState(state: AuthState) {
  state.modal = {
    actionType: null,
    source: null,
    view: null,
  };
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authBootstrapStarted(state) {
      state.initializing = true;
      state.error = null;
    },
    authBootstrapFinished(state) {
      state.initializing = false;
    },
    authSessionChanged(
      state,
      action: PayloadAction<{
        profile: UserProfile | null;
        user: AuthenticatedUser | null;
      }>,
    ) {
      setAuthenticatedState(state, action.payload.user, action.payload.profile);
      state.error = null;
      state.initializing = false;
    },
    authSessionCleared(state) {
      setAuthenticatedState(state, null, null);
      state.error = null;
      state.initializing = false;
      state.submitting = false;
    },
    authErrorSet(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    authViewSet(state, action: PayloadAction<AuthModalState['view']>) {
      state.modal.view = action.payload;
      state.error = null;
    },
    authPromptOpened(
      state,
      action: PayloadAction<{
        actionType: AuthActionType | null;
        source: AuthPromptSource;
        view?: AuthModalState['view'];
      }>,
    ) {
      state.modal = {
        actionType: action.payload.actionType,
        source: action.payload.source,
        view: action.payload.view ?? 'prompt',
      };
      state.error = null;
    },
    authFlowClosed(state) {
      resetModalState(state);
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(signInWithEmailThunk.pending, state => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(signInWithEmailThunk.fulfilled, state => {
        state.submitting = false;
        state.error = null;
        resetModalState(state);
      })
      .addCase(signInWithEmailThunk.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.error.message ?? 'Unable to sign in.';
      })
      .addCase(signUpWithEmailThunk.pending, state => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(signUpWithEmailThunk.fulfilled, state => {
        state.submitting = false;
        state.error = null;
        resetModalState(state);
      })
      .addCase(signUpWithEmailThunk.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.error.message ?? 'Unable to create your account.';
      })
      .addCase(signInWithGoogleThunk.pending, state => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(signInWithGoogleThunk.fulfilled, state => {
        state.submitting = false;
        state.error = null;
        resetModalState(state);
      })
      .addCase(signInWithGoogleThunk.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.error.message ?? 'Unable to continue with Google.';
      })
      .addCase(startAppleSignInPlaceholderThunk.pending, state => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(startAppleSignInPlaceholderThunk.fulfilled, state => {
        state.submitting = false;
      })
      .addCase(startAppleSignInPlaceholderThunk.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.error.message ?? 'Apple Sign-In is not available yet.';
      })
      .addCase(signOutThunk.pending, state => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(signOutThunk.fulfilled, state => {
        state.submitting = false;
        state.error = null;
        resetModalState(state);
      })
      .addCase(signOutThunk.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.error.message ?? 'Unable to sign out.';
      });
  },
});

export const authActions = authSlice.actions;
export const authReducer = authSlice.reducer;
