# OX Game

เว็บเกม OX (Tic-Tac-Toe) เล่นกับบอท ต้องล็อกอินก่อนเล่น มีระบบคะแนน, Leaderboard และหน้า Admin สำหรับดูคะแนนผู้เล่นทั้งหมด

- **Frontend:** Vite + React 19 + TypeScript (strict)
- **Backend:** Vercel Functions (`api/`) + Firebase Admin SDK
- **Auth:** Firebase Authentication — ผู้เล่นล็อกอินด้วย Google, Admin ล็อกอินด้วย Email/Password
- **ฐานข้อมูล:** Cloud Firestore (เข้าถึงผ่าน API เท่านั้น)
- **Test:** Vitest + React Testing Library, Playwright (E2E)

## กติกาเกม

- ผู้เล่นเป็น **X** เดินก่อน สลับกับบอท (O) บนกระดาน 3×3 ใครได้ 3 ตัวติดกัน (แถว/คอลัมน์/ทแยง) ชนะ ถ้ากระดานเต็มโดยไม่มีผู้ชนะคือเสมอ
- เลือกระดับบอทได้ 2 ระดับ: **Easy** (เดินสุ่ม แต่มีโอกาสชนะหรือบล็อกเมื่อมีจังหวะ) และ **Hard** (minimax แต่สุ่มเดินพลาดบางตา ผู้เล่นที่เล่นดีเสมอได้เสมอและมีโอกาสชนะเป็นครั้งคราว)
- คะแนน: ชนะ **+1**, แพ้ **−1** (คะแนนติดลบได้), เสมอ **0**
- ชนะติดต่อกัน **3 ครั้ง** ได้โบนัส **+1** (เกมที่ 3 ได้รวม +2) แล้วนับ streak ใหม่ แพ้หรือเสมอ reset streak
- เกมที่ยังไม่จบ ออกจากหน้าไปแล้วกลับมาเล่นต่อได้ ถ้ากด Start new game ทั้งที่มีเกมค้าง เกมเดิมจะนับเป็นแพ้
- การตัดสินผลและคำนวณคะแนนทำฝั่ง server เท่านั้น client ส่งได้แค่ "ช่องที่เดิน"

## ผู้ใช้และสิทธิ์

| ผู้ใช้ | ล็อกอินที่ | ทำอะไรได้ |
|---|---|---|
| ผู้เล่น | `/login` ด้วย Google | เล่นเกม, ดู Leaderboard (ชื่อกับคะแนน ไม่เห็นอีเมล) |
| Admin | `/login/admin` ด้วย Email/Password | ดู Leaderboard และหน้า `/admin` (รายชื่อผู้เล่นทั้งหมดพร้อมอีเมล) เล่นเกมไม่ได้ |

- Admin มีบัญชีเดียวตายตัว: **`adminox@gmail.com`** (ค่าคงที่ใน [shared/constants.ts](shared/constants.ts)) และต้องล็อกอินด้วย provider แบบ Email/Password
- หน้า `/login/admin` ไม่มีลิงก์จากหน้าอื่น ไม่มีสมัครสมาชิกและไม่มี reset password บัญชีที่ล็อกอินผ่านแต่ไม่ใช่ admin จะเห็นข้อความเดียวกับรหัสผ่านผิด ("Invalid email or password.")
- การตรวจสิทธิ์ admin ทำฝั่ง server (`server/auth.ts`) ทุก request ส่วนการซ่อนเมนูฝั่ง client เป็นแค่ UX

หมายเหตุ: การล็อกอินด้วย Google ผ่าน Firebase Authentication ใช้ OAuth 2.0 / OpenID Connect อยู่เบื้องหลัง โดย Firebase SDK จัดการ flow ให้ทั้งหมด

## ตั้งค่า Firebase

