# Mockups: OX Game

SVG mockup แบบ polished (mid-fi) ภาพและ layout เหมือนรอบก่อนทุกหน้า แต่ปรับ visual style ให้ดูเป็นเกมที่ทันสมัยและเป็นมิตรขึ้น (ดู "Visual style" ด้านล่าง)
UI text เป็นภาษาอังกฤษตาม Assumptions · desktop `1440×900`, mobile `375×812` (ขนาด canvas และ layout เดิม plan ยังใช้ได้)
ทำ mobile เฉพาะหน้าที่ layout ต่างจริง (game, game over, leaderboard, admin) หน้าอื่นเป็น card กลางจอที่ย่อตามความกว้างได้ตรง ๆ
ข้อความตัวเอียงสีเทาในภาพคือ annotation สำหรับทีม ไม่ใช่ UI

| # | Screen | State | ภาพ | FR |
|---|--------|-------|-----|----|
| 01 | Login | default (signed out) | ![](01-login--default.svg) | FR-1, FR-2 |
| 01 | Login | loading (signing in / restoring session) | ![](01-login--loading.svg) | FR-2 |
| 01 | Login | error (sign-in failed) | ![](01-login--error.svg) | FR-2 |
| 02 | Game setup | default (choose Easy/Hard + stats) | ![](02-setup--default.svg) | FR-5, FR-8 |
| 02 | Game setup | loading (starting game, controls disabled) | ![](02-setup--loading.svg) | FR-5, FR-11 |
| 03 | Game | default: your turn, keyboard focus + hover, desktop | ![](03-game--default.svg) | FR-4, FR-5, FR-8, NFR-4 |
| 03 | Game | bot thinking (loading, board locked) | ![](03-game--bot-thinking.svg) | FR-4, FR-11, NFR-3 |
| 03 | Game | default, mobile | ![](03-game--default-mobile.svg) | FR-4, FR-8, NFR-5 |
| 04 | Game over | win (+1), green winning line (diagonal) | ![](04-gameover--win.svg) | FR-4, FR-6, FR-8, FR-12 |
| 04 | Game over | win + streak bonus (+2, streak → 0/3), green winning line (row) | ![](04-gameover--win-bonus.svg) | FR-6, FR-7, FR-8 |
| 04 | Game over | loss / bot wins (−1), red winning line (column) | ![](04-gameover--loss.svg) | FR-4, FR-6, FR-7 |
| 04 | Game over | draw (0, streak reset), neutral | ![](04-gameover--draw.svg) | FR-4, FR-6, FR-7 |
| 04 | Game over | win, mobile | ![](04-gameover--win-mobile.svg) | FR-6, FR-12, NFR-5 |
| 05 | Resume banner | unfinished game on Play page | ![](05-resume--default.svg) | FR-12 (Q3) |
| 06 | Leaderboard | default (current user highlighted, top-3 medals) | ![](06-leaderboard--default.svg) | FR-9 |
| 06 | Leaderboard | default, mobile | ![](06-leaderboard--default-mobile.svg) | FR-9, NFR-5 |
| 06 | Leaderboard | empty | ![](06-leaderboard--empty.svg) | FR-9 |
| 07 | Admin | default (sortable table, sorted by Score) | ![](07-admin--default.svg) | FR-10 |
| 07 | Admin | default, mobile (card list + sort select) | ![](07-admin--default-mobile.svg) | FR-10, NFR-5 |
| 07 | Admin | not authorized (non-admin) | ![](07-admin--forbidden.svg) | FR-10, NFR-1 |
| 08 | Shared header / nav + shared controls | player / admin / mobile / signed out / button states | ![](08-header--variants.svg) | FR-1, FR-2, FR-10 |
| 09 | Admin login `/login/admin` | default (email, password + Show, Sign in) | ![](09-login-admin--default.svg) | FR-13 (AC-25, AC-29, UI-10) |
| 09 | Admin login `/login/admin` | loading (button disabled, "Signing in…") | ![](09-login-admin--loading.svg) | FR-13 (AC-26) |
| 09 | Admin login `/login/admin` | error: "Invalid email or password." | ![](09-login-admin--error.svg) | FR-13 (AC-26) |
| 09 | Admin login `/login/admin` | default, mobile 360px | ![](09-login-admin--default-mobile.svg) | FR-13 (UI-10), NFR-5 |

