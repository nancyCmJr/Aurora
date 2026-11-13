<?php
require_once __DIR__ . '/sesion.php';

if (empty($_SESSION['aurora_usuario']['codigo'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Debes iniciar sesión',
    ], JSON_UNESCAPED_UNICODE);
    exit();
}
if ($_SESSION['aurora_usuario']['rol'] !== 'Admin') {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'No tienes permisos para gestionar usuarios',
    ], JSON_UNESCAPED_UNICODE);
    exit();
}
