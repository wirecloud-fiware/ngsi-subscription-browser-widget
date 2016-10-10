/*
 * Copyright (c) 2015-2016 CoNWeT Lab., Universidad Politécnica de Madrid
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
    };

    NGSITypeBrowser.prototype.updateNGSIConnection = function updateNGSIConnection() {

        this.ngsi_server = mp.prefs.get('ngsi_server');
        var options = {
            request_headers: {},
            use_user_fiware_token: mp.prefs.get('use_user_fiware_token')
        };
        if (mp.prefs.get('use_owner_credentials')) {
            options.request_headers['X-FIWARE-OAuth-Token'] = 'true';
            options.request_headers['X-FIWARE-OAuth-Header-Name'] = 'X-Auth-Token';
            options.request_headers['x-FI-WARE-OAuth-Source'] = 'workspaceowner';
        }

        var tenant = mp.prefs.get('ngsi_tenant').trim().toLowerCase();
        if (tenant !== '') {
            options.request_headers['FIWARE-Service'] = tenant;
        }

        var path = mp.prefs.get('ngsi_service_path').trim().toLowerCase();
        if (path !== '' && path !== '/') {
            options.request_headers['FIWARE-ServicePath'] = path;
        }

        this.ngsi_connection = new NGSI.Connection(this.ngsi_server, options);
    };

    /**************************************************************************/
    /****************************** HANDLERS **********************************/
    /**************************************************************************/

    var onNGSIQuerySuccess = function onNGSIQuerySuccess(next, page, data, details) {
        for (var i = 0; i < data.length; i++) {
            if (!Array.isArray(data[i].attributes)) {
                data[i].attributes = [];
            }
        }

        var search_info = {
            'resources': data,
            'current_page': page,
            'total_count': details.count
        };

        next(data, search_info);
    };

    var createNGSISource = function createNGSISource() {
        this.ngsi_source = new se.PaginatedSource({
            'pageSize': 30,
            'requestFunc': function (page, options, onSuccess, onError) {
                if (this.ngsi_connection !== null) {
                    this.ngsi_connection.getAvailableSubscriptions({
                        limit: options.pageSize,
                        offset: (page - 1) * options.pageSize,
                        onSuccess: onNGSIQuerySuccess.bind(null, onSuccess, page),
                        onFailure: onError
                    });
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
            {field: 'expires', label: 'Expires', width: '24ex', sortable: false}
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
                        content.appendChild(button);
                    }

                    if (mp.prefs.get('allow_delete')) {
                        button = new se.Button({
                            class: 'btn-danger',
                            iconClass: 'fa fa-trash fa-fw',
                            title: 'Delete'
                        });
                        button.addEventListener("click", function () {
                            this.ngsi_connection.deleteSubscription(entry.id, {
                                onSuccess: this.ngsi_source.refresh.bind(this.ngsi_source)
                            });
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
