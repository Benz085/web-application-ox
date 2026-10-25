# OX Game — งานที่ผู้อนุมัติต้องทำเอง

ทีม AI ทำเองไม่ได้หรือห้ามทำ (ต้องใช้บัญชีของคุณ, เป็นการอนุมัติ, หรือมีผลกับ environment จริง)
อ้างอิง: [spec.md](spec.md) · [plan.md](plan.md) · [mockups/index.md](mockups/index.md)

สถานะ: `[x]` เสร็จแล้ว · `[ ]` ยังไม่ทำ · ประมาณเวลารวม ≈ 0.85 man-day (ตาม plan: human-only work)

---

## A. ก่อน Gate B (ตอนนี้)

- [x] สร้าง Firebase project `web-application-ox`
- [x] สร้างผู้ใช้ admin ใน Firebase Authentication: `adminox@gmail.com` (provider Email/Password)
- [ ] เปิดดู mockup ใหม่ที่ render จริง (ทีมตรวจแค่ว่า SVG ถูกต้อง ยังไม่ได้ดูภาพ): `mockups/09-login-admin--*.svg` (4 ไฟล์) และ `mockups/08-header--variants.svg`, `07-admin--default*.svg` ที่แก้ header ของ admin
- [x] ตอบคำถามใน [mockups/index.md](mockups/index.md): ใช้ "You lose", confirm dialog ใช้ AC-9 พอ
- [ ] ตอบคำถามที่เหลือ 1 ข้อ: สี X/O ใช้ indigo/orange ตามภาพ หรือเปลี่ยนเป็นแบบอื่น (ดูข้อ 2 ใน index.md)
- [ ] ตรวจ spec + plan ที่แก้หลัง Gate A (เพิ่ม admin login: FR-13, AC-25–29, UI-10, T18–T20 และประมาณ ≈ +1.0 md) แล้วตอบ **"อนุมัติ" (Gate B)**
  - แผนเปลี่ยนหลัง Gate A คุณต้องอนุมัติใหม่ ห้ามถือว่าผ่านอยู่แล้ว

## B. ตั้งค่า Firebase console (ก่อนทดสอบจริง; ทำขนานกับ Phase 4 ได้)