1. สร้างโปรเจกต์ที่ [Firebase console](https://console.firebase.google.com/) (โปรเจกต์ `web-application-ox`)
2. **Authentication → Sign-in method** เปิด **Google** และ **Email/Password**
3. **Authentication → Users → Add user** สร้างผู้ใช้ `adminox@gmail.com` พร้อมรหัสผ่าน
   - **ต้องสร้างก่อนเปิดเว็บให้คนอื่นใช้** เพราะ Firebase อนุญาต 1 บัญชีต่ออีเมล ถ้าไม่มีบัญชีนี้อยู่ คนอื่นสมัครอีเมลนี้ก่อนได้
   - ถ้าในหน้า Authentication → Settings → User actions มีตัวเลือก "Enable create (sign-up)" แนะนำให้ปิด
4. **Authentication → Settings → Authorized domains** เพิ่มโดเมนที่ deploy (เช่น `web-application-ox.vercel.app`) (`localhost` มีให้แล้ว)
5. **Firestore Database** สร้างฐานข้อมูล แล้ว deploy [firestore.rules](firestore.rules) (ปฏิเสธการอ่านเขียนจาก client ทั้งหมด การเข้าถึงข้อมูลทำผ่าน API ด้วย Admin SDK เท่านั้น)
6. **Project settings → General → Your apps** เพิ่ม Web app แล้วคัดลอกค่า config ไปใส่ตัวแปร `VITE_FIREBASE_*`
7. **Project settings → Service accounts → Generate new private key** แล้วเอาค่า `project_id`, `client_email`, `private_key` ไปใส่ตัวแปร `FIREBASE_*` (ห้าม commit ไฟล์ key และห้ามแชร์)

### ปรับความยากของบอทระดับ Hard (ไม่บังคับ)

สร้างเอกสาร Firestore `config/bot` ที่มี field `hardMistakeRate` (number 0–1) เป็นอัตราที่บอทเดินพลาด ถ้าไม่มีเอกสารนี้ใช้ค่าเริ่มต้น `0.2` ปรับได้ผ่าน Firebase console เท่านั้น (ไม่มีหน้า UI)

## ตัวแปรสภาพแวดล้อม

คัดลอก [.env.example](.env.example) เป็น `.env` (หรือ `.env.local`) แล้วกรอกค่า — `.env` ถูก ignore ใน git

| ตัวแปร | ใช้ที่ | ความหมาย |
|---|---|---|
| `FIREBASE_PROJECT_ID` | server | จาก service account (`project_id`) |
| `FIREBASE_CLIENT_EMAIL` | server | จาก service account (`client_email`) |
| `FIREBASE_PRIVATE_KEY` | server | จาก service account (`private_key`) ใส่ในเครื่องหมายคำพูดได้ โค้ดแปลง `\n` ให้ |
| `VITE_FIREBASE_API_KEY` | client | Web app config |
| `VITE_FIREBASE_AUTH_DOMAIN` | client | Web app config |
| `VITE_FIREBASE_PROJECT_ID` | client | Web app config |
| `VITE_FIREBASE_APP_ID` | client | Web app config |
| `VITE_E2E` | test เท่านั้น | สลับ Firebase auth เป็นผู้ใช้ปลอมเพื่อรัน E2E **ห้ามตั้งค่านี้บน production** |

ตัวแปร `VITE_*` ถูกฝังใน bundle ฝั่ง client (ค่า config ของ Firebase Web เป็นข้อมูลสาธารณะโดยออกแบบ) ส่วน `FIREBASE_*` เป็นความลับและอยู่ฝั่ง server เท่านั้น

## รันในเครื่อง

```bash
npm install
cp .env.example .env     # แล้วกรอกค่า

# ฝั่ง frontend อย่างเดียว (API ยังไม่ทำงาน)
npm run dev

# frontend + API (Vercel Functions) ต้องมี Vercel CLI และ login แล้ว
npx vercel dev
```

## คำสั่งตรวจคุณภาพ

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run lint` | oxlint |
| `npm run typecheck` | `tsc -b` (strict) |
| `npm test` | unit / integration ด้วย Vitest |
| `npm test -- --coverage` | พร้อม coverage |
| `npm run build` | type check + build frontend |
| `npm run e2e` | Playwright E2E (เปิด dev server เองด้วย `VITE_E2E=true` และ mock `/api/*`) |

ครั้งแรกต้องติดตั้ง browser สำหรับ Playwright: `npx playwright install chromium`

E2E ใช้ผู้ใช้ปลอมและ API ปลอม จึง**ไม่ครอบคลุม** การล็อกอิน Google จริง, การล็อกอิน Email/Password จริง และ Firestore จริง — สิ่งเหล่านี้ทดสอบด้วยมือกับ Firebase จริง

## โครงสร้างโปรเจกต์

```
api/       Vercel Functions (handler บาง ๆ: ตรวจสิทธิ์ → validate → เรียก server/)
server/    โค้ดฝั่ง server (auth, repo, game service) ไม่ถูกเปิดเป็น route
shared/    ตรรกะบริสุทธิ์และ type ที่ใช้ร่วมกัน (กติกา, บอท, คะแนน)
src/       Vite SPA (import ใน src ใช้ alias `@/web-app-ox/...` ชี้ไปที่ src/)
e2e/       Playwright specs
```

## Deploy บน Vercel

1. ตรวจและ merge PR เข้า `main`
2. สร้างโปรเจกต์บน Vercel จาก GitHub repo (framework: Vite — `vercel.json` ตั้ง SPA rewrite ให้แล้ว)
3. ตั้งตัวแปรสภาพแวดล้อมตามตารางด้านบนใน Project Settings → Environment Variables (**ห้ามตั้ง `VITE_E2E`**)
4. Deploy แล้วเพิ่มโดเมนที่ได้ใน Firebase Authorized domains
5. ตรวจว่าเปิด `/login`, `/login/admin` ได้ และล็อกอินแล้วเรียก `/api/me` สำเร็จ

โปรเจกต์ Firebase คือ `web-application-ox` และโดเมน production คือ `web-application-ox.vercel.app`

## ความปลอดภัย (สรุป)

- ทุก request ไป `/api/*` ต้องมี Firebase ID token (`Authorization: Bearer`) token ผิดหรือหมดอายุได้ 401 ก่อนอ่านหรือเขียนข้อมูลใด ๆ
- Firestore Security Rules ปฏิเสธการอ่านเขียนจาก client ทั้งหมด
- คะแนนเปลี่ยนด้วย Firestore transaction เกมหนึ่งให้คะแนนได้ครั้งเดียว
- ไม่มี secret ใน source; `.env.example` ไม่มีค่าจริง
