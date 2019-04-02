# NGSI Type Browser widget

[![](https://nexus.lab.fiware.org/repository/raw/public/badges/chapters/visualization.svg)](https://www.fiware.org/developers/catalogue/)
![](https://img.shields.io/github/license/wirecloud-fiware/ngsi-subscription-browser-widget.svg)

The NGSI Type Browser [WireCloud widget](http://wirecloud.readthedocs.org/en/latest/) allows you to browser the entities
types used in a given
[Orion Context Broker](http://catalogue.fiware.org/enablers/publishsubscribe-context-broker-orion-context-broker) server
in a easy and paginated way. This is done using the `contextTypes` querys, so updates made into the context broker are
not reflected immediately when using this widget.

> Latest version of this widget is always provided in
> [FIWARE Lab](https://store.lab.fiware.org/search/keyword/OrionStarterKit) where you can make use of it on the
> [Mashup portal](https://mashup.lab.fiware.org). Remember to take a look into the example mashups provided in the
> OrionStarterKit offering.

## Build

Be sure to have installed [Node.js](http://node.js). For example, you can install it on Ubuntu and Debian running the
following commands:

```console
curl -sL https://deb.nodesource.com/setup | sudo bash -
sudo apt-get install nodejs
sudo apt-get install npm
```

Install other npm dependencies by running:

```console
npm install
```

For build the widget you need download grunt:

```console
sudo npm install -g grunt-cli
```

And now, you can use grunt:

```console
grunt
```

If everything goes well, you will find a wgt file in the `dist` folder.

## Documentation

Documentation about how to use this widget is available on the [User Guide](src/doc/userguide.md). Anyway, you can find
general information about how to use widgets on the
[WireCloud's User Guide](https://wirecloud.readthedocs.io/en/stable/user_guide/) available on Read the Docs.

## Copyright and License

Copyright (c) 2015 CoNWeT Lab., Universidad Politecnica de Madrid

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the
License. You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific
language governing permissions and limitations under the License.
