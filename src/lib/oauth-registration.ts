export const OAUTH_REGISTRATION_KEY = 'grace-oauth-registration';

export type OauthRegistrationDraft = {
  credential?: string;
  appleState?: string;
  provider: 'google' | 'apple';
  picture?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

export function saveOauthRegistrationDraft(draft: OauthRegistrationDraft) {
  try {
    sessionStorage.setItem(OAUTH_REGISTRATION_KEY, JSON.stringify(draft));
  } catch {
    // private mode
  }
}

export function loadOauthRegistrationDraft(): OauthRegistrationDraft | null {
  try {
    const raw = sessionStorage.getItem(OAUTH_REGISTRATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OauthRegistrationDraft;
    if (!parsed?.provider) return null;
    if (!parsed.credential && !parsed.appleState) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearOauthRegistrationDraft() {
  try {
    sessionStorage.removeItem(OAUTH_REGISTRATION_KEY);
  } catch {
    // private mode
  }
}
