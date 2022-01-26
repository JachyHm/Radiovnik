<?php
/**
 * Soubor definice udaju k DB.
 * 
 * PHP version 7.1
 * 
 * @category  DB
 * @package   DB
 * @author    JachyHm <jachym.hurtik@gmail.com>
 * @copyright 2016 - 2020 JachyHm 
 * @license   Free to share
 * @version   CVS: 1
 * @link      simp_db.php
 */

/* Definice udaju */
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$host = <DB_HOST>;
$user = <DB_USER>;
$pass = <DB_PASS>;
$db = <DB_NAME>;
$mysqli = new mysqli($host, $user, $pass, $db) or die($mysqli->error);
$mysqli->set_charset("utf8");

$captcha_secret = <SECRET_KEY>;
$phonesPassword = <PHONES_PASSWORD>;

if (!empty($_SERVER['HTTP_CLIENT_IP'])) { //check ip from share internet
    $ip=$_SERVER['HTTP_CLIENT_IP'];
} elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) { //to check ip is pass from proxy
    $ip=$_SERVER['HTTP_X_FORWARDED_FOR'];
} else {
    $ip=$_SERVER['REMOTE_ADDR'];
}