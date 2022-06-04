<?php
require_once "../simp_db.php";
require_once "utils.php";

if (!(isset($_GET["pass"]) && $_GET["pass"] == $updatePassword) && !(isset($_POST["pass"]) && $_POST["pass"] == $updatePassword)) {
    flushResponse(403, "Neplatné heslo!", $mysqli);
}

$transaction_id = 0;
if (isset($_GET["id"])) {
    $transaction_id = $_GET["id"];
} else if (isset($_POST["id"])) {
    $transaction_id = $_POST["id"];
}

$transactions_sql = $mysqli->prepare('SELECT * FROM `transactions` WHERE `id` = ? AND NOT `approved`;');
$transactions_sql->bind_param("i", $transaction_id);
$transactions_sql->execute();
$transactions_result = $transactions_sql->get_result();
if (empty($transactions_result) || $transactions_result->num_rows == 0) {
    flushResponse(403, "Nesprávné číslo transakce!", $mysqli);
}

try {
    $patches_sql = $mysqli->prepare('SELECT * FROM `transactions_changes` WHERE `transaction_id` = ?;');
    $patches_sql->bind_param("i", $transaction_id);
    $patches_sql->execute();
    $patches_result = $patches_sql->get_result();
    if (!empty($patches_result)) {
        if ($patches_result->num_rows > 0) {
            while ($patch = $patches_result->fetch_assoc()) {
                if (!empty($patch_result)) {
                    while ($patch = $patch_result->fetch_assoc()) {
                        $query_start = "UPDATE `stations` SET `verified` = 1 ";
                        $query = "";

                        if (!empty($patch["type"])) {
                            $query .= ", `type` = {$patch["type"]} ";
                        }

                        if (!empty($patch["control_type"])) {
                            $query .= ", `control_type` = {$patch["control_type"]} ";
                        }

                        if (!empty($patch["remote_control"])) {
                            $query .= ", `remote_control` = {$patch["remote_control"]} ";
                        }

                        $mysqli->query($query_start . $query . "WHERE `id` = {$patch["id"]};");
                    }
                }
            }
        }
    }

    $channels_sql = $mysqli->prepare('SELECT `sr70`, `type`, `channel`, `description`, `gid` FROM `transactions_channels` WHERE `transaction_id` = ?;');
    $channels_sql->bind_param("i", $transaction_id);
    $channels_sql->execute();
    $channels_result = $channels_sql->get_result();
    if (!empty($channels_result)) {
        while ($channel = $channels_result->fetch_assoc()) {
            $gid = $channel["gid"];
            if ($channel["type"] == -1) {
                $mysqli->query("DELETE FROM `channels` WHERE `gid` = $gid");
            } else {
                $query_start = "INSERT INTO `channels` (`sr70`, `type`, `channel`, `description`, `gid`) VALUES ({$channel["sr70"]}, {$channel["type"]}, {$channel["channel"]}, '{$channel["description"]}', $gid) ON DUPLICATE KEY UPDATE `gid` = $gid ";
                $query = "";
                try {

                    if (!empty($channel["type"])) {
                        $query .= ", `type` = {$channel["type"]} ";
                    }

                    if (!empty($channel["control_type"])) {
                        $query .= ", `channel` = {$channel["channel"]} ";
                    }

                    if (!empty($channel["remote_control"])) {
                        $query .= ", `description` = {$channel["description"]} ";
                    }

                    $mysqli->query($query_start . $query);
                } catch (Exception $e) {
                    flushResponse(500, "Nekonzistentní databáze, prosím sestavte databázi odznovu!\n$query_start{$query}\n$e", $mysqli);
                }
            }
        }
    }
    $channels_sql->close();

    $approve_sql = $mysqli->prepare('UPDATE `transactions` SET `approved` = 1 WHERE `id` = ?;');
    $approve_sql->bind_param("i", $transaction_id);
    $approve_sql->execute();
    
    flushResponse(200, "Všechny změny úspěšně aplikovány!", $mysqli);
}
catch (Exception $e) {
    flushResponse(500, "Nepovedlo se aplikovat provedené změny!\n$e", $mysqli);
}

?>