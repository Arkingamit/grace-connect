import { registerPlugin } from '@capacitor/core';

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

/** Map native / Capacitor Google errors to a message members can act on. */
export function googleNativeSignInError(err: unknown): string {
  const anyErr = err as { message?: string; errorMessage?: string; code?: string } | null;
  const message = String(anyErr?.message || anyErr?.errorMessage || '');

  if (/SHA-1|not in Firebase|not registered|developer_error|error code: 10|12500/i.test(message)) {
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
