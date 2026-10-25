# OX Game — Test cases

Source: `spec.md` (AC-1..AC-29, UI-1..UI-10), `plan.md` (Test plan), `mockups/index.md`.

## Conventions

- **Priority:** P1 = automate in Playwright (`VITE_E2E=true`, fake user via `?e2eUser=admin|player|none`, `/api/*` mocked with `page.route`). P2 = manual / exploratory, or covered by unit/integration tests owned by test-be / test-fe.
- **Type:** `E2E` | `manual-UAT` (approver, real Google / real Firebase email+password / real Firestore) | `unit` (covered by unit/integration test, no E2E).
- Mocked API in E2E: the mock must follow the API contract in plan.md (`/api/me`, `/api/game/*`, `/api/leaderboard`, `/api/admin/*`). E2E checks the UI against the mock; server rules are checked by unit tests.
- Fake-auth login: where a case says "sign in (fake)", the fake email/password and Google flows in `e2eAuth.ts` are driven with mocked results (success, wrong credentials, non-admin valid account). Exact trigger is an open question (see end).
- Test data: players "Alex Morgan" (player), admin "Admin OX" (`adminox@gmail.com`). No real customer data.

---

## S1 Login (FR-1, FR-2, FR-3)

| TC | Title | AC / UI | Pri | Type | Preconditions | Steps | Expected |
|---|---|---|---|---|---|---|---|
| TC-1 | Logged out `/` redirects to login | AC-1 | P1 | E2E | `e2eUser=none` | 1. Open `/` | URL is `/login`; game not visible |
| TC-2 | Logged out `/leaderboard` redirects to login | AC-1 | P1 | E2E | `e2eUser=none` | 1. Open `/leaderboard` | URL is `/login` |
| TC-3 | Logged out `/admin` redirects to admin login | AC-1 | P1 | E2E | `e2eUser=none` | 1. Open `/admin` | URL is `/login/admin` |
| TC-4 | Login default state | UI-1, AC-29 | P1 | E2E | `e2eUser=none` | 1. Open `/login` 2. Inspect | Matches `01-login--default.svg`: heading, "Sign in with Google" button. No email/password field, no link to `/login/admin` (no text/href containing "admin") |
| TC-5 | Login loading state | UI-1 | P1 | E2E | `e2eUser=none`, Google sign-in fake delayed | 1. Click Sign in with Google | Matches `01-login--loading.svg`: button disabled / busy, spinner; no double sign-in on second click |
| TC-6 | Login error state | UI-1 | P1 | E2E | Google sign-in fake rejects | 1. Click Sign in with Google | `role="alert"` message visible per `01-login--error.svg`; button usable to retry; retry goes to loading state |
| TC-7 | Real Google first login creates profile | AC-2, FR-3 | P2 | manual-UAT | Real Firebase project, Google account never used | 1. Open `/login` 2. Sign in with Google 3. Check Firestore console `users/{uid}` | Lands on game/setup page; doc exists with score 0, streak 0, wins/losses/draws 0 |
| TC-8 | Real Google second login does not reset profile | AC-2 | P2 | manual-UAT | Account from TC-7 with score != 0 | 1. Sign out 2. Sign in again 3. Check score on setup and in Firestore | Score, streak, stats unchanged |
| TC-9 | Profile created only on first `/api/me` call | AC-2, FR-3 | P2 | unit | fake Firestore | Call me handler twice with same uid after changing score | One doc created; second call returns existing values, no reset (test-be) |
| TC-10 | Session survives refresh | AC-3 | P1 | E2E | `e2eUser=player`, API mocked | 1. Open `/` (signed in) 2. Reload | Still signed in, stays on game page, no redirect to `/login` |
| TC-11 | Sign out returns to login | AC-3, UI-8 | P1 | E2E | `e2eUser=player` | 1. Click Sign out in header | URL `/login`; opening `/` redirects to `/login` again |
| TC-12 | Real session persists after refresh (Google) | AC-3, FR-2 | P2 | manual-UAT | Signed in with real Google | 1. Refresh 2. Close tab, reopen site | Still signed in; Sign out then returns to `/login` |
| TC-13 | API rejects missing / malformed / expired token | AC-4 | P2 | unit | fake token verifier | Call every `/api/*` handler with no header, `Bearer garbage`, expired token | 401 each; fake Firestore shows zero reads/writes (test-be) |
| TC-14 | 401 on deployed API without token | AC-4 | P2 | manual-UAT | Deployed or `vercel dev` | `curl` `/api/me`, `/api/leaderboard`, `/api/admin/players` with no token and with `Bearer abc` | 401 JSON, no data in body |
| TC-15 | API 401 while in app sends user to login | AC-4, FR-1 | P2 | E2E | `e2eUser=player`, mock `/api/me` returns 401 | 1. Open `/` | UI does not show game data; user sees error or is sent to `/login` (verify actual behaviour, note as exploratory) |
| TC-16 | Signed-out header variant | UI-8 | P1 | E2E | `e2eUser=none` | 1. Open `/login` | Header shows only brand/signed-out variant per `08-header--variants.svg`; no Play / Leaderboard / Admin / Sign out |

## S2 Play vs bot (FR-4, FR-5, FR-11, FR-12)

Mock game API state kept in the spec file (board, difficulty, status) so moves are deterministic.

