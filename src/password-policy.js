// Shared rule for every server path that SETS a new password.
// Sign-in must never call this: legacy passwords keep working.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

const RULES = [
  ['length', 'at least 8 characters', pw => pw.length >= PASSWORD_MIN_LENGTH],
  ['uppercase', 'an uppercase letter', pw => /[A-Z]/.test(pw)],
  ['lowercase', 'a lowercase letter', pw => /[a-z]/.test(pw)],
  ['number', 'a number', pw => /[0-9]/.test(pw)],
  ['symbol', 'a symbol', pw => /[^A-Za-z0-9]/.test(pw)]
];

export function validateNewPassword(value) {
  const pw = typeof value === 'string' ? value : '';
  if (pw.length > PASSWORD_MAX_LENGTH) {
    return { ok: false, missing: ['max_length'], error: 'Password must be ' + PASSWORD_MAX_LENGTH + ' characters or fewer.' };
  }
  const failed = RULES.filter(([, , test]) => !test(pw));
  if (!failed.length) return { ok: true, missing: [] };
  return {
    ok: false,
    missing: failed.map(([key]) => key),
    error: 'Password must include: ' + failed.map(([, label]) => label).join(', ') + '.'
  };
}
