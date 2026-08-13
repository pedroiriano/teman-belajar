<?php
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
require_once('/var/www/html/public/lib/oauthlib.php');

set_config('curlsecurityallowedport', "8080\n8081");
set_config('curlsecurityblockedhosts', '127.0.0.2');

$issuer = \core\oauth2\api::get_issuer(2); // Assuming ID 2 is Keycloak
$client = new \core\oauth2\client($issuer, '', '', false);
$token_url = 'http://keycloak.teman-belajar.localhost:8081/realms/teman-belajar/protocol/openid-connect/token';
$params = ['grant_type' => 'authorization_code', 'code' => 'dummy', 'redirect_uri' => 'dummy', 'client_id' => $issuer->get('clientid'), 'client_secret' => $issuer->get('clientsecret')];

echo "Sending POST to $token_url\n";
$response = $client->post($token_url, $client->build_post_data($params));
$info = $client->get_info();

echo "HTTP Code: " . $info['http_code'] . "\n";
echo "Response: " . $response . "\n";