| TC | Title | AC / UI | Pri | Type | Preconditions | Steps | Expected |
|---|---|---|---|---|---|---|---|
| TC-17 | Setup default state, new player | UI-2, AC-5 | P1 | E2E | `e2eUser=player`, `/api/me` profile score 0, no active game | 1. Open `/` | Per `02-setup--default.svg`: score, streak as 3 dots + `0/3`, W/L/D tiles with labels, Easy and Hard options, Easy preselected, Start game button |
| TC-18 | Setup preselects last played difficulty | UI-2 | P1 | E2E | profile `lastDifficulty=hard` (or equivalent per API) | 1. Open `/` | Hard preselected |
| TC-19 | Setup loading state | UI-2 | P1 | E2E | start request delayed | 1. Click Start game | `02-setup--loading.svg`: button "Starting…", difficulty options and button disabled |
| TC-20 | Start game creates empty board, player is X and moves first | AC-5, FR-4, UI-3 | P1 | E2E | no active game | 1. Choose Hard 2. Start game | Request has difficulty=hard; 9 empty cells; status says your turn; board enabled |
| TC-21 | Board cell labels | UI-3, AC-23 | P1 | E2E | game in progress | 1. Inspect 9 cells via `getByRole('button')` | Each cell is a button with label like "Row 2, column 1, empty"; marked cells include the mark ("…, X"/"…, O") |
| TC-22 | Keyboard play | UI-3, AC-23, NFR-4 | P1 | E2E | game in progress | 1. Tab to board 2. Arrow keys move focus (all 4 directions, edges do not wrap out of board) 3. Press Enter on a cell 4. Press Space on another cell on your next turn | Focus follows arrows, visible focus ring; Enter and Space both play X; no mouse needed |
| TC-23 | X is a cross, O is a ring | UI-3 | P2 | manual-UAT | game with X and O on board | 1. Look at board (also in grayscale / forced-colors) | X (cross) and O (ring) distinguishable by shape, not colour only |
| TC-24 | Move gets bot reply in one response, board locked while thinking | AC-7, UI-3, NFR-3 | P1 | E2E | game in progress; mock move response delayed | 1. Click an empty cell 2. Immediately inspect board 3. Wait for response | While waiting: `03-game--bot-thinking.svg` state, all cells disabled, visible status text; after response: player X and bot O both on board, your turn again |
| TC-25 | Status text is `aria-live="polite"` | UI-3 | P1 | E2E | game in progress | 1. Locate status element | Has `aria-live="polite"`, text updates per turn / result |
| TC-26 | Double click during bot thinking sends one move | AC-7, AC-16 | P1 | E2E | delayed move response | 1. Double-click one cell quickly 2. Click another cell while locked | Only one `POST move` captured by the mock; second click ignored |
| TC-27 | Server rejects occupied cell | AC-6 | P2 | unit | fake Firestore with game | Send move to occupied cell | 4xx, game doc unchanged (test-be) |
| TC-28 | Server rejects out-of-range, finished game, other user's game | AC-6, FR-11 | P2 | unit | fake Firestore | Move index -1 / 9 / 1.5; move on finished game; move with other uid | 4xx each, state unchanged, score unchanged (test-be) |
| TC-29 | UI recovers when move is rejected (4xx) | AC-6, UI-9 | P1 | E2E | mock move returns 409/400 | 1. Click a cell | `role="alert"` "Couldn't reach the server. Try again." (or API error), board returns to last server state (no stray X) |
| TC-30 | Win lines for X and O + draw | AC-8, FR-4 | P2 | unit | none | Test all 8 lines for both marks; full board with no line | Win detected for each line/mark; draw only on full board without line (test-be/shared) |
| TC-31 | Resume banner after reload | AC-9, UI-5 | P1 | E2E | mock `/api/me` / active game returns unfinished game (2 moves, hard) | 1. Open `/` | Resume banner per `05-resume--default.svg` with Resume and Start new game buttons |
| TC-32 | Resume restores board and difficulty | AC-9, FR-12 | P1 | E2E | as TC-31 | 1. Click Resume | Game page shows same board marks and same difficulty label; your turn |
| TC-33 | Start new game asks for confirmation; Cancel keeps game | AC-9, UI-5 | P1 | E2E | as TC-31 | 1. Click Start new game 2. Click Cancel | Confirm text says unfinished game counts as a loss (−1); after Cancel no abandon request sent, banner still shown |
| TC-34 | Confirm abandons game as loss and starts new | AC-9, AC-13 | P1 | E2E | as TC-31 | 1. Start new game 2. Confirm | Abandon/new request sent; score shown −1 relative to before, streak 0/3, losses +1; Setup then new empty game |
| TC-35 | Abandon scoring rule | AC-9, AC-13 | P2 | unit | fake Firestore, unfinished game, streak 2 | Start new game | Old game finished as loss, score −1, streak 0, losses +1, once only (test-be) |
| TC-36 | Easy bot behaviour | AC-10, FR-5 | P2 | unit | seeded RNG | Position with win available / block needed; many samples | Takes win/block with fixed documented probability, otherwise random legal move (test-be) |
| TC-37 | Hard bot never loses at rate 0; random at rate 1 | AC-11, FR-5 | P2 | unit | none | Enumerate all reachable positions at rate 0; rate 1 sampling; missing/invalid config | Never loses at 0; random legal moves at 1; default 0.2 when doc missing/invalid (test-be) |
| TC-38 | `config/bot` rate change takes effect | AC-11 | P2 | manual-UAT | Real Firestore, approver access | 1. Set `config/bot.hardMistakeRate` to 0 and then 1 2. Play Hard games | At 0 bot never loses (best result for player is draw); at 1 bot moves look random; delete doc → default 0.2 |
| TC-39 | Difficulty works end to end (real) | AC-5, AC-7 | P2 | manual-UAT | Real stack | 1. Play Easy and Hard games to completion | Both levels playable; bot replies each move; Hard feels stronger |
| TC-40 | Unfinished game persists (real Firestore) | AC-9, FR-12 | P2 | manual-UAT | Real stack | 1. Start game, make 2 moves 2. Close tab 3. Return next day / other browser | Resume banner, same board and difficulty |
| TC-41 | Start / load failure | UI-9 | P1 | E2E | mock start returns 500 / network abort | 1. Click Start game | `role="alert"` "Couldn't reach the server. Try again."; controls re-enabled; no game board shown |
| TC-42 | Network error during move | UI-9, AC-6 | P1 | E2E | `route.abort()` on move | 1. Click cell | Alert shown; board returns to last server state; user can retry the move |
| TC-43 | Back / forward during game | FR-12 | P2 | manual-UAT | game in progress | 1. Go to Leaderboard 2. Browser back | Game restored from server state, no duplicated or lost marks |
| TC-44 | Session expiry mid-game | AC-4 | P2 | manual-UAT | Real stack, token revoked / expired | 1. Wait or revoke 2. Click a cell | App recovers (token refresh) or shows error / login; no score change on failure |
| TC-45 | Admin cannot play (UI) | AC-28, FR-13 | P1 | E2E | `e2eUser=admin` | 1. Open `/` | Redirected to `/admin`; header has no Play link |
| TC-46 | Admin cannot play (API) | AC-28 | P2 | unit | fake token verifier with admin token | Call `/api/game/*` | 403 `ADMIN_ACCOUNT`; no game doc created (test-be) |

## S3 Scoring (FR-6, FR-7, FR-8)

