# Design: Multi-crew "Groups" — let the app spread by word of mouth

**Status:** proposal · **Scope target:** dozens of users (friends-of-friends) ·
**Product shape:** each person creates or joins their **own private crew**
(picks, crew map, status), isolated from every other crew.

## Why
Today the app is a single-tenant tool hard-wired for one crew of three. Identity
is a fixed email allowlist that maps to the names **Grant / Desmond / Lawrence**,
and every piece of shared data lives in one global namespace. For the app to
spread — "tap this link to join our crew" — it needs exactly one new concept:
the **group** (a private party/crew). Everything else is consequences of that.

At this scale we deliberately **do not** build realtime infra, paid tiers, or an
abuse system — per-group polling keeps costs trivial, and invite-only groups make
location sharing safe by construction.

---

## 1. Today's data model (what we're changing)
All keys in Upstash Redis are **global**; the hash field is the person's
**display name**, taken from the verified session (`session.person`):

| Key | Type | Shape |
|---|---|---|
| `picks` | hash | field `"<setId>|<person>"` → `"1"` |
| `picks_trash:<person>` | string (24h) | JSON backup of cleared fields |
| `crew_status` | hash (4h TTL) | field `<person>` → JSON `{text, ts}` |
| `crew_loc` | hash (4h TTL) | field `<person>` → JSON `{lat,lng,acc,ts}` |
| `lineup_overrides` | string | JSON `{overrides, updatedAt}` |

Identity: `api/_auth.js#personForEmail` maps an allow-listed email → one of three
names. `api/status.js` hardcodes `PEOPLE = ['Grant','Desmond','Lawrence']`.
Colors live in `src/components/lineup/theme.js` (`PERSON_COLORS`/`PERSON_INK`),
keyed by those same three names.

---

## 2. Target data model

### Identity: stable user id, not display name
The hash field becomes the user's **lowercased Google email** (`userId`), which is
already verified at login and never chosen by the user. Display name + color are
**per-membership** (a user can be "Des" in one crew, "DJ Des" in another), looked
up from the group's member list — not from a global constant.

### New keys (group-namespaced)
| Key | Type | Shape |
|---|---|---|
| `group:<gid>:meta` | string(JSON) | `{ id, name, createdBy, createdAt }` |
| `group:<gid>:members` | hash | field `<userId>` → JSON `{ displayName, color, role, joinedAt }` |
| `group:<gid>:picks` | hash | field `"<setId>|<userId>"` → `"1"` |
| `group:<gid>:picks_trash:<userId>` | string (24h) | JSON backup |
| `group:<gid>:status` | hash (4h) | field `<userId>` → JSON `{text, ts}` |
| `group:<gid>:loc` | hash (4h) | field `<userId>` → JSON `{lat,lng,acc,ts}` |
| `joincode:<CODE>` | string | `<gid>` (code → group lookup) |
| `user:<userId>:groups` | set | the group ids this user belongs to |

`gid` = short random id; `CODE` = 6–8 char unguessable join code (also the share
link `/join/<CODE>`).

### Lineup overrides stay GLOBAL
Timetable corrections are the **same festival for everyone** — they are not
per-crew. Keep `lineup_overrides` global, but restrict **publishing** to an app
admin (a small `ADMIN_EMAILS` env), so one random crew can't rewrite the schedule
for all. Reads stay open to any session.

---

## 3. Access model

- **Login** (`api/auth.js`, `api/oauth.js`): drop the `ALLOWED_EMAILS` gate. Any
  verified Google account gets a session `{ email, name }`. `session.person` goes
  away; `userId = email`.
- **Authorization** moves from "is your email allowlisted" → **"are you a member
  of the group you're touching."** New helper in `_auth.js`:
  `requireMembership(req, res, gid)` → runs `requireSession`, then checks
  `user:<userId>:groups` contains `gid` (or `HEXISTS group:<gid>:members userId`),
  returns the member record or writes 403. **Every** data endpoint calls it; a
  `gid` from the request is never trusted without this check.

---

## 4. Endpoints

**New — `api/groups.js`:**
- `GET /api/groups` → my groups `[{id, name, role}]`.
- `GET /api/groups?g=<gid>` → group detail incl. `members: [{userId, displayName, color}]` (used to render names/colors). Membership required.
- `POST {action:'create', name, displayName, color}` → mint `gid` + `CODE`, write meta + first membership, add to `user:<userId>:groups`. Returns `{gid, code}`.
- `POST {action:'join', code, displayName, color}` → resolve `joincode:<CODE>`→gid, add membership (reject dup), assign a free palette color if none given.
- `POST {action:'leave', g}` → remove my membership + my fields from picks/status/loc (self data deletion).

**Changed — `api/picks.js`, `api/status.js`:** require `g` (groupId) on every
call; `requireMembership`; namespace all keys with `group:<gid>:`; field = `userId`.
Drop the hardcoded `PEOPLE` filter in `status.js` (membership is the filter now).

**Changed — `api/lineup.js`:** keep global; gate `POST` (publish) behind
`ADMIN_EMAILS` instead of any session.

---

