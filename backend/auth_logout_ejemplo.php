<?php
// Guarda este contenido como auth/logout.php solo si tu endpoint actual
// no elimina una sesión PHP. Revisa primero su implementación.
require_once __DIR__ . '/../config/sesion.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit();
}
$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires' => time() - 42000,
        'path' => $params['path'],
        'domain' => $params['domain'],
        'secure' => $params['secure'],
        'httponly' => $params['httponly'],
        'samesite' => $params['samesite'] ?? 'Lax'
    ]);
}
session_destroy();
echo json_encode(['success' => true, 'message' => 'Sesión finalizada']);