รวม 25 ภาพ (01–08 = 21 ภาพ ปรับ style รอบนี้ ชื่อไฟล์เดิมทั้งหมด; 09 = 4 ภาพจากงาน D2 ไม่ได้แก้ในรอบนี้)

หมายเหตุ 09: ใช้ font, card, input/button radius, spinner และ alert box ชุดเดียวกับ 01-login (accent indigo `#4F46E5` ตามภาพ 01) แต่ต่างจากหน้า player ด้วยพื้นหลัง slate ไม่มีลาย X/O, ไอคอนโล่สีเข้ม, badge "ADMIN" และหัวข้อ "Admin sign in". mobile วาดที่ 360px ตาม UI-10 (viewBox `360×800`)

## Visual style

- **โทน:** friendly, modern; พื้นหลังหน้า soft gradient indigo-50 → slate-50, เนื้อหาอยู่บน card สีขาวมุมโค้ง (16–24px) + เงาบาง (`feDropShadow` dy 6, blur 10, opacity 8%) + เส้นขอบ slate-200
- **Typography:** `system-ui, sans-serif` ทุกที่ · H1 30px/800 · status/result 22px/800 · body 16px · secondary 14px · caption 12px · ตัวเลขคะแนนใหญ่ 44px/800 สี primary · หัวตาราง 12px/700 uppercase (CSS `text-transform`) letter-spacing 0.5px
- **Header:** logo tile (gradient indigo → violet + X/O สีขาว), nav link แบบ pill (active = indigo pill + ตัวหนา + underline 4px, hover = slate-100 pill), avatar วงกลม gradient + initials, ปุ่ม Sign out แบบ pill outline
- **Board:** card ขาวโค้ง 26px, ช่องโค้ง 16px พื้น slate-50; **X = cross สี indigo `#4F46E5`**, **O = ring สี orange `#EA580C`** (ต่างทั้งรูปทรงและสี) เส้นหนา 12px ปลายมน; hover ช่องว่าง = indigo tint + ghost X; ช่องที่ disabled ตอนบอทคิด = slate-200
- **Buttons:** primary = indigo ทึบ มุม 12–14px + เงา, hover `#4338CA`; secondary = ขาว + ขอบ slate-300, hover พื้น slate-50 + ขอบ slate-400; disabled = slate-200 + ตัวอักษร slate-500 ไม่มีเงา; focus-visible = กรอบประ indigo 2.5px เว้นระยะ (ดูแถว F ใน 08)
- **Pills / badges:** difficulty (Hard = orange-50/orange-800, Easy = emerald-50/emerald-700), streak `x/3` (amber เมื่อมี streak, slate เมื่อ 0/3), "Selected", "You", "Visible to admins only"
- **Streak dots:** จุดเต็ม = amber `#F59E0B` ขอบ `#D97706`, จุดว่าง = ขาว ขอบ slate-300 + ตัวเลข `x/3` ใน pill เสมอ
- **Stats tiles:** Wins = green-50 / ตัวเลข green-700, Losses = red-50 / red-700, Draws = slate-100 / slate-700 (มี label ข้อความกำกับทุกช่อง)
- **Tables:** header slate-50, zebra rows (แถวคู่ slate-50), แถวผู้ใช้ปัจจุบัน indigo-50 + แถบซ้าย + pill "You"; Leaderboard top 3 = เหรียญวงกลม **gold / silver / bronze ที่ยังแสดงเลขอันดับ**; คะแนนติดลบ = เครื่องหมายลบ + สีแดง
- **Empty / error / forbidden:** illustration ในวงกลมพื้นอ่อน (empty = กระดานเปล่า indigo, forbidden = กุญแจ amber แทนสีแดงเพื่อไม่ให้ดูเป็น error ร้ายแรง), error alert = red-50 + แถบซ้ายแดง + ไอคอน + หัวข้อ
- ใช้ gradient เฉพาะ page background, logo/avatar และแถบบนของ result card แบบ bonus; ใช้ shadow เฉพาะ card และ primary button

