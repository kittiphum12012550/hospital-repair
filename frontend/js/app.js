/**
 * ==========================================================================
 * Hospital Maintenance System - Frontend User Application Logic (app.js)
 * For General Hospital Staff / Nurses: Submit Repair Tickets & Track Status
 * ==========================================================================
 */

let currentImageBase64 = null;

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  initDateDisplay();
  loadTrackingList();

  // Load API Endpoint in Config Modal
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

// Tab Switching (Between Form and Track Status only)
function switchTab(tabName) {
  ['form', 'track'].forEach(tab => {
    const section = document.getElementById(`tab-${tab}`);
    const btn = document.getElementById(`tabBtn-${tab}`);
    if (!section || !btn) return;

    if (tab === tabName) {
      section.classList.remove('hidden');
      btn.className = "flex-1 py-3 text-center text-sm font-medium border-b-2 border-white text-white flex items-center justify-center gap-2 transition";
    } else {
      section.classList.add('hidden');
      btn.className = "flex-1 py-3 text-center text-sm font-medium border-b-2 border-transparent text-sky-200 hover:text-white flex items-center justify-center gap-2 transition";
    }
  });
  lucide.createIcons();
}

// Image Upload & Client-Side Resizing
function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.match('image.*')) {
    Swal.fire({
      icon: 'warning',
      title: 'ไฟล์ไม่ถูกต้อง',
      text: 'กรุณาเลือกไฟล์ภาพถ่ายเท่านั้น (JPEG, PNG, WebP)',
      confirmButtonColor: '#0284C7'
    });
    return;
  }

  const reader = new FileReader();
  reader.onload = function(evt) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 900;
      let width = img.width;
      let height = img.height;

      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      currentImageBase64 = canvas.toDataURL('image/jpeg', 0.75);

      document.getElementById('uploadPrompt').classList.add('hidden');
      const previewContainer = document.getElementById('imagePreviewContainer');
      const previewImg = document.getElementById('imagePreview');
      previewImg.src = currentImageBase64;
      previewContainer.classList.remove('hidden');
      lucide.createIcons();
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

function removeImage(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  currentImageBase64 = null;
  const input = document.getElementById('imageInput');
  const preview = document.getElementById('imagePreview');
  const container = document.getElementById('imagePreviewContainer');
  const prompt = document.getElementById('uploadPrompt');

  if (input) input.value = '';
  if (preview) preview.src = '';
  if (container) container.classList.add('hidden');
  if (prompt) prompt.classList.remove('hidden');
}

