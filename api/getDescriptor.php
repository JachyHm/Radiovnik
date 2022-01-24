<?php
require_once "../simp_db.php";
require_once "utils.php";

$user_channels = array();
$user_channels_sql = $mysqli->prepare('SELECT ch.`sr70`, ch.`type`, ch.`channel`, ch.`description` FROM `transactions_channels` ch LEFT JOIN `transactions` t ON ch.`transaction_id` = t.`id` WHERE NOT t.`approved` AND t.`ip_address` = ? ORDER BY t.`timestamp` DESC, ch.`sr70` ASC;');
$user_channels_sql->bind_param("s", $ip);
$user_channels_sql->execute();
$user_channels_result = $user_channels_sql->get_result();
if (!empty($user_channels_result)) {
    if ($user_channels_result->num_rows > 0) {
        $lastId = 0;
        while ($channel = $user_channels_result->fetch_assoc()) {
            $id = $channel["sr70"];
            if (!array_key_exists($id, $user_channels)) {
                $user_channels[$id] = array();
                $newChannel = array();
                $newChannel["type"] = $channel["type"];
                $newChannel["channel"] = $channel["channel"];
                $newChannel["description"] = $channel["description"];
                array_push($user_channels[$id], $newChannel);
            } else if ($lastId == 0 || $id == $lastId) {
                $newChannel = array();
                $newChannel["type"] = $channel["type"];
                $newChannel["channel"] = $channel["channel"];
                $newChannel["description"] = $channel["description"];
                array_push($user_channels[$id], $newChannel);
            }
            $lastId = $id;
        }
    }
}
$user_channels_result->close();

$user_stations = array();
$user_stations_sql = $mysqli->prepare('SELECT s.`id`, s.`type`, s.`control_type`, s.`remote_control` FROM `transactions_changes` s LEFT JOIN `transactions` t ON s.`transaction_id` = t.`id` WHERE NOT t.`approved` AND t.`ip_address` = ? ORDER BY t.`timestamp` DESC;');
$user_stations_sql->bind_param("s", $ip);
$user_stations_sql->execute();
$user_stations_result = $user_stations_sql->get_result();
if (!empty($user_stations_result)) {
    while ($station = $user_stations_result->fetch_assoc()) {
        $id = $station["id"];
        if (!array_key_exists($id, $user_stations)) {
            $user_stations[$id] = array();
        }
        unset($station["id"]);
        $user_stations[$id][] = $station;
    }
}
$user_stations_result->close();

$stations_sql = $mysqli->prepare('SELECT * FROM `stations` ORDER BY `id` ASC');
$stations_sql->execute();
$stations_result = $stations_sql->get_result();

$stations = array();
if (!empty($stations_result)) {
    if ($stations_result->num_rows > 0) {
        $channels_sql = $mysqli->prepare('SELECT * FROM `channels` WHERE `sr70` = ? ORDER BY `type`;');
        while ($station = $stations_result->fetch_assoc()) {
            if (!array_key_exists($station["id"], $user_channels)) {
                $channels = array();
                $channels_sql->bind_param("i", $station["id"]);
                $channels_sql->execute();
                $channels_result = $channels_sql->get_result();
                if (!empty($channels_result)) {
                    if ($channels_result->num_rows > 0) {
                        while ($channel = $channels_result->fetch_assoc()) {
                            unset($channel["id"]);
                            $channels[] = $channel;
                        }
                    }
                }
            } else {
                $channels = $user_channels[$station["id"]];
            }
            //TODO: check for unapproved changes for this IP - SELECT * FROM `transaction_channels` ch LEFT JOIN `transactions` t ON ch.`transaction_id` = t.`id` WHERE NOT t.`approved` AND t.`ip_address` = ?;
            $station["channels"] = $channels;
            if (array_key_exists($station["id"], $user_stations)) {
                foreach ($user_stations[$station["id"]] as $userStation) {
                    applyStationPatch($station, $userStation);
                }
            }
            $stations[] = $station;
        }
        $channels_result->close();
    }
}
$stations_result->close();

flushResponse(200, "Success!", $mysqli, $stations);
?>