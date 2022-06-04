let NUM_STATIONS = 10;

let lon = 0;
let lat = 0;
let jsonData = [];
let tempChanges = {};
let savedChanges = {};
let confirmedStations = {};
let stationRows = [];
let sendingChanges = false;
let confirmErrorTimeout;
let infoTimeout;

let search;
let unsavedToast;
let loginToast;

let password = localStorage.getItem("password");
let lastChannelId = -1;

window.onload = () => {
    //"use strict";
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js");
    }

    const stationsEl = document.getElementById("stations");
    createStationRows(stationsEl);
    
    const unsavedToastEl = document.getElementById("unsavedChanges");
    unsavedToast = bootstrap.Toast.getOrCreateInstance(unsavedToastEl);

    if (password == null) {
        const loginToastEl = document.getElementById("notLoggedUser");
        loginToast = bootstrap.Toast.getOrCreateInstance(loginToastEl);
        loginToast.show();
    }

    registerLocationEvents();
    // if (!(/Android|webOS|iPhone|iPad|iPod|BlackBerry|BB|PlayBook|IEMobile|Windows Phone|Kindle|Silk|Opera Mini/i.test(navigator.userAgent))) {
        requireLocation();
    // }
    search = document.getElementById("search");
    search.addEventListener('input', redrawStations);
    search.addEventListener('propertychange', redrawStations); // for IE8

    deleteButton = document.getElementById("delete-changes");
    deleteButton.addEventListener("click", () => {
        clearSavedEdits();
        redrawStations();
    });

    sendButton = document.getElementById("send-changes");
    sendButton.addEventListener("click", () => {
        $("#confirm-changes").modal('show');
        setChangesHTML();
    });

    $("#login-form").submit(function(e) {
        e.preventDefault();
        password = $("#password").val();
        localStorage.setItem("password", password);
        receiveData();
        $("#login").modal("hide");
        loginToast?.hide();
    });
    $("#login").bind("show.bs.modal", () => {
        $("#password").val("");
    });

    // window.onscroll = function() {
    //     if ((window.innerHeight + window.pageYOffset) >= document.body.offsetHeight && NUM_STATIONS < jsonData.length) {
    //         NUM_STATIONS += 5;
    //         createStationRows(stationsEl);
    //         redrawStations();
    //     }
    // };
    document.getElementById("load-more").addEventListener("click", (e) => {
        e.preventDefault();
        NUM_STATIONS += 5;
        createStationRows(stationsEl);
        redrawStations();
    });

    receiveData();
    
    $("#confirm-changes-form").submit(function(e) {
        e.preventDefault();

        //grecaptcha.ready(function() {
            //grecaptcha.execute('6Le5JjEeAAAAAP-oiFbWfIBZipMgSe2EqFWppKVE', {action: 'sendChanges'}).then(function(token) {
                var url = "api/commit";
                $.ajax({
                    type: "POST",
                    url: url,
                    data: {
                        user: $("#name").val(),
                        email: $("#mail").val(),
                        comment:  $("#description").val(),
                        changes: JSON.stringify(savedChanges),
                        confirms: JSON.stringify(confirmedStations),
                        //recaptcha: token,
                    },
                    success: function(data)
                    {
                        if (data.code < 200 || data.code > 299) {
                            $("#confirm-changes-error").html(data.message).fadeIn();
                            clearTimeout(confirmErrorTimeout);
                            confirmErrorTimeout = setTimeout(function(){$("#confirm-changes-error").fadeOut();}, 20000);
                        } else {
                            $("#confirm-changes").modal('hide');
                            $("#info-content").html("Veškeré úpravy byly úspěšně odeslány ke schválení!<br>Prosíme neodesílejte změny opakovaně, odeslané změny se projeví teprve po schválení správcem.");
                            $("#info").modal("show");
                            clearTimeout(infoTimeout);
                            infoTimeout = setTimeout(function(){$("#info").modal("hide");}, 20000);
                            clearSavedEdits();
                            receiveData();
                        }
                    },
                    error: function (request, status, error) {
                        clearTimeout(confirmErrorTimeout);
                        if (request.responseJSON != null) {
                            $("#confirm-changes-error").html(request.responseJSON.message).fadeIn();
                        } else {
                            $("#confirm-changes-error").html("Něco se nám nepovedlo, ale nezoufejte, určitě již pracujeme na nápravě.").fadeIn();
                        }
                        confirmErrorTimeout = setTimeout(function(){$("#confirm-changes-error").fadeOut();}, 20000);
                    }
                });
            //});
        //});
    });
}

