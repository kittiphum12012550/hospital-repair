/**
 * ==========================================================================
 * Hospital Maintenance System - API Service Layer
 * Handles communication between Frontend and Backend (Google Apps Script / PHP / LocalStorage)
 * ==========================================================================
 */

const ApiService = (function() {
  const STORAGE_KEY = 'hosp_repair_orders_v1';
  const CONFIG_KEY = 'hosp_repair_api_endpoint';

  // Hospital Sample Seed Data
  const defaultSeeds = [
    {
      id: 'REQ-MED-20261118-001',
      timestamp: '18/11/2026 08:30:15',
      category: 'เครื่องมือแพทย์',
      department: 'งานอุบัติเหตุและฉุกเฉิน (ER)',
      location: 'เตียงช่วยฟื้นคืนชีพ 1',
      assetId: 'MED-DF-04 (เครื่องกระตุกหัวใจ Defibrillator)',
      urgency: 'ฉุกเฉินวิกฤต (ทันที)',
      symptom: 'เครื่องแจ้ง Error Code: BAT-02 ชาร์จไฟไม่เข้า แบตเตอรี่สำรองไม่พร้อมใช้งาน',
      requesterName: 'พว.สุภาพร (พยาบาลเวร)',
      contactPhone: 'ต่อ 1101 / 081-9988776',
      status: 'กำลังดำเนินการ',
      technician: 'นายประเสริฐ (ช่างเครื่องมือแพทย์)',
      technicianNotes: 'เข้าเปลี่ยนแบตเตอรี่สำรองแท้ อยู่ระหว่างทดสอบ Self-test',
      image: null
    },
    {
      id: 'REQ-FAC-20261118-002',
      timestamp: '18/11/2026 09:15:40',
      category: 'ระบบอาคาร/กายภาพ',
      department: 'ผู้ป่วยใน (IPD/วอร์ด)',
      location: 'วอร์ดหญิง ชั้น 2 ห้อง 204',
      assetId: 'AIR-IPD-204 (แอร์ติดผนัง 18,000 BTU)',
      urgency: 'ด่วน (ภายใน 24 ชม.)',
      symptom: 'แอร์มีน้ำหยดลงเตียงผู้ป่วย และพัดลมมีเสียงดังผิดปกติ',
      requesterName: 'พว.มณีรัตน์ วารินทร์',
      contactPhone: 'ต่อ 1204',
      status: 'รอดำเนินการ',
      technician: '',
      technicianNotes: '',
      image: null
    },
    {
      id: 'REQ-IT-20261117-005',
      timestamp: '17/11/2026 14:20:00',
      category: 'ระบบคอมพิวเตอร์/IT',
      department: 'เภสัชกรรม / ห้องยา',
      location: 'ช่องจ่ายยา 3',
      assetId: 'PRN-RX-03 (เครื่องพิมพ์สติกเกอร์ฉลากยา)',
      urgency: 'ด่วนมาก (ภายใน 2 ชม.)',
      symptom: 'พิมพ์ฉลากยาไม่ออก กระดาษติดเซนเซอร์ บาร์โค้ดสแกนไม่ติด',
      requesterName: 'ภก.กิตติพงษ์',
      contactPhone: 'ต่อ 1150',
      status: 'ซ่อมเสร็จสิ้น',
      technician: 'นายวิชัย (นักวิชาการคอมฯ)',
      technicianNotes: 'ทำความสะอาดหัวพิมพ์ Thermal และเปลี่ยนลูกยางดึงกระดาษ ทดสอบพิมพ์ 50 ใบ คมชัดปกติ',
      image: null
    }
  ];

  // Local Storage Helpers
  function getLocalOrders() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSeeds));
        return defaultSeeds;
      }
      return JSON.parse(data) || [];
    } catch (e) {
      console.error('LocalStorage read error:', e);
      return defaultSeeds;
    }
  }

  function saveLocalOrders(orders) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    } catch (e) {
      console.error('LocalStorage write error:', e);
    }
  }

  function getEndpoint() {
    return localStorage.getItem(CONFIG_KEY) || '';
  }

  function setEndpoint(url) {
    localStorage.setItem(CONFIG_KEY, url.trim());
  }

  // Generate Unique Ticket ID
  function generateTicketId(category) {
    let prefix = 'REQ-MED';
    if (category.includes('อาคาร') || category.includes('กายภาพ')) prefix = 'REQ-FAC';
    else if (category.includes('IT') || category.includes('คอมพิวเตอร์')) prefix = 'REQ-IT';
    else if (category.includes('ครุภัณฑ์')) prefix = 'REQ-GEN';

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const rand = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${yyyy}${mm}${dd}-${rand}`;
  }

  // Public Methods
  return {
    getEndpoint,
    setEndpoint,
    generateTicketId,

    // Fetch All Orders
    async getAllOrders() {
      const endpoint = getEndpoint();
      if (endpoint && endpoint.startsWith('http')) {
        try {
          const res = await fetch(`${endpoint}?action=getAll`, { method: 'GET' });
          if (res.ok) {
            const result = await res.json();
            if (result.status === 'success' && Array.isArray(result.data)) {
              return result.data;
            }
          }
        } catch (err) {
          console.warn('Backend fetch failed, falling back to LocalStorage:', err);
        }
      }
      return getLocalOrders();
    },

    // Submit New Repair Ticket
    async submitOrder(orderData) {
      // 1. Assign Ticket ID & Timestamp
      if (!orderData.id) {
        orderData.id = generateTicketId(orderData.category);
      }
      if (!orderData.timestamp) {
        orderData.timestamp = new Date().toLocaleString('th-TH');
      }

      // 2. Sync to Remote Backend (Google Apps Script or PHP API) if configured
      const endpoint = getEndpoint();
      if (endpoint && endpoint.startsWith('http')) {
        try {
          await fetch(endpoint, {
            method: 'POST',
            mode: 'no-cors', // Supports Google Apps Script redirects
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
          });
        } catch (err) {
          console.warn('Remote sync failed:', err);
        }
      }

      // 3. Always save locally to ensure offline-readiness
      const orders = getLocalOrders();
      orders.unshift(orderData);
      saveLocalOrders(orders);

      return {
        success: true,
        ticketId: orderData.id,
        data: orderData
      };
    },

    // Update Ticket Status (For Technicians / Admin)
    async updateOrderStatus(id, updates) {
      const orders = getLocalOrders();
      const index = orders.findIndex(o => o.id === id);
      if (index === -1) {
        throw new Error('ไม่พบข้อมูลใบงาน ' + id);
      }

      orders[index] = { ...orders[index], ...updates };
      saveLocalOrders(orders);

      // Sync update to backend if configured
      const endpoint = getEndpoint();
      if (endpoint && endpoint.startsWith('http')) {
        try {
          await fetch(endpoint, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update', id: id, ...updates })
          });
        } catch (err) {
          console.warn('Remote update sync failed:', err);
        }
      }

      return orders[index];
    },

    // Reset Sample Data
    resetSamples() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSeeds));
      return defaultSeeds;
    }
  };
})();
