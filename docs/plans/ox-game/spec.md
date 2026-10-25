# OX Game — Spec

> Status: **Gate 0 approved (with changes) — Gate A approved — Phase 2–3 done, Gate B approved — Phase 4 in progress**
> Change request (approver, after Gate A): separate admin login at `/login/admin` with Firebase email/password — see "Changes" table, FR-13 and S6.

## Goal Agreement

- **Goal:** เว็บเกม OX (ผู้เล่น vs บอท) ที่ต้องล็อกอินก่อนเล่น มีระบบคะแนน และหน้าสำหรับตรวจคะแนนผู้เล่นทั้งหมด deploy บน Vercel
- **ปัญหา / เหตุผล:** โจทย์สมัครงาน ส่งมอบเป็น Git repo พร้อมคู่มือ แล้วส่ง URL ไปที่ careers@bifrostconnect.co.th
- **ผู้ใช้:** ผู้เล่นทั่วไป (ล็อกอิน Google) และผู้ตรวจ/แอดมิน (ดูคะแนนทุกคน)
- **Success criteria:**
  1. ยังไม่ล็อกอินแล้วเล่นไม่ได้ และล็อกอินด้วย Google ผ่าน Firebase Authentication (OAuth 2.0 / OpenID Connect) ได้
  2. กติกา OX ถูกต้อง (ชนะ แพ้ เสมอ) เล่นกับบอทได้ เลือกระดับความยากได้ 2 ระดับ (ง่าย / ยาก)
  3. ชนะ +1, แพ้ −1 และชนะติดกัน 3 ครั้งได้โบนัส +1 แล้วนับ streak ใหม่
  4. หน้า Leaderboard/Admin แสดงคะแนนผู้เล่นทั้งหมด
  5. Production บน Vercel ใช้งานได้จริง มี README ภาษาไทย (setup, env, deploy)
- **In scope:** Vite + React + TypeScript, Firebase Auth (Google), Firestore, Vercel Functions (game / scores API ที่ตรวจ ID token ด้วย Firebase Admin SDK), Vitest, Playwright, README
- **Out of scope:** ระบบสมาชิกเอง, multiplayer ผู้เล่นกับผู้เล่น, provider อื่นนอกจาก Google (ผู้เล่น) และ Email/Password (เฉพาะ admin), หน้า sign-up / reset password / จัดการ admin ใน UI, ขนาดกระดานอื่น, ระบบชำระเงิน
- **Constraints / deadline:** ไม่ระบุ deadline; ห้ามใส่ secret ลงโค้ด (ใช้ env และ `.env.example`)
- **Design reference:** ไม่มี
- **Scope mode:** Full
- **Execution mode:** Subagents
- **Team:** ux-ui-designer, frontend-developer, backend-developer, test-fe-engineer, test-be-engineer, qa-engineer, code-reviewer (ข้าม codebase-researcher เพราะ repo ใหม่)
- **E2E:** Playwright (ต้องขออนุมัติก่อนติดตั้งใน Phase 4)
- **Working branch:** `development` (PR เข้า `main`)
- **Deploy:** ผู้อนุมัติ deploy เองหลัง merge PR เข้า `main` (ทีมไม่ deploy)
- **Approver:** ผู้ใช้ใน session นี้
- **Token budget:** none
- **Price per 1M tokens:** ไม่ระบุ (ดูจาก `/usage` ที่ Gate C)

## Changes from the Gate 0 draft

| เดิม | เปลี่ยนเป็น | ผลกระทบ |
|---|---|---|
| Google OAuth ตรง + Neon Postgres | Firebase Auth (Google) + Firestore | ลดงาน session/CSRF ประมาณ 0.5–1 md; ต้องตั้ง Firebase Admin service account บน Vercel; README ต้องอธิบายว่า Firebase Google sign-in ใช้ OAuth 2.0 / OIDC อยู่เบื้องหลัง |
| ความยากบอทระดับเดียว | 2 ระดับ: ง่าย / ยาก | เพิ่ม FR-5, ต้องมี test ของ bot ทั้งสองระดับ |
| Base branch `main` | ทำงานบน `development` | ดู Open Question Q1 |
| Deploy ตามที่ทีมเตรียม | ผู้อนุมัติ deploy เอง | ทีมไม่ต้องทำ pipeline; ต้องมีคู่มือ deploy + env list |
| Admin = Google อีเมลใน `ADMIN_EMAILS`, หน้า login เดียว | Admin login แยกที่ `/login/admin` ด้วย Firebase Email/Password; ผู้อนุมัติสร้าง user/pass เองใน Firebase console; **admin มีบัญชีเดียวตายตัว `adminox@gmail.com`** (constant ในโค้ด ไม่ใช้ env) | เพิ่ม FR-13 / S6 / UI-10 และ mockup ใหม่ ~+0.6 md; ไม่มีหน้า sign-up; เลิกใช้ env `ADMIN_EMAILS`; เช็กด้วยอีเมลตายตัว (Firebase อนุญาต 1 บัญชีต่ออีเมล จึงต้องสร้างบัญชี `adminox@gmail.com` ใน console ก่อน deploy ไม่งั้นคนอื่นสมัครอีเมลนี้ได้) |