- [ ] **Authentication → Sign-in method:** เปิด **Google** และ **Email/Password** (ยืนยันว่า Email/Password เปิดอยู่จริง)
- [ ] **Authentication → Settings → User actions:** ปิด "Enable create (sign-up)" ถ้ามีตัวเลือกนี้ (กันคนสมัครบัญชี Email/Password เอง)
- [ ] **Authentication → Settings → Authorized domains:** เพิ่มโดเมน Vercel ของโปรเจกต์ (`localhost` มีให้แล้ว) — ทำหลังรู้โดเมน
- [ ] **Firestore Database:** สร้างฐานข้อมูล (production mode; rules ทีมจะเขียนเป็น deny-all แล้วคุณ deploy เอง)
- [ ] **Project settings → General → Your apps:** เพิ่ม Web app แล้วคัดลอกค่า config (apiKey, authDomain, projectId, appId) สำหรับ `VITE_FIREBASE_*`
- [ ] **Project settings → Service accounts:** Generate new private key แล้วเก็บไฟล์ไว้เอง (**ห้าม commit, ห้ามส่งให้ทีม AI**) ใช้ค่า `project_id`, `client_email`, `private_key` เป็น `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- [ ] (ไม่บังคับ) สร้าง doc `config/bot` ใน Firestore ด้วย field `hardMistakeRate` (number 0–1) ถ้าอยากปรับความยากบอทระดับยาก; ไม่สร้างก็ใช้ 0.2
- [ ] Deploy Firestore rules (`firestore.rules` แบบ deny-all) หลังทีมเขียนเสร็จ (T6)

## C. ระหว่าง Phase 4 (ทีมจะหยุดถามคุณ)

- [ ] อนุมัติ T0: สร้าง initial commit บน `main` แล้วแตก `development` (ตาม Q1) และติดตั้ง dependency ตามแผน
- [ ] อนุมัติ T13: ติดตั้ง Playwright (`@playwright/test`) และ `playwright.config.ts`
- [ ] ถ้า token ใช้ถึง ~80% ของ budget (ตอนนี้ไม่ได้ตั้ง budget) ตัดสินใจว่าไปต่อหรือไม่

## D. Gate C (ก่อน push / เปิด PR)

- [ ] รัน `/usage` แล้ววาง Session block + breakdown ของ subagents ให้ทีม เพื่อกรอก Actual vs Estimate
- [ ] ตรวจรายงานผล validation (lint, typecheck, test, build, E2E), QA verdict และ review findings
- [ ] อนุมัติให้ push branch และเปิด PR เข้า `main` (remote: `origin` = https://github.com/Benz085/web-application-ox.git)

## E. UAT ด้วยมือ (ทีมทดสอบ OAuth จริงอัตโนมัติไม่ได้)

ทดสอบกับ Firebase จริงหลังใส่ env แล้ว (`vercel dev` หรือ deploy จริง)

- [ ] Google login ด้วยบัญชีผู้เล่น: เข้าเกมได้, สร้าง profile ใหม่ (score 0 / streak 0), refresh แล้วยังล็อกอินอยู่, sign out กลับ `/login`
- [ ] เล่นครบ 1 เกมกับบอททั้ง Easy และ Hard; ชนะ +1, แพ้ −1, เสมอ 0; ชนะติด 3 ครั้งได้ +2 แล้ว streak กลับ 0
- [ ] ออกจากเกมกลางคัน → กลับมามี Resume banner; Start new game ถามยืนยันและนับเป็นแพ้
- [ ] `/login/admin` ด้วย `adminox@gmail.com` + รหัสผ่านที่ตั้งไว้ → เข้า `/admin` ได้, เห็นอีเมลผู้เล่นทุกคน
- [ ] `/login/admin` ใส่รหัสผ่านผิด → ขึ้น "Invalid email or password." และไม่บอกว่าผิดช่องไหน
- [ ] `/login/admin` ด้วยบัญชี Email/Password อื่นที่ไม่ใช่ admin (สร้างชั่วคราวใน console แล้วลบทิ้ง) → ขึ้นข้อความเดียวกัน และถูก sign out
- [ ] ผู้เล่นทั่วไปเปิด `/admin` ตรง ๆ → เห็น not-authorized; Leaderboard ไม่แสดงอีเมล
- [ ] บัญชี admin ไม่เล่นเกมและไม่อยู่ใน Leaderboard / รายชื่อผู้เล่น
- [ ] ยังไม่ล็อกอินแล้วเข้า `/` หรือ `/leaderboard` → ไป `/login`; เข้า `/admin` → ไป `/login/admin`
- [ ] ทดสอบบนมือถือ (≥ 360px) และอย่างน้อย 2 browser

## F. Deploy และส่งงาน

- [ ] ตรวจและ merge PR เข้า `main` (ทีมไม่ merge ให้)
- [ ] สร้างโปรเจกต์บน Vercel จาก GitHub repo แล้วตั้ง env ทั้งหมดตาม `.env.example`:
  `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, และกลุ่ม `VITE_FIREBASE_*` (ชื่อสุดท้ายยืนยันใน `.env.example` หลัง T0)
  - ไม่ต้องตั้ง `ADMIN_EMAILS` / `ADMIN_UIDS` (admin คือ `adminox@gmail.com` ตายตัวในโค้ด)
  - **ห้ามตั้ง `VITE_E2E=true` บน production**
- [ ] เอาโดเมน Vercel ไปเพิ่มใน Firebase Authorized domains (ข้อ B)
- [ ] Deploy แล้วเช็กว่า `/login`, `/login/admin` และ `/api/me` ทำงานบน production
- [ ] แก้ placeholder ใน README (ชื่อ Firebase project / โดเมน Vercel) ตาม Q6
- [ ] ส่ง URL ไปที่ careers@bifrostconnect.co.th

---

## หมายเหตุด้านความปลอดภัย

- **ต้องมีบัญชี `adminox@gmail.com` ใน Firebase ก่อนเปิดเว็บสาธารณะ** (มีแล้ว) ไม่งั้นคนอื่นสมัครอีเมลนี้ได้ก่อน
- อย่าแชร์ไฟล์ service account key หรือรหัสผ่าน admin ในแชตหรือ commit
- ถ้าอยากเปลี่ยน admin ภายหลัง ต้องแก้ค่า `ADMIN_EMAIL` ใน `shared/constants.ts` แล้ว deploy ใหม่