| TC | Title | AC / UI | Pri | Type | Preconditions | Steps | Expected |
|---|---|---|---|---|---|---|---|
| TC-47 | Win +1 (diagonal) | AC-12, UI-4 | P1 | E2E | score 0, streak 0; mock finishes game with X diagonal | 1. Play winning moves | `04-gameover--win.svg`: headline "You win!", pill "+1", green winning cells, strike line, text "three X in a diagonal"; setup/header shows score +1, streak 1/3, wins +1 |
| TC-48 | Win with bonus +2 | AC-15, UI-4 | P1 | E2E | streak 2; mock win in a row | 1. Win the game | `04-gameover--win-bonus.svg`: "3 wins in a row!", pill "+2", streak back to 0/3, score +2 total |
| TC-49 | Streak restarts after bonus | AC-15 | P1 | E2E | after TC-48 state | 1. Play and win another game | Streak shows 1/3 (not 4), score +1 |
| TC-50 | Loss −1 headline "You lose" (column) | AC-13, UI-4 | P1 | E2E | score 1, streak 1; mock bot wins on column | 1. Play until bot wins | `04-gameover--loss.svg`: headline exactly "You lose", pill "−1", red winning cells + strike line, text "The bot got three O in the column"; streak 0/3, losses +1 |
| TC-51 | Score goes negative | AC-13 | P1 | E2E | score 0; mock loss | 1. Lose a game 2. View setup, header, Leaderboard row | Score shown as "−1" (minus sign + red), not clamped to 0 |
| TC-52 | Draw 0 | AC-14, UI-4 | P1 | E2E | streak 2; mock draw | 1. Fill board with no line | `04-gameover--draw.svg`: "It's a draw", pill "0", no highlight/strike; score unchanged, streak 0/3, draws +1 |
| TC-53 | Winning line variants (rows, columns, both diagonals) | UI-4, AC-8 | P2 | manual-UAT | game vs real or mocked bot | Win via each of the 8 lines | Highlight and strike line follow the winning line; message names row/column/diagonal; same for bot wins (red) |
| TC-54 | Result message not colour-only | UI-4, NFR-4 | P1 | E2E | after win and loss | 1. Inspect game-over | Text headline, icon, strike line and aria-live message present in addition to colour |
| TC-55 | Play again keeps difficulty | UI-4, FR-12 | P1 | E2E | after game over on Hard | 1. Click Play again | New empty game started with difficulty=hard in request; no Setup page |
| TC-56 | Change difficulty goes to Setup | UI-4 | P1 | E2E | after game over | 1. Click Change difficulty | Setup page shown with updated stats |
| TC-57 | Game over mobile layout | UI-4, AC-22 | P1 | E2E | viewport 375x812 | 1. Win a game | Per `04-gameover--win-mobile.svg`; no horizontal scroll |
| TC-58 | Stats shown and updated after each game | AC-17, UI-2, FR-8 | P1 | E2E | mock `/api/me` reflects each result | 1. Finish win, loss, draw in sequence 2. Look at Setup/game page | Score, streak `x/3` + dots, W/L/D match mock after every game |
| TC-59 | Score / streak / stats arithmetic | AC-12..AC-15 | P2 | unit | fake Firestore | Table-driven: win, loss, draw, streak 0..2 wins, 3 wins in a row, win after bonus, loss/draw reset | Exact score/streak/W/L/D per FR-6, FR-7 (test-be, pure scoring function) |
| TC-60 | Result applied exactly once | AC-16 | P2 | unit | fake Firestore, finished game | Repeat move; run two concurrent finishing moves | Score/stats changed once; second call rejected or no-op (test-be) |
| TC-61 | Double submit against real Firestore | AC-16 | P2 | manual-UAT | Real Firestore | 1. Send final-move request twice quickly (devtools "replay" / curl) | Score changes once in Firestore console |
| TC-62 | Scoring is server-side only | FR-11, AC-21 | P2 | manual-UAT | Real stack | 1. Try to write `users/{uid}.score` from browser console with Firebase client SDK; try move request with extra `score` field | Write denied (permission-denied); extra field ignored; score unchanged |
| TC-63 | Streak dots and pill | UI-2, AC-17 | P1 | E2E | streak 0, 1, 2 via mock | 1. Open Setup for each | 0/3, 1/3, 2/3 with matching filled dots and text pill (amber when > 0, slate at 0) |

## S4 Leaderboard & Admin (FR-9, FR-10)