## 5. Client

- **`GroupContext`** (new): `activeGroupId` (persisted in localStorage), `groups`,
  current group's `members` map (`userId → {displayName, color}`), and
  `create/join/leave/switch`. Wraps the app alongside `AuthContext`.
- **Onboarding / empty states** in `AuthGate` (or a new gate after it):
  - 0 groups → "Create a crew" or "Join with a code".
  - `/join/<CODE>` route → shows crew name → pick display name + color → joins.
  - Header gets a small **crew switcher** + an "Invite" affordance (share link / QR).
- **Dynamic members:** replace `PERSON_COLORS`/`PERSON_INK` lookups and any
  3-person assumptions (picks columns, crew map markers, presence) with the active
  group's member list. Color assigned from a palette at join, user-editable.
- **Hooks** (`usePicks`, `useCrewStatus`, `useGeoShare`) take `activeGroupId` and
  call `/api/...?g=<gid>`. Their localStorage cache keys also become group-scoped
  so switching crews doesn't bleed data.

---

## 6. Migration (one-off)
Preserve the current crew as the first group:
1. Create `group:<g0>` named e.g. "The Budhole"; map each `ALLOWED_EMAILS`
   `email:Name` pair to a membership `{displayName:Name, color: PERSON_COLORS[Name]}`.
2. Rewrite global keys → `group:<g0>:*`, translating each field's **display name →
   email** using the same map:
   - `picks` field `"<setId>|Grant"` → `group:<g0>:picks` field `"<setId>|grant@…"`.
   - `crew_status` / `crew_loc` keyed `Name` → keyed `email`.
3. Mint a `joincode` for g0; add g0 to each member's `user:<email>:groups`.
4. `lineup_overrides` stays as-is (global).
A small Node script using the Upstash REST client, run once. Old global keys can
be left in place (ignored) or deleted after verification.

---

## 7. Open-the-door checklist (the non-code gate)
- **Publish the Google OAuth consent screen.** Today it's in *Testing* mode (every
  user must be added by email manually — impossible for word of mouth). Since the
  app only uses non-sensitive scopes (`openid email profile`), publishing does
  **not** trigger Google's long verification — it needs app name, support email, an
  authorized domain, and a **privacy policy URL**.
- **Privacy page** (static route) covering: Google email/name, opt-in location
  (group-scoped, 4h TTL), retention, and how to delete (leave group / delete data).
- Keep location **opt-in** and group-scoped (already true) — the safety story.

---

## Operating costs (dozens-of-users scale)
Essentially free — a few dollars worst case for the whole festival. The only
usage-driven cost is Upstash, and the **5s poll interval is the cost driver**,
not the user or group count.

| Item | At this scale | Cost |
|---|---|---|
| Vercel **Hobby** | hosting + `/api` functions + 100 GB bandwidth; ~110 KB gzipped bundle, SW-cached after first load | **$0** (non-commercial only — Pro $20/mo if ever monetized) |
| Upstash **Redis** | see math below; picks/status are a few KB/group vs 256 MB free | **$0** in free tier → **~$1–10** total if exceeded |
| Google **OAuth** | unlimited sign-ins, publishing the consent screen | **$0** |
| Domain | optional nicer URL | ~**$12/yr** |
| **Realistic total** | | **~$0–25/yr** |

**Redis command math:** `useLivePoll` polls every 5s active / 30s idle and
**stops when the tab is hidden**. A realistic active festival-day user ≈ **4–5K
commands/day** (~30 min active + a couple hours idle-open, ~2 commands/poll across
picks + status). 30 users ≈ **~150K commands on a peak day**, ~450K across 3 days;
near-zero off-festival. Pay-as-you-go beyond free ≈ **$0.20 / 100K commands** →
single-digit dollars worst case. Per-group namespacing **isolates** data but adds
no commands (same users).

**Cost levers, if ever needed:** bump the active interval 5s→10s (halves
commands); long term, a polling→push/realtime rewrite only pays off past
hundreds-to-thousands of concurrent users. Verify current Upstash/Vercel tier
numbers before launch — thresholds drift, the methodology doesn't.

## 8. Suggested PR sequence
1. **PR-1 — Backend isolation (no UI change):** group keys + `requireMembership`
   + `api/groups.js` + migration; hardcode g0 as the active group server-side so
   the existing three keep working unchanged. *De-risks data isolation first.*
2. **PR-2 — Client groups:** `GroupContext`, onboarding (create/join/`/join/:code`),
   crew switcher, dynamic members/colors, group-scoped hooks + caches.
3. **PR-3 — Open auth:** drop `ALLOWED_EMAILS` gate, `ADMIN_EMAILS` for lineup
   publish, publish consent screen, privacy page, leave/delete-my-data.
4. **PR-4 — Stranger polish:** generalize branding, install coaching (esp. iOS
   "Add to Home Screen"), rate-limit create/join, confirm Redis TTLs.

## 9. Explicitly out of scope (until past a few hundred users)
Realtime transport (keep polling), paid infra tiers, push notifications,
moderation/abuse tooling, GDPR formalities beyond a basic privacy page.
