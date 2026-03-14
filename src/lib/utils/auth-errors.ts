/**
 * Utility to map technical database/auth errors to user-friendly messages.
 * Specifically masks internal schema/database errors from customers.
 */

export function getFriendlyAuthError(error: any): string {
  if (!error) return "";

  const message = typeof error === 'string' ? error : error.message || "";
  const lowerMsg = message.toLowerCase();

  // Mask cryptic database/schema errors
  if (
    lowerMsg.includes("database error") || 
    lowerMsg.includes("querying schema") || 
    lowerMsg.includes("unexpected error") ||
    lowerMsg.includes("internal error") ||
    lowerMsg.includes("500")
  ) {
    return "Our systems are experiencing a temporary hiccup. Please try again in a moment.";
  }

  // Common Auth errors
  if (lowerMsg.includes("invalid login credentials")) {
    return "The email or password you entered is incorrect.";
  }
  if (lowerMsg.includes("email not confirmed")) {
    return "Please confirm your email address before signing in.";
  }
  if (lowerMsg.includes("user already exists")) {
    return "An account with this email already exists.";
  }
  if (lowerMsg.includes("password should be")) {
    return "Your password must be at least 6 characters long.";
  }
  if (lowerMsg.includes("rate limit") || lowerMsg.includes("too many requests")) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }

  // Default to the message if it seems safe, or a generic one if not
  return message || "An unexpected error occurred. Please try again.";
}