| TC | Title | AC / UI | Pri | Type | Preconditions | Steps | Expected |
|---|---|---|---|---|---|---|---|
| TC-64 | Leaderboard default | AC-18, UI-6 | P1 | E2E | `e2eUser=player`; mock 5 players | 1. Open `/leaderboard` | `06-leaderboard--default.svg`: rows sorted by score desc, rank, name, score, W/L/D; top 3 medals with visible rank numbers |
| TC-65 | Leaderboard never shows email | AC-18, Q4 | P1 | E2E | mock response includes no email; also seed one with email in UI text check | 1. Open `/leaderboard` 2. Search page text for "@" | No email column or text; no "Visible to admins only" data |
| TC-66 | Leaderboard tie-break and sequential rank | AC-18 | P2 | unit | fake Firestore | Players with equal score, equal wins, same name | Order: score desc, wins desc, name; ranks 1,2,3,… (no shared rank) (test-be) |
| TC-67 | Leaderboard tie order rendered | AC-18 | P1 | E2E | mock returns tied players in server order | 1. Open `/leaderboard` | Ranks displayed sequentially 1..n in the mock order, no duplicate rank numbers |
| TC-68 | Players with 0 finished games hidden | AC-18 | P2 | unit | fake Firestore with 0-game user | Call leaderboard | 0-game user excluded (test-be) |
| TC-69 | Current user row highlighted | UI-6 | P1 | E2E | mock includes current user | 1. Open `/leaderboard` | Own row bold with "You" tag and left bar (not colour only) |
| TC-70 | Leaderboard empty state | UI-6, AC-18 | P1 | E2E | mock returns `[]` | 1. Open `/leaderboard` | `06-leaderboard--empty.svg` empty state |
| TC-71 | Leaderboard mobile | UI-6, AC-22 | P1 | E2E | viewport 375x812 | 1. Open `/leaderboard` | `06-leaderboard--default-mobile.svg` layout, no horizontal scroll |
| TC-72 | Leaderboard loading / error | UI-9 | P1 | E2E | mock delayed, then 500 | 1. Open `/leaderboard` | "Loading…" row while pending; after failure `role="alert"` error |
| TC-73 | Header for player | UI-8 | P1 | E2E | `e2eUser=player` | 1. Open `/` | Nav: Play, Leaderboard, Sign out; no Admin link; active link bold with underline; display name = `displayName`, falls back to email prefix before `@` (test both), avatar initials |
| TC-74 | Header on mobile | UI-8, AC-22 | P1 | E2E | viewport 375 | 1. Open `/` | Mobile header variant per `08-header--variants.svg`, all links reachable |
| TC-75 | Admin sees admin table | AC-19, UI-7, FR-10 | P1 | E2E | `e2eUser=admin`; mock players incl. 0-game player | 1. Open `/admin` | `07-admin--default.svg`: columns email, score, streak, W/L/D, last played; includes 0-game players; sorted by Score by default |
| TC-76 | Admin sortable headers | UI-7 | P1 | E2E | as TC-75 | 1. Click each sortable header twice 2. Check `aria-sort` | Rows reorder asc/desc; active header has `aria-sort="ascending"/"descending"`, others none/not set; sort is by keyboard operable button |
| TC-77 | Admin last played in local time zone | AC-19 | P1 | E2E | context `timezoneId` set (e.g. Asia/Bangkok) and mock ISO timestamp | 1. Open `/admin` | Displayed time equals timestamp converted to the viewer's zone |
| TC-78 | Admin mobile | UI-7, AC-22 | P1 | E2E | `e2eUser=admin`, 375px | 1. Open `/admin` | `07-admin--default-mobile.svg`: card list with sort select; changing select reorders; no horizontal scroll |
| TC-79 | Non-admin not authorized on `/admin` | AC-20, UI-7 | P1 | E2E | `e2eUser=player`; mock `/api/admin/players` returns 403 | 1. Open `/admin` directly | `07-admin--forbidden.svg` state; no player data shown |
| TC-80 | Non-admin has no Admin nav link | AC-20, UI-8 | P1 | E2E | `e2eUser=player` | 1. Inspect header on all pages | No "Admin" link |
| TC-81 | Admin header | UI-8, AC-28 | P1 | E2E | `e2eUser=admin` | 1. Open `/admin` | Nav: Leaderboard, Admin, Sign out (no Play); name "Admin OX", initials "AO" |
| TC-82 | Admin can open Leaderboard | Decision 6, UI-6 | P1 | E2E | `e2eUser=admin` | 1. Click Leaderboard | Leaderboard shown, no email, admin row absent from list |
| TC-83 | Admin check on server | AC-20 | P2 | unit | fake verifier | Token email `adminox@gmail.com` + password provider → 200; `ADMINOX@Gmail.com` + password → 200; same email with google.com provider → 403; other email + password → 403; no `/api/admin/*` for player | As listed (test-be) |
| TC-84 | Admin list excluded admin / leaderboard excludes admin | AC-28, AC-18 | P2 | unit | fake Firestore | Seed users incl. a stray doc for admin email | Neither `/api/leaderboard` nor `/api/admin/players` return admin (test-be) |
| TC-85 | Admin sees real data | AC-19, AC-20 | P2 | manual-UAT | Real stack, ≥ 2 players with games | 1. Admin login at `/login/admin` 2. Open `/admin` | Real emails, scores, streak, W/L/D, last played; non-admin Google player gets forbidden |
| TC-86 | Leaderboard reflects real play | AC-18 | P2 | manual-UAT | Real stack, 2 Google accounts | 1. Both finish a game 2. Open `/leaderboard` | Both listed, correct order, no email |
| TC-87 | Admin list loading / error | UI-9 | P1 | E2E | `e2eUser=admin`, mock delayed then 500 | 1. Open `/admin` | "Loading…" then `role="alert"` error |

## S5 Non-functional

| TC | Title | AC / UI | Pri | Type | Preconditions | Steps | Expected |
|---|---|---|---|---|---|---|---|
| TC-88 | Firestore rules deny all client access | AC-21, NFR-1 | P2 | unit | Rules file; emulator if available | Try get/list/create/update/delete on `users`, `games`, `config` unauthenticated and authenticated | All denied. If emulator is not available: review `firestore.rules` has only `allow read, write: if false` |
| TC-89 | Rules in real project | AC-21 | P2 | manual-UAT | Rules deployed to real project | 1. In browser console with Firebase client SDK, read `users/{uid}` and `config/bot` while signed in | `permission-denied` |
| TC-90 | 360px width no horizontal scroll | AC-22, NFR-5 | P1 | E2E | viewport 360x800 | 1. Visit `/login`, `/login/admin`, Setup, Game, Game over, Leaderboard, `/admin` 2. Compare `scrollWidth` with `clientWidth` | No horizontal scroll on any page |
| TC-91 | Board keyboard + label (a11y, full flow) | AC-23 | P1 | E2E | game in progress | Covered by TC-21, TC-22; additionally verify Tab order enters board once and leaves it | See TC-21, TC-22 |
| TC-92 | Visible focus and basic a11y | NFR-4, UI-3 | P2 | manual-UAT | Browser | Tab through each page; check focus ring (dashed indigo), labels, contrast, screen reader reads status | All interactive items focusable, labelled, focus ring visible |
| TC-93 | README coverage (Thai) | AC-24, NFR-8 | P2 | manual-UAT | README.md | Read and check each item: Firebase project, Google sign-in, Firestore, service account env, enabling Email/Password, creating admin user, fixed email `adminox@gmail.com` created before deploy, `config/bot`, local run, tests, Vercel deploy, placeholders | Every item present, in Thai, no real secrets or project names |
| TC-94 | No secrets in repo | NFR-1 | P2 | manual-UAT | Repo | grep for private key, API key patterns; check `.env.example` | Only placeholders |
| TC-95 | E2E fake auth not in production bundle | plan risk | P2 | manual-UAT | Production build | `npm run build` then grep dist for `e2eAuth` / `e2eUser` | Not found |
| TC-96 | Performance of move | NFR-3 | P2 | manual-UAT | Deployed app | Time 20 moves in devtools Network | p95 < 1 s |
| TC-97 | Browser matrix | NFR-6 | P2 | manual-UAT | Chrome, Safari, Firefox, Edge latest | Run login, one game, leaderboard | Works the same |

## S6 Admin login (FR-13)