function createStationRows(stationsEl) {
    let diff = NUM_STATIONS-stationRows.length;
    if (diff < 0) {
        return;
    }
    for (var i = stationRows.length; i < NUM_STATIONS; i++) {
        stationRows[i] = new StationRow(confirmStation, tempEdit, saveTempEdits, clearTempEdits);
        stationsEl.appendChild(stationRows[i].innerHTML);
    }
}

function clearSavedEdits() {
    savedChanges = {};
    confirmedStations = {};
    lastChannelId = -1;
    saveToLocalStorage();
    toggleToast();
}

function receiveData() {
    jsonData = [];
    redrawStations();
    document.getElementById("data-loading").style.display = 'block';
    $.getJSON(`/data.json?pass=${password ?? ""}`, function(data) {
        jsonData = data.content;
        sortByDistance();
        loadFromLocalStorage();
        redrawStations();
        document.getElementById("data-loading").style.display = 'none';
        //ac.setData(jsonData);
    });
}

function copyObject(oldObj) {
    if (typeof oldObj == 'object' && oldObj != null) {
        var newObj = Array.isArray(oldObj) ? [] : {};
        for (const key in oldObj) {
            const item = oldObj[key];
            newObj[key] = copyObject(item);
        }
        return newObj;
    }

    return oldObj;
}

function applyPatch(object, patch, merge = false) {
    if (object == null || patch == null)
        return;

    for (const key in patch) {
        if (key == "channels" || key == "removedChannels") {
            applyPatch(object[key], patch[key], true);
        } else if (merge) {
            object[key] = {...object[key], ...patch[key]};
        } else {
            object[key] = copyObject(patch[key]);
        }
    }
}

function patchChannels(channels, addedChannels, removedChannels) {
    applyPatch(channels, addedChannels, true);
    
    for (const key in removedChannels) {
        delete channels[key];
    }

    return channels
}

function createElement(innerHTML, tag = 'div') {
    let div = document.createElement(tag);
    div.innerHTML = innerHTML;
    return div.firstChild;
}

//LOCATION FUNCTIONS
function degreesToRadians(degrees) {
    return (degrees * Math.PI) / 180;
}

function distanceInMBetweenEarthCoordinates(lat1, lon1, lat2, lon2) {
    const earthRadiusKm = 6371

    const dLat = degreesToRadians(lat2-lat1)
    const dLon = degreesToRadians(lon2-lon1)

    const lat1r = degreesToRadians(lat1)
    const lat2r = degreesToRadians(lat2)

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1r) * Math.cos(lat2r)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return earthRadiusKm * c * 1000.0
}

function sortByDistance() {
    jsonData.forEach(function(data, index, arr) {
        arr[index].distance = distanceInMBetweenEarthCoordinates(lat, lon, data.lat, data.lon);
    });
    jsonData.sort(function(a,b) {
        if (a.distance < b.distance) {
            return -1;
        }

        if (a.distance > b.distance) {
            return 1;
        }
        return 0;
    });
}

function registerLocationEvents() {
    document.getElementById("body").addEventListener('mousemove', requireLocation);
    document.getElementById("body").addEventListener('mousedown', requireLocation);
    document.getElementById("body").addEventListener('focus', requireLocation);
    document.getElementById("body").addEventListener('scroll', requireLocation);
}

function unregisterLocationEvents() {
    document.getElementById("body").removeEventListener('mousemove', requireLocation);
    document.getElementById("body").removeEventListener('mousedown', requireLocation);
    document.getElementById("body").removeEventListener('focus', requireLocation);
    document.getElementById("body").removeEventListener('scroll', requireLocation);
}

function requireLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            unregisterLocationEvents();
            lon = position.coords.longitude;
            lat = position.coords.latitude;
            sortByDistance();
            redrawStations();
        }, () => {
            unregisterLocationEvents();
        });
    } else {
        unregisterLocationEvents();
    }
}


//STATION ROW FUNCTIONS
function removeDiacritics(str) {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}


//SEARCHBOX FUNCTIONS
function matchesLookup(input, pattern) {
    for (let i = 0; i < input.length; i++) {
        for (let j = 0; j < pattern.length; j++) {
            if (i + j >= input.length) {
                return false;
            }
            const index = input[i+j].indexOf(pattern[j]);
            if (index != 0) {
                if (i == input.length - 1) {
                    return false;
                }
                break;
            }
            if (j == pattern.length-1)
                return true;
        }
    }
    return true;
}

