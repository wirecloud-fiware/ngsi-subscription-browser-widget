/*
 * Copyright (c) 2015-2017 CoNWeT Lab., Universidad Politécnica de Madrid
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* global NGSI, StyledElements */

(function (se, mp) {

    "use strict";

    var NGSITypeBrowser = function NGSITypeBrowser() {

        /* Context */
        mp.widget.context.registerCallback(function (newValues) {
            if (this.layout && ("heightInPixels" in newValues || "widthInPixels" in newValues)) {
                this.layout.repaint();
            }
        }.bind(this));

        /* Preferences */
        mp.prefs.registerCallback(function (newValues) {
            if ('ngsi_server' in newValues || 'use_user_fiware_token' in newValues || 'use_owner_credentials' in newValues || 'ngsi_tenant' in newValues || 'ngsi_service_path' in newValues) {
                this.updateNGSIConnection();
            }

            this.ngsi_source.goToFirst();
        }.bind(this));

        mp.wiring.registerCallback("reload", function () {
            this.ngsi_source.goToFirst();
        }.bind(this));

        this.layout = null;
        this.table = null;
    };

    NGSITypeBrowser.prototype.init = function init() {
        createNGSISource.call(this);
        this.updateNGSIConnection();

        this.layout = new se.VerticalLayout();
        createTable.call(this);

        this.layout.center.addClassName('loading');
        this.layout.insertInto(document.body);

        this.editor_config_output = mp.widget.createOutputEndpoint();
        this.template_output = mp.widget.createOutputEndpoint();
        this.update_subscription_endpoint = mp.widget.createInputEndpoint(onUpdateSubscription.bind(this));
        this.create_subscription_endpoint = mp.widget.createInputEndpoint(onCreateSubscription.bind(this));

        this.create_entity_button = new se.Button({
            class: "se-btn-circle add-entity-button z-depth-3",
            iconClass: "fa fa-plus",
        });
        this.create_entity_button.addEventListener('click', function (button) {
            openEditorWidget.call(this, button, "create");
            this.template_output.pushEvent(JSON.stringify(emptySubscription));
        }.bind(this));

        this.layout.center.appendChild(this.create_entity_button);
    };

    NGSITypeBrowser.prototype.updateNGSIConnection = function updateNGSIConnection() {

        this.ngsi_server = mp.prefs.get('ngsi_server');
        var options = {
            request_headers: {},
            use_user_fiware_token: mp.prefs.get('use_user_fiware_token')
        };
        if (mp.prefs.get('use_owner_credentials')) {
            options.request_headers['FIWARE-OAuth-Token'] = 'true';
            options.request_headers['FIWARE-OAuth-Header-Name'] = 'X-Auth-Token';
            options.request_headers['FIWARE-OAuth-Source'] = 'workspaceowner';
        }

        var tenant = mp.prefs.get('ngsi_tenant').trim().toLowerCase();
        if (tenant !== '') {
            options.request_headers['FIWARE-Service'] = tenant;
        }

        var path = mp.prefs.get('ngsi_service_path').trim().toLowerCase();
        if (path !== '') {
            options.request_headers['FIWARE-ServicePath'] = path;
        }

        this.ngsi_connection = new NGSI.Connection(this.ngsi_server, options);
    };

    // =========================================================================
    // PRIVATE MEMBERS
    // =========================================================================

    var emptySubscription = {
        "description": "",
        "subject": {
            "entities": [
                {
                    "idPattern": "",
                    "type": ""
                }
            ],
            "condition": {
                "attrs": []
            }
        },
        "notification": {
            "http": {
                "url": "https://..."
            },
            "attrs": []
        }
    };

    var onNGSIQuerySuccess = function onNGSIQuerySuccess(next, page, data) {
        var search_info = {
            'resources': data.results,
            'current_page': page,
            'total_count': data.count
        };

        next(data.results, search_info);
    };

    var onUpdateSubscription = function onUpdateSubscription(data_string) {
        var data = JSON.parse(data_string);
        this.ngsi_connection.v2.updateSubscription(data, {keyValues: true}).then(() => {
            this.ngsi_source.refresh();
            if (this.editor_widget != null) {
                this.editor_widget.remove();
            }
        });
    };

    var onCreateSubscription = function onCreateSubscription(data_string) {
        var data = JSON.parse(data_string);
        this.ngsi_connection.v2.createSubscription(data, {keyValues: true}).then(() => {
            this.ngsi_source.refresh();
            if (this.editor_widget != null) {
                this.editor_widget.remove();
            }
        });
    };

    var openEditorWidget = function openEditorWidget(button, action) {
        if (this.editor_widget == null) {
            this.editor_widget = mp.mashup.addWidget("CoNWeT/json-editor/1.0.1", {refposition: button});
            this.editor_widget.addEventListener('remove', onEditorWidgetClose.bind(this));
            // Crete a wiring connection for sending editor conf and initial contents
            this.editor_config_output.connect(this.editor_widget.inputs.configure);
            this.template_output.connect(this.editor_widget.inputs.input);
        }

        // Disconnect json editor output endpoint
        this.editor_widget.outputs.output.disconnect();

        // And reconnect it with the expected one
        switch (action) {
        case "edit":
            this.editor_config_output.pushEvent({
                "readonly": [
                    ["id"]
                ]
            });
            this.editor_widget.outputs.output.connect(this.update_subscription_endpoint);
            break;
        case "create":
            this.editor_config_output.pushEvent({
                "readonly": []
            });
            this.editor_widget.outputs.output.connect(this.create_subscription_endpoint);
            break;
        }
    };

    var onEditorWidgetClose = function onEditorWidgetClose() {
        this.editor_widget = null;
    };

    var createNGSISource = function createNGSISource() {
        this.ngsi_source = new se.PaginatedSource({
            'pageSize': 30,
            'requestFunc': function (page, options, onSuccess, onError) {
                if (this.ngsi_connection !== null) {
                    this.ngsi_connection.v2.listSubscriptions({
                        count: true,
                        limit: options.pageSize,
                        offset: (page - 1) * options.pageSize
                    }).then(
                        onNGSIQuerySuccess.bind(null, onSuccess, page),
                        onError
                    );
                } else {
                    onSuccess([], {resources: [], total_count: 0, current_page: 0});
                }
            }.bind(this)
        });
        this.ngsi_source.addEventListener('requestStart', function () {
            this.layout.center.disable();
        }.bind(this));
        this.ngsi_source.addEventListener('requestEnd', function () {
            this.layout.center.enable();
        }.bind(this));
    };

    var createTable = function createTable() {
        var fields;

        // Configure the basic fields
        fields = [
            {field: 'id', label: 'Id', sortable: false, width: "20%"},
            {field: 'description', label: 'Description', sortable: false},
            {field: 'status', label: 'Status', width: '10ex', sortable: false},
            {field: 'expires', type: 'date', label: 'Expires', width: '24ex', sortable: false}
        ];

        if (mp.prefs.get('allow_delete')) {
            fields.push({
                label: 'Actions',
                width: '100px',
                contentBuilder: function (entry) {
                    var content, button;

                    content = new se.Container({class: 'btn-group'});

                    if (mp.prefs.get('allow_edit')) {
                        button = new se.Button({
                            iconClass: 'fa fa-pencil fa-fw',
                            title: 'Edit'
                        });
                        button.addEventListener('click', function (button) {
                            openEditorWidget.call(this, button, "edit");
                            this.template_output.pushEvent(JSON.stringify(entry));
                        }.bind(this));
                        content.appendChild(button);
                    }

                    if (mp.prefs.get('allow_delete')) {
                        button = new se.Button({
                            class: 'btn-danger',
                            iconClass: 'fa fa-trash fa-fw',
                            title: 'Delete'
                        });
                        button.addEventListener("click", function () {
                            this.ngsi_connection.v2.deleteSubscription(entry.id)
                                .then(this.ngsi_source.refresh.bind(this.ngsi_source));
                        }.bind(this));
                        content.appendChild(button);
                    }

                    return content;
                }.bind(this),
                sortable: false
            });
        }

        // Create the table
        this.table = new se.ModelTable(fields, {id: 'name', pageSize: 30, source: this.ngsi_source, 'class': 'table-striped'});
        this.table.reload();
        this.layout.center.clear();
        this.layout.center.appendChild(this.table);
    };

    var widget = new NGSITypeBrowser();
    window.addEventListener("DOMContentLoaded", widget.init.bind(widget), false);

})(StyledElements, MashupPlatform);
