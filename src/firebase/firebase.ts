import firebase from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';
import storage from '@react-native-firebase/storage';

const FIREBASE_CONFIGURATION_ERROR =
  'Firebase is not configured. Add iOS `GoogleService-Info.plist` and Android `android/app/google-services.json`, then rebuild the app.';

function getDefaultFirebaseApp() {
  // With React Native Firebase, the default app is configured natively via:
  // - iOS: `ios/GoogleService-Info.plist`
  // - Android: `android/app/google-services.json`
  //
  // If those files are missing, accessing the default app will throw at runtime.
  try {
    return firebase.app();
  } catch {
    throw new Error(FIREBASE_CONFIGURATION_ERROR);
  }
}

export function getFirebaseConfigurationErrorMessage() {
  return FIREBASE_CONFIGURATION_ERROR;
}

export function isFirebaseConfigured() {
  try {
    firebase.app();
    return true;
  } catch {
    return false;
  }
}

export function getFirebaseApp() {
  return getDefaultFirebaseApp();
}

export function getFirebaseAuth() {
  getDefaultFirebaseApp();
  return auth();
}

export function getFirebaseFirestore() {
  getDefaultFirebaseApp();
  return firestore();
}

export function getFirebaseStorage() {
  getDefaultFirebaseApp();
  return storage();
}

export function getFirebaseMessaging() {
  getDefaultFirebaseApp();
  return messaging();
}