## Functional Requirements

| ID | Requirement |
|---|---|
| FR-1 | ผู้ใช้ที่ยังไม่ล็อกอินเห็นเฉพาะหน้า Login และเข้าหน้าเกม/ leaderboard ไม่ได้ (ทั้งใน UI และที่ API) |
| FR-2 | ล็อกอิน/ล็อกเอาต์ด้วย Google ผ่าน Firebase Auth; session คงอยู่หลัง refresh |
| FR-3 | เมื่อล็อกอินครั้งแรก ระบบสร้าง profile ผู้เล่นใน Firestore (score 0, streak 0) |
| FR-4 | เล่น OX กระดาน 3×3 กับบอท: ผู้เล่นเป็น X เดินก่อน สลับตากับบอท (O) จนมีผู้ชนะ (3 ตัวติดกันแถว/คอลัมน์/ทแยง) หรือเสมอ (กระดานเต็ม) |
| FR-5 | ก่อนเริ่มเกมเลือกระดับบอทได้: **ง่าย** / **ยาก** |
| FR-6 | ชนะ +1 คะแนน, แพ้ −1 คะแนน, เสมอ 0 |
| FR-7 | ชนะติดต่อกัน 3 ครั้งได้โบนัส +1 (เกมที่ 3 ได้รวม +2) แล้วตัวนับ streak กลับเป็น 0 เริ่มนับใหม่; แพ้หรือเสมอ reset streak |
| FR-8 | แสดงคะแนนปัจจุบัน streak และสถิติ (ชนะ/แพ้/เสมอ) ของผู้เล่นบนหน้าเกม |
| FR-9 | หน้า Leaderboard แสดงผู้เล่นทั้งหมดเรียงตามคะแนน (ชื่อ, คะแนน, สถิติ) |
| FR-10 | หน้า Admin (เฉพาะ `adminox@gmail.com`) แสดงรายละเอียดของผู้เล่นทั้งหมด: อีเมล, คะแนน, streak, W/L/D, เวลาเล่นล่าสุด |
| FR-11 | ตัดสินผลและคำนวณคะแนนฝั่ง server เท่านั้น; client ส่งได้เฉพาะ "ช่องที่เดิน" และไม่สามารถเขียนคะแนนเองได้ |
| FR-12 | ผู้เล่นเริ่มเกมใหม่ได้หลังจบเกม; เกมที่ยังไม่จบแล้วออกจากหน้าไป กลับมาเล่นต่อได้ (ค่าเริ่มต้นตาม Q3) |
| FR-13 | Admin ล็อกอินที่หน้าแยก `/login/admin` ด้วย email + password (Firebase Auth Email/Password) บัญชี admin สร้างโดยผู้อนุมัติใน Firebase console ไม่มีการสมัครในแอป; บัญชีที่ไม่ใช่ admin ล็อกอินที่หน้านี้ไม่ได้; บัญชี admin ไม่ใช่ผู้เล่น (ไม่มี profile ไม่เล่นเกม ไม่อยู่ใน Leaderboard / รายการผู้เล่น) |

