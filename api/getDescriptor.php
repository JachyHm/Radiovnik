<?php
require_once "../simp_db.php";
require_once "utils.php";

$stations_sql = $mysqli->prepare('SELECT * FROM `stations` ORDER BY `id` ASC');
$stations_sql->execute();
$stations_result = $stations_sql->get_result();

$stations = array();
if (!empty($stations_result)) {
    if ($stations_result->num_rows > 0) {
        $isLoggedUser = isset($_GET["pass"]) && trim($_GET["pass"]) == $phonesPassword;
        $channels_sql = $isLoggedUser ? $mysqli->prepare('SELECT `type`, `channel`, `description`, `gid` FROM `channels` WHERE `sr70` = ? ORDER BY `type`') : $mysqli->prepare('SELECT `type`, `channel`, `description`, `gid` FROM `channels` WHERE `sr70` = ? AND `type` != 3 ORDER BY `type`;');
        while ($station = $stations_result->fetch_assoc()) {
            $channels = array();
            $channels_sql->bind_param("i", $station["id"]);
            $channels_sql->execute();
            $channels_result = $channels_sql->get_result();
            if (!empty($channels_result)) {
                if ($channels_result->num_rows > 0) {
                    while ($channel = $channels_result->fetch_assoc()) {
                        $gid = $channel["gid"];
                        unset($channel["gid"]);
                        $channels[$gid] = $channel;
                    }
                }
            }
            $station["channels"] = $channels;
            $stations[] = $station;
        }
        $channels_result->close();
    }
}
$stations_result->close();

flushResponse(200, "Success!", $mysqli, $stations);
?>