<?php
require_once "../simp_db.php";
require_once "utils.php";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    //if (isset($_POST["recaptcha_token"])) {
        /*$url = 'https://www.google.com/recaptcha/api/siteverify';
        $data = array('secret' => $captcha_secret, 'response' => $_POST["recaptcha"]);
        $options = array(
            'http' => array(
                'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
                'method'  => 'POST',
                'content' => http_build_query($data)
            )
        );
        $context  = stream_context_create($options);
        $result = json_decode(file_get_contents($url, false, $context));*/

        //if ($result && $result->success && $result->score > 0.5 && $result->action == "commit" && $result->hostname == "simp.jachyhm.cz") {
            if (isset($_POST["user"]) && isset($_POST["email"]) && isset($_POST["comment"]) && isset($_POST["changes"]) && isset($_POST["confirms"])) {// && false) {
                $transaction_id = 0;
                try {
                    $user = trim($_POST["user"]);
                    $email = trim($_POST["email"]);
                    $comment = trim($_POST["comment"]);
                    $changes = json_decode($_POST["changes"]);
                    $confirms = json_decode($_POST["confirms"]);

                    $sql = $mysqli->prepare('INSERT INTO `transactions`(`ip_address`, `email`, `user`, `comment`, `last_id`) VALUES (?, ?, ?, ?, -1);');
                    $sql->bind_param("ssss", $ip, $email, $user, $comment);
                    $sql->execute();
                    $transaction_id = $mysqli->insert_id;

                    $result = $mysqli->query('SELECT `last_id` FROM `transactions` ORDER BY `last_id` DESC LIMIT 1;');
                    if (empty($result)) {
                        flushResponse(500, "Nepovedlo se získat unikátní identifikátor stanice, zkuste to prosím později!", $mysqli);
                    }
                    $row = $result->fetch_assoc();
                    $last_id = $row["last_id"];
                
                    $result = new stdClass();
                    $sql = $mysqli->prepare('INSERT INTO `transactions_changes`(`id`, `type`, `control_type`, `remote_control`, `transaction_id`) VALUES (?, ?, ?, ?, ?);');
                    $sql2 = $mysqli->prepare('INSERT INTO `transactions_channels`(`sr70`, `type`, `channel`, `description`, `gid`, `transaction_id`) VALUES (?, ?, ?, ?, ?, ?);');
                    foreach ($changes as $id => $station) {
                        if (!isset($station)) {
                            continue;
                        }
                        $sql->bind_param("iiiii", $id, $station->type, $station->control_type, $station->remote_control, $transaction_id);
                        $sql->execute();
                        $result->$id = new stdClass();
                        $result->$id->channels = array();
                        $result->$id->removedChannels = array();
                        if (isset($station->channels)) {
                            foreach ($station->channels as $key => $channel) {
                                if ($key < 0) {
                                    $last_id++;
                                    $key = $last_id;
                                    if (!isset($channel->type)) {
                                        flushResponse(422, "Nekonzistentní data kanálu $channel->channel - $channel->description (gid: $channel->gid) ve stanici $station->id!", $mysqli);
                                    }
                                }
                                $sql2->bind_param("iissii", $id, $channel->type, $channel->channel, $channel->description, $key, $transaction_id);
                                $sql2->execute();
                                array_push($result->$id->channels, $channel);
                            }
                        }
                        if (isset($station->removedChannels)) {
                            foreach ($station->removedChannels as $key => $_) {
                                if ($key > 0) {
                                    $type = -1;
                                    $empty = "";
                                    $sql2->bind_param("iissii", $id, $type, $empty, $empty, $key, $transaction_id);
                                    $sql2->execute();
                                    array_push($result->$id->removedChannels, $key);
                                }
                            }
                        }
                    }

                    $mysqli->query("UPDATE `transactions` SET `last_id` = $last_id WHERE `id` = $transaction_id;");

                    $sql = $mysqli->prepare('INSERT INTO `transactions_confirms` (`sr70`, `transaction_id`) VALUES (?, ?);');
                    foreach ($confirms as $id => $_) {
                        $sql->bind_param("ii", $id, $transaction_id);
                        $sql->execute();
                    }
                    send_mail("info@jachyhm.cz", "simpovnik@jachyhm.cz", "Nová transakce $transaction_id!", "Zdarec, máš novou transakci od $user ($email):\n$comment\n\nchanges: {$_POST["changes"]}\nconfirmed: {$_POST["confirms"]}\nPotvrď ji kliknutím sem: https://simp.jachyhm.cz/api/confirmUpdate?id=$transaction_id&pass=$updatePassword\"");
                    flushResponse(200, "Všechny změny úspěšně zapsány!", $mysqli, $result);
                }
                catch (Exception $e) {
                    $mysqli->query("DELETE FROM `transactions` WHERE `id` = $transaction_id");
                    $mysqli->query("DELETE FROM `transaction_changes` WHERE `transaction_id` = $transaction_id");
                    $mysqli->query("DELETE FROM `transaction_channels` WHERE `transaction_id` = $transaction_id");
                    $mysqli->query("DELETE FROM `transaction_confirms` WHERE `transaction_id` = $transaction_id");
                    flushResponse(500, "Nepovedlo se uložit provedené změny, zkuste to prosím později!<br>$e", $mysqli);
                }
            }
        /*} else {
            flushResponse(403, "Sorry, but you seem to be a robot. And we definitelly do not want one here.", $mysqli);
        }*/
    //}
    flushResponse(422, "Povinný parametr chybí!", $mysqli);
} else {
    header('Allow: POST');
    flushResponse(405, "Method Not Allowed", $mysqli);
}

?>