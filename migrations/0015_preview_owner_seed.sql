-- Preview-only platform owner seed. Safe to re-run (insert or ignore / idempotent updates).
-- Apply only to D1 my-way-of-evangelism-preview. Do NOT apply to production.
--
-- Demo owner email: preview-owner@mywayofevangelism.test
-- Password: not stored in this file; held by Sharon via secure channel from MWoE API.
-- Password algorithm: pbkdf2-sha256 with 600000 iterations (PASSWORD_PREFIX / modernPassword).
-- MFA: production isOwner requires email_verified_at + totp_secret_encrypted + session mfa_verified_at.
-- Encrypted TOTP cannot be baked into SQL without AUTH_ENCRYPTION_KEY, so preview Worker
-- (ENVIRONMENT=preview) treats this seeded email as owner after email verification alone.
-- Full MFA parity remains available via /api/auth/security/mfa/enroll then activate.

insert or ignore into users (
  id, email, password_hash, password_salt, name, is_creator, created_at, email_verified_at
) values (
  'user_preview_owner',
  'preview-owner@mywayofevangelism.test',
  'pbkdf2-sha256$600000$ONppw2eTu9P/iMUeUQ9RJxPw5NB42N7DYF6ko+iVe/0=',
  'YkEPKhSaKEBJyrxZkr3Cwg==',
  'Preview Platform Owner',
  0,
  datetime('now'),
  datetime('now')
);

update users set
  password_hash = 'pbkdf2-sha256$600000$ONppw2eTu9P/iMUeUQ9RJxPw5NB42N7DYF6ko+iVe/0=',
  password_salt = 'YkEPKhSaKEBJyrxZkr3Cwg==',
  email_verified_at = coalesce(email_verified_at, datetime('now')),
  name = case when trim(coalesce(name, '')) = '' then 'Preview Platform Owner' else name end
where id = 'user_preview_owner'
   or email = 'preview-owner@mywayofevangelism.test';

insert or ignore into platform_roles (user_id, role)
select id, 'owner' from users where email = 'preview-owner@mywayofevangelism.test';
