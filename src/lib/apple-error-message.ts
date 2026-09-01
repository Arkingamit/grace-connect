/** Never show raw ASAuthorizationError strings to members or App Review. */
export function formatAppleAuthError(message: string): string {
  if (/plugin is not implemented/i.test(message)) {
    return 'Apple sign-in could not open in this app version. Please try again.';
  }
  if (/cancel/i.test(message)) return 'Apple sign-in was canceled.';
  if (/AuthorizationError error 1000|error 1000/i.test(message)) {
    return 'Apple sign-in could not be completed. Please try again.';
  }
  if (/AuthenticationServices|AuthorizationError/i.test(message)) {
    return 'Apple sign-in failed. Please try again.';
  }
  return message || 'Apple sign-in failed. Please try again.';
}