// Form Submission with Anti-Double Submit
async function handleFormSubmit(event) {
  event.preventDefault();
  const form = document.getElementById('repairForm');

  const category = form.category.value;
  const department = form.department.value.trim();
  const location = form.location.value.trim();
  const assetId = form.assetId.value.trim();
  const urgency = form.urgency.value;
  const symptom = form.symptom.value.trim();
  const requesterName = form.requesterName.value.trim();
  const contactPhone = form.contactPhone.value.trim();

  // Validation
  if (!department || !location || !symptom || !requesterName || !contactPhone) {
    Swal.fire({
      icon: 'warning',
      title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
      text: 'โปรดระบุ แผนก, จุดที่ตั้ง, อาการเสีย, ชื่อผู้แจ้ง และเบอร์โทรศัพท์ติดต่อ',
      confirmButtonText: 'ตกลง',
      confirmButtonColor: '#0284C7'
    });
    return;
  }

  // Anti-Double Submit
  const submitBtn = document.getElementById('submitBtn');
  const btnText = document.getElementById('btnText');
  const btnSpinner = document.getElementById('btnSpinner');

  submitBtn.disabled = true;
  submitBtn.classList.add('opacity-75', 'cursor-not-allowed');
  btnText.innerText = 'กำลังส่งข้อมูลและบันทึก...';
  btnSpinner.classList.remove('hidden');

  try {
    const payload = {
      category: category,
      department: department,
      location: location,
      assetId: assetId || '-',
      urgency: urgency,
      symptom: symptom,
      requesterName: requesterName,
      contactPhone: contactPhone,
      status: 'รอดำเนินการ',
      technician: '',
      technicianNotes: '',
      image: currentImageBase64
    };

    const result = await ApiService.submitOrder(payload);

    await Swal.fire({
      icon: 'success',
      title: 'ส่งแจ้งซ่อมสำเร็จ!',
      html: `
        <div class="text-left text-sm space-y-2 py-2">
          <div class="p-3 bg-sky-50 rounded-xl border border-sky-100">
            <span class="text-xs text-sky-600 block font-semibold">หมายเลขใบงานแจ้งซ่อม:</span>
            <span class="text-base font-bold font-mono text-hospital-800">${result.ticketId}</span>
          </div>
          <p class="text-slate-600 text-xs mt-2">
            📍 <strong>สถานที่:</strong> ${department} (${location})<br>
            ⏱️ <strong>ระดับความเร่งด่วน:</strong> ${urgency}<br>
            ระบบได้บันทึกและส่งข้อมูลเข้าศูนย์งานซ่อมบำรุงเรียบร้อยแล้ว
          </p>
        </div>
      `,
      confirmButtonText: 'รับทราบและคัดลอกเลขใบงาน',
      confirmButtonColor: '#0284C7',
      showCancelButton: true,
      cancelButtonText: 'ไปหน้าติดตามสถานะ',
      cancelButtonColor: '#64748B'
    }).then((swalRes) => {
      navigator.clipboard.writeText(result.ticketId).catch(() => {});
      if (swalRes.dismiss === Swal.DismissReason.cancel) {
        switchTab('track');
        document.getElementById('searchInput').value = result.ticketId;
        searchRepairOrders();
      }
    });

    // Reset Form
    form.reset();
    removeImage();
    document.getElementById('urgency').classList.add('has-value');
    await loadTrackingList();

  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาดในการบันทึก',
      text: err.message || 'กรุณาลองใหม่อีกครั้ง หรือติดต่อเจ้าหน้าที่ไอที',
      confirmButtonColor: '#EF4444'
    });
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-75', 'cursor-not-allowed');
    btnText.innerText = 'ส่งข้อมูลแจ้งซ่อม';
    btnSpinner.classList.add('hidden');
  }
}

