import type { RootState } from '../store';

export const selectAuthState = (state: RootState) => state.auth;
export const selectAuthError = (state: RootState) => state.auth.error;
export const selectAuthInitializing = (state: RootState) =>
  state.auth.initializing;
export const selectAuthModal = (state: RootState) => state.auth.modal;
export const selectAuthProfile = (state: RootState) => state.auth.profile;
export const selectAuthStatus = (state: RootState) => state.auth.status;
export const selectAuthSubmitting = (state: RootState) =>
  state.auth.submitting;
export const selectCurrentUser = (state: RootState) => state.auth.currentUser;
export const selectIsAuthenticated = (state: RootState) =>
  state.auth.status === 'authenticated';
