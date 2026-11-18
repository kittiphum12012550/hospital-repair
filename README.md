# 🏥 ระบบติดตามงานซ่อมบำรุงโรงพยาบาล (Hospital Maintenance System)

ระบบบริหารจัดการและติดตามงานแจ้งซ่อมบำรุงสำหรับ **โรงพยาบาลและหน่วยงานสาธารณสุข** รองรับทั้งงานเครื่องมือแพทย์, ระบบกายภาพ/อาคาร, งานเทคโนโลยีสารสนเทศ (IT) และครุภัณฑ์ทั่วไป ตามมาตรฐานการพัฒนาคุณภาพโรงพยาบาล (HA)

---

## 🏗️ สถาปัตยกรรมแยกส่วน (Separation of Concerns: Frontend & Backend)

ระบบได้รับการแยกโฟลเดอร์ระหว่าง **Frontend** และ **Backend** ไว้อย่างชัดเจน เพื่อให้ง่ายต่อการพัฒนา ดูแลรักษา และเลือกใช้งานได้ตามความเหมาะสมของโรงพยาบาล:

```
d:\fix\
├── frontend/                               # 🖥️ ส่วนหน้าบ้าน (Client-Side UI)
│   ├── css/
│   │   └── style.css                       # สไตล์ลิสต์: Floating Labels, Dropzone, Animations
│   ├── js/
│   │   ├── api.js                          # API Service: เชื่อมต่อ Backend / LocalStorage Fallback
│   │   └── app.js                          # UI Controller: ฟอร์ม, ตรวจสอบข้อมูล, SweetAlert2, กระดานช่าง
│   └── index.html                          # หน้าเว็บสำหรับ Client
│
├── backend/                                # ⚙️ ส่วนหลังบ้าน (Server-Side & Data)
│   ├── google-apps-script/
│   │   └── Code.gs                         # Cloud Serverless: รับข้อมูลลง Google Sheets + ส่ง LINE Notify
│   ├── php/
│   │   ├── config.php                      # ตั้งค่าฐานข้อมูลและ LINE Token สำหรับ Server ภายใน
│   │   └── api.php                         # REST API สำหรับ MySQL / MariaDB
│   └── database/
│       └── schema.sql                      # โครงสร้างตารางฐานข้อมูล Relational SQL
│
├── index.html                              # Root Entry Point (รองรับ GitHub Pages เปิดใช้งานได้ทันที)
└── README.md                               # เอกสารคู่มือระบบ
```

---

## 🌟 จุดเด่นที่ออกแบบเฉพาะสำหรับโรงพยาบาล

1. **คัดกรองระดับความเร่งด่วน (Urgency Triage):**
   - 🔴 **ฉุกเฉินวิกฤต (ทันที):** สำหรับจุดเสี่ยงต่อชีวิตผู้ป่วย เช่น ER, ICU, ห้องผ่าตัด (OR)
   - 🟠 **ด่วนมาก (ภายใน 2 ชม.):** กระทบต่อบริการผู้ป่วยหลัก เช่น เครื่องพิมพ์ฉลากยา, เครื่องวัดสัญญาณชีพ
   - 🟡 **ด่วน (ภายใน 24 ชม.):** รบกวนการทำงานของเจ้าหน้าที่
   - 🟢 **ปกติ (ภายใน 48 ชม.):** ซ่อมบำรุงทั่วไป / เชิงป้องกัน
2. **แยกหมวดหมู่งานซ่อมตามโครงสร้าง รพ.:**
   - 🩺 **เครื่องมือแพทย์ (Medical Equipment):** เครื่องวัดความดัน, Defibrillator, เครื่องช่วยหายใจ
   - 🏢 **ระบบอาคารและกายภาพ (Facilities):** ไฟฟ้า, แอร์, ประปา, ก๊าซทางการแพทย์ (Medical Gas)
   - 💻 **ระบบสารสนเทศ (IT & HIS):** คอมพิวเตอร์, HosXP/HIS, เครื่องสแกนบาร์โค้ด, ปริ้นเตอร์ฉลากยา
   - 🪑 **ครุภัณฑ์ทั่วไปและยานพาหนะ:** เตียงคนไข้, รถเข็นนั่ง/นอน, รถพยาบาล (Ambulance)
3. **ถ่ายรูปแนบอาการเสียจากมือถือได้ทันที (Camera / Mobile Attachment):** มีระบบ Auto-Resize รูปภาพให้เสร็จสรรพ โหลดไว ไม่เปลืองพื้นที่
4. **ป้องกันการกดส่งซ้ำ (Anti-Double Submit):** ล็อกปุ่มอัตโนมัติขณะส่งข้อมูล

---

## 🚀 ทางเลือกการใช้งานหลังบ้าน (Backend Options)

โรงพยาบาลสามารถเลือกใช้งาน Backend ได้ตามความพร้อมของระบบ:

### ทางเลือกที่ 1: Google Sheets + LINE Notify (แนะนำ — ไม่มีค่าใช้จ่าย 100%)
* **เหมาะสำหรับ:** โรงพยาบาลชุมชน, รพ.สต., หรือหน่วยงานที่ต้องการความสะดวก รวดเร็ว ไม่ต้องดูแลเซิร์ฟเวอร์
* **วิธีติดตั้ง:**
  1. สร้างสเปรดชีตใหม่ใน Google Sheets
  2. ไปที่ **ส่วนขยาย (Extensions)** → **Apps Script**
  3. นำโค้ดจาก `backend/google-apps-script/Code.gs` ไปวาง
  4. (ถ้าต้องการ) ใส่ `LINE_NOTIFY_TOKEN` ในโค้ด
  5. กด **Deploy** → **New Deployment** → เลือก **Web App** → สิทธิ์เข้าถึงเลือก **Anyone**
  6. นำ URL ที่ได้ มาใส่ในหน้าเว็บตรงไอคอน ⚙️ (มุมขวาบน)

### ทางเลือกที่ 2: เซิร์ฟเวอร์ภายในโรงพยาบาล (Intranet / On-Premise)
* **เหมาะสำหรับ:** โรงพยาบาลที่มี Web Server ภายใน (Apache/Nginx/IIS + PHP + MySQL)
* **วิธีติดตั้ง:**
  1. นำไฟล์ `backend/database/schema.sql` ไป Import ใน MySQL / MariaDB
  2. แก้ไขไฟล์ `backend/php/config.php` ให้ตรงกับ User/Password ของฐานข้อมูล
  3. นำ Webhook URL ของ `api.php` มาใส่ในหน้าเว็บ

---

## 🌐 การนำขึ้น GitHub Pages

เพื่อแชร์ลิงก์ให้เจ้าหน้าที่ในโรงพยาบาลใช้งานผ่านมือถือได้ทันที:

```powershell
$env:PATH = "C:\MinGit\cmd;$env:PATH"
cd D:\fix
git add .
git commit -m "Separate frontend and backend architecture"
git push -u origin main
```

จากนั้นเปิด GitHub: **Settings** → **Pages** → เลือก Branch **`main`** โฟลเดอร์ **`/(root)`** แล้วกด Save
URL จะเปิดได้ที่: `https://<your-username>.github.io/hospital-repair/`
