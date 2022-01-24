const NUM_STATIONS = 10;

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
let toast;

window.onload = () => {
    //"use strict";
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js");
    }

    const stationsEl = document.getElementById("stations");
    for (var i = 0; i < NUM_STATIONS; i++) {
        stationRows[i] = new StationRow(confirmStation, tempEdit, saveTempEdits, clearTempEdits);
        stationsEl.appendChild(stationRows[i].innerHTML);
    }
    
    const toastEl = document.getElementById("unsavedChanges");
    toast = bootstrap.Toast.getOrCreateInstance(toastEl);

    registerLocationEvents();
    if (!(/Android|webOS|iPhone|iPad|iPod|BlackBerry|BB|PlayBook|IEMobile|Windows Phone|Kindle|Silk|Opera Mini/i.test(navigator.userAgent))) {
        requireLocation();
    }
    search = document.getElementById("search");
    search.addEventListener('input', redrawStations);
    search.addEventListener('propertychange', redrawStations); // for IE8

    deleteButton = document.getElementById("delete-changes");
    deleteButton.addEventListener("click", () => {
        savedChanges = {};
        confirmedStations = {};
        saveToLocalStorage();
        toggleToast();
        redrawStations();
    });

    sendButton = document.getElementById("send-changes");
    sendButton.addEventListener("click", () => {
        $("#confirm-changes").modal('show');
        setChangesHTML();
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
                            $("#info-content").html("Veškeré úpravy byly úspěšně odeslány ke schválení!");
                            $("#info").modal("show");
                            clearTimeout(infoTimeout);
                            infoTimeout = setTimeout(function(){$("#info").modal("hide");}, 20000);
                            savedChanges = {};
                            confirmedStations = {};
                            saveToLocalStorage();
                            toggleToast();
                            receiveData();
                        }
                    },
                    error: function (request, status, error) {
                        clearTimeout(confirmErrorTimeout);
                        $("#confirm-changes-error").html(request.responseJSON.message).fadeIn();
                        confirmErrorTimeout = setTimeout(function(){$("#confirm-changes-error").fadeOut();}, 20000);
                    }
                });
            //});
        //});
    });
}

function receiveData() {
    $.getJSON('/data.json', function(data) {
        jsonData = data.content;
        sortByDistance();
        loadFromLocalStorage();
        redrawStations();
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

function applyPatch(object, patch) {
    for (const key in patch) {
        object[key] = copyObject(patch[key]);
    }
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
}


//EDITOR FUNCTIONS
function toggleToast() {
    if (Object.keys(confirmedStations).length > 0 || Object.keys(savedChanges).length > 0) {
        toast.show();
    } else {
        toast.hide();
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

function tempEdit(id, data) {
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
}

function loadFromLocalStorage() {
    confirmedStations = JSON.parse(localStorage.getItem("confirmedStations")) ?? {};
    savedChanges = JSON.parse(localStorage.getItem("savedChanges")) ?? {};
    tempChanges = JSON.parse(localStorage.getItem("tempChanges")) ?? {};
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
    if (a.type !== b.type)
        return 0b100;

    let flags = 0;
    if (a.channel != b.channel) {
        flags |= 0b001;
    }
    if (a.description != b.description) {
        flags |= 0b010;
    }
    return flags;
}

function processChannelChanges(changes, id, oldChannels, newChannels) {
    const comparer = (a, b) => {
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
    newChannels.sort(comparer);
    for (let i = 0; i < Math.max(oldChannels.length, newChannels.length); i++) {
        const oldChannel = oldChannels[i];
        const newChannel = newChannels[i];

        if (oldChannel == null) {
            addOrCreateChange(changes, id, `Přidán kanál ${CHANNEL_TYPE_DESCRIPTOR.find((obj) => obj[0] == newChannel.type)[1]} ${newChannel.channel} - ${newChannel.description}`);
        } else if (newChannel == null) {
            addOrCreateChange(changes, id, `Odebrán kanál ${CHANNEL_TYPE_DESCRIPTOR.find((obj) => obj[0] == oldChannel.type)[1]} ${oldChannel.channel} - ${oldChannel.description}`);
        } else {
            const flags = compareChannels(oldChannel, newChannel);
            if (flags == 1) {
                addOrCreateChange(changes, id, `${newChannel.type == 3 ? `Změněno telefonní číslo prostředku ${newChannel.description} z ${oldChannel.channel} na ${newChannel.channel}` : `Změněn kanál prostředku ${CHANNEL_TYPE_DESCRIPTOR.find((obj) => obj[0] == newChannel.type)[1]} - ${newChannel.description} z ${oldChannel.channel} na ${newChannel.channel}`}`);
            } else if (flags == 2) {
                addOrCreateChange(changes, id, `Změněn popis prostředku ${CHANNEL_TYPE_DESCRIPTOR.find((obj) => obj[0] == newChannel.type)[1]} - ${newChannel.channel} z ${oldChannel.description} na ${newChannel.description}`);
            } else if (flags != 0) {
                addOrCreateChange(changes, id, `Odebrán kanál ${CHANNEL_TYPE_DESCRIPTOR.find((obj) => obj[0] == oldChannel.type)[1]} ${oldChannel.channel} - ${newChannel.description}`);
                addOrCreateChange(changes, id, `Přidán kanál ${CHANNEL_TYPE_DESCRIPTOR.find((obj) => obj[0] == newChannel.type)[1]} ${newChannel.channel} - ${oldChannel.description}`);
            }
        }
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

        if (station.channels != null) {
            processChannelChanges(changes, id, copyObject(origStation.channels), copyObject(station.channels));
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