import {
  collection,
  doc,
  getDoc,
  setDoc,
  Timestamp,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

import { getFirebaseFirestore, logFirebaseError } from '../../firebase';
import type { UserProfile } from '../../types';

type FirestoreUserProfile = {
  avatarUrl?: string;
  createdAt?: FirebaseFirestoreTypes.Timestamp | null;
  displayName?: string;
  level?: number;
  userId?: string;
  xp?: number;
};

function getFallbackDisplayName(user: FirebaseAuthTypes.User) {
  if (user.displayName?.trim()) {
    return user.displayName.trim();
  }

  if (user.email) {
    const [name] = user.email.split('@');
    if (name) {
      return name;
    }
  }

  return 'Atlasb user';
}

function normalizeProfile(
  uid: string,
  data: Partial<FirestoreUserProfile> | undefined,
  fallbackUser: FirebaseAuthTypes.User,
): UserProfile {
  return {
    uid,
    displayName: data?.displayName?.trim() || getFallbackDisplayName(fallbackUser),
    avatarUrl: data?.avatarUrl?.trim() || fallbackUser.photoURL || '',
    level: typeof data?.level === 'number' ? data.level : 1,
    xp: typeof data?.xp === 'number' ? data.xp : 0,
    createdAt: data?.createdAt ?? Timestamp.now(),
  };
}

function getProfileDocument(uid: string) {
  return doc(collection(getFirebaseFirestore(), 'users'), uid);
}

export async function ensureUserProfile(user: FirebaseAuthTypes.User) {
  const profilePath = `users/${user.uid}`;
  const profileDocument = getProfileDocument(user.uid);
  let profileSnapshot: FirebaseFirestoreTypes.DocumentSnapshot<FirebaseFirestoreTypes.DocumentData>;

  try {
    profileSnapshot = await getDoc(profileDocument);
  } catch (error) {
    logFirebaseError(
      'Firestore get user profile failed',
      {
        operation: 'getDoc',
        path: profilePath,
        uid: user.uid,
      },
      error,
    );
    throw error;
  }

  if (!profileSnapshot.exists) {
    const profile: FirestoreUserProfile = {
      userId: user.uid,
      displayName: getFallbackDisplayName(user),
    };

    try {
      await setDoc(profileDocument, profile);
    } catch (error) {
      logFirebaseError(
        'Firestore create user profile failed',
        {
          operation: 'setDoc',
          path: profilePath,
          payload: profile,
          uid: user.uid,
        },
        error,
      );
      throw error;
    }

    return normalizeProfile(user.uid, profile, user);
  }

  const normalizedProfile = normalizeProfile(
    user.uid,
    profileSnapshot.data() as Partial<FirestoreUserProfile> | undefined,
    user,
  );

  return normalizedProfile;
}