| TC | Title | AC / UI | Pri | Type | Preconditions | Steps | Expected |
|---|---|---|---|---|---|---|---|
| TC-98 | Admin login default state | UI-10, AC-29 | P1 | E2E | `e2eUser=none` | 1. Open `/login/admin` | `09-login-admin--default.svg`: "Admin sign in", ADMIN badge, Email and Password inputs with real `<label>`s (`getByLabel`), Show button, Sign in button. No Google button, sign-up, reset link, or "back to player login" link |
| TC-99 | Show / hide password | UI-10 | P1 | E2E | as TC-98 | 1. Click Show 2. Click Hide | Input type toggles password/text; button has `aria-pressed` and `aria-label`; it is `type="button"` (does not submit) |
| TC-100 | Admin login success | AC-25 | P1 | E2E | fake admin credentials accepted; mock `/api/me` returns `{profile:null,isAdmin:true}` | 1. Enter email and password 2. Sign in | Lands on `/admin` showing admin table |
| TC-101 | Admin stays signed in after refresh | AC-25 | P1 | E2E | after TC-100 / `e2eUser=admin` | 1. Reload `/admin` | Still on `/admin`, no redirect |
| TC-102 | Admin sign out returns to `/login/admin` | AC-25 | P1 | E2E | `e2eUser=admin` | 1. Click Sign out | URL `/login/admin` |
| TC-103 | Wrong credentials: generic alert | AC-26, UI-10 | P1 | E2E | fake rejects with wrong password / unknown email | 1. Submit wrong password 2. Submit unknown email | Both show same `role="alert"` "Invalid email or password."; no field-specific marking; per `09-login-admin--error.svg`; email kept, password cleared, focus in password |
| TC-104 | Loading state disables button | AC-26, UI-10 | P1 | E2E | fake sign-in delayed | 1. Submit 2. Click button again | `09-login-admin--loading.svg`: button disabled "Signing in…"; only one request |
| TC-105 | Non-admin valid account rejected with same message | AC-27 | P1 | E2E | fake sign-in succeeds for `player@example.com`; mock `/api/me` `isAdmin:false` | 1. Submit those credentials | Client signs out immediately; alert text exactly "Invalid email or password." identical to TC-103; remains on `/login/admin`; opening `/admin` afterwards is still redirected to `/login/admin` |
| TC-106 | Non-admin gets 403 from admin API | AC-27, AC-20 | P2 | unit | fake verifier, non-admin password account | Call `/api/admin/players` | 403 (test-be) |
| TC-107 | Real admin login | AC-25, FR-13 | P2 | manual-UAT | Real Firebase, `adminox@gmail.com` created in console | 1. Open `/login/admin` 2. Sign in with real password 3. Refresh 4. Sign out | Lands `/admin`, refresh keeps session, sign out → `/login/admin` |
| TC-108 | Real wrong password / unknown email | AC-26 | P2 | manual-UAT | Real Firebase | 1. Wrong password for admin 2. Unknown email 3. Valid second email/password test account (non-admin) | Identical "Invalid email or password." in all three; account in 3 is signed out |
| TC-109 | Too many attempts | UI-10 (proposal 8) | P2 | manual-UAT | Real Firebase | 1. Fail login repeatedly | Message "Too many attempts. Try again later." in the same alert (shown only if implemented; otherwise record as note) |
| TC-110 | Admin `/api/me` and profile | AC-28 | P2 | unit | fake Firestore | Call `/api/me` with admin token | `{ profile: null, isAdmin: true }`; no `users/{uid}` created (test-be) |
| TC-111 | Admin never gets a profile (real) | AC-28 | P2 | manual-UAT | Real Firestore | 1. After TC-107 check Firestore | No `users/{adminUid}` doc; admin absent from Leaderboard and Admin list |
| TC-112 | Admin redirected away from `/` and `/login/admin` | Flow in mockups, AC-28 | P1 | E2E | `e2eUser=admin` | 1. Open `/` 2. Open `/login/admin` | Both end on `/admin` |
| TC-113 | Player cannot reach admin login to bypass | AC-29, AC-20 | P1 | E2E | `e2eUser=player` | 1. Open `/admin` | Forbidden state (TC-79); player flow unaffected |
| TC-114 | Admin login mobile 360px | UI-10, AC-22 | P1 | E2E | viewport 360x800 | 1. Open `/login/admin` | `09-login-admin--default-mobile.svg`, fields and button fully visible, no horizontal scroll |
| TC-115 | Admin login visually distinct | UI-10 | P2 | manual-UAT | Browser | Compare `/login` and `/login/admin` | Slate background, no X/O pattern, shield icon, ADMIN badge, per mockups |
| TC-116 | `/login` has no admin form or link | AC-29 | P1 | E2E | `e2eUser=none` | Covered by TC-4; also check page source / all anchors | No `type=password` input, no anchor to `/login/admin` |

---

## Regression

New repo, no prior features. Re-run on every change to these shared areas:

| Area changed | Re-run |
|---|---|
| `shared/` scoring / board / bot | TC-30, TC-36, TC-37, TC-59, TC-60, then E2E TC-47..TC-52 |
| Auth / guards / router / header | TC-1..TC-3, TC-10, TC-11, TC-45, TC-79..TC-82, TC-100..TC-102, TC-112 |
| API client / error handling | TC-29, TC-41, TC-42, TC-72, TC-87 |
| Layout / CSS | TC-57, TC-71, TC-74, TC-78, TC-90, TC-114 |
| Server token check / admin check | TC-13, TC-83, TC-106, TC-110 |
| Firestore rules / data model | TC-88, TC-89, TC-60 |

Full P1 suite is run at Phase 5 (QA verify) together with lint, typecheck, unit tests and build.

---

## Coverage matrix

| Criterion | TC |
|---|---|
| AC-1 | TC-1, TC-2, TC-3 |
| AC-2 | TC-7, TC-8, TC-9 |
| AC-3 | TC-10, TC-11, TC-12 |
| AC-4 | TC-13, TC-14, TC-15, TC-44 |
| AC-5 | TC-17, TC-20, TC-39 |
| AC-6 | TC-27, TC-28, TC-29, TC-42 |
| AC-7 | TC-24, TC-26, TC-39 |
| AC-8 | TC-30, TC-53 |
| AC-9 | TC-31, TC-32, TC-33, TC-34, TC-35, TC-40 |
| AC-10 | TC-36 |
| AC-11 | TC-37, TC-38 |
| AC-12 | TC-47, TC-59 |
| AC-13 | TC-34, TC-35, TC-50, TC-51, TC-59 |
| AC-14 | TC-52, TC-59 |
| AC-15 | TC-48, TC-49, TC-59 |
| AC-16 | TC-26, TC-60, TC-61 |
| AC-17 | TC-58, TC-63 |
| AC-18 | TC-64, TC-65, TC-66, TC-67, TC-68, TC-70, TC-84, TC-86 |
| AC-19 | TC-75, TC-77, TC-85 |
| AC-20 | TC-79, TC-80, TC-83, TC-85, TC-106, TC-113 |
| AC-21 | TC-62, TC-88, TC-89 |
| AC-22 | TC-57, TC-71, TC-74, TC-78, TC-90, TC-114 |
| AC-23 | TC-21, TC-22, TC-91 |
| AC-24 | TC-93 |
| AC-25 | TC-100, TC-101, TC-102, TC-107 |
| AC-26 | TC-103, TC-104, TC-108 |
| AC-27 | TC-105, TC-106, TC-108 |
| AC-28 | TC-45, TC-46, TC-81, TC-84, TC-110, TC-111, TC-112 |
| AC-29 | TC-4, TC-98, TC-116 |
| UI-1 | TC-4, TC-5, TC-6 |
| UI-2 | TC-17, TC-18, TC-19, TC-58, TC-63 |
| UI-3 | TC-20, TC-21, TC-22, TC-23, TC-24, TC-25 |
| UI-4 | TC-47, TC-48, TC-50, TC-52, TC-53, TC-54, TC-55, TC-56, TC-57 |
| UI-5 | TC-31, TC-33 |
| UI-6 | TC-64, TC-69, TC-70, TC-71 |
| UI-7 | TC-75, TC-76, TC-78, TC-79 |
| UI-8 | TC-11, TC-16, TC-73, TC-74, TC-80, TC-81 |
| UI-9 | TC-29, TC-41, TC-42, TC-72, TC-87 |
| UI-10 | TC-98, TC-99, TC-103, TC-104, TC-114, TC-115 |

