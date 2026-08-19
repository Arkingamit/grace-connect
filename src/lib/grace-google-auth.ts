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