## Palette (tokens)

| Token | Hex | ใช้กับ | Contrast (ข้อความ) |
|---|---|---|---|
| `bg-from` / `bg-to` | `#EEF2FF` / `#F8FAFC` | page background gradient | - |
| `surface` | `#FFFFFF` | card, header, table | - |
| `surface-muted` | `#F8FAFC` | cell, table header, zebra | - |
| `surface-sunken` | `#F1F5F9` | draw tile, neutral pill, nav hover | - |
| `border` | `#E2E8F0` | card/cell border, divider, disabled fill | - |
| `border-strong` | `#CBD5E1` | secondary button, empty streak dot | - |
| `text` | `#0F172A` | heading, body | 17.9:1 บนขาว |
| `text-muted` | `#475569` | secondary text, inactive nav | 7.6:1 บนขาว |
| `text-subtle` | `#64748B` | caption, annotation | 4.8:1 บนขาว |
| `primary` | `#4F46E5` | primary button, active nav bar, X mark, focus ring | ขาวบน primary 6.3:1 |
| `primary-hover` / `primary-text` | `#4338CA` | hover, ตัวอักษร primary, ตัวเลขคะแนน | 7.0:1 บน `#EEF2FF` |
| `primary-soft` | `#EEF2FF` (ขอบ `#C7D2FE`, `#A5B4FC`) | active pill, selected option, current-user row, cell hover | - |
| `brand-to` | `#7C3AED` | ปลาย gradient logo/avatar | ขาวบน 5.7:1 |
| `o-mark` | `#EA580C` (ตัวอักษร "O" ใช้ `#C2410C`) | O ring | กราฟิก 3.6:1 (≥ 3:1) |
| `success` | `#16A34A` | **กรอบ + strike line เมื่อผู้เล่นชนะ** | กราฟิก 3.3:1 |
| `success-text` / `success-soft` / `success-bg` | `#15803D` / `#DCFCE7` / `#F0FDF4` | "+1/+2", Wins tile, พื้นช่องที่ชนะ | 4.7:1 บน `#DCFCE7` |
| `danger` | `#DC2626` | **กรอบ + strike line เมื่อบอทชนะ**, error accent | 4.8:1 บนขาว |
| `danger-text` / `danger-soft` / `danger-bg` | `#B91C1C` / `#FEE2E2` / `#FEF2F2` | "−1", Losses tile, error alert, คะแนนติดลบ | 5.4:1 บน `#FEE2E2` |
| `amber` / `amber-text` / `amber-soft` | `#F59E0B` / `#92400E` / `#FFFBEB` (ขอบ `#FCD34D`) | streak dots/pill, admin-only pill, lock | 7:1+ |
| `hard` | `#FFF7ED` / `#FDBA74` / `#9A3412` | Difficulty: Hard pill | 7:1+ |
| `easy` | `#ECFDF5` / `#6EE7B7` / `#047857` | Difficulty: Easy pill | 5.2:1 |
| `gold` | `#FDE68A` ขอบ `#F59E0B` / เลข `#78350F` | rank 1 | 7:1+ |
| `silver` | `#E2E8F0` ขอบ `#94A3B8` / เลข `#1E293B` | rank 2 | 11:1+ |
| `bronze` | `#FED7AA` ขอบ `#EA580C` / เลข `#7C2D12` | rank 3 | 7:1+ |

ข้อยกเว้น: ปุ่ม "Starting…" ระหว่าง busy (`#818CF8` + ขาว ~3:1) ถือเป็น disabled state ซึ่ง WCAG ไม่บังคับ 4.5:1

## กติกาสีของผลเกม (ใช้กับเส้นชนะทั้ง 8 แบบ: 3 แถว, 3 คอลัมน์, 2 ทแยง)