## Non-functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 Security | ตรวจ Firebase ID token ทุก request ที่ API; Firestore Security Rules ปฏิเสธการเขียนทั้งหมดจาก client; secret อยู่ใน env เท่านั้น (`.env.example` ไม่มีค่าจริง); admin ตรวจฝั่ง server |
| NFR-2 Data integrity | อัปเดตคะแนน/streak ด้วย Firestore transaction เพื่อกัน race (เช่น ส่งผลเกมซ้ำ) และเกมหนึ่งให้คะแนนได้ครั้งเดียว |
| NFR-3 Performance | เดินหมากแล้วได้ผลตอบกลับในเวลาที่รู้สึกทันที (เป้า < 1 วินาทีที่ p95 ในสภาพปกติ) |
| NFR-4 Accessibility | ใช้คีย์บอร์ดเล่นได้, ช่องกระดานมี label, สีไม่เป็นตัวบอกสถานะเพียงอย่างเดียว |
| NFR-5 Responsive | ใช้งานได้บนมือถือ (≥ 360px) และ desktop |
| NFR-6 Browser | Chrome, Safari, Firefox, Edge เวอร์ชันล่าสุด |
| NFR-7 Quality | TypeScript strict, lint + type check + test + build ผ่านก่อนส่ง; test ครอบกติกาเกม, bot, การคำนวณคะแนนและ streak |
| NFR-8 Docs | README ภาษาไทย: สร้าง Firebase project, เปิด Google sign-in, สร้าง Firestore, ตั้ง service account, env ทั้งหมด, รัน local, deploy บน Vercel |

## Assumptions

| หัวข้อ | ค่า default |
|---|---|
| Game logic | server เป็นผู้ตัดสิน (บอทเดิน, ตัดสินผล, คำนวณคะแนนฝั่ง server) |
| บอท **ง่าย** | เดินแบบสุ่ม โดยมีโอกาสน้อยที่จะบล็อก/ชนะเมื่อมีจังหวะ ผู้เล่นชนะได้ง่าย |
| บอท **ยาก** | minimax เป็นหลัก แต่สุ่มเดินพลาดบางตา (เริ่มต้น ~20% ของตาเดิน ค่าเก็บใน Firestore doc `config/bot` field `hardMistakeRate` ผู้อนุมัติปรับเองผ่าน Firebase console ไม่มี UI ปรับ; ถ้าไม่มี doc ใช้ 0.2) ผู้เล่นที่เล่นดีเสมอได้เสมอ และมีโอกาสชนะเป็นครั้งคราว |
| คะแนนต่างตามระดับ | ไม่ต่าง: ชนะ +1 / แพ้ −1 เท่ากันทุกระดับ |
| ผู้เริ่มก่อน | ผู้เล่นเป็น X และเดินก่อนเสมอ |
| เสมอ | 0 คะแนน และ reset streak |
| คะแนนติดลบ | ติดลบได้ |
| Streak | ชนะครั้งที่ 3 ติดกันได้ +1 รวมเป็น +2 ในเกมนั้น แล้ว streak = 0 |
| Admin | admin คนเดียว: อีเมล `adminox@gmail.com` (ตายตัวใน `shared/constants.ts`, เทียบแบบ case-insensitive); ไม่มี env; ผู้เล่นทั่วไปเห็นเฉพาะ Leaderboard (ชื่อกับคะแนน ไม่เห็นอีเมล) |
| Admin login | `/login/admin` ใช้ `signInWithEmailAndPassword`; หลังล็อกอินเรียก `/api/me` ถ้า `isAdmin=false` ให้ sign out ทันทีและแสดง error; ข้อความ error ของ credential ผิดเป็นข้อความกลางเดียวกัน (ไม่บอกว่า email หรือ password ผิด); admin ที่ล็อกอินแล้วเข้า `/` จะถูกพาไป `/admin` |
| ภาษา UI | อังกฤษ; README เป็นไทย |
| Backend | Vercel Functions + Firebase Admin SDK; client เรียก API ด้วย ID token (`Authorization: Bearer`) และอ่าน Firestore ตรงไม่ได้ |
| Firestore (ร่าง, ยืนยันใน Phase 2) | `users/{uid}` (profile, score, streak, wins, losses, draws), `games/{gameId}` (uid, board, difficulty, status, createdAt), `config/bot` (hardMistakeRate) |

## Open Questions — answered by approver

| # | คำถาม | คำตอบ |
|---|---|---|
| Q1 | สร้าง initial commit บน `main` แล้วแตก `development` | ได้ (ทำหลังผ่าน Gate B; push ยังต้องได้อนุมัติ) |
| Q2 | Git remote | GitHub เชื่อมแล้ว: `origin` = https://github.com/Benz085/web-application-ox.git |
| Q3 | เกมที่ยังไม่จบ | เล่นต่อได้ (เก็บเกมค้างใน Firestore) |
| Q4 | Leaderboard | ผู้เล่นทั่วไปเห็นชื่อ+คะแนน; admin เห็นรายละเอียดกว่า |
| Q5 | บอทระดับยาก | minimax แต่สุ่มพลาดบ้าง ผู้เล่นมีโอกาสชนะเป็นครั้งคราว; อัตราพลาดเก็บใน Firestore `config/bot` ปรับผ่าน Firebase console |
| Q6 | ชื่อ Firebase project / โดเมน Vercel | ใส่ placeholder ใน README แล้วผู้อนุมัติอัปเดตเอง |