function redrawStations() {
    let count = 0;
    const lookup = search.value.trim();
    // if (lookup.length == 0)
    //     return;
    
    for (var i = 0; i < jsonData.length; i++) {
        let stationData = copyObject(jsonData[i]);
        const stationId = stationData.id;
        
        const cleanedLookup = removeDiacritics(lookup).toLowerCase().replace(/[^0-9a-z\s.,-]/gi, '');
        const cleanedStationName = removeDiacritics(stationData.name).toLowerCase().replace(/[^0-9a-z\s.,-]/gi, '');
        if (matchesLookup(cleanedStationName.split(/[\s.-]+/), cleanedLookup.split(/[\s.-]+/)) || stationData.abbreviation.toLowerCase().indexOf(cleanedLookup) == 0 || stationId.toString().indexOf(cleanedLookup) == 0) {
            let isEditing = false;
            let tempVerified = confirmedStations[stationId] || stationData.verified == 1; 
            if (savedChanges[stationId] != null) {
                tempVerified = true;
                applyPatch(stationData, savedChanges[stationId]);
            }
            if (tempChanges[stationId] != null) {
                isEditing = true;
                tempVerified = true;
                //applyPatch(stationData, tempChanges[stationId]);
            }
            stationRows[count].setData(stationData, copyObject(tempChanges[stationId]), tempVerified, isEditing);
            if (++count >= NUM_STATIONS)
                break;
        }
    }
    
    for (var i = count; i < NUM_STATIONS; i++) {
        stationRows[i].hide();
    }

    document.getElementById("load-more").innerHTML = count == NUM_STATIONS ? "<h5>Zobrazit dalších 5 stanic...</h5>" : "";
}


//EDITOR FUNCTIONS
function toggleToast() {
    if (Object.keys(confirmedStations).length > 0 || Object.keys(savedChanges).length > 0) {
        unsavedToast.show();
    } else {
        unsavedToast.hide();
    }
    toggleSaveButton();
}

function toggleSaveButton() {
    confirm = document.getElementById("send-changes");
    confirmTT = document.getElementById("send-changes-tt");
    if (Object.keys(tempChanges).length > 0 || sendingChanges) {
        confirm.disabled = true;
        confirmTT.setAttribute('title', 'Prosím potvrďte nejprve veškeré rozpracované změny.');
        confirmTT.setAttribute('aria-label', 'Prosím potvrďte nejprve veškeré rozpracované změny.');
        window.document.title = "Radiovník (neuložené změny)";
    } else {
        confirm.disabled = false;
        confirmTT.setAttribute('title', '');
        confirmTT.setAttribute('aria-label', '');
        window.document.title = "Radiovník";
    }
}

function confirmStation(id) {
    confirmedStations[id] = true;
    toggleToast();
    saveToLocalStorage();
}

function tempEdit(id, data, key) {
    tempChanges[id] = data;
    toggleSaveButton();
    saveToLocalStorage();
}

function saveTempEdits(id) {
    if (tempChanges[id] != null) {
        savedChanges[id] = tempChanges[id];
        clearTempEdits(id);
        toggleToast();
    }
}

function clearTempEdits(id) {
    delete tempChanges[id];
    toggleSaveButton();
    saveToLocalStorage();
}

function saveToLocalStorage() {
    localStorage.setItem("confirmedStations", JSON.stringify(confirmedStations));
    localStorage.setItem("savedChanges", JSON.stringify(savedChanges));
    localStorage.setItem("tempChanges", JSON.stringify(tempChanges));
    localStorage.setItem("lastChannelId", lastChannelId);
}

function loadFromLocalStorage() {
    confirmedStations = JSON.parse(localStorage.getItem("confirmedStations")) ?? {};
    savedChanges = JSON.parse(localStorage.getItem("savedChanges")) ?? {};
    tempChanges = JSON.parse(localStorage.getItem("tempChanges")) ?? {};
    lastChannelId = localStorage.getItem("lastChannelId") ?? -1;
    toggleToast();
}

//SAVE CHANGES FUNCTIONS
function addOrCreateChange(changes, id, change) {
    if (changes[id] == null) {
        changes[id] = [];
    }
    changes[id].push(change);
}

function compareChannels(a, b) {
    let flags = 0;
    if (a.channel != b.channel)
        flags |= 0b001;

    if (a.description != b.description)
        flags |= 0b010;

    if (a.type !== b.type)
        flags |= 0b100;

    return flags;
}

