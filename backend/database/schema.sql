-- ============================================================================
-- ระบบติดตามงานซ่อมบำรุงโรงพยาบาล (Hospital Maintenance System Database)
-- Dialect: MySQL 8.0+ / MariaDB 10.4+ / PostgreSQL Compatible
-- ============================================================================

CREATE DATABASE IF NOT EXISTS hospital_repair_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hospital_repair_db;

-- 1. ตารางหมวดหมู่งานซ่อม (Categories & SLA)
CREATE TABLE IF NOT EXISTS repair_categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_code VARCHAR(20) NOT NULL UNIQUE,       -- เช่น MED, FAC, IT, GEN
    category_name VARCHAR(100) NOT NULL,             -- เครื่องมือแพทย์, ระบบอาคาร, ไอที
    default_sla_hours INT DEFAULT 48,                -- SLA มาตรฐานตาม HA (ชั่วโมง)
    is_active TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. ตารางแผนก/หน่วยงานภายในโรงพยาบาล (Hospital Departments)
CREATE TABLE IF NOT EXISTS departments (
    dept_id INT AUTO_INCREMENT PRIMARY KEY,
    dept_name VARCHAR(150) NOT NULL,
    building VARCHAR(100) DEFAULT NULL,
    floor_no VARCHAR(20) DEFAULT NULL,
    phone_ext VARCHAR(50) DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. ตารางหลักใบงานแจ้งซ่อม (Repair Tickets / Work Orders)
CREATE TABLE IF NOT EXISTS repair_tickets (
    ticket_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ticket_no VARCHAR(35) NOT NULL UNIQUE,          -- เช่น REQ-MED-20261118-001
    category_code VARCHAR(20) NOT NULL,
    department_name VARCHAR(150) NOT NULL,
    location_detail VARCHAR(255) NOT NULL,          -- จุดที่ตั้ง ห้อง เลขเตียง ชั้น
    asset_id VARCHAR(100) DEFAULT NULL,             -- รหัสครุภัณฑ์ รพ.
    asset_name VARCHAR(255) DEFAULT NULL,           -- ชื่อครุภัณฑ์/อุปกรณ์
    urgency_level VARCHAR(50) DEFAULT 'ปกติ (ภายใน 48 ชม.)',
    symptom TEXT NOT NULL,                          -- รายละเอียดอาการเสีย
    image_url LONGTEXT DEFAULT NULL,                -- ลิงก์รูปภาพ หรือ Base64
    requester_name VARCHAR(120) NOT NULL,           -- ชื่อผู้แจ้ง
    contact_phone VARCHAR(60) NOT NULL,             -- เบอร์โทร/เบอร์ต่อภายใน
    status VARCHAR(50) DEFAULT 'รอดำเนินการ',
    technician_name VARCHAR(120) DEFAULT NULL,      -- ช่างผู้รับผิดชอบ
    technician_notes TEXT DEFAULT NULL,             -- บันทึกการแก้ไข
    completed_at DATETIME DEFAULT NULL,             -- วันที่ดำเนินการแล้วเสร็จ
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ticket_no (ticket_no),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- ข้อมูลเริ่มต้น (Seed Data)
-- ----------------------------------------------------------------------------

INSERT INTO repair_categories (category_code, category_name, default_sla_hours) VALUES
('MED', 'เครื่องมือแพทย์ (Medical Equipment)', 12),
('FAC', 'ระบบอาคาร/กายภาพและสิ่งแวดล้อม (Facilities)', 24),
('IT', 'ระบบคอมพิวเตอร์และเครือข่าย (IT & HIS)', 12),
('GEN', 'ครุภัณฑ์ทั่วไปและยานพาหนะ (General)', 48)
ON DUPLICATE KEY UPDATE category_name=VALUES(category_name);

INSERT INTO departments (dept_name, building, floor_no, phone_ext) VALUES
('งานอุบัติเหตุและฉุกเฉิน (ER)', 'อาคารผู้ป่วยนอก-อุบัติเหตุ', '1', '1100, 1101'),
('ผู้ป่วยนอก (OPD)', 'อาคารผู้ป่วยนอก-อุบัติเหตุ', '1', '1105'),
('ผู้ป่วยใน (IPD/วอร์ด)', 'อาคารผู้ป่วยใน', '2', '1201'),
('ห้องผ่าตัด (OR)', 'อาคารผู้ป่วยนอก-อุบัติเหตุ', '2', '1120'),
('เภสัชกรรม / ห้องยา', 'อาคารผู้ป่วยนอก-อุบัติเหตุ', '1', '1150'),
('ทันตกรรม (Dental)', 'อาคารส่งเสริมสุขภาพ', '1', '1130'),
('ชันสูตร / ห้องแล็บ (Lab)', 'อาคารผู้ป่วยนอก-อุบัติเหตุ', '1', '1160'),
('รังสีวิทยา (X-Ray)', 'อาคารผู้ป่วยนอก-อุบัติเหตุ', '1', '1170')
ON DUPLICATE KEY UPDATE phone_ext=VALUES(phone_ext);