## Commands to use in Phase 5 (repo ใหม่ จะยืนยันหลัง scaffold)

`npm run lint` · `npm run typecheck` · `npm test -- --coverage` · `npm run build` · `npx playwright test` (ชื่อสุดท้ายยืนยันหลัง scaffold)

## Estimate (Rough, ยังเป็นค่าเดิม)

~5–7 man-day รวม buffer · Subagents ~1.5–3M token (การเปลี่ยนเป็น Firebase ลดงานเล็กน้อย ตัวเลขละเอียดที่ Gate B)

## Gates

- [x] Gate 0 — Goal Agreement (อนุมัติพร้อมแก้ไขตามตาราง Changes)
- [x] Gate A — Requirement
- [x] Gate B — Design + Plan (approved, incl. admin login change request)
- [ ] Gate C — Validation (ก่อน push / เปิด PR)

## Stories & Acceptance Criteria (Phase 3)

### S1 Login (FR-1, FR-2, FR-3)
- **AC-1** Given a logged-out user, when they open `/` or `/leaderboard`, then they are redirected to `/login`; when they open `/admin`, then they are redirected to `/login/admin`.
- **AC-2** Given the Login page, when the user signs in with Google, then they land on the game page and a `users/{uid}` doc exists with score 0, streak 0 (created on first call only; later logins do not reset it).
- **AC-3** Given a signed-in user, when they refresh the page, then they stay signed in; when they sign out, then they return to `/login`.
- **AC-4** Given any `/api/*` request with a missing, malformed or expired ID token, then the response is 401 and no data is read or written.

### S2 Play vs bot (FR-4, FR-5, FR-11, FR-12)
- **AC-5** Given the setup screen, when the user picks Easy or Hard and starts, then an in-progress game with an empty board exists and the player (X) moves first.
- **AC-6** Given an in-progress game, when the player sends a move, then the server rejects (4xx, state unchanged) a move on an occupied cell, an out-of-range cell, a finished game, or a game owned by another user.
- **AC-7** Given a valid move that does not end the game, then the same response contains the bot's reply move.
- **AC-8** All 8 winning lines are detected for X and O; a full board with no line is a draw.
- **AC-9** Given an unfinished game, when the user reloads or returns later, then the Play page shows the Resume banner (mockup 05) and the same board and difficulty are restored on Resume. "Start new game" while a game is unfinished asks for confirmation, then abandons the old game as a loss (−1, streak 0) and starts a new one.
- **AC-10** Easy bot: random move, but takes an immediate win or block with a fixed probability (documented constant).
- **AC-11** Hard bot: reads `config/bot.hardMistakeRate` (default 0.2 when missing/invalid). With rate 0 it never loses (verified over all reachable positions); with rate 1 it plays random moves.

### S3 Scoring (FR-6, FR-7, FR-8)
- **AC-12** Win: +1 score, streak +1, wins +1.
- **AC-13** Loss: −1 score (may go negative), streak 0, losses +1.
- **AC-14** Draw: 0 score, streak 0, draws +1.
- **AC-15** Given streak 2, when the player wins, then score +2 in total (1 win + 1 bonus) and streak resets to 0; the next win starts a new count at 1.
- **AC-16** A result is applied exactly once per game: repeated or concurrent move requests after the game ended do not change score or stats (Firestore transaction).
- **AC-17** The game page shows current score, streak (x/3) and W/L/D, updated after each game.

### S4 Leaderboard & Admin (FR-9, FR-10)
- **AC-18** Leaderboard lists players who have finished at least one game, sorted by score desc (ties by wins desc, then name; ranks are sequential, no shared rank), showing name, score, W/L/D; it never exposes email. Admin page lists all players including those with 0 games.
- **AC-19** Admin page lists all players with email, score, streak, W/L/D, last played.
- **AC-20** Admin = a valid ID token whose email is `adminox@gmail.com` (case-insensitive) and whose sign-in provider is `password` (so it cannot be satisfied by a stray Google token). Non-admins get 403 from `/api/admin/*`, see a not-authorized state on `/admin`, and do not see the Admin nav link.

