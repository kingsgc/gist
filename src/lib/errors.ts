/** Normalize every value a Supabase API may throw into a real `Error`
 *  whose `.message` the UI can present on the user. A PostgrestError / AuthError
 *  is a plain object, so we build one up front — otherwise the app falls back
 *  to the generic "not an Error" branch and shows "Gist no go send. Try again." */
export function toError(error: unknown, fallback = "Something choke. Try again."): Error {
  if (error instanceof Error) return error;
  if (error && typeof error === "object") {
    const message =
      (error as { message?: unknown }).message ??
      (error as { code?: string }).code ??
      (error as { hint?: string }).hint;
    if (message) {
      return new Error(String(message));
    }
  }
  return new Error(typeof error === "string" ? error : fallback);
}
