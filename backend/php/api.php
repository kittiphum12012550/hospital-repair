<?php
/**
 * Hospital Maintenance System - REST API Endpoint
 */
require_once __DIR__ . '/config.php';
header('Content-Type: application/json; charset=utf-8');

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

// Handle GET: List & Search
if ($method === 'GET') {
    $action = $_GET['action'] ?? 'getAll';

    if ($action === 'search' && !empty($_GET['q'])) {
        $q = '%' . trim($_GET['q']) . '%';
        $stmt = $pdo->prepare("SELECT ticket_no as id, created_at as timestamp, category_code as category, department_name as department, location_detail as location, asset_id as assetId, urgency_level as urgency, symptom, requester_name as requesterName, contact_phone as contactPhone, status, technician_name as technician, technician_notes as technicianNotes, image_url as image FROM repair_tickets WHERE ticket_no LIKE :q OR contact_phone LIKE :q OR requester_name LIKE :q OR department_name LIKE :q ORDER BY ticket_id DESC LIMIT 100");
        $stmt->execute([':q' => $q]);
        $data = $stmt->fetchAll();
        echo json_encode(['status' => 'success', 'data' => $data]);
        exit();
    }

    // Default: Return All Orders
    $stmt = $pdo->query("SELECT ticket_no as id, created_at as timestamp, category_code as category, department_name as department, location_detail as location, asset_id as assetId, urgency_level as urgency, symptom, requester_name as requesterName, contact_phone as contactPhone, status, technician_name as technician, technician_notes as technicianNotes, image_url as image FROM repair_tickets ORDER BY ticket_id DESC LIMIT 200");
    $data = $stmt->fetchAll();
    echo json_encode(['status' => 'success', 'data' => $data]);
    exit();
}

// Handle POST: Submit Ticket or Update Status
if ($method === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data) {
        $data = $_POST;
    }

    if (empty($data)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'No payload received']);
        exit();
    }

    // Check if Update action
    if (!empty($data['action']) && $data['action'] === 'update' && !empty($data['id'])) {
        $stmt = $pdo->prepare("UPDATE repair_tickets SET status = :status, technician_name = :tech, technician_notes = :notes WHERE ticket_no = :id");
        $stmt->execute([
            ':status' => $data['status'] ?? 'รอดำเนินการ',
            ':tech' => $data['technician'] ?? '',
            ':notes' => $data['technicianNotes'] ?? '',
            ':id' => $data['id']
        ]);
        echo json_encode(['status' => 'success', 'message' => 'Ticket updated successfully']);
        exit();
    }

    // Insert New Ticket
    $ticketId = $data['id'] ?? ('REQ-HOSP-' . date('Ymd') . '-' . rand(100, 999));
    $stmt = $pdo->prepare("INSERT INTO repair_tickets (ticket_no, category_code, department_name, location_detail, asset_id, urgency_level, symptom, image_url, requester_name, contact_phone, status, technician_name, technician_notes) VALUES (:id, :cat, :dept, :loc, :asset, :urgency, :symptom, :img, :req, :phone, :status, :tech, :notes)");

    $stmt->execute([
        ':id' => $ticketId,
        ':cat' => $data['category'] ?? 'ทั่วไป',
        ':dept' => $data['department'] ?? '-',
        ':loc' => $data['location'] ?? '-',
        ':asset' => $data['assetId'] ?? '-',
        ':urgency' => $data['urgency'] ?? 'ปกติ',
        ':symptom' => $data['symptom'] ?? '-',
        ':img' => $data['image'] ?? null,
        ':req' => $data['requesterName'] ?? '-',
        ':phone' => $data['contactPhone'] ?? '-',
        ':status' => $data['status'] ?? 'รอดำเนินการ',
        ':tech' => '',
        ':notes' => ''
    ]);

    // Send LINE Notify if configured
    if (defined('LINE_NOTIFY_TOKEN') && LINE_NOTIFY_TOKEN !== '') {
        sendLineNotification($data, $ticketId);
    }

    echo json_encode([
        'status' => 'success',
        'ticketId' => $ticketId,
        'message' => 'สร้างใบงานแจ้งซ่อมสำเร็จ'
    ]);
    exit();
}

function sendLineNotification($data, $ticketId) {
    $msg = "\n🔔 แจ้งซ่อมใหม่ (รพ.)\n"
         . "-------------------------\n"
         . "🎫 เลขที่: {$ticketId}\n"
         . "🏥 แผนก: {$data['department']}\n"
         . "📍 จุดที่ตั้ง: {$data['location']}\n"
         . "⚠️ ความเร่งด่วน: {$data['urgency']}\n"
         . "🔧 อาการ: {$data['symptom']}\n"
         . "👤 ผู้แจ้ง: {$data['requesterName']} ({$data['contactPhone']})\n"
         . "-------------------------";

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://notify-api.line.me/api/notify");
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query(['message' => $msg]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/x-www-form-urlencoded',
        'Authorization: Bearer ' . LINE_NOTIFY_TOKEN
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_exec($ch);
    curl_close($ch);
}
