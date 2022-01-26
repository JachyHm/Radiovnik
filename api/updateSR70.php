<?php
require_once "../simp_db.php";
require_once "utils.php";

function DMStoDecimal($dmsString) 
{
    $sign = ($dmsString[0] == 'W' || $dmsString[0] == 'S') ? -1 : 1;

    $hoursPos = mb_strpos($dmsString, '°');
    $hours = (double)mb_substr($dmsString, 1, $hoursPos-1);

    $minsPos = mb_strpos($dmsString, '\'');
    $mins = (double)mb_substr($dmsString, $hoursPos+1, $minsPos-$hoursPos-1);

    $secsPos = mb_strpos($dmsString, '"');
    $secs = (double)str_replace(',', '.', mb_substr($dmsString, $minsPos+1, $secsPos-$minsPos-1));

    return $sign*($hours + $mins/60 + $secs/3600);
}

function TrimPhonenumber($phoneNumber) 
{
    if (mb_substr($phoneNumber, 0, 4) == "+420") {
        $phoneNumber = mb_substr($phoneNumber, 4);
    }
    return trim(preg_replace("/\D/", '', $phoneNumber));
}

if (isset($_POST["secret"]) && $_POST["secret"] === $pass) {
    if (isset($_FILES["sr70"])) {
        if (strtolower(pathinfo($_FILES['sr70']['name'], PATHINFO_EXTENSION)) == "csv") {
            $tmp_name = $_FILES['sr70']['tmp_name'];
            if (@is_uploaded_file($tmp_name)) {
                $sql = $mysqli->prepare('INSERT INTO `sr70`(`id`, `name`, `short_name`, `abbreviation`, `type`, `state`, `control_type`, `remote_control`, `operator`, `lon`, `lat`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE `name` = ?, `short_name` = ?, `abbreviation` = ?, `type` = ?, `state` = ?, `control_type` = ?, `remote_control` = ?, `operator` = ?, `lon` = ?, `lat` = ?;');
                $fileHandler = file($tmp_name);
                foreach ($fileHandler as $line) {
                    $data = str_getcsv($line, ';');

                    $id = $data[0];
                    $id_str = mb_substr($id, 1, 1);
                    if ($id < 100000 || $id_str == 0 || $id_str == 1 || $id_str == 2 || $id_str == 9) {
                        continue;
                    }

                    $abr = trim($data[7]);
                    if ($abr == '-') {
                        $abr = "";
                    }

                    $state = $data[11];
                    if ($state == 4) {
                        continue;
                    }

                    $cntt = $data[13];
                    $rcnt = $data[15];
                    /*if ($cntt == 9 && $rcnt == 0) {
                        continue;
                    }*/

                    $type = $data[9];
                    if ($type != 1 && $type != 3 && $type != 4 && $type != 5 && $type != 8 && $type != 9 && $type != 11 && !($type >= 21 && $type <= 24 && $cntt != 9)) {
                        continue;
                    }

                    $lon = DMStoDecimal(trim($data[28]));
                    $lat = DMStoDecimal(trim($data[29]));

                    $name = trim($data[2]);
                    $short_name = trim($data[3]);
                    $operator = trim($data[23]);
                    $sql->bind_param("isssiiiisddsssiiiisdd", $id, $name, $short_name, $abr, $type, $state, $cntt, $rcnt, $operator, $lon, $lat, $name, $short_name, $abr, $type, $state, $cntt, $rcnt, $operator, $lon, $lat);
                    $sql->execute();
                }
                flushResponse(200, "Stations list updated succesfully!", $mysqli);
            } else {
                flushResponse(500, "Stations list wasn't uploaded correctly!", $mysqli);
            }
        } else {
            flushResponse(415, "Only *.csv file can be processed!", $mysqli);
        }
    } else if (isset($_FILES["numbers"])) {
        if (strtolower(pathinfo($_FILES['numbers']['name'], PATHINFO_EXTENSION)) == "csv") {
            $tmp_name = $_FILES['numbers']['tmp_name'];
            if (@is_uploaded_file($tmp_name)) {
                $mysqli->query('DELETE FROM `transactions` WHERE `id` = -1;');
                $sql = $mysqli->prepare('INSERT INTO `transactions`(`id`, `ip_address`, `email`, `user`, `comment`, `approved`, `last_id`) VALUES (-1, ?, "admin", "admin", "Telephone numbers list update", 1, -1);');
                $sql->bind_param("s", $ip);
                $sql->execute();

                $result = $mysqli->query('SELECT `last_id` FROM `transactions` ORDER BY `last_id` DESC LIMIT 1;');
                if (empty($result)) {
                    flushResponse(500, "Nepovedlo se získat unikátní identifikátor stanice, zkuste to prosím později!", $mysqli);
                }
                $row = $result->fetch_assoc();
                $last_id = $row["last_id"];

                $search_sql = $mysqli->prepare('SELECT `id` FROM `sr70` WHERE `abbreviation` = ?;');
                $select_sql = $mysqli->prepare('SELECT `type`, `channel`, `description` FROM `transactions_channels` WHERE `sr70`= ?;');
                $insert_sql = $mysqli->prepare('INSERT INTO `transactions_channels`(`sr70`, `type`, `channel`, `description`, `gid`, `transaction_id`) VALUES (?, 3, ?, ?, ?, -1);');

                $fileHandler = file($tmp_name);
                $unknown_stations = array();
                $multiple_stations = array();
                foreach ($fileHandler as $line) {
                    $data = str_getcsv($line, ';');

                    $code_name = $data[0];
                    $len = 3;
                    if (mb_substr($code_name, 10, 1) == ' ') {
                        $len = 6;
                    }
                    $abr = mb_substr($code_name, 4, $len);

                    $desc = $data[1];
                    $telephone = TrimPhonenumber($data[4]);
                    $mobile = TrimPhonenumber($data[5]);

                    $sr70 = 0;

                    $search_sql->bind_param("s", $abr);
                    $search_sql->execute();
                    $search_result = $search_sql->get_result();
                    if (!empty($search_result)) {
                        if ($search_result->num_rows > 0) {
                            $row = $search_result->fetch_assoc();
                            $sr70 = $row["id"];
                            if ($search_result->num_rows > 1) {
                                array_push($multiple_stations, $abr);
                            }
                        } else if ($search_result->num_rows == 0) {
                            $sql = $mysqli->prepare('SELECT `id` FROM `sr70` WHERE `abbreviation` LIKE ?;');
                            $abr = $abr."%";
                            $sql->bind_param("s", $abr);
                            $sql->execute();
                            $sql_result = $sql->get_result();
                            if (!empty($search_result)) {
                                if ($search_result->num_rows > 0) {
                                    $row = $search_result->fetch_assoc();
                                    $sr70 = $row["id"];
                                } else {
                                    array_push($unknown_stations, $abr);
                                }
                            }
                        }
                    }

                    if ($sr70 == 0) {
                        continue;
                    }

                    if (mb_substr($telephone, 0, 1) == 9) {
                        $last_id++;
                        $insert_sql->bind_param("issi", $sr70, $telephone, $data[1], $last_id);
                        $insert_sql->execute();
                    }

                    if (!IsNullOrEmptyString($mobile) && ($mobile != $telephone || mb_substr($telephone, 0, 1) != 9)) {
                        $last_id++;
                        $desc = $data[1]." (mobil)";
                        $insert_sql->bind_param("issi", $sr70, $mobile, $desc, $last_id);
                        $insert_sql->execute();
                    }
                }
                $mysqli->query("UPDATE `transactions` SET `last_id` = $last_id WHERE `id` = -1;");

                $result = new stdClass();
                $result->multipleRows = $multiple_stations;
                $result->noRows = $unknown_stations;
                flushResponse(200, "Telephone numbers list updated succesfully!", $mysqli, $result);
            } else {
                flushResponse(500, "Telephone numbers list wasn't uploaded correctly!", $mysqli);
            }
        } else {
            flushResponse(415, "Only *.csv file can be processed!", $mysqli);
        }
    } else {
        flushResponse(400, "Please input file to upload!", $mysqli);
    }
} else {
    flushResponse(403, "You have to be logged in to update SR70!", $mysqli);
}
?>