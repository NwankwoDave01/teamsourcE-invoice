// Mirrors the observed Supabase Auth password policy. Keep in sync with Auth settings;
// the browser copy is usability only, the server check runs on every registration.
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
// Supabase's allowed punctuation: !@#$%^&*()_+-=[]{};':"\|<>?,./`~
export const PASSWORD_SPECIAL_CHARACTERS = "!@#$%^&*()_+-=[]{};':\"\\|<>?,./`~";

export type PasswordRuleId = "length" | "lowercase" | "uppercase" | "digit" | "special";

export const PASSWORD_RULES: ReadonlyArray<{ id: PasswordRuleId; label: string; message: string; test: (p: string) => boolean }> = [
  { id: "length", label: `${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters`,
    message: `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters long.`,
    test: (p) => p.length >= PASSWORD_MIN_LENGTH && p.length <= PASSWORD_MAX_LENGTH },
  { id: "lowercase", label: "A lowercase letter (a-z)", message: "Password must include a lowercase letter (a-z).", test: (p) => /[a-z]/.test(p) },
  { id: "uppercase", label: "An uppercase letter (A-Z)", message: "Password must include an uppercase letter (A-Z).", test: (p) => /[A-Z]/.test(p) },
  { id: "digit", label: "A number (0-9)", message: "Password must include a number (0-9).", test: (p) => /[0-9]/.test(p) },
  { id: "special", label: "A special character, such as ! @ # $ % or &",
    message: `Password must include a special character, such as ! @ # $ % & * ? or -.`,
    test: (p) => [...p].some((c) => PASSWORD_SPECIAL_CHARACTERS.includes(c)) },
];

export function passwordRuleResults(password: string): Record<PasswordRuleId, boolean> {
  return Object.fromEntries(PASSWORD_RULES.map((r) => [r.id, r.test(password)])) as Record<PasswordRuleId, boolean>;
}

/** First failing rule's actionable message, or null when the password satisfies the policy. */
export function passwordPolicyError(password: string): string | null {
  return PASSWORD_RULES.find((r) => !r.test(password))?.message ?? null;
}

export const PASSWORD_POLICY_SUMMARY =
  `Password must be ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters and include a lowercase letter, an uppercase letter, a number and a special character.`;
