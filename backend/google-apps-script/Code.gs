/**
 * =========================================================================
 * ระบบติดตามงานซ่อมบำรุงโรงพยาบาล (Hospital Maintenance Work Order System)
 * Backend: Google Apps Script + Google Sheets + LINE Notify
 * =========================================================================
 */

// 1. ตั้งค่าพื้นฐาน (Configuration)
const CONFIG = {
  SHEET_NAME: 'รายการแจ้งซ่อม',
  LINE_NOTIFY_TOKEN: '', // ใส่ LINE Notify Token ของกลุ่มช่างซ่อมบำรุงที่นี่
  TIMEZONE: 'GMT+7'
};

/**
 * doPost: รับข้อมูลจาก Frontend Web Form และบันทึกลงตาราง Google Sheets
 */
function doPost(e) {
  try {
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    let data;
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      data = e.parameter;
    } else {
      return responseJSON({ status: 'error', message: 'No data received' });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

    // หากยังไม่มี Sheet ให้สร้างพร้อม Header
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.SHEET_NAME);
      const headers = [
        'วันเวลาแจ้ง (Timestamp)',
        'เลขที่ใบงาน (Ticket ID)',
        'หมวดหมู่งาน',
        'แผนก/หน่วยงาน',
        'จุดที่ตั้ง/ห้อง/เตียง',
        'ชื่ออุปกรณ์/เลขครุภัณฑ์',
        'ระดับความเร่งด่วน',
        'อาการเสีย/ปัญหา',
        'ชื่อผู้แจ้ง',
        'เบอร์โทรศัพท์/เบอร์ต่อ',
        'สถานะงาน',
        'ช่างผู้รับผิดชอบ',
        'บันทึกผลการซ่อม/หมายเหตุ',
        'ลิงก์ภาพถ่าย'
      ];
      sheet.appendRow(headers);
      
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#075985')
                 .setFontColor('#FFFFFF')
                 .setFontWeight('bold')
                 .setHorizontalAlignment('center');
      sheet.setFrozenRows(1);
    }

    // จัดเตรียมข้อมูล
    const timestamp = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'dd/MM/yyyy HH:mm:ss');
    const ticketId = data.id || generateHospitalTicketId(data.category);
    const category = data.category || 'ทั่วไป';
    const department = data.department || '-';
    const location = data.location || '-';
    const assetId = data.assetId || '-';
    const urgency = data.urgency || 'ปกติ';
    const symptom = data.symptom || '-';
    const requesterName = data.requesterName || '-';
    const contactPhone = data.contactPhone || '-';
    const status = data.status || 'รอดำเนินการ';
    const technician = data.technician || '';
    const technicianNotes = data.technicianNotes || '';
    
    // บันทึกรูปลง Drive ถ้ามี
    let imageUrl = '-';
    if (data.image && data.image.startsWith('data:image')) {
      try {
        imageUrl = saveImageToDrive(data.image, ticketId);
      } catch (imgErr) {
        imageUrl = 'บันทึกรูปไม่สำเร็จ: ' + imgErr.toString();
      }
    }

    // ตรวจสอบว่าเป็นคำสั่ง Update งานหรือไม่
    if (data.action === 'update' && data.id) {
      const rows = sheet.getDataRange().getValues();
      let updated = false;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][1] === data.id) {
          if (data.status) sheet.getRange(i + 1, 11).setValue(data.status);
          if (data.technician) sheet.getRange(i + 1, 12).setValue(data.technician);
          if (data.technicianNotes) sheet.getRange(i + 1, 13).setValue(data.technicianNotes);
          updated = true;
          break;
        }
      }
      lock.releaseLock();
      return responseJSON({ status: 'success', message: 'Update success', updated: updated });
    }

    // ถ้าเป็น New Ticket ให้ appendRow
    sheet.appendRow([
      timestamp,
      ticketId,
      category,
      department,
      location,
      assetId,
      urgency,
      symptom,
      requesterName,
      contactPhone,
      status,
      technician,
      technicianNotes,
      imageUrl
    ]);

    lock.releaseLock();

    // ส่งแจ้งเตือน LINE Notify
    if (CONFIG.LINE_NOTIFY_TOKEN) {
      sendLineNotify({
        ticketId: ticketId,
        category: category,
        department: department,
        location: location,
        assetId: assetId,
        urgency: urgency,
        symptom: symptom,
        requester: requesterName,
        phone: contactPhone,
        imageUrl: imageUrl !== '-' ? imageUrl : null
      });
    }

    return responseJSON({
      status: 'success',
      ticketId: ticketId,
      timestamp: timestamp,
      message: 'บันทึกข้อมูลแจ้งซ่อมสำเร็จ'
    });

  } catch (error) {
    return responseJSON({
      status: 'error',
      message: error.toString()
    });
  }
}

