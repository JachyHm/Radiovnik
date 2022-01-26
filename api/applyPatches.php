<?php
require_once "../simp_db.php";
require_once "utils.php";

if (!(isset($_GET["pass"]) && $_GET["pass"] == $pass) && !(isset($_POST["pass"]) && $_POST["pass"] == $pass)) {
    flushResponse(403, "Neplatné heslo!", $mysqli);
}

try {
    $mysqli->query('DELETE FROM `stations`;');
    $mysqli->query('DELETE FROM `channels`;');

    $stations_sql = $mysqli->prepare('SELECT * FROM `sr70` ORDER BY `id` ASC;');
    $stations_sql->execute();
    $stations_result = $stations_sql->get_result();
    if (!empty($stations_result)) {
        if ($stations_result->num_rows > 0) {
            $patch_sql = $mysqli->prepare('SELECT s.`type`, s.`control_type`, s.`remote_control` FROM `transactions_changes` s LEFT JOIN `transactions` t ON s.`transaction_id` = t.`id` WHERE s.`id` = ? AND t.`approved` ORDER BY t.`timestamp` ASC;');
            $write_sql = $mysqli->prepare('INSERT INTO `stations` (`id`, `name`, `short_name`, `abbreviation`, `type`, `state`, `control_type`, `remote_control`, `operator`, `lon`, `lat`, `verified`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);');
            while ($station = $stations_result->fetch_assoc()) {
                $patch_sql->bind_param("i", $station["id"]);
                $patch_sql->execute();
                $patch_result = $patch_sql->get_result();
                if (!empty($patch_result)) {
                    while ($patch = $patch_result->fetch_assoc()) {
                        applyStationPatch($station, $patch);
                    }
                }
                $write_sql->bind_param("isssiiiisddi", $station["id"], $station["name"], $station["short_name"], $station["abbreviation"], $station["type"], $station["state"], $station["control_type"], $station["remote_control"], $station["operator"], $station["lon"], $station["lat"], $station["verified"]);
                $write_sql->execute();
            }
            $patch_sql->close();
            $write_sql->close();
        }
    }
    $stations_result->close();

    $confirms_sql = $mysqli->prepare('SELECT c.`sr70` FROM `transactions_confirms` c LEFT JOIN `transactions` t ON c.`transaction_id` = t.`id` WHERE t.`approved`;');
    $confirms_sql->execute();
    $confirms_result = $confirms_sql->get_result();
    if (!empty($confirms_result)) {
        if ($confirms_result->num_rows > 0) {
            $update_sql = $mysqli->prepare('UPDATE `stations` SET `verified` = 1 WHERE `id` = ?;');
            while ($confirm = $confirms_result->fetch_assoc()) {
                $update_sql->bind_param("i", $confirm["sr70"]);
                $update_sql->execute();
            }
            $update_sql->close();
        }
    }
    $confirms_sql->close();

    $channels = array();
    $temp_channels = array();
    $channels_sql = $mysqli->prepare('SELECT ch.`sr70`, ch.`type`, ch.`channel`, ch.`description`, ch.`gid` FROM `transactions_channels` ch LEFT JOIN `transactions` t ON ch.`transaction_id` = t.`id` WHERE t.`approved` ORDER BY t.`timestamp` ASC;');
    $channels_sql->execute();
    $channels_result = $channels_sql->get_result();
    if (!empty($channels_result)) {
        while ($channel = $channels_result->fetch_assoc()) {
            $gid = $channel["gid"];
            if (!array_key_exists($gid, $channels)) {
                if (array_key_exists($gid, $temp_channels)) {
                    $channels[$gid] = $temp_channels[$gid];
                } else {
                    $channels[$gid] = array();
                }
            }
            if (!array_key_exists($gid, $temp_channels)) {
                $temp_channels[$gid] = array();
            }
            if ($channel["type"] == -1) {
                unset($channels[$gid]);
            } else {
                applyChannelPatch($channels[$gid], $channel);
                applyChannelPatch($temp_channels[$gid], $channel);
            }
        }
    }
    $channels_sql->close();

    $write_sql = $mysqli->prepare('INSERT INTO `channels` (`sr70`, `type`, `channel`, `description`, `gid`) VALUES (?, ?, ?, ?, ?);');
    foreach ($channels as $gid => $channel) {
        $write_sql->bind_param("iissi", $channel["sr70"], $channel["type"], $channel["channel"], $channel["description"], $gid);
        $write_sql->execute();
    }
    $write_sql->close();
    
    flushResponse(200, "Všechny změny úspěšně aplikovány!", $mysqli);
}
catch (Exception $e) {
    flushResponse(500, "Nepovedlo se aplikovat provedené změny!\n$e", $mysqli);
}

?>