import { Capacitor, registerPlugin } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

export interface GraceGoogleAuthResult {
  idToken: string;
  email?: string;
  displayName?: string;
  givenName?: string;
  familyName?: string;
  imageUrl?: string;
  sub?: string;
  name?: string;
}

interface GraceGoogleAuthPlugin {
  signIn(): Promise<GraceGoogleAuthResult>;
}

/** Android Credential Manager Google sign-in (Grace Music strategy). */
export const GraceGoogleAuth = registerPlugin<GraceGoogleAuthPlugin>('GraceGoogleAuth');

function pluginMissing(err: unknown) {
  return /not implemented/i.test(
    String((err as { message?: string; errorMessage?: string } | null)?.message
      || (err as { errorMessage?: string } | null)?.errorMessage
      || ''),
  );
}

/**
 * Native Google ID token. Prefer Credential Manager on Android when the APK
 * includes GraceGoogleAuth; otherwise use Codetrix (already in older builds).
 */
export async function signInWithGoogleNative(): Promise<GraceGoogleAuthResult> {
  if (Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('GraceGoogleAuth')) {
    try {
      const result = await GraceGoogleAuth.signIn();
      if (result.idToken) return result;
    } catch (err) {
      if (!pluginMissing(err)) throw err;
    }
  }

  const user = await GoogleAuth.signIn();
  const idToken = user.authentication?.idToken;
  if (!idToken) {
    throw new Error('Google authentication failed. No ID Token received.');
  }
  return {
    idToken,
    email: user.email,
    displayName: user.name,
    givenName: user.givenName,
    familyName: user.familyName,
    imageUrl: user.imageUrl,
  };
}

/** Map native / Capacitor Google errors to a message members can act on. */
export function googleNativeSignInError(err: unknown): string {
  const anyErr = err as { message?: string; errorMessage?: string; code?: string } | null;
  const message = String(anyErr?.message || anyErr?.errorMessage || '');
  const code = String(anyErr?.code || '');

  // The legacy Google Sign-In SDK in older app builds reports every configuration
  // problem (unregistered signing key, wrong client ID) as "Something went wrong".
  if (code === '10' || /developer_error|something went wrong/i.test(message)) {
    return (
      'Google sign-in is not available in this version of the app. Please install the latest ' +
      'Grace Connect build, or continue with Apple.'
    );
  }

  if (/SHA-1|not in Firebase|not registered|error code: 10|12500/i.test(message)) {
    return message;
  }

  if (/cancel/i.test(message)) {
    return (
      'Google login was canceled. If you did not cancel, add this APK’s SHA-1 in Firebase ' +
      '(Project settings → Your apps → com.graceconnect.app), wait a few minutes, then retry.'
    );
  }

  return message || 'Google login failed. Please try again.';
}
