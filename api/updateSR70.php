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

if (isset($_POST["secret"]) && $_POST["secret"] === "asdfasdf") {
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
                flushResponse(500, "File wasn't uploaded correctly!", $mysqli);
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