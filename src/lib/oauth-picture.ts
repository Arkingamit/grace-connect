/** Google ID tokens include `picture`. Apple ID tokens typically do not. */
export function getOAuthPicture(
  payload: { picture?: unknown } | Record<string, unknown> | null | undefined,
): string | undefined {
  const picture = payload?.picture;
  if (typeof picture !== "string") return undefined;
  if (!picture.startsWith("https://")) return undefined;

  // Request a larger Google avatar than the default 96px crop.
  if (picture.includes("googleusercontent.com")) {
    return picture.replace(/=s\d+(?:-c)?(?:-mo)?$/, "=s256-c");
  }

  return picture;
}