All 29 AC and 10 UI criteria have at least one case.

## Criteria that cannot be fully automated, and why

| Criterion | Limit | Handling |
|---|---|---|
| AC-2, AC-3 (real part), FR-2 | Google OAuth popup cannot be automated reliably; `VITE_E2E` fake user does not exercise Firebase | TC-7, TC-8, TC-12 manual-UAT (E2E covers only the guard / refresh / sign-out behaviour with the fake user) |
| AC-25..AC-27 (real part) | Real Firebase email/password and the `adminox@gmail.com` console account | TC-107, TC-108 manual-UAT; E2E uses the fake admin |
| AC-4 (real part), AC-16 (real concurrency), AC-21 (real rules), AC-11 config doc, AC-9 persistence | Need real Vercel Functions / Firestore (E2E mocks the API) | Unit tests with fake Firestore plus TC-14, TC-38, TC-40, TC-61, TC-89 manual-UAT |
| AC-10, AC-11, AC-8, AC-12..AC-15 logic | The mocked API cannot prove server logic | `unit` cases (TC-30, TC-36, TC-37, TC-59); E2E only checks UI rendering of results |
| AC-24 README | Document review, not executable | TC-93 manual |
| NFR-3 performance, NFR-6 browsers, real time-zone | Not in E2E (Chromium only with mock) | TC-96, TC-97 manual |
| TC-109 "Too many attempts" | Only a proposal in mockups, not an AC | Verify only if implemented |

## Counts

Total 116 cases: P1 = 70 (all E2E) · P2 = 46 (manual-UAT 27, unit 18, E2E-exploratory 1).

---

## E2E automation map (Playwright, T14)

Specs live in `e2e/*.spec.ts`; mock API and helpers in `e2e/helpers/` (`mockApi.ts` stateful `/api/*` mock, `auth.ts` test-only patches of `e2eAuth.ts`, `ui.ts`, `fixtures.ts`). Test titles start with the TC id. Run: `npx playwright test`.

P1 cases: 70, automated: 70, not automated: 0.