| ผล | ช่องที่ชนะ | Strike line | Result card | ข้อความ + ไอคอน |
|---|---|---|---|---|
| ผู้เล่นชนะ (+1) | กรอบ **เขียว** `#16A34A` 4px + พื้น `#F0FDF4` ทั้ง 3 ช่อง | เขียว `#16A34A` 10px มี white halo 18px รองใต้ | ขอบ + แถบบนเขียว, pill "+1" เขียว | "You win!" + trophy, สถานะ "You got three X in a …" |
| ผู้เล่นชนะ + bonus (+2) | เหมือนชนะ (เขียว) | เขียว | ขอบเขียว, แถบบน gradient เขียว → amber, pill "+2" เขียว | "3 wins in a row!" + star |
| บอทชนะ (−1) | กรอบ **แดง** `#DC2626` 4px + พื้น `#FEF2F2` ทั้ง 3 ช่อง | แดง `#DC2626` 10px + white halo | ขอบ + แถบบนแดง, pill "−1" แดง | "You lose" + robot icon, สถานะ "The bot got three O in the …" |
| เสมอ (0) | ไม่มี highlight | ไม่มี | ขอบ slate, แถบบน slate, pill "0" slate | "It's a draw" + ไอคอน "=" |

- ภาพตัวอย่าง: ทแยง (04--win, 04--win-mobile), แถว (04--win-bonus), คอลัมน์ (04--loss); แบบอื่นใช้กติกาเดียวกัน strike line ลากจากกลางช่องแรกถึงกลางช่องสุดท้ายและเลยออกไปเล็กน้อย
- ไม่พึ่งสีอย่างเดียว: strike line + รูปทรง X/O + ข้อความผล + ไอคอน + ข้อความบอกตำแหน่ง (ใน `aria-live`)
- **สีแดงไม่ได้สงวนไว้สำหรับ error อีกต่อไป**: ใช้กับ error, ผลแพ้ (บอทชนะ), Losses tile และคะแนนติดลบ โดย error ยังแยกได้ด้วย `role="alert"` + ไอคอน "!" + หัวข้อ

## Flow

```
01 Login --Sign in with Google--> 01--loading --ok--> 02 Setup (หรือ 05 Resume ถ้ามีเกมค้าง)
                                              --fail--> 01--error --retry--> 01--loading
02 Setup --Start game--> 02--loading --> 03 Game (your turn)
03 Game --click/Enter on cell--> 03--bot-thinking --> 03 (your turn) | 04 Game over (win / win-bonus / loss / draw)
04 Game over --Play again--> 03 (same difficulty) | --Change difficulty--> 02 Setup
05 Resume --Resume game--> 03 Game (saved board) | --Start new game--> confirm --> เกมเดิมนับแพ้ (−1, streak 0) --> 02--loading
Header: Play → 02/03/05 · Leaderboard → 06 · Admin (admin only) → 07 · Sign out → 01
Non-admin เปิด /admin ตรง → 07--forbidden · Signed out เปิด URL ใด ๆ → 01

09 /login/admin (พิมพ์ URL เอง ไม่มีลิงก์จาก 01) --Sign in--> 09--loading
   --ok + isAdmin--> 07 Admin (header: Leaderboard · Admin · Sign out)
   --wrong credentials--> 09--error --retry--> 09--loading
   --valid account but not admin (signOut ทันที, แสดงข้อความเดียวกับ wrong credentials)--> 09--error
Signed out เปิด /admin → 09 · Admin กด Sign out → 09 · Admin ที่ล็อกอินอยู่เปิด /login/admin หรือ / → 07
```

## หมายเหตุด้าน accessibility (ใช้ทุกหน้า)

- X = เส้นไขว้ 2 เส้น (indigo), O = วงแหวน (orange): รูปร่างต่างกัน ไม่พึ่งสี
- ทุกช่องเป็น `<button>` มี `aria-label` เช่น "Row 2, column 1, empty"; ลูกศรย้าย focus, Enter/Space วาง X; focus ring เป็นเส้นประ indigo หนา; hover (pointer เท่านั้น) = indigo tint + ghost X
- เส้นชนะ = กรอบช่อง (เขียว/แดง) + พื้นช่อง + strike line + ข้อความ ("three X in a diagonal") + หัวข้อผลพร้อมไอคอน
- สถานะเกม/ผลเกมอยู่ใน `aria-live="polite"`; error ใช้ `role="alert"` + ไอคอน + หัวข้อ
- แถวของผู้ใช้ปัจจุบัน / ลิงก์ที่ active ใช้ตัวหนา + pill/underline/แถบซ้ายร่วมกับสี
- อันดับ 1–3 ใน Leaderboard แสดงตัวเลขในเหรียญเสมอ
- streak แสดงทั้งจุด 3 จุดและตัวเลข `x/3`
- ข้อความทุกตัวผ่าน contrast ≥ 4.5:1 (ดูตาราง Palette) ยกเว้น disabled state
- 09: ทุก input มี `<label>` จริง, ปุ่ม Show/Hide เป็น `<button type="button">` มี `aria-pressed` + `aria-label`, error ไม่ทำกรอบแดงที่ field ใด field หนึ่ง (ไม่บอกว่าผิดช่องไหน)