### S6 Admin login (FR-13)
- **AC-25** Given `/login/admin`, when an admin enters a valid email + password, then they land on `/admin`; a refresh keeps them signed in; sign out returns them to `/login/admin`.
- **AC-26** Given wrong credentials (unknown email or wrong password), then the page shows one generic `role="alert"` error ("Invalid email or password.") and does not reveal which field was wrong; the button is disabled while the request is running.
- **AC-27** Given a valid Firebase email/password account whose email is not `adminox@gmail.com`, when it signs in at `/login/admin`, then the client signs out immediately and shows the same "Invalid email or password." alert as for wrong credentials (the page never reveals that the password was right); `/api/admin/*` returns 403 for it.
- **AC-28** Given an admin account, `/api/me` returns `{ profile: null, isAdmin: true }` and creates no `users/{uid}` doc; `/api/game/*` returns 403 `ADMIN_ACCOUNT`; the admin is absent from Leaderboard and the Admin player list; the header shows Leaderboard, Admin and Sign out (no Play).
- **AC-29** The public `/login` page has no email/password form and no link to `/login/admin` (admin URL is not advertised); `/login/admin` has no sign-up, reset or Google option.

### S5 Non-functional
- **AC-21** Firestore Security Rules deny all client reads and writes (all access goes through the API).
- **AC-22** Layout works at 360px width without horizontal scroll.
- **AC-23** The board is operable by keyboard and each cell has an accessible label (position and mark).
- **AC-24** README (Thai) covers Firebase setup, Google sign-in, Firestore, service account env, enabling Email/Password and creating the admin user in the console, the fixed admin email `adminox@gmail.com` (must be created before deploy), `config/bot`, local run, tests, and Vercel deploy, with placeholders for project names/domains.

### UI criteria (from mockups in `mockups/`)
- **UI-1** Login shows default, loading and error states as `01-login--*.svg`; error uses `role="alert"`.
- **UI-2** Setup shows score, streak as 3 dots plus `x/3`, W/L/D, Easy/Hard choice (last played level preselected, Easy for new players) per `02-setup--*.svg`; controls disabled while starting.
- **UI-3** Game page per `03-game--*.svg`: X is a cross and O is a ring (shape, not colour); cells are buttons with labels like "Row 2, column 1, empty"; arrow keys move focus, Enter/Space plays; board is locked with a visible status while the bot is thinking; status text is in `aria-live="polite"`.
- **UI-4** Game over per `04-gameover--*.svg`: win (+1), win with bonus (+2, streak back to 0/3), loss (−1), draw (0); winning line shown by cell background, strike line and text; "Play again" keeps the same difficulty; "Change difficulty" goes to Setup.
- **UI-5** Resume banner per `05-resume--default.svg` with Resume and Start new game (with confirm).
- **UI-6** Leaderboard per `06-leaderboard--*.svg`: current user row bold with "You" tag and left bar; empty state; mobile layout from 375px.
- **UI-7** Admin per `07-admin--*.svg`: sortable headers with `aria-sort`; mobile card list with sort select; not-authorized state for non-admins.
- **UI-8** Header per `08-header--variants.svg`: Play / Leaderboard / Admin (admin only) and Sign out; signed-out variant. **Display name** in the header: Firebase `displayName`; if empty, the part of the email before `@` (e.g. `adminox`); the admin account shows the fixed name **"Admin OX"** (initials "AO"). Admin nav is Leaderboard · Admin only (no Play).
- **UI-10** Admin login per `09-login-admin--*.svg` (drawn, task D2: default, loading, error, mobile; no "back to player login" link): email + password fields with labels, show/hide password, default / loading / error states, `role="alert"` error, visually distinct from the player login, works at 360px.
- **UI-9** (not mocked, text only) Inline `role="alert"` message "Couldn't reach the server. Try again." when start/move/load fails (board returns to last server state); simple "Loading…" rows on Leaderboard/Admin with an error alert.

### Decisions on designer questions (defaults, approver may override)
1. Start new game with an unfinished game → confirm, then counts as a loss. 2. Resume via banner. 3. Ties: sequential rank by score, wins, name. 4. Leaderboard hides players with 0 finished games; Admin shows all. 5. "Last played" in viewer's local time zone. 6. Admin can also open Leaderboard.

### Definition of Done
All AC-* covered by a test (unit/integration or E2E or a manual case); lint, typecheck, unit/integration, build and E2E pass; QA verdict not FAIL; code-reviewer has no open Blocker/Major; no secrets in repo; `.env.example` up to date; README done.