| TC | Spec file | Test title (after TC id) |
|---|---|---|
| TC-1 | `e2e/login-guard.spec.ts` | logged out / redirects to /login |
| TC-2 | `e2e/login-guard.spec.ts` | logged out /leaderboard redirects to /login |
| TC-3 | `e2e/login-guard.spec.ts` | logged out /admin redirects to /login/admin |
| TC-4 | `e2e/login-guard.spec.ts` | login default state has Google only and no admin entry point |
| TC-5 | `e2e/login-guard.spec.ts` | login loading state blocks a second sign-in |
| TC-6 | `e2e/login-guard.spec.ts` | login error state shows alert and allows retry |
| TC-10 | `e2e/login-guard.spec.ts` | session survives refresh |
| TC-11 | `e2e/login-guard.spec.ts` | sign out returns to login and / is guarded again |
| TC-16 | `e2e/login-guard.spec.ts` | signed-out header variant shows no app navigation |
| TC-17 | `e2e/game-play.spec.ts` | setup default state for a new player |
| TC-18 | `e2e/game-play.spec.ts` | setup preselects the last played difficulty |
| TC-19 | `e2e/game-play.spec.ts` | setup loading state disables the controls |
| TC-20 | `e2e/game-play.spec.ts` | start creates an empty board and the player moves first |
| TC-21 | `e2e/game-play.spec.ts` | board cells are labelled buttons |
| TC-22 | `e2e/game-play.spec.ts` | keyboard play with arrows, Enter and Space |
| TC-24 | `e2e/game-play.spec.ts` | move gets one bot reply and the board is locked while thinking |
| TC-25 | `e2e/game-play.spec.ts` | status text is an aria-live polite region |
| TC-26 | `e2e/game-play.spec.ts` | double click sends one move and a click while locked is ignored |
| TC-29 | `e2e/game-play.spec.ts` | UI recovers when the server rejects a move |
| TC-31 | `e2e/game-resume.spec.ts` | resume banner after reload |
| TC-32 | `e2e/game-resume.spec.ts` | resume restores the board and difficulty |
| TC-33 | `e2e/game-resume.spec.ts` | start new game asks for confirmation and Cancel keeps the game |
| TC-34 | `e2e/game-resume.spec.ts` | confirm abandons the game as a loss and starts a new one |
| TC-41 | `e2e/game-play.spec.ts` | start failure shows an alert and re-enables the controls |
| TC-42 | `e2e/game-play.spec.ts` | network error during a move keeps the board and allows a retry |
| TC-45 | `e2e/game-play.spec.ts` | admin cannot play: redirected to /admin without a Play link |
| TC-47 | `e2e/game-scoring.spec.ts` | win +1 on a diagonal |
| TC-48 | `e2e/game-scoring.spec.ts` | third win in a row gives +2 and resets the streak |
| TC-49 | `e2e/game-scoring.spec.ts` | streak restarts after the bonus |
| TC-50 | `e2e/game-scoring.spec.ts` | loss -1 shows "You lose" with the bot line |
| TC-51 | `e2e/game-scoring.spec.ts` | score goes negative and is shown with a minus sign (stats panel); score goes negative and is shown with a minus sign (leaderboard row) |
| TC-52 | `e2e/game-scoring.spec.ts` | draw gives 0 points and resets the streak |
| TC-54 | `e2e/game-scoring.spec.ts` | result is not conveyed by colour only |
| TC-55 | `e2e/game-scoring.spec.ts` | Play again keeps the difficulty and skips Setup |
| TC-56 | `e2e/game-scoring.spec.ts` | Change difficulty goes to Setup with updated stats |
| TC-57 | `e2e/game-scoring.spec.ts` | game over mobile layout has no horizontal scroll |
| TC-58 | `e2e/game-scoring.spec.ts` | stats update after each finished game (win, loss, draw) |
| TC-63 | `e2e/game-scoring.spec.ts` | streak text and hint for 0, 1 and 2 wins in a row |
| TC-64 | `e2e/leaderboard.spec.ts` | default: rows sorted with rank, name, score and W/L/D |
| TC-65 | `e2e/leaderboard.spec.ts` | leaderboard never shows an email |
| TC-67 | `e2e/leaderboard.spec.ts` | tied players are ranked sequentially in server order |
| TC-69 | `e2e/leaderboard.spec.ts` | current user row is marked with a You tag |
| TC-70 | `e2e/leaderboard.spec.ts` | empty state |
| TC-71 | `e2e/leaderboard.spec.ts` | leaderboard mobile has no horizontal scroll |
| TC-72 | `e2e/leaderboard.spec.ts` | loading then error state |
| TC-73 | `e2e/header.spec.ts` | player header: Play, Leaderboard, Sign out, name and initials; player header falls back to the email prefix without a display name |
| TC-74 | `e2e/header.spec.ts` | header on mobile keeps every link reachable |
| TC-75 | `e2e/admin-page.spec.ts` | admin table lists all players, sorted by score by default |
| TC-76 | `e2e/admin-page.spec.ts` | sortable headers reorder rows and expose aria-sort |
| TC-77 | `e2e/admin-page.spec.ts` | last played is shown in the viewer time zone (Bangkok, UTC+7); last played is shown in the viewer time zone (New York, UTC-5) |
| TC-78 | `e2e/admin-page.spec.ts` | admin mobile shows cards with a sort select |
| TC-79 | `e2e/admin-page.spec.ts` | non-admin sees the not-authorized state and no player data |
| TC-80 | `e2e/admin-page.spec.ts` | non-admin has no Admin nav link on any page |
| TC-81 | `e2e/header.spec.ts` | admin header: Leaderboard, Admin, Sign out, name Admin OX |
| TC-82 | `e2e/leaderboard.spec.ts` | admin can open the leaderboard without emails or an admin row |
| TC-87 | `e2e/admin-page.spec.ts` | admin list loading then error state |
| TC-90 | `e2e/responsive-360.spec.ts` | no horizontal scroll at 360px on every page |
| TC-91 | `e2e/game-play.spec.ts` | Tab enters the board once and leaves it |
| TC-98 | `e2e/admin-login.spec.ts` | default state: email/password only, no other entry points |
| TC-99 | `e2e/admin-login.spec.ts` | show / hide password toggles input type and does not submit |
| TC-100 | `e2e/admin-login.spec.ts` | admin login success lands on /admin table |
| TC-101 | `e2e/admin-login.spec.ts` | admin stays signed in after refresh |
| TC-102 | `e2e/admin-login.spec.ts` | admin sign out returns to /login/admin |
| TC-103 | `e2e/admin-login.spec.ts` | wrong password and unknown email give the same generic alert |
| TC-104 | `e2e/admin-login.spec.ts` | loading state disables the button and sends one sign-in |
| TC-105 | `e2e/admin-login.spec.ts` | valid non-admin account is rejected with the same message |
| TC-112 | `e2e/admin-login.spec.ts` | signed-in admin is redirected from / and /login/admin to /admin |
| TC-113 | `e2e/admin-login.spec.ts` | player cannot bypass through admin routes |
| TC-114 | `e2e/admin-login.spec.ts` | admin login mobile 360px fits without horizontal scroll |
| TC-116 | `e2e/login-guard.spec.ts` | /login has no admin form or link |

Notes on partial coverage (asserted by role/label/text only, not pixel/visual comparison with the SVG mockups):

- TC-5, TC-6: the fake `signInWithGoogle` is instant and never fails, so the spec patches the module served by Vite (`helpers/auth.ts`) to delay or reject it. Source files are not changed.
- TC-103 "wrong password": the fake accepts any non-empty password for `adminox@gmail.com`; the spec patches the fake to reject password `wrong-password`. TC-73 email-prefix fallback uses the same patch (player without display name).
- TC-17, TC-63: streak dots are `aria-hidden` and have no role; only the `x/3` text and hint are asserted, not filled dots or pill colour.
- TC-47, TC-50, TC-54: winning-cell highlight is asserted through the cell class (`board__cell--win` / `--loss`); the strike line SVG is `aria-hidden` and not asserted. No icon assertion.
- TC-69, TC-73: "left bar" and "bold + underline" are visual; asserted through the "You" tag, `aria-current` on the row, and `aria-current="page"` on the nav link.
- TC-18: the last difficulty is client-side (`localStorage` key `ox:lastDifficulty`), not in the profile.
- TC-25: located with `[aria-live="polite"]` because the status `<p>` has no role.
- TC-79 / TC-113: the app decides from `isAdmin` in `/api/me`, so a player never calls `/api/admin/players` (asserted: 0 requests). The 403 is mocked as well.
- TC-104: sign-in triggers `/api/me` twice (sign-in check plus auth provider); the spec asserts no extra request after a forced second click.
- Known failing: TC-51 (stats panel) is red because of an app defect (negative score rendered with ASCII "-" instead of "−"; see QA report).

---

## QA verify results (Phase 5.2, qa-engineer)

**Verdict: PASS WITH NOTES** (no Blocker/Major; Minor visual gaps vs mockups; manual-UAT cases still need the approver).

Environment: Chromium (Playwright), `VITE_E2E=true`, only `/api/*` mocked. Note: the working tree had uncommitted changes by someone else while this ran (`src/auth/AuthContext.tsx`, `server/auth.ts`, `package.json`, ...); results are for the tree as it was during the run.

### Real run

| Command | Result |
|---|---|
| `npx playwright test` | 73 passed, 0 failed, 0 skipped (51 s). TC-51 (stats panel minus sign) is now green; the "Known failing" note above is stale. |

### P2 cases / regression checked in a real browser (scratch scripts, not in repo)

