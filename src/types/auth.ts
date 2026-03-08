import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export type AuthActionType =
  | 'uploadPost'
  | 'suggestEdit'
  | 'persistentProfileFeature';

export type AuthView = 'prompt' | 'signIn' | 'signUp' | null;

export type AuthPromptSource = 'guard' | 'profile';

export type UserProfile = {
  uid: string;
  displayName: string;
  avatarUrl: string;
  level: number;
  xp: number;
  createdAt: FirebaseFirestoreTypes.Timestamp | null;
};

export type AuthModalState = {
  actionType: AuthActionType | null;
  source: AuthPromptSource | null;
  view: AuthView;
};

export type AuthStatus = 'guest' | 'authenticated';

export type AuthenticatedUser = FirebaseAuthTypes.User;
