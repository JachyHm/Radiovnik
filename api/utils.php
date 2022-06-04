<?php
function flushResponse($code, $message, $mysqli = null, $body = null) 
{
    http_response_code($code);

    if (!isset($body)) {
        $body = new stdClass();
    }

    /*if ($code >= 200 && $code <= 299) {
        $code = 1;
    } else {
        $code = -1;
    }*/

    $response = new stdClass();
    $response->code = $code;
    $response->message = $message;
    $response->timestamp = time();
    $response->content = $body;

    $response_json = json_encode($response);

    if ($mysqli != null) {
        $mysqli->close();
    }

    $supportsGzip = false;
    if (isset($_SERVER['HTTP_ACCEPT_ENCODING'])) {
        $supportsGzip = strpos($_SERVER['HTTP_ACCEPT_ENCODING'], 'gzip') !== false;
    }
    if ($supportsGzip) {
        $response_json = gzencode($response_json, 9);
        header('Content-Encoding: gzip');
    }

    header('Content-Type: application/json; Charset: UTF-8');
    header('Content-Length: ' . strlen($response_json));
    
    die($response_json);
}

function applyStationPatch(&$data, $patch) 
{
    if (isset($patch["type"])) {
        $data["type"] = $patch["type"];
    }
    if (isset($patch["control_type"])) {
        $data["control_type"] = $patch["control_type"];
    }
    if (isset($patch["remote_control"])) {
        $data["remote_control"] = $patch["remote_control"];
    }
    $data["verified"] = true;
}

function applyChannelPatch(&$data, $patch) 
{
    if (isset($patch["type"])) {
        $data["type"] = $patch["type"];
    }
    if (isset($patch["channel"])) {
        $data["channel"] = $patch["channel"];
    }
    if (isset($patch["description"])) {
        $data["description"] = $patch["description"];
    }
    if (isset($patch["sr70"])) {
        $data["sr70"] = $patch["sr70"];
    }
    $data["verified"] = true;
}

function IsNullOrEmptyString($str){
    return ($str === null || trim($str) === '');
}

function send_mail($recipient = '', $sender = '', $subject = '', $message = '', $is_html = false) {
    // Detect HTML markdown
    if (substr_count($message, '</') >= 1) {
        $is_html = true;
    }

    // Build recipient name <email> pair
    if (is_array($recipient)) {
        $recipient = '=?UTF-8?B?' . base64_encode($recipient[0]) . '?= <' . $recipient[1] . '>';
    }

    // Build sender name <email> pair
    if (is_array($sender)) {
        $sender = '=?UTF-8?B?' . base64_encode($sender[0]) . '?= <' . $sender[1] . '>';
    }

    // Determine content type
    $content_type = 'text/plain';
    if ($is_html) {
        $content_type = 'text/html';
    }

    // Subject
    $subject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

    // Mail headers
    $header  = 'MIME-Version: 1.0' . "\r\n";
    $header .= 'Content-type: ' . $content_type . '; charset=utf-8' . "\r\n";
    $header .= 'Content-Transfer-Encoding: base64' . "\r\n";
    $header .= 'Date: ' . date('r (T)') . "\r\n";

    $header .= 'From: ' . $sender . "\r\n";
    $header .= 'Reply-To: no-reply@jachyhm.cz' . "\r\n";

    $header .= 'X-Mailer: PHP ' . phpversion();

    if (mail($recipient, $subject, chunk_split(base64_encode($message)), $header)) {
        return true;
    } else {
        return false;
    }
}