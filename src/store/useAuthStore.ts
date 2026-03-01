import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { create } from 'zustand';

import { firebaseAuth } from '../firebase';

type AuthState = {
  initializing: boolean;
  user: FirebaseAuthTypes.User | null;
  setUser: (user: FirebaseAuthTypes.User | null) => void;
  setInitializing: (initializing: boolean) => void;
};

export const useAuthStore = create<AuthState>(set => ({
  initializing: true,
  user: null,
  setUser: user => set({ user }),
  setInitializing: initializing => set({ initializing }),
}));

export function startAuthListener() {
  return firebaseAuth.onAuthStateChanged(user => {
    useAuthStore.setState({ user, initializing: false });
  });
}