## ข้อเสนอ (ไม่อยู่ใน requirement)

1. **Error ระหว่างเล่น/เริ่มเกม และ loading/error ของ Leaderboard/Admin**: ตอนนี้เป็น UI-9 ใน spec แบบ text-only ยังไม่ได้วาด ถ้าต้องการภาพ ใช้ alert แบบเดียวกับ 01--error วางใต้ status และ skeleton rows สี slate-100
2. **Confirm dialog ของ "Start new game"** (AC-9) ยังไม่ได้วาด เสนอ modal card ขาว: หัวข้อ "Start a new game?", ข้อความ "Your unfinished game will count as a loss (−1).", ปุ่ม "Start new game" (danger แดง) + "Cancel" (secondary)
3. **Play again** ใช้ระดับเดิมทันที ไม่ต้องผ่านหน้า Setup (ภาพ 04 วาดแบบนี้)
4. **Leaderboard แสดงอันดับของตัวเอง** ถ้าอยู่นอกหน้าแรก (เมื่อผู้เล่นเยอะ) อาจต้องมี pagination หรือ sticky row "Your rank" ภายหลัง
5. **Admin**: เพิ่มคอลัมน์ display name คู่กับ email เพื่อให้เทียบกับ Leaderboard ได้ง่าย
6. **Animation เบา ๆ** (ไม่บังคับ): strike line วาดเข้า 300ms, ปิดเมื่อ `prefers-reduced-motion`
7. **09 Admin login, หลัง error**: เก็บ email ไว้ ล้าง password และย้าย focus ไปที่ password (ภาพ 09--error วาดแบบนี้)
8. **09 ข้อความ "Too many attempts. Try again later."** (`auth/too-many-requests` ตาม plan) ใช้ alert box เดียวกับ 09--error ไม่ได้วาดแยก
9. **Header ของ admin ตาม AC-28** (Leaderboard · Admin · Sign out, ไม่มี Play) แก้แล้วใน 07-admin--default / -mobile และ variant B/D ของ 08-header; ยังเหลือชื่อตัวอย่าง "Alex Morgan" (ผู้เล่น) ใน header ของ admin ซึ่งเป็นแค่ข้อมูลตัวอย่าง

## คำตอบที่ได้แล้ว (Decisions on designer questions ใน `../spec.md`)

1. Start new game ขณะมีเกมค้าง → confirm แล้วนับเป็นแพ้ (−1, streak 0); annotation ใน 05 อัปเดตแล้ว
2. Resume ผ่าน banner (ภาพ 05)
3. คะแนนเท่ากัน → อันดับเรียงต่อกัน ตาม score, wins, name (ไม่มีอันดับร่วม)
4. Leaderboard ซ่อนผู้เล่นที่ยังไม่จบเกม; Admin แสดงทุกคน; annotation ใน 06--empty อัปเดตแล้ว
5. "Last played" ตาม time zone ของเครื่องผู้ดู
6. Admin เปิดหน้า Leaderboard ได้ด้วย

## คำถามถึงผู้อนุมัติ

1. ~~หัวข้อผลแพ้~~ **ตอบแล้ว:** ใช้ **"You lose"** (04--loss แก้แล้ว)
2. **สีของ X/O** (X indigo, O orange) โอเคหรือไม่ หรืออยากให้ X/O เป็นสีกลาง (slate) เพื่อให้เขียว/แดงของผลเกมเด่นกว่านี้
3. ~~Confirm dialog~~ **ตอบแล้ว:** ใช้คำอธิบายใน AC-9 พอ ไม่วาดเพิ่ม
