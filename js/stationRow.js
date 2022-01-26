class StationRow {
    constructor(onValidation, onEdit, onSave, onCancel) {
        this.data = {};
        this.oldData = {};
        this.isVerified = false;
        this.wasVerified = false;
        this.onEdit = onEdit;

        this.innerHTML = document.createElement(`div`);

        this.heading = document.createElement('h5');
        this.innerHTML.appendChild(this.heading);
        this.title = document.createElement('span');
        this.heading.appendChild(this.title);
        this.editButton = createElement(`<a class="fas edit-icon" href="#" data-placement="right" title="Upravit informace o stanici">&#xf303;</a>`, 'a');
        this.heading.appendChild(this.editButton);
        this.tickButton = createElement(`<a class="collapse fas edit-icon" href="#" data-placement="right" title="Potvrdit zobrazená data">&#xf00c;</a>`, 'a');
        this.heading.appendChild(this.tickButton);
        this.cancelButton = createElement(`<a class="collapse fas edit-icon" href="#" data-placement="right" title="Zahodit provedené změny">&#xf00d;</a>`, 'a');
        this.heading.appendChild(this.cancelButton);
        this.id = createElement(`<span class="station-id"></span>`, 'span');
        this.heading.appendChild(this.id);

        this.tickButton.addEventListener("click", (e) => {
            e.preventDefault();
            if (this.editorActive) {
                this.editorActive = false;
                applyPatch(this.oldData, this.data);
                this.wasVerified = this.isVerified;
                onSave(this.oldData.id);
            } else {
                this.isVerified = true;
                this.wasVerified = true;
                onValidation(this.oldData.id);
            }

            this.redraw();
        });

        //display part
            this.displayStation = document.createElement('div');
            this.innerHTML.appendChild(this.displayStation);
            this.description = document.createElement('div');
            this.displayStation.appendChild(this.description);
            this.channels = document.createElement('ul');
            this.displayStation.appendChild(this.channels);

            this.editButton.addEventListener("click", (e) => {
                e.preventDefault();
                this.editorActive = true;

                this.redraw();
            });

        //edit part
            this.editStation = document.createElement('div');
            this.innerHTML.appendChild(this.editStation);

            this.cancelButton.addEventListener("click", (e) => {
                e.preventDefault();
                this.editorActive = false;
                this.data = {};
                this.isVerified = this.wasVerified;
                onCancel(this.oldData.id);
                
                this.redraw();
            });

            this.propEditorRow = createElement(`<div class="row flex"></div>`);
            this.editStation.appendChild(this.propEditorRow);

            this.typeSelectDiv = createElement(`<div class="col-md-4"></div>`);
            this.propEditorRow.appendChild(this.typeSelectDiv);
    
            this.controlTypeSelectDiv = createElement(`<div class="col-md-4"></div>`);
            this.propEditorRow.appendChild(this.controlTypeSelectDiv);

            this.remoteStationSelectDiv = createElement(`<div class="col-md-4"></div>`);
            this.propEditorRow.appendChild(this.remoteStationSelectDiv);

            this.channelsEditor = createElement('<div class="mt-4"></div>');
            this.editStation.appendChild(this.channelsEditor);

            this.addChannelButton = createElement(`<div class="text-center m-2"><a class="fas" href="#" data-placement="right" title="Přidat nový kanál">&#xf055;</a></div>`);
            this.editStation.appendChild(this.addChannelButton);
            this.addChannelButton.addEventListener("click", (e) => {
                e.preventDefault();
                if (this.data.channels == null) {
                    this.data.channels = {};
                }
                this.data.channels[lastChannelId] = {type: 0, channel: "", description: ""};
                lastChannelId--;
                this.isVerified = true;
                this.onEdit(this.oldData.id, this.data);

                this.redraw();
            });

        this.innerHTML.appendChild(document.createElement('hr'));

        return this;
    }

    unloadSelects() {
        if (this.typeSelectDiv.firstChild === this.typeSelect) {
            this.typeSelectDiv.removeChild(this.typeSelect);
        }
        if (this.controlTypeSelectDiv.firstChild === this.controlTypeSelect) {
            this.controlTypeSelectDiv.removeChild(this.controlTypeSelect);
        }
        if (this.remoteStationSelectDiv.firstChild === this.remoteStationSelect) {
            this.remoteStationSelectDiv.removeChild(this.remoteStationSelect);
        }
    }

    loadSelects() {
        this.typeSelect = this.getSelectHTML(TYPE_DESCRIPTOR, "Druh dopravny", this.data?.type ?? this.oldData?.type);
        this.typeSelect.onchange = () => {
            this.data.type = Number(this.typeSelect.value);
            this.isVerified = true;
            this.onEdit(this.oldData.id, copyObject(this.data));
        };
        this.typeSelectDiv.appendChild(this.typeSelect);

        this.controlTypeSelect = this.getSelectHTML(CONTROL_TYPE_DESCRIPTOR, "Obsazení dopravny", this.data?.control_type ?? this.oldData?.control_type);
        this.controlTypeSelect.onchange = () => {
            this.data.control_type = Number(this.controlTypeSelect.value);
            this.isVerified = true;
            this.onEdit(this.oldData.id, copyObject(this.data));
        };
        this.controlTypeSelectDiv.appendChild(this.controlTypeSelect);

        let firstTrigger = false;
        this.remoteStationSelect = this.getStationSelectHTML(jsonData, this.data?.remote_control ?? this.oldData?.remote_control);
        this.remoteStationSelectDiv.appendChild(this.remoteStationSelect);
        $(`#remote-${this.oldData.id}`).hierarchySelect({
            hierarchy: false,
            width: '100%',
            resetSearchOnSelection: true,
            initialValueSet: true,
            onChange: (val) => {
                if (firstTrigger) {
                    this.data.remote_control = val;
                    this.isVerified = firstTrigger;
                    this.onEdit(this.oldData.id, copyObject(this.data));
                }
                firstTrigger = true;
            }
        });
    }

    unloadChannels() {
        this.channelsEditor.innerHTML = "";
    }

    createChannelInstance(key) {
        if (this.data.channels == null) {
            this.data.channels = {};
        }
        if (this.data.channels[key] == null) {
            this.data.channels[key] = {};
        }
    }

    loadChannels() {
        let channels = patchChannels(copyObject(this.oldData?.channels), this.data?.channels, {...this.data?.removedChannels, ...this.oldData?.removedChannels});
        for (const key in channels) {
            const channel = channels[key];
            let channelsItem = createElement(`<div class="row flex"></div>`);

            let channelTypeDiv = createElement(`<div class="col-md-2"></div>`);
            let channelType = this.getSelectHTML(CHANNEL_TYPE_DESCRIPTOR, "Druh spojení", channel.type);
            channelTypeDiv.appendChild(channelType);
            channelsItem.appendChild(channelTypeDiv);
            channelType.addEventListener("change", () => {
                this.createChannelInstance(key);
                
                this.data.channels[key].type = Number(channelType.value);
                this.isVerified = true;
                this.onEdit(this.oldData.id, copyObject(this.data));
            });
    
            let channelCodeDiv = createElement(`<div class="col-md-3"></div>`);
            let channelCode = createElement(`<input type="text" class="form-control" maxlength="10" size="10" aria-label="Číslo kanálu/telefonu" data-placement="right" title="Číslo kanálu/telefonu" value="${channel.channel}">`);
            channelCodeDiv.appendChild(channelCode);
            channelsItem.appendChild(channelCodeDiv);
            channelCode.addEventListener("input", () => {
                this.createChannelInstance(key);

                if (channelType.value == 0) {
                    channelCode.value = "";
                } else if (channelType.value == 1) {
                    channelCode.value = channelCode.value.toUpperCase().match(/^[0-9]{1,2}[A-C]{1}|^[0-9]{1,2}/);
                } else if (channelType.value == 2) {
                    channelCode.value = channelCode.value.toUpperCase().match(/^[0-9]{1,2}/);
                } else {
                    channelCode.value = channelCode.value.toUpperCase().match(/^[0-9]{1,9}/);
                }
                this.data.channels[key].channel = channelCode.value;
                this.isVerified = true;
                this.onEdit(this.oldData.id, copyObject(this.data));
            });

            let channelDescriptionDiv = createElement(`<div class="col-md-6"></div>`);
            let channelDescription = createElement(`<input type="text" class="form-control" maxlength="100" size="100" aria-label="Stručný popis (100 znaků)" data-placement="right" title="Stručný popis (100 znaků)" value="${channel.description}">`);
            channelDescriptionDiv.appendChild(channelDescription);
            channelsItem.appendChild(channelDescriptionDiv);
            channelDescription.addEventListener("input", () => {
                this.createChannelInstance(key);

                this.data.channels[key].description = channelDescription.value;
                this.isVerified = true;
                this.onEdit(this.oldData.id, copyObject(this.data));
            });

            let channelDelete = createElement(`<div class="col-md-1"><a class="fas" href="#" data-placement="right" title="Odebrat kanál">&#xf2ed;</a></div>`);
            channelsItem.appendChild(channelDelete);
            channelDelete.addEventListener("click", (e) => {
                e.preventDefault();
                if (this.data.channels != null && this.data.channels[key] != null) {
                    delete this.data.channels[key];
                }
                if (this.data.removedChannels == null) {
                    this.data.removedChannels = {};
                }
                this.data.removedChannels[key] = true;
                this.isVerified = true;
                this.onEdit(this.oldData.id, copyObject(this.data), key);
                this.channelsEditor.removeChild(channelsItem);
            });

            this.channelsEditor.appendChild(channelsItem);
        }
    }

    getSelectHTML(options, hint, selectedIndex) {
        let selectNode = createElement(`<select class="form-select col-md-4" aria-label="${hint}" data-placement="right" title="${hint}"></select>`, 'div');
        for (var option of options) {
            selectNode.appendChild(createElement(`<option ${selectedIndex >= 0 && option[0] == selectedIndex ? "selected" : ""} value="${option[0]}">${option[1]}</option>`));
        }
        return selectNode;
    }

    getStationSelectHTML(options, selectedIndex) {
        const id = this.oldData.id;
        let selectNode = createElement(`<div class="dropdown hierarchy-select" id="remote-${id}"></div>`);

        let button = createElement(`<button type="button" class="form-select text-left" id="remote-${id}-button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false" aria-label="Místo odkud je dopravna řízena" data-placement="right" title="Místo odkud je dopravna řízena"></button>`, 'button');
        selectNode.appendChild(button);

        let menu = createElement(`<ul class="dropdown-menu" aria-labelledby="remote-${id}-button"></ul>`, 'ul');
        selectNode.appendChild(menu);

        let search = createElement(`<div class="hs-searchbox"><input type="text" class="form-control" autocomplete="off"></div>`);
        menu.appendChild(search);

        let itemsHolder = createElement(`<div class="hs-menu-inner"></div>`);
        menu.appendChild(itemsHolder);

        itemsHolder.appendChild(createElement(`<li><a class="dropdown-item" data-value="0" data-default-selected="" href="#">Stanice je řízena místně</a></li>`, 'li'));
        for (var option of options) {
            itemsHolder.appendChild(createElement(`<li><a class="dropdown-item" data-value="${option.id}" href="#">${this.getStationHeader(option)}</a></li>`, 'li'));
        }

        let input = createElement(`<input class="d-none" readonly="readonly" aria-hidden="true" type="text" value="${selectedIndex}"/>`, 'input');
        selectNode.appendChild(input);

        return selectNode;
    }

    getStationHeader(source) {
        const abr = source.abbreviation.length > 0 ? `[${source.abbreviation}]` : "";
        return `${source.name} ${abr}`;
    }

    hide()
    {
        this.innerHTML.classList.add("collapse");
        this.isVisible = false;
    }

    setData(dbData, editData, isVerified, isEditor) {
        this.data = editData ?? {};
        this.oldData = dbData;
        this.isVerified = isVerified;
        this.wasVerified = dbData.verified == 1;
        this.isVisible = true;
        this.editorActive = isEditor;
        this.redraw();
    }

    redraw() {
        this.innerHTML.classList.remove("collapse");
        this.title.innerHTML = this.getStationHeader(this.oldData);
        this.id.innerHTML = this.oldData.id;
        this.unloadSelects();
        this.unloadChannels();
        if (this.editorActive) {
            this.displayStation.classList.add("collapse");
            this.editStation.classList.remove("collapse");
            this.cancelButton.classList.remove("collapse");
            this.editButton.classList.add("collapse");
            this.tickButton.classList.remove("collapse");
            this.loadSelects();
            this.loadChannels();
            
        } else {
            this.displayStation.classList.remove("collapse");
            this.editStation.classList.add("collapse");
            this.cancelButton.classList.add("collapse");
            this.editButton.classList.remove("collapse");

            this.description.innerHTML = this.getStationDescriptorString(this.oldData);
            this.channels.innerHTML = this.buildChannels();
            if (this.isVerified) {
                this.tickButton.classList.add("collapse");
                this.description.classList.remove("station-not-verified");
            } else {
                this.tickButton.classList.remove("collapse");
                this.description.classList.add("station-not-verified");
            }
        }
    }

    getStationDescriptorString(data) {
        var description = data.control_type == 9 || data.control_type == 8 ? "není" : "je";
        var appendix = "";
        switch (data.type) {
            case 1:
                description = `stanice ${description} obsazena`;
                appendix = "a";
                break;
            case 3:
                description = `dopravna D3 ${description} obsazena`;
                appendix = "a";
                break;
            case 4:
                description = `dopravna D4 ${description} obsazena`;
                appendix = "a";
                break;
            case 5:
                description = `CDP ${description} obsazeno`;
                appendix = "o";
                break;
            case 8:
            case 9:
                description = `obvod stanice ${description} obsazen`;
                appendix = "";
                break;
            case 11:
                description = `výhybna ${description} obsazena`;
                appendix = "a";
                break;
            case 21:
            case 23:
            case 24:
                description = `odbočka ${description} obsazena`;
                appendix = "a";
                break;
        }
    
        switch (data.control_type) {
            case 1:
                description += " výpravčím";
                break;
            case 10:
                description += " perónovým výpravčím";
                break;
            case 11:
                description += " perónovým a panelovým výpravčím";
                break;
            case 12:
                description += " pohotovostním výpravčím";
                break;
            case 13:
                description += " panelovým a pohotovostním výpravčím";
                break;
            case 14:
                description += " perónovým, panelovým a pohotovostním výpravčím";
                break;
            case 15:
                description += " výpravčím a dispečerem dirigujícím/RB";
                break;
            case 2:
                description += " staničním dozorcem";
                break;
            case 3:
                description += " dirigujícím dispečerem";
                break;
            case 31:
                description += " dirigujícím dispečerem";
                break;
            case 32:
                description += " perónovým výpravčím a dirigujícím dispečerem";
                break;
            case 33:
                description += " perónovým a panelovým výpravčím a dirigujícím dispečerem";
                break;
            case 34:
                description += " pohotovostním výpravčím a dirigujícím dispečerem";
                break;
            case 35:
                description += " pohotovostním a panelovým výpravčím a dirigujícím dispečerem";
                break;
            case 36:
                description += " perónovým, panelovým a pohotovostním výpravčím a dirigujícím dispečerem";
                break;
            case 37:
                description += " výpravčím, dirigujícím dispečerem a dispečerem RB";
                break;
            case 38:
                description += " dirigujícím dispečerem vykonávajícím službu pohotovostního výpravčího";
                break;
            case 4:
                description += " traťovým dispečerem";
                break;
            case 5:
            case 51:
                description += " výpravčím DOZ";
                break;
            case 52:
                description += " výpravčím DOZ a perónovým výpravčím";
                break;
            case 53:
                description += " výpravčím DOZ a perónovým a panelovým výpravčím";
                break;
            case 54:
                description += " výpravčím DOZ a pohotovostním výpravčím";
                break;
            case 55:
                description += " výpravčím DOZ a panelovým a pohotovostním výpravčím";
                break;
            case 56:
                description += " výpravčím DOZ a perónovým, panelovým a pohotovostním výpravčím";
                break;
            case 57:
                description += " výpravčím DOZ, panelovým výpravčím a dispečerem dirigujícím/RB";
                break;
            case 58:
                description += " výpravčím DOZ, perónovým výpravčím a dispečerem dirigujícím/RB vykonávajícím službu výpravčího";
                break;
            case 59:
                description += " dvěma výpravčími DOZ, jeden vykonává službu výpravčího";
                break;
            case 6:
                description += " pohotovostním výpravčím";
                break;
            case 8:
                description += " zaměstanci SŽ";
                break;
        }
        
        if (data.remote_control > 0 || data.control_type == 9) {
            description += ` a je ${data.type == 3 || data.type == 4 ? `dirigována` : `řízen${appendix} dálkově`}`;
        }
        if (data.remote_control > 0) {
            var remoteStation = jsonData.find(element => element.id == data.remote_control);
            if (remoteStation != null) {
                description += ` z pracoviště ${remoteStation.short_name}`;
            }
        }
        return description;
    }
    
    buildChannels() {
        let channels = "";
        let channelsData = patchChannels(copyObject(this.oldData?.channels), this.data?.channels, {...this.data?.removedChannels, ...this.oldData?.removedChannels});
        for (const key in channelsData) {
            const channel = channelsData[key];
            let channelString = channel.channel;
            if (channel.type == 3) {
                channelString = "";
                let src = channel.channel;
                const gap = 3;

                while (src.length > 0) {
                    channelString = channelString + " " + src.substring(0, gap);
                    src = src.substring(gap);
                }
                channelString += "</a>";
            }
            channels += `<li><b>${channel.type == 0 ? "GSM-R " : channel.type == 1 ? "TRS " : channel.type == 2 ? "SIMPLEX " : `<a href=tel:+420${channel.channel}>+420 `} ${channelString} - ${channel.description}</b></li>`;
        };
        return channels;
    }
}