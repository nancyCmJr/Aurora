<?php
/**
 * Bootstrap centralizado de CORS y sesión PHP para Aurora.
 * Debe incluirse al comienzo de auth/login.php y cada endpoint protegido,
 * ANTES de cualquier echo o salida HTML.
 */
$origen = $_SERVER['HTTP_ORIGIN'] ?? '';
$origenesPermitidos = [
    'http://localhost:8100',
    'http://127.0.0.1:8100',
    // Añade aquí el origen exacto de tu aplicación cuando la publiques.
];
if ($origen !== '' && in_array($origen, $origenesPermitidos, true)) {
    header('Access-Control-Allow-Origin: ' . $origen);
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_name('AURORA_SESSID');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        // Válido para desarrollo http://localhost:8100 -> http://localhost/api_aurora
        // En producción entre sitios distintos: SameSite=None + Secure + HTTPS.
        'samesite' => 'Lax',
    ]);
    session_start();
}