function processChannelChanges(changes, id, oldChannels, newChannels, removedChannels) {
    /*const comparer = (a, b) => {
        if (a.type > b.type) {
            return 1;
        }
        if (a.type < b.type) {
            return -1;
        }

        if (a.channel > b.channel) {
            return 1;
        }
        if (a.channel < b.channel) {
            return -1;
        }

        return 0;
    }
    oldChannels.sort(comparer);
    newChannels.sort(comparer);*/

    for (const key in newChannels) {
        if (removedChannels != null && removedChannels[key])
            continue;

        const oldChannel = oldChannels[key];
        const newChannel = {...oldChannel, ...newChannels[key]};

        if (oldChannel != null) {
            const flags = compareChannels(oldChannel, newChannel);
            if ((flags & 1) != 0) {
                addOrCreateChange(changes, id, `${newChannel.type == 3 ? `Změněno telefonní číslo prostředku ${newChannel.description} z ${oldChannel.channel} na ${newChannel.channel}` : `Změněn kanál prostředku ${CHANNEL_TYPE_DESCRIPTOR.find((obj) => obj[0] == newChannel.type)[1]} - ${newChannel.description} z ${oldChannel.channel} na ${newChannel.channel}`}`);
            }
            if ((flags & 2) != 0) {
                addOrCreateChange(changes, id, `Změněn popis prostředku ${CHANNEL_TYPE_DESCRIPTOR.find((obj) => obj[0] == newChannel.type)[1]} - ${newChannel.channel} z ${oldChannel.description} na ${newChannel.description}`);
            }
            if ((flags & 4) != 0) {
                addOrCreateChange(changes, id, `Změněn typ prostředku ${newChannel.channel} - ${newChannel.description} z ${CHANNEL_TYPE_DESCRIPTOR.find((obj) => obj[0] == oldChannel.type)[1]} na ${CHANNEL_TYPE_DESCRIPTOR.find((obj) => obj[0] == newChannel.type)[1]}`);
            }
        } else {
            addOrCreateChange(changes, id, `Přidán kanál ${CHANNEL_TYPE_DESCRIPTOR.find((obj) => obj[0] == newChannel.type)[1]} ${newChannel.channel} - ${newChannel.description}`);
        }
    }

    for (const key in removedChannels) {
        const oldChannel = oldChannels[key] ?? newChannels[key];
        if (oldChannel == null)
            continue;

        addOrCreateChange(changes, id, `Odebrán kanál ${CHANNEL_TYPE_DESCRIPTOR.find((obj) => obj[0] == oldChannel.type)[1]} ${oldChannel.channel} - ${oldChannel.description}`);
    }
}

function buildChanges() {
    let changes = {};
    for (const id in savedChanges) {
        const station = savedChanges[id];
        const origStation = jsonData.find((obj) => obj.id == id);
        if (station?.type != null && station.type != origStation.type) {
            addOrCreateChange(changes, id, `Změněn typ pracoviště z "${TYPE_DESCRIPTOR.find((obj) => obj[0] == origStation.type)[1]}" na "${TYPE_DESCRIPTOR.find((obj) => obj[0] == station.type)[1]}"`);
        }

        if (station?.control_type != null && station.control_type != origStation.control_type) {
            addOrCreateChange(changes, id, `Změněno obsazení pracoviště z "${CONTROL_TYPE_DESCRIPTOR.find((obj) => obj[0] == origStation.control_type)[1]}" na "${CONTROL_TYPE_DESCRIPTOR.find((obj) => obj[0] == station.control_type)[1]}"`);
        }

        if (station?.remote_control != null && station.remote_control != origStation.remote_control) {
            const oldRemoteStation = origStation.remote_control > 0 ? jsonData.find((obj) => obj.id == origStation.remote_control) : null;
            const newRemoteStation = station.remote_control > 0 ? jsonData.find((obj) => obj.id == station.remote_control) : null;
            addOrCreateChange(changes, id, `Změněno místo dálkového řízení z ${origStation.remote_control > 0 ? `"${oldRemoteStation.name}" (${oldRemoteStation.id})` : "místního řízení"} na ${station.remote_control > 0 ? `"${newRemoteStation.name}" (${newRemoteStation.id})` : "místní řízení"}`);
        }

        if (station.channels != null || station.removedChannels != null) {
            processChannelChanges(changes, id, copyObject(origStation.channels), copyObject(station.channels), station.removedChannels);
        }
    }
    
    for (const id in confirmedStations) {
        addOrCreateChange(changes, id, `Potvrzeny údaje pracoviště`);
    }

    return changes;
}

function setChangesHTML() {
    let changesEl = document.getElementById("confirm-changes-changes");
    changesEl.innerHTML = "";

    const changes = buildChanges();
    for (const key in changes) {
        let stationEl = document.createElement('li');
        stationEl.appendChild(createElement(`<div><h6>${jsonData.find((obj) => obj.id == key).name} (${key})</h6></div>`));

        let stationChangesEl = document.createElement('ul');
        stationEl.appendChild(stationChangesEl);

        for (const change in changes[key]) {
            stationChangesEl.appendChild(createElement(`<li>${changes[key][change]}</li>`, 'li'));
        }

        changesEl.appendChild(stationEl);
    }
}