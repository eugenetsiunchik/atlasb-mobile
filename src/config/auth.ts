export const googleSignInConfig = {
  webClientId: 'REPLACE_WITH_FIREBASE_WEB_CLIENT_ID.apps.googleusercontent.com',
  iosClientId: 'REPLACE_WITH_IOS_CLIENT_ID.apps.googleusercontent.com',
  iosUrlScheme: 'com.googleusercontent.apps.REPLACE_WITH_IOS_REVERSED_CLIENT_ID',
};

export function isGoogleSignInConfigured() {
  return !Object.values(googleSignInConfig).some(value => value.includes('REPLACE_WITH'));
}

export function getGoogleSignInSetupMessage() {
  return [
    'Google Sign-In is not configured yet.',
    'Update `src/config/auth.ts` with your Firebase web client ID, iOS client ID, and iOS reversed client ID URL scheme.',
    'Then replace the placeholder URL scheme in `ios/AtlasbMobile/Info.plist` and ensure Google OAuth clients exist in Firebase/Google Cloud.',
  ].join(' ');
}
