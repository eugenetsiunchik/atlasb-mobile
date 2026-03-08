import {
  collection,
  doc,
  getDoc,
  setDoc,
  Timestamp,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

import { getFirebaseFirestore } from '../../firebase';
import type { UserProfile } from '../../types';

type FirestoreUserProfile = {
  avatarUrl: string;
  createdAt: FirebaseFirestoreTypes.Timestamp | null;
  displayName: string;
  level: number;
  xp: number;
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
  const profileDocument = getProfileDocument(user.uid);
  const profileSnapshot = await getDoc(profileDocument);

  if (!profileSnapshot.exists) {
    const profile: FirestoreUserProfile = {
      avatarUrl: user.photoURL || '',
      createdAt: Timestamp.now(),
      displayName: getFallbackDisplayName(user),
      level: 1,
      xp: 0,
    };

    await setDoc(profileDocument, profile);

    return normalizeProfile(user.uid, profile, user);
  }

  const normalizedProfile = normalizeProfile(
    user.uid,
    profileSnapshot.data() as Partial<FirestoreUserProfile> | undefined,
    user,
  );

  await setDoc(
    profileDocument,
    {
      avatarUrl: normalizedProfile.avatarUrl,
      createdAt: normalizedProfile.createdAt,
      displayName: normalizedProfile.displayName,
      level: normalizedProfile.level,
      xp: normalizedProfile.xp,
    },
    { merge: true },
  );

  return normalizedProfile;
}
