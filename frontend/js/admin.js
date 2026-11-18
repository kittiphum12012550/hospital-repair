/**
 * ==========================================================================
 * Hospital Maintenance System - Admin & Technician Logic (admin.js)
 * Manages Case Overview, Triage Filtering, Status Updates, and Technicians
 * ==========================================================================
 */

const ADMIN_PIN_KEY = 'hosp_admin_pin';
const ADMIN_AUTH_KEY = 'hosp_admin_auth_session';
const DEFAULT_PIN = '1234';

let currentFilterCategory = 'all';
let currentFilterStatus = 'all';
let currentSearchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  checkAdminAuth();
  initDateDisplay();
  loadAdminDashboard();

  // Load configured endpoint in modal
  const currentEndpoint = ApiService.getEndpoint();
  const inputEl = document.getElementById('apiEndpointInput');
  if (inputEl && currentEndpoint) {
    inputEl.value = currentEndpoint;
  }
});

function initDateDisplay() {
  const now = new Date();
  const options = { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' };
  const el = document.getElementById('currentDateDisplay');
  if (el) el.innerText = now.toLocaleDateString('th-TH', options);
}

// -------------------------------------------------------------
// Authentication / PIN Verification
// -------------------------------------------------------------
function checkAdminAuth() {
  const isAuthenticated = sessionStorage.getItem(ADMIN_AUTH_KEY);
  const authModal = document.getElementById('authModal');
  const mainContent = document.getElementById('adminMainContent');

  if (isAuthenticated === 'true') {
    if (authModal) authModal.classList.add('hidden');
    if (mainContent) mainContent.classList.remove('opacity-0', 'pointer-events-none');
  } else {
    if (authModal) authModal.classList.remove('hidden');
    if (mainContent) mainContent.classList.add('opacity-0', 'pointer-events-none');
    setTimeout(() => {
      const pinInput = document.getElementById('adminPinInput');
      if (pinInput) pinInput.focus();
    }, 200);
  }
}

function verifyPin(event) {
  event.preventDefault();
  const pinInput = document.getElementById('adminPinInput');
  const enteredPin = pinInput.value.trim();
  const savedPin = localStorage.getItem(ADMIN_PIN_KEY) || DEFAULT_PIN;

  if (enteredPin === savedPin) {
    sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
    pinInput.value = '';
    document.getElementById('authModal').classList.add('hidden');
    const mainContent = document.getElementById('adminMainContent');
    if (mainContent) mainContent.classList.remove('opacity-0', 'pointer-events-none');
    
    Swal.fire({
      icon: 'success',
      title: 'เข้าสู่ระบบสำเร็จ',
      text: 'ยินดีต้อนรับสู่ระบบงานซ่อมบำรุงโรงพยาบาล',
      timer: 1200,
      showConfirmButton: false
    });
    loadAdminDashboard();
  } else {
    Swal.fire({
      icon: 'error',
      title: 'รหัส PIN ไม่ถูกต้อง',
      text: 'กรุณาลองใหม่อีกครั้ง (ค่าเริ่มต้นคือ 1234)',
      confirmButtonColor: '#EF4444'
    });
    pinInput.value = '';
    pinInput.focus();
  }
}

function logoutAdmin() {
  sessionStorage.removeItem(ADMIN_AUTH_KEY);
  checkAdminAuth();
}

function changePinPrompt() {
  Swal.fire({
    title: 'เปลี่ยนรหัส PIN เข้าสู่ระบบ',
    input: 'password',
    inputLabel: 'กำหนดรหัส PIN ใหม่ (ตัวเลข 4-6 หลัก)',
    inputPlaceholder: 'เช่น 5678',
    showCancelButton: true,
    confirmButtonText: 'บันทึก PIN ใหม่',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#0284C7',
    inputValidator: (value) => {
      if (!value || value.length < 4) {
        return 'กรุณากำหนดรหัส PIN อย่างน้อย 4 หลัก';
      }
    }
  }).then((res) => {
    if (res.isConfirmed) {
      localStorage.setItem(ADMIN_PIN_KEY, res.value);
      Swal.fire({
        icon: 'success',
        title: 'เปลี่ยน PIN สำเร็จ',
        text: 'โปรดจดจำรหัส PIN ใหม่สำหรับการเข้าสู่ระบบครั้งถัดไป',
        timer: 1500,
        showConfirmButton: false
      });
    }
  });
}

// -------------------------------------------------------------
// Load & Render Admin Dashboard
// -------------------------------------------------------------
async function loadAdminDashboard() {
  const orders = await ApiService.getAllOrders();
  updateStats(orders);
  renderOrdersTable(orders);
}

function updateStats(orders) {
  const total = orders.length;
  const pending = orders.filter(o => o.status === 'รอดำเนินการ').length;
  const progress = orders.filter(o => o.status === 'กำลังดำเนินการ' || o.status.includes('รออะไหล่')).length;
  const completed = orders.filter(o => o.status === 'ซ่อมเสร็จสิ้น').length;
  const emergency = orders.filter(o => o.urgency && o.urgency.includes('ฉุกเฉินวิกฤต') && o.status !== 'ซ่อมเสร็จสิ้น').length;

  document.getElementById('stat-total').innerText = total;
  document.getElementById('stat-pending').innerText = pending;
  document.getElementById('stat-progress').innerText = progress;
  document.getElementById('stat-completed').innerText = completed;

  const emEl = document.getElementById('stat-emergency');
  if (emEl) {
    emEl.innerText = emergency;
    if (emergency > 0) {
      emEl.parentElement.parentElement.classList.add('ring-2', 'ring-rose-500', 'animate-pulse');
    } else {
      emEl.parentElement.parentElement.classList.remove('ring-2', 'ring-rose-500', 'animate-pulse');
    }
  }
}

// Filter Handlers
function setCategoryFilter(category) {
  currentFilterCategory = category;
  document.querySelectorAll('.filter-cat-btn').forEach(btn => {
    if (btn.dataset.category === category) {
      btn.className = "filter-cat-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-hospital-600 text-white shadow-sm transition";
    } else {
      btn.className = "filter-cat-btn px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 transition";
    }
  });
  loadAdminDashboard();
}

function setStatusFilter(status) {
  currentFilterStatus = status;
  document.querySelectorAll('.filter-status-btn').forEach(btn => {
    if (btn.dataset.status === status) {
      btn.className = "filter-status-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-hospital-600 text-white shadow-sm transition";
    } else {
      btn.className = "filter-status-btn px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 transition";
    }
  });
  loadAdminDashboard();
}

function handleSearchInput() {
  currentSearchQuery = document.getElementById('adminSearchInput').value.trim().toLowerCase();
  loadAdminDashboard();
}

function resetAdminFilters() {
  currentFilterCategory = 'all';
  currentFilterStatus = 'all';
  currentSearchQuery = '';
  document.getElementById('adminSearchInput').value = '';
  setCategoryFilter('all');
  setStatusFilter('all');
}

// Render Table
function renderOrdersTable(orders) {
  const tbody = document.getElementById('adminTableBody');
  const emptyState = document.getElementById('emptyTableState');
  if (!tbody) return;

  // Apply Filters
  let filtered = orders;

  if (currentFilterCategory !== 'all') {
    filtered = filtered.filter(o => o.category && o.category.includes(currentFilterCategory));
  }

  if (currentFilterStatus !== 'all') {
    if (currentFilterStatus === 'progress') {
      filtered = filtered.filter(o => o.status === 'กำลังดำเนินการ' || o.status.includes('รออะไหล่'));
    } else {
      filtered = filtered.filter(o => o.status === currentFilterStatus);
    }
  }

  if (currentSearchQuery) {
    filtered = filtered.filter(o => 
      (o.id && o.id.toLowerCase().includes(currentSearchQuery)) ||
      (o.department && o.department.toLowerCase().includes(currentSearchQuery)) ||
      (o.location && o.location.toLowerCase().includes(currentSearchQuery)) ||
      (o.requesterName && o.requesterName.toLowerCase().includes(currentSearchQuery)) ||
      (o.contactPhone && o.contactPhone.toLowerCase().includes(currentSearchQuery)) ||
      (o.assetId && o.assetId.toLowerCase().includes(currentSearchQuery)) ||
      (o.symptom && o.symptom.toLowerCase().includes(currentSearchQuery))
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  tbody.innerHTML = filtered.map(order => `
    <tr class="hover:bg-slate-50/80 transition text-xs ${order.urgency && order.urgency.includes('ฉุกเฉิน') && order.status !== 'ซ่อมเสร็จสิ้น' ? 'bg-rose-50/40' : ''}">
      
      <!-- Ticket ID & Date -->
      <td class="py-3 px-3">
        <span class="font-mono font-bold text-hospital-800">${order.id}</span>
        <div class="text-[10px] text-slate-400">${order.timestamp}</div>
      </td>

      <!-- Department & Room -->
      <td class="py-3 px-3">
        <div class="font-medium text-slate-800">${order.department}</div>
        <div class="text-[11px] text-slate-500">${order.location}</div>
        ${order.assetId && order.assetId !== '-' ? `<div class="text-[10px] text-slate-400 font-mono">ครุภัณฑ์: ${order.assetId}</div>` : ''}
      </td>

      <!-- Category & Symptom -->
      <td class="py-3 px-3 max-w-[240px]">
        <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">${order.category}</span>
        <div class="text-xs text-slate-700 font-normal line-clamp-2 mt-1" title="${order.symptom}">${order.symptom}</div>
        ${order.image ? `
          <button type="button" onclick="viewPhoto('${order.id}')" class="inline-flex items-center gap-1 text-[10px] text-hospital-600 hover:underline mt-1">
            <i data-lucide="image" class="w-3 h-3"></i> ดูภาพแนบ
          </button>
        ` : ''}
      </td>

      <!-- Urgency -->
      <td class="py-3 px-3">
        ${getUrgencyBadge(order.urgency)}
      </td>

      <!-- Requester -->
      <td class="py-3 px-3">
        <div class="text-slate-800 font-medium">${order.requesterName}</div>
        <div class="text-[11px] text-slate-500">${order.contactPhone}</div>
      </td>

      <!-- Status -->
      <td class="py-3 px-3">
        ${getStatusBadge(order.status)}
        ${order.technician ? `<div class="text-[10px] text-slate-500 mt-1">ช่าง: ${order.technician}</div>` : ''}
      </td>

      <!-- Action Button -->
      <td class="py-3 px-3 text-center">
        <div class="flex items-center justify-center gap-1.5">
          ${order.status === 'รอดำเนินการ' ? `
            <button onclick="quickAcceptOrder('${order.id}')" class="px-2.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold inline-flex items-center gap-1 shadow-sm transition" title="รับงานทันที">
              <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>
              รับงาน
            </button>
          ` : ''}
          <button onclick="openStatusModal('${order.id}')" class="px-2.5 py-1.5 rounded-lg bg-hospital-50 hover:bg-hospital-100 text-hospital-700 text-xs font-semibold inline-flex items-center gap-1 transition" title="แก้ไขสถานะ">
            <i data-lucide="edit" class="w-3.5 h-3.5"></i>
            อัปเดต
          </button>
        </div>
      </td>

    </tr>
  `).join('');

  lucide.createIcons();
}

// Urgency & Status Badges
function getUrgencyBadge(urgency) {
  if (urgency && urgency.includes('ฉุกเฉิน')) {
    return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-300 animate-pulse"><i data-lucide="alert-triangle" class="w-3 h-3"></i> ฉุกเฉินวิกฤต</span>`;
  } else if (urgency && urgency.includes('ด่วนมาก')) {
    return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">ด่วนมาก</span>`;
  } else if (urgency && urgency.includes('ด่วน')) {
    return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">ด่วน</span>`;
  }
  return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-normal bg-slate-100 text-slate-600">ปกติ</span>`;
}

function getStatusBadge(status) {
  switch (status) {
    case 'รอดำเนินการ':
      return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> รอดำเนินการ</span>`;
    case 'กำลังดำเนินการ':
      return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-700"><span class="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping"></span> กำลังดำเนินการ</span>`;
    case 'รออะไหล่/ส่งซ่อมภายนอก':
      return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700"><span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> รออะไหล่</span>`;
    case 'ซ่อมเสร็จสิ้น':
      return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700"><i data-lucide="check" class="w-3 h-3 stroke-[3]"></i> ซ่อมเสร็จสิ้น</span>`;
    default:
      return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-normal bg-slate-100 text-slate-600">${status}</span>`;
  }
}

// Quick Accept
async function quickAcceptOrder(orderId) {
  Swal.fire({
    title: `รับงาน ${orderId}?`,
    text: 'เปลี่ยนสถานะเป็น "กำลังดำเนินการ"',
    input: 'text',
    inputPlaceholder: 'ชื่อช่างผู้รับเรื่อง (เช่น ช่างประเสริฐ)',
    showCancelButton: true,
    confirmButtonText: 'ยืนยันรับงาน',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#0284C7'
  }).then(async (res) => {
    if (res.isConfirmed) {
      await ApiService.updateOrderStatus(orderId, {
        status: 'กำลังดำเนินการ',
        technician: res.value || 'เจ้าหน้าที่เวรซ่อมบำรุง',
        technicianNotes: 'ช่างรับงานและอยู่ระหว่างเข้าหน้างาน'
      });
      await loadAdminDashboard();
      Swal.fire({ icon: 'success', title: 'รับงานเรียบร้อย', timer: 1200, showConfirmButton: false });
    }
  });
}

// Modal Handlers
async function openStatusModal(orderId) {
  const all = await ApiService.getAllOrders();
  const order = all.find(o => o.id === orderId);
  if (!order) return;

  document.getElementById('modalOrderId').value = order.id;
  document.getElementById('modalTicketId').innerText = order.id;
  document.getElementById('modalStatus').value = order.status;
  document.getElementById('modalTechnician').value = order.technician || '';
  document.getElementById('modalNotes').value = order.technicianNotes || '';

  // Show case brief in modal
  const briefEl = document.getElementById('modalCaseBrief');
  if (briefEl) {
    briefEl.innerHTML = `
      <strong>${order.department}</strong> (${order.location})<br>
      <span class="text-slate-500">อาการเสีย:</span> ${order.symptom}
    `;
  }

  document.getElementById('statusModal').classList.remove('hidden');
  lucide.createIcons();
}

function closeStatusModal() {
  document.getElementById('statusModal').classList.add('hidden');
}

async function saveStatusUpdate(event) {
  event.preventDefault();
  const id = document.getElementById('modalOrderId').value;
  const status = document.getElementById('modalStatus').value;
  const technician = document.getElementById('modalTechnician').value.trim();
  const notes = document.getElementById('modalNotes').value.trim();

  try {
    await ApiService.updateOrderStatus(id, {
      status: status,
      technician: technician,
      technicianNotes: notes
    });

    closeStatusModal();
    await loadAdminDashboard();

    Swal.fire({
      icon: 'success',
      title: 'อัปเดตสถานะสำเร็จ',
      text: `ใบงาน ${id} อัปเดตเป็น: ${status}`,
      timer: 1500,
      showConfirmButton: false
    });
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      text: err.message
    });
  }
}

async function viewPhoto(orderId) {
  const all = await ApiService.getAllOrders();
  const order = all.find(o => o.id === orderId);
  if (order && order.image) {
    Swal.fire({
      title: `ภาพถ่ายแนบ: ${order.id}`,
      imageUrl: order.image,
      imageAlt: 'ภาพอาการเสีย',
      confirmButtonColor: '#0284C7',
      confirmButtonText: 'ปิด'
    });
  }
}

// CSV Export
async function exportToCSV() {
  const orders = await ApiService.getAllOrders();
  if (orders.length === 0) {
    Swal.fire({ icon: 'info', title: 'ไม่มีข้อมูลให้ส่งออก', confirmButtonColor: '#0284C7' });
    return;
  }

  const headers = ['รหัสใบงาน', 'วันเวลาแจ้ง', 'หมวดหมู่', 'แผนก', 'สถานที่', 'เลขครุภัณฑ์', 'ความเร่งด่วน', 'อาการเสีย', 'ผู้แจ้ง', 'เบอร์ติดต่อ', 'สถานะ', 'ช่างผู้รับผิดชอบ', 'บันทึกการซ่อม'];
  const rows = orders.map(o => [
    `"${o.id}"`,
    `"${o.timestamp}"`,
    `"${o.category}"`,
    `"${o.department}"`,
    `"${o.location}"`,
    `"${o.assetId || ''}"`,
    `"${o.urgency}"`,
    `"${(o.symptom || '').replace(/"/g, '""')}"`,
    `"${o.requesterName}"`,
    `"${o.contactPhone}"`,
    `"${o.status}"`,
    `"${o.technician || ''}"`,
    `"${(o.technicianNotes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Hospital_Maintenance_Admin_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Reset Samples
function resetSampleData() {
  Swal.fire({
    title: 'โหลดข้อมูลตัวอย่างโรงพยาบาล?',
    text: 'ระบบจะโหลดรายการจำลองใหม่ 3 รายการ',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'ตกลง',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#0284C7'
  }).then(async (res) => {
    if (res.isConfirmed) {
      ApiService.resetSamples();
      await loadAdminDashboard();
      Swal.fire({ icon: 'success', title: 'โหลดข้อมูลสำเร็จ', timer: 1200, showConfirmButton: false });
    }
  });
}

function toggleConfigModal() {
  const modal = document.getElementById('configModal');
  modal.classList.toggle('hidden');
  lucide.createIcons();
}

function saveApiEndpoint() {
  const url = document.getElementById('apiEndpointInput').value.trim();
  ApiService.setEndpoint(url);
  toggleConfigModal();
  Swal.fire({
    icon: 'success',
    title: 'บันทึกการตั้งค่าเรียบร้อย',
    text: url ? 'เชื่อมต่อ Backend API แล้ว' : 'ใช้งานในโหมด LocalStorage',
    timer: 1500,
    showConfirmButton: false
  });
}