// Helpers: Badges & Timeline
function getUrgencyBadge(urgency) {
  if (urgency && urgency.includes('ฉุกเฉิน')) {
    return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-300 animate-critical"><i data-lucide="alert-triangle" class="w-3 h-3"></i> ฉุกเฉินวิกฤต</span>`;
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

function renderTimeline(order) {
  const step1Done = true;
  const step2Done = order.status !== 'รอดำเนินการ';
  const step3Done = order.status === 'ซ่อมเสร็จสิ้น';

  return `
    <div class="mt-4 pt-3 border-t border-slate-100">
      <div class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">ขั้นตอนการดำเนินงาน:</div>
      <div class="grid grid-cols-3 gap-2 text-center text-xs">
        <div class="flex flex-col items-center">
          <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step1Done ? 'bg-hospital-600 text-white' : 'bg-slate-200 text-slate-500'}">
            1
          </div>
          <span class="mt-1 text-[11px] font-medium ${step1Done ? 'text-hospital-700' : 'text-slate-400'}">ส่งแจ้งเรื่อง</span>
        </div>
        <div class="flex flex-col items-center">
          <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step2Done ? 'bg-sky-500 text-white' : 'bg-slate-200 text-slate-500'}">
            2
          </div>
          <span class="mt-1 text-[11px] font-medium ${step2Done ? 'text-sky-600' : 'text-slate-400'}">ช่างรับงาน/กำลังซ่อม</span>
        </div>
        <div class="flex flex-col items-center">
          <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step3Done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}">
            3
          </div>
          <span class="mt-1 text-[11px] font-medium ${step3Done ? 'text-emerald-600' : 'text-slate-400'}">ซ่อมเสร็จสิ้น</span>
        </div>
      </div>
    </div>
  `;
}

// Load Tracking List
async function loadTrackingList() {
  const orders = await ApiService.getAllOrders();
  renderTrackingList(orders);
}

// Render Tracking List
function renderTrackingList(orders) {
  const container = document.getElementById('ordersList');
  const emptyState = document.getElementById('emptySearchState');
  if (!container) return;

  if (!orders || orders.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  container.innerHTML = orders.map(order => `
    <div class="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:border-slate-300 transition space-y-3">
      <div class="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="font-mono text-sm font-bold text-hospital-800">${order.id}</span>
            <span class="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">${order.category}</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-0.5">แจ้งเมื่อ: ${order.timestamp}</p>
        </div>
        <div class="flex items-center gap-2">
          ${getUrgencyBadge(order.urgency)}
          ${getStatusBadge(order.status)}
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div>
          <span class="text-slate-400 block">สถานที่ / แผนก:</span>
          <strong class="text-slate-700">${order.department}</strong>
          <div class="text-slate-600 mt-0.5">จุดที่ตั้ง: ${order.location}</div>
          ${order.assetId && order.assetId !== '-' ? `<div class="text-slate-500 mt-0.5">เลขครุภัณฑ์: <span class="font-mono">${order.assetId}</span></div>` : ''}
        </div>

        <div>
          <span class="text-slate-400 block">ผู้แจ้งซ่อม:</span>
          <strong class="text-slate-700">${order.requesterName}</strong>
          <div class="text-slate-600 mt-0.5">เบอร์โทรศัพท์: ${order.contactPhone}</div>
        </div>
      </div>

      <div class="bg-slate-50 rounded-xl p-3 text-xs">
        <span class="font-semibold text-slate-700 block mb-1">อาการเสียที่ระบุ:</span>
        <p class="text-slate-600 whitespace-pre-line">${order.symptom}</p>
        ${order.image ? `
          <div class="mt-2">
            <button type="button" onclick="viewPhoto('${order.id}')" class="inline-flex items-center gap-1 text-[11px] text-hospital-600 hover:underline">
              <i data-lucide="image" class="w-3.5 h-3.5"></i> ดูภาพถ่ายที่แนบ
            </button>
          </div>
        ` : ''}
      </div>

      ${order.technicianNotes ? `
        <div class="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-3 text-xs text-emerald-900">
          <span class="font-semibold flex items-center gap-1">
            <i data-lucide="wrench" class="w-3.5 h-3.5 text-emerald-600"></i>
            บันทึกการซ่อมโดย: ${order.technician || 'เจ้าหน้าที่ซ่อมบำรุง'}
          </span>
          <p class="text-emerald-800 mt-1">${order.technicianNotes}</p>
        </div>
      ` : ''}

      ${renderTimeline(order)}
    </div>
  `).join('');

  lucide.createIcons();
}

// Search
async function searchRepairOrders() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const all = await ApiService.getAllOrders();
  if (!q) {
    renderTrackingList(all);
    return;
  }
  const filtered = all.filter(o => 
    (o.id && o.id.toLowerCase().includes(q)) ||
    (o.requesterName && o.requesterName.toLowerCase().includes(q)) ||
    (o.contactPhone && o.contactPhone.toLowerCase().includes(q)) ||
    (o.department && o.department.toLowerCase().includes(q)) ||
    (o.assetId && o.assetId.toLowerCase().includes(q)) ||
    (o.symptom && o.symptom.toLowerCase().includes(q))
  );
  renderTrackingList(filtered);
}

async function resetSearch() {
  document.getElementById('searchInput').value = '';
  const all = await ApiService.getAllOrders();
  renderTrackingList(all);
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

// Settings Modal
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
    text: url ? 'เชื่อมต่อ Backend API / Webhook แล้ว' : 'ใช้งานในโหมด LocalStorage',
    timer: 1500,
    showConfirmButton: false
  });
}
