import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  reload,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as signOutFromFirebase,
  type FirebaseAuthTypes,
  updateProfile,
} from '@react-native-firebase/auth';
import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import {
  getGoogleSignInSetupMessage,
  googleSignInConfig,
  isGoogleSignInConfigured,
} from '../../config/auth';
import {
  getFirebaseAuth,
  getFirebaseConfigurationErrorMessage,
  isFirebaseConfigured,
} from '../../firebase';

type EmailSignInParams = {
  email: string;
  password: string;
};

type EmailSignUpParams = EmailSignInParams & {
  displayName: string;
};

let hasConfiguredGoogleSignIn = false;

function getFallbackDisplayName(email: string) {
  const [name] = email.split('@');
  return name || 'Atlasb user';
}

function getFriendlyGoogleError(error: unknown) {
  if (isErrorWithCode(error)) {
    switch (error.code) {
      case statusCodes.IN_PROGRESS:
        return 'Google Sign-In is already in progress.';
      case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
        return 'Google Play Services is not available on this device.';
      default:
        return error.message;
    }
  }

  return error instanceof Error ? error.message : 'Google Sign-In failed.';
}

function ensureGoogleSignInConfigured() {
  if (!isGoogleSignInConfigured()) {
    throw new Error(getGoogleSignInSetupMessage());
  }

  if (hasConfiguredGoogleSignIn) {
    return;
  }

  GoogleSignin.configure({
    iosClientId: googleSignInConfig.iosClientId,
    webClientId: googleSignInConfig.webClientId,
  });

  hasConfiguredGoogleSignIn = true;
}

export function subscribeToAuthStateChanges(
  listener: (user: FirebaseAuthTypes.User | null) => void,
) {
  if (!isFirebaseConfigured()) {
    listener(null);
    return () => {};
  }

  return onAuthStateChanged(getFirebaseAuth(), listener);
}

export async function signInWithEmail({
  email,
  password,
}: EmailSignInParams) {
  const credential = await signInWithEmailAndPassword(
    getFirebaseAuth(),
    email.trim(),
    password,
  );

  return credential.user;
}

export async function signUpWithEmail({
  displayName,
  email,
  password,
}: EmailSignUpParams) {
  const firebaseAuth = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(
    firebaseAuth,
    email.trim(),
    password,
  );
  const nextDisplayName = displayName.trim() || getFallbackDisplayName(email);

  await updateProfile(credential.user, {
    displayName: nextDisplayName,
  });
  await reload(credential.user);

  return firebaseAuth.currentUser ?? credential.user;
}

export async function signInWithGoogle() {
  if (!isFirebaseConfigured()) {
    throw new Error(getFirebaseConfigurationErrorMessage());
  }

  ensureGoogleSignInConfigured();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  try {
    const firebaseAuth = getFirebaseAuth();
    const response = await GoogleSignin.signIn();

    if (isCancelledResponse(response)) {
      throw new Error('Google Sign-In was cancelled.');
    }

    if (!isSuccessResponse(response)) {
      throw new Error('Google Sign-In did not complete successfully.');
    }

    const idToken = response.data.idToken;

    if (!idToken) {
      throw new Error(
        'Google Sign-In did not return an ID token. Check your Firebase OAuth client configuration.',
      );
    }

    const googleCredential = GoogleAuthProvider.credential(idToken);
    const credential = await signInWithCredential(firebaseAuth, googleCredential);

    if (!credential.user.displayName && response.data.user.name) {
      await updateProfile(credential.user, {
        displayName: response.data.user.name,
        photoURL: response.data.user.photo,
      });
      await reload(credential.user);
    }

    return firebaseAuth.currentUser ?? credential.user;
  } catch (error) {
    throw new Error(getFriendlyGoogleError(error));
  }
}

export async function signOut() {
  if (!isFirebaseConfigured()) {
    throw new Error(getFirebaseConfigurationErrorMessage());
  }

  try {
    await GoogleSignin.signOut();
  } catch {
    // Google Sign-In may never have been used, so this is intentionally best-effort.
  }

  await signOutFromFirebase(getFirebaseAuth());
}

export async function startAppleSignInPlaceholder() {
  throw new Error('Apple Sign-In is not implemented yet. Wire the native provider before enabling it.');
}
