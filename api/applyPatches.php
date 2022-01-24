<?php
require_once "../simp_db.php";
require_once "utils.php";

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
    $channels_sql = $mysqli->prepare('SELECT ch.`sr70`, ch.`type`, ch.`channel`, ch.`description`, ch.`transaction_id` FROM `transactions_channels` ch LEFT JOIN `transactions` t ON ch.`transaction_id` = t.`id` WHERE t.`approved` ORDER BY t.`timestamp` DESC, ch.`sr70` ASC;');
    $channels_sql->execute();
    $channels_result = $channels_sql->get_result();
    if (!empty($channels_result)) {
        if ($channels_result->num_rows > 0) {
            $lastId = "";
            while ($channel = $channels_result->fetch_assoc()) {
                $id = $channel["sr70"];
                if (!array_key_exists($id, $channels)) {
                    $channels[$id] = array();
                    $newChannel = new stdClass();
                    $newChannel->type = $channel["type"];
                    $newChannel->channel = $channel["channel"];
                    $newChannel->description = $channel["description"];
                    array_push($channels[$id], $newChannel);
                    $lastId = $id.$channel["transaction_id"];
                } else if ($lastId == "" || $id.$channel["transaction_id"] == $lastId) {
                    $newChannel = new stdClass();
                    $newChannel->type = $channel["type"];
                    $newChannel->channel = $channel["channel"];
                    $newChannel->description = $channel["description"];
                    array_push($channels[$id], $newChannel);
                }
            }
        }
    }
    $channels_sql->close();

    $write_sql = $mysqli->prepare('INSERT INTO `channels` (`sr70`, `type`, `channel`, `description`) VALUES (?, ?, ?, ?);');
    foreach ($channels as $id => $station) {
        foreach ($station as $channel) {
            $write_sql->bind_param("iiss", $id, $channel->type, $channel->channel, $channel->description);
            $write_sql->execute();
        }
    }
    $write_sql->close();
    
    flushResponse(200, "Všechny změny úspěšně aplikovány!", $mysqli);
}
catch (Exception $e) {
    flushResponse(500, "Nepovedlo se aplikovat provedené změny!\n$e", $mysqli);
}

?>