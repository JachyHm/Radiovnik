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
                try {
                    $user = $_POST["user"];
                    $email = $_POST["email"];
                    $comment = $_POST["comment"];
                    $changes = json_decode($_POST["changes"]);
                    $confirms = json_decode($_POST["confirms"]);

                    $sql = $mysqli->prepare('INSERT INTO `transactions`(`ip_address`, `email`, `user`, `comment`) VALUES (?, ?, ?, ?);');
                    $sql->bind_param("ssss", $ip, $email, $user, $comment);
                    $sql->execute();
                
                    $result = new stdClass();
                    $transaction_id = $mysqli->insert_id;
                    $sql = $mysqli->prepare('INSERT INTO `transactions_changes`(`id`, `type`, `control_type`, `remote_control`, `transaction_id`) VALUES (?, ?, ?, ?, ?);');
                    $sql2 = $mysqli->prepare('INSERT INTO `transactions_channels`(`sr70`, `type`, `channel`, `description`, `transaction_id`) VALUES (?, ?, ?, ?, ?);');
                    foreach ($changes as $id => $station) {
                        $sql->bind_param("iiiii", $id, $station->type, $station->control_type, $station->remote_control, $transaction_id);
                        $sql->execute();
                        $result->$id = new stdClass();
                        $result->$id->channels = array();
                        foreach ($station->channels as $channel) {
                            $sql2->bind_param("iissi", $id, $channel->type, $channel->channel, $channel->description, $transaction_id);
                            $sql2->execute();
                            array_push($result->$id->channels, $channel);
                        }
                    }

                    $sql = $mysqli->prepare('INSERT INTO `transactions_confirms` (`sr70`, `transaction_id`) VALUES (?, ?);');
                    foreach ($confirms as $id => $_) {
                        $sql->bind_param("ii", $id, $transaction_id);
                        $sql->execute();
                    }
                    flushResponse(200, "Všechny změny úspěšně zapsány!", $mysqli, $result);
                }
                catch (Exception $e) {
                    flushResponse(500, "Nepovedlo se uložit provedené změny, zkuste to prosím později!\n$e", $mysqli);
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