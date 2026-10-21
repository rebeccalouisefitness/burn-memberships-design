# Anonymous guest login from the website screenshots (21 Oct 2026)

**What happened:** At 13:38:50–13:39:11 EDT (17:38:50–17:39:11 UTC) on 21 Oct 2026, a local copy of the BURN app was opened in headless Chrome to capture the /community and /challenge screens (script `_shots/community.sh`). The Community screen calls `ensureSession()` (src/lib/community.ts), which runs `supabase.auth.signInAnonymously()` against the live project zhvsfaepwcoepgyqrbdt. That most likely created **one** anonymous user. The browser profile was deleted afterwards, so nobody can sign back in as that user.

The capture used for the site (13:40, `_shots/chat.sh`) had every Supabase call stubbed, so it created nothing.

**What to look for:** In Supabase → Authentication → Users, find an **anonymous** user (no email or phone) with **Created at between 17:38:45 and 17:39:15 UTC on 21 Oct 2026** (13:38:45–13:39:15 EDT). It should have no posts, no profile and no purchases.

**Status:** Not deleted. Claude can't permanently delete rows in the live member database, so Rebecca needs to do it. Before deleting, check there is exactly one match. If there are none, nothing was created and nothing needs doing.

Check first (SQL Editor, read-only):
```sql
select id, created_at, is_anonymous, email, phone, last_sign_in_at
from auth.users
where is_anonymous
  and created_at between '2026-10-21 17:38:45+00' and '2026-10-21 17:39:15+00';
```
If that returns exactly one row, delete that user by its id from Authentication → Users (… → Delete user).

| Date | Action | By |
|---|---|---|
| 21 Oct 2026 | Identified the time window; nothing deleted | Claude |
