import { getApp, getApps, type FirebaseApp } from '@react-native-firebase/app';
import { getAuth, type FirebaseAuthTypes } from '@react-native-firebase/auth';
import {
  getFirestore,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import '@react-native-firebase/functions';
import type { FirebaseFunctionsTypes } from '@react-native-firebase/functions';
import { getMessaging, type Messaging } from '@react-native-firebase/messaging';
import { getStorage, type FirebaseStorageTypes } from '@react-native-firebase/storage';

const FIREBASE_CONFIGURATION_ERROR =
  'Firebase is not configured. Add iOS `GoogleService-Info.plist` and Android `android/app/google-services.json`, then rebuild the app.';
const DEFAULT_FIREBASE_FUNCTIONS_REGION = 'europe-central2';

function getDefaultFirebaseApp() {
  // With React Native Firebase, the default app is configured natively via:
  // - iOS: `ios/GoogleService-Info.plist`
  // - Android: `android/app/google-services.json`
  //
  // If those files are missing, accessing the default app will throw at runtime.
  try {
    return getApp();
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `${FIREBASE_CONFIGURATION_ERROR} Native error: ${error.message}`
        : FIREBASE_CONFIGURATION_ERROR,
    );
  }
}

export function getFirebaseConfigurationErrorMessage() {
  return FIREBASE_CONFIGURATION_ERROR;
}

export function isFirebaseConfigured() {
  return getApps().length > 0;
}

export function getFirebaseApp(): FirebaseApp {
  return getDefaultFirebaseApp();
}

export function getFirebaseAuth(): FirebaseAuthTypes.Module {
  return getAuth(getDefaultFirebaseApp());
}

export function getFirebaseFirestore(): FirebaseFirestoreTypes.Module {
  return getFirestore(getDefaultFirebaseApp());
}

export function getFirebaseFunctions(
  region = DEFAULT_FIREBASE_FUNCTIONS_REGION,
): FirebaseFunctionsTypes.Module {
  return getDefaultFirebaseApp().functions(region);
}

export function getFirebaseStorage(): FirebaseStorageTypes.Module {
  return getStorage(getDefaultFirebaseApp());
}

export function getFirebaseMessaging(): Messaging {
  return getMessaging(getDefaultFirebaseApp());
}

