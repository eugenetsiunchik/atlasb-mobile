import { authActions, store } from '../../store';
import type { AuthActionType } from '../../types';

export function requireAuthForAction(actionType: AuthActionType) {
  if (store.getState().auth.status === 'authenticated') {
    return true;
  }

  store.dispatch(
    authActions.authPromptOpened({
      actionType,
      source: 'guard',
    }),
  );

  return false;
}
