import firebase from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';
import storage from '@react-native-firebase/storage';

function getDefaultFirebaseApp() {
  // With React Native Firebase, the default app is configured natively via:
  // - iOS: `ios/GoogleService-Info.plist`
  // - Android: `android/app/google-services.json`
  //
  // If those files are missing, accessing the default app will throw at runtime.
  try {
    return firebase.app();
  } catch (e) {
    throw new Error(
      'Firebase is not configured. Add iOS `GoogleService-Info.plist` and Android `android/app/google-services.json`, then rebuild the app.',
    );
  }
}

export const firebaseApp = getDefaultFirebaseApp();

// Singletons (default app instances)
export const firebaseAuth = auth();
export const firebaseFirestore = firestore();
export const firebaseStorage = storage();
export const firebaseMessaging = messaging();