| TC | Result | Evidence |
|---|---|---|
| TC-15 (API 401 on `/api/me`) | pass, behaviour noted | Page stays in the shell and shows "Could not load your account / <raw server message> / Try again / Sign out". It does not redirect to `/login`, and the raw server message is shown. |
| TC-43 (back/forward) | pass | Resume banner after reload; Resume restores X/O; Leaderboard then Back shows the setup/resume banner again with server state, no duplicated marks. |
| TC-53 (win lines) | partial | Diagonal, row and column drawn correctly for player and bot (green/red, strike line, text "right column"/"middle row"/"diagonal"). The other 5 lines not rendered. |
| TC-92 (keyboard / focus) | pass | Arrows move focus, edges do not wrap, Enter plays, focus ring is dashed indigo, Tab enters the board once and leaves it. |
| TC-26 (double click) | pass | `dblclick` while the bot is thinking sent 1 move; cells are `aria-disabled="true"` (not `disabled`). |
| TC-41 / TC-42 (500 on start / move) | pass | Alert "Couldn't reach the server. Try again."; board unchanged; controls usable. The alert pushes the board down about 65 px (layout shift). |
| TC-11 / sign out and back in | pass | Sign out -> `/login`; `/` -> `/login`; Google sign-in (fake) -> `/`. |
| TC-99, TC-100, TC-102, TC-103 (admin login) | pass | Show toggles type; Enter submits; success -> `/admin`; sign out -> `/login/admin`; wrong account -> "Invalid email or password.", email kept, focus in password. |
| TC-112 | pass | Admin on `/`, `/login`, `/login/admin` ends on `/admin`; `/leaderboard` stays on the leaderboard. |
| TC-113 / player routes | pass | Player on `/admin` sees "Not authorized" and makes 0 `/api/admin/*` calls; player on `/login/admin` sees the admin login form (not redirected; spec only requires redirecting admins); player on `/login` goes to `/`. |
| TC-90 (360 px) | pass | `scrollWidth - clientWidth = 0` on login, admin login, setup, game, leaderboard, admin (cards), forbidden, game over. |
| TC-115 | pass | Admin login: slate background, no X/O, shield, ADMIN badge. |
| Regression (auth/router/header, API errors, layout) | pass | Covered by the 73 E2E plus the checks above. |

Not run (need unit tooling or real services): all `unit` cases (TC-9, 13, 27, 28, 30, 35-37, 46, 59, 60, 66, 68, 83, 84, 88, 106, 110) are owned by test-be/test-fe and were not part of this task. TC-23 (grayscale) and TC-97 (Safari/Firefox/Edge) not run: only Chromium available.

### Bugs

| # | Sev | Where | Steps | Expected | Actual | Screenshot |
|---|---|---|---|---|---|---|
| B1 | Minor | Leaderboard at 360 px | Open `/leaderboard`, 360 px, player "Alex Morgan" is You | Name stays readable on one line or wraps at a word | Name breaks inside the word ("Morga" / "n") because the You tag and 3 stat columns squeeze the name | `.../scratchpad/qa/lb-m.png` |
| B2 | Minor | Game over (all variants) | Finish any game | Result card has an icon (trophy / robot / "=" / star) and a "+1 / -1 / 0" pill, sits beside the board on desktop (`04-gameover--*.svg`) | No icon, points are plain big text, card is below the board on desktop so Play again may be below the fold; on 360/375 px the buttons need a scroll | `go-win.png`, `go-win-m.png`, `go-loss2.png` |
| B3 | Minor | Setup / stats / game | Open `/` | Per mockups: radio indicators, Easy/Hard icon pill, Wins green tile, Losses red tile, amber streak dots/pill, "Difficulty: X" pill, compact stats bar on mobile | Plain indigo dots, grey tiles, no radios, difficulty only in sub-text, full stats card below the board on mobile | `setup.png`, `game.png`, `game-m.png` |
| B4 | Nit | Login pages | Open `/login` | Decorative X/O shapes in the background; eye icon next to Show; "!" icon in the error alert | None of these three | `login.png`, `adminlogin.png`, `x-adminlogin-err.png` |
| B5 | Nit | Unknown URL | Open `/nonexistent` (any user) | Redirect or a not-found message | Empty page (no catch-all route) | - |
| B6 | Nit | Resume confirm | Click Start new game | Danger-style confirm button (mockup proposal 2) | Primary indigo "Yes, start new game" (text and Cancel are correct) | `resume-confirm.png` |

Visually matching the mockups: login, admin login (default, error), leaderboard (medals, You row with bar, minus sign in red, empty), admin table (sort indicator, "Visible to admins only", dash for no games) and mobile cards with sort select, forbidden state, winning cells and strike line (green/red, no overflow, stylesheet loaded), "You lose" headline, draw without highlight, 3 equal board rows.

### Manual UAT for the approver (real Google / Firebase / Firestore)

1. TC-7: open `/login`, Sign in with Google with an account never used. Expect the game page; in Firestore console `users/{uid}` exists with score 0, streak 0, wins/losses/draws 0.
2. TC-8: Sign out, sign in again with the same account after playing one game. Score, streak, stats unchanged.
3. TC-12: signed in with Google, refresh, then close the tab and reopen the site. Still signed in; Sign out returns to `/login`.
4. TC-107: create `adminox@gmail.com` (Email/Password) in Firebase console. Open `/login/admin`, sign in, refresh, sign out. Lands on `/admin`, refresh keeps the session, sign out returns to `/login/admin`.
5. TC-108: on `/login/admin` try a wrong password, an unknown email, and a valid second email/password account that is not admin. All three show exactly "Invalid email or password."; the third is signed out.
6. TC-109: fail the admin login many times. Expect "Too many attempts. Try again later." if implemented, otherwise record a note.
7. TC-111 / TC-85: after step 4 check Firestore has no `users/{adminUid}`; `/admin` lists real emails/scores/streak/W/L/D/last played; a non-admin Google player on `/admin` gets "Not authorized"; admin is absent from `/leaderboard`.
8. TC-38 / TC-39: set `config/bot.hardMistakeRate` to 0 then 1 (and delete the doc), play Hard games. 0: bot never loses; 1: random-looking moves; missing doc: default 0.2.
9. TC-40 / TC-44: start a game, make 2 moves, close the tab, return from another browser: resume banner with same board. Revoke/expire the session mid-game and click a cell: app recovers or shows an error, score unchanged.
10. TC-61 / TC-62 / TC-89: replay the final-move request twice (devtools or curl): score changes once. In the browser console with the Firebase client SDK, write `users/{uid}.score` and read `config/bot`: `permission-denied`.
11. TC-14: `curl` `/api/me`, `/api/leaderboard`, `/api/admin/players` on the deployed app (or `vercel dev`) with no token and with `Bearer abc`: 401 JSON each.
12. TC-86: two Google accounts each finish a game; `/leaderboard` lists both in the right order without email.
13. TC-93, TC-94, TC-95, TC-96, TC-97: README review, secret grep, `npm run build` then grep `dist` for `e2eAuth`/`e2eUser`, p95 move time under 1 s, browser matrix.