/**
 * doGet: ค้นหาและดึงข้อมูลไปแสดงที่หน้าเว็บ
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

    if (!sheet) {
      return responseJSON({ status: 'success', data: [] });
    }

    const rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) {
      return responseJSON({ status: 'success', data: [] });
    }

    const rawData = rows.slice(1);
    const orders = rawData.map(r => ({
      timestamp: r[0],
      id: r[1],
      category: r[2],
      department: r[3],
      location: r[4],
      assetId: r[5],
      urgency: r[6],
      symptom: r[7],
      requesterName: r[8],
      contactPhone: r[9],
      status: r[10],
      technician: r[11],
      technicianNotes: r[12],
      imageUrl: r[13]
    }));

    if (action === 'search') {
      const q = (e.parameter.q || '').toLowerCase();
      const filtered = orders.filter(o => 
        String(o.id).toLowerCase().includes(q) ||
        String(o.contactPhone).includes(q) ||
        String(o.requesterName).toLowerCase().includes(q) ||
        String(o.department).toLowerCase().includes(q)
      );
      return responseJSON({ status: 'success', data: filtered });
    }

    return responseJSON({ status: 'success', data: orders.reverse() });

  } catch (error) {
    return responseJSON({ status: 'error', message: error.toString() });
  }
}

function generateHospitalTicketId(category) {
  let prefix = 'REQ-MED';
  if (category && (category.includes('อาคาร') || category.includes('กายภาพ'))) prefix = 'REQ-FAC';
  else if (category && (category.includes('IT') || category.includes('คอมพิวเตอร์'))) prefix = 'REQ-IT';
  else if (category && category.includes('ครุภัณฑ์')) prefix = 'REQ-GEN';

  const dateStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMMdd');
  const rand = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${dateStr}-${rand}`;
}

function saveImageToDrive(base64Data, ticketId) {
  const folderName = 'Hospital_Repairs';
  let folder;
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(folderName);
  }

  const contentType = base64Data.substring(5, base64Data.indexOf(';'));
  const bytes = Utilities.base64Decode(base64Data.split(',')[1]);
  const blob = Utilities.newBlob(bytes, contentType, `${ticketId}.jpg`);

  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function sendLineNotify(info) {
  if (!CONFIG.LINE_NOTIFY_TOKEN) return;

  let urgencyIcon = '🟢';
  if (info.urgency.includes('ฉุกเฉิน')) urgencyIcon = '🚨 [ฉุกเฉินวิกฤต!]';
  else if (info.urgency.includes('ด่วนมาก')) urgencyIcon = '🔥 [ด่วนมาก]';
  else if (info.urgency.includes('ด่วน')) urgencyIcon = '⚡ [ด่วน]';

  let msg = `\n🔔 แจ้งซ่อมใหม่ (${info.category})\n`;
  msg += `------------------------------\n`;
  msg += `🎫 เลขที่: ${info.ticketId}\n`;
  msg += `🏥 แผนก: ${info.department}\n`;
  msg += `📍 สถานที่: ${info.location}\n`;
  if (info.assetId && info.assetId !== '-') msg += `🏷️ ครุภัณฑ์: ${info.assetId}\n`;
  msg += `⚠️ ความเร่งด่วน: ${urgencyIcon} ${info.urgency}\n`;
  msg += `🔧 อาการ: ${info.symptom}\n`;
  msg += `👤 ผู้แจ้ง: ${info.requester} (${info.phone})\n`;
  if (info.imageUrl) msg += `📷 ภาพถ่าย: ${info.imageUrl}\n`;
  msg += `------------------------------`;

  const payload = {
    method: 'post',
    headers: { 'Authorization': 'Bearer ' + CONFIG.LINE_NOTIFY_TOKEN },
    payload: { 'message': msg },
    muteHttpExceptions: true
  };

  UrlFetchApp.fetch('https://notify-api.line.me/api/notify', payload);
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
