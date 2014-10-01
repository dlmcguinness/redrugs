var redrugsApp = angular.module('redrugsApp', []);

redrugsApp.controller('ReDrugSCtrl', function ReDrugSCtrl($scope, $http) {

    /* OSC code */

    //129.161.106.124 CCC computer
    // socket = io.connect('http://127.0.0.1', { port: 8081, rememberTransport: false});
    // console.log('oi');
    // socket.on('connect', function() {
    //     // sends to socket.io server the host/port of oscServer and oscClient
    //     socket.emit('config', {
    //         server: {
    //             port: 3333,
    //             host: '127.0.0.1' 
    //         },
    //         client: {
    //             port: 3334,
    //             host: '129.161.106.124'
    //         }
    //     });
    // });
    // socket.on('message', function(obj) {
    //     var status = document.getElementById("status");
    //     status.innerHTML = obj[0];
    //     console.log(obj);
    // });

    /* End of OSC code */

    $scope.elements = {
        nodes:[],
        edges:[]
    };
    $scope.nodeMap = {};
    $scope.edges = [];
    $scope.edgeMap = {};
    $scope.edgesFilter = {
        triangle: true,
        tee: true,
        circle: true,
        diamond: true,
        square: true,
        none: true,
        other: true
    };
    $scope.layout = {
        name: 'arbor',
        liveUpdate: false,
        circle: true,
        directed: true,
        maxSimulationTime: 2000,
        padding: [100,100,100,100]
    };
    $scope.resources = {};
    $scope.searchTerms = "";
    $scope.searchTermURIs = {};
    $scope.showLabel = true;

    $scope.container = $('#results');
    $scope.result = $("#result");
    $scope.createGraph = function() {
        $scope.container.cytoscape({
            style: cytoscape.stylesheet()
                .selector('node')
                .css({
                    'min-zoomed-font-size': 8,
                    'content': 'data(label)',
                    'text-valign': 'center',
                    'color':'white',
                    'background-color': 'data(color)',
                    'shape': 'data(shape)',
                    'text-outline-width': 2,
                    'text-outline-color': 'data(textlinecolor)',
                    'border-color': 'data(linecolor)',
                    'border-width': 2,
                    'height': 'data(size)',
                    'width': 'data(size)',
                    'cursor': 'pointer'
                })
                .selector('edge')
                .css({
                    'opacity':'data(probability)',
                    'width':'data(width)',
                    'target-arrow-shape': 'data(shape)',
                    'target-arrow-color': 'data(color)',
                    'line-color': 'data(color)'
                })
                .selector(':selected')
                .css({
                    'background-color': '#D8D8D8',
                    'line-color': '#D8D8D8',
                    'target-arrow-color': '#D8D8D8',
                    'source-arrow-color': '#D8D8D8',
                    'opacity':1,
                })
                .selector('.highlighted')
                .css({
                    'background-color': '#000000',
                    'line-color': '#000000',
                    'target-arrow-color': '#000000',
                    'transition-property': 'background-color, line-color, target-arrow-color, height, width',
                    'transition-duration': '0.5s'
                })
                .selector('.hidden')
                .css({
                    'opacity': 0,
                })
                .selector('.faded')
                .css({
                    'opacity': 0.25,
                    'text-opacity': 0
                })
                .selector('.hideLabel')
                .css({
                    'text-opacity': 0
                }),

            elements: [] ,

            hideLabelsOnViewport: true ,

            ready: function(){
                $scope.cy = cy = this;
                cy.boxSelectionEnabled(false);

                // Hides dynamically revealed objects on page
                cy.on('drag', function(e) {
                    $("#button-box").addClass('hidden');
                    $("#edge-info").addClass('hidden');
                });
                cy.on('pan', function(e) {
                    $("#button-box").addClass('hidden');
                    $("#edge-info").addClass('hidden');
                });
                cy.on('zoom', function(e) {
                    $("#button-box").addClass('hidden');
                    $("#edge-info").addClass('hidden');
                });
                cy.on('tapdragover', 'node', function(e) {
                    var node = e.cyTarget;
                    if (!$scope.showLabel) {
                        node.removeClass('hideLabel');
                    }
                });
                cy.on('tagdragout', 'node', function(e) {
                    var node = e.cyTarget;
                    if (!$scope.showLabel) {
                        node.addClass('hideLabel');
                    }
                });
                cy.on('free', 'node', function(e) {
                    var selected = $scope.cy.$('node:selected');
                    selected.nodes().each(function(i,d) {
                        var pos = d.renderedPosition();
                        $("#button-box").css("left", pos.x-105);
                        $("#button-box").css("top", pos.y-90);
                        $("#button-box").removeClass('hidden');
                    });
                });
                // Double-clicking on whitespace removes all CSS changes
                cy.on('vclick', function(e){
                    if( e.cyTarget === cy ){
                        cy.elements().removeClass('faded');
                        if (!$scope.showLabel) {
                            cy.elements().addClass('hideLabel');
                        }
                        $("#button-box").addClass('hidden');
                        $("#edge-info").addClass('hidden');
                        cy.elements().removeClass("highlighted");
                    }
                });

                // Double-clicking a node...
                cy.on('select', 'node', function(e){
                    var node = e.cyTarget; 
                    var neighborhood = node.neighborhood().add(node);
                    var pos = node.renderedPosition();
                    
                    cy.elements().addClass('faded');
                    neighborhood.removeClass('faded');
                    if (!$scope.showLabel) {
                        node.removeClass('hideLabel');
                        neighborhood.removeClass('hideLabel');
                    }
                    
                    $("#button-box").css("left", pos.x-105);
                    $("#button-box").css("top", pos.y-90);
                    $("#button-box").removeClass('hidden');

                    $('#edge-info').addClass('hidden');
                    // socket.send((pos.x).toFixed(2));
                    // socket.send((pos.y).toFixed(2));

                    // console.log(cy.json());
                });
                // Double-clicking an edge...
                cy.on('click', 'edge', function(e) {
                    var uris = [];
                    var db = function() {
                        var result = "";
                        for(var k in uris) { result += "<li>" + k + "</li>"; }
                        return result;
                    };
                    var infolist = function(source) {
                        var table = []
                        for (i = 0; i < source.length; i++) {
                            // Gets name of database source
                            var start = source[i].indexOf("dataset/") + 8;
                            var end = source[i].indexOf("/", start);
                            var db = source[i].slice(start, end);
                            var db2 = db.charAt(0).toUpperCase() + db.slice(1);
                            uris[db2] = true;
                            // Gets name of the interactionType
                            start = source[i].indexOf("URIRef(u'", end) + 9;
                            end = source[i].indexOf("'),", start);
                            var typeLabel = source[i].slice(start, end);
                            typeLabel = (!$scope.edgeTypes[typeLabel]) ? 'Interaction with Disease' : $scope.edgeTypes[typeLabel]
                            // Gets probability value
                            start = source[i].indexOf("Literal(u'") + 10;
                            end = source[i].indexOf("'", start);
                            var prob = source[i].slice(start, end);
                            // Add data to table array
                            var temp = [];
                            temp.push(db2);
                            temp.push(typeLabel);
                            temp.push(prob);
                            table.push(temp);
                        }
                        var t = "";
                        for (i = 0; i < table.length; i++) {
                            t = t + "<tr>";
                            for (j = 0; j < 3; j++) {
                                t = t + "<td>" + table[i][j] + "</td>";
                            }
                            t = t + "</tr>";
                        }
                        return t;
                    }
                    var pos = e.cyRenderedPosition;
                    var edge = e.cyTarget;

                    var table = infolist(edge.data().data);
                    $("#edge-info").html("<p>Interaction: " + edge.data().types + "</p><p> Probability: " + edge.data().probability + "</p> Z-Score: " + edge.data().zscore + "<ul> Databases Referenced: " + db() + "</ul><p><a href='#edgeTable' role='button' data-toggle='modal'>Click to view all interactions</a></p>"); 
                    $("#edgeTable .modal-body").html('<table class="table"><thead><tr><th>Database</th><th>Interaction Type</th><th>Probability</th></tr></thead><tbody>' + table + '</tbody></table>');
                    $("#edge-info").css("left", pos.x+20);
                    $("#edge-info").css("top", pos.y-10);
                    $("#edge-info").removeClass('hidden');
                });
            }
        });
    }
    $scope.createGraph();

    $scope.graph = $.Graph();
    $scope.ns = {
        rdf: $.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#"),
        rdfs: $.Namespace("http://www.w3.org/2000/01/rdf-schema#"),
        prov: $.Namespace("http://www.w3.org/ns/prov#"),
        pml: $.Namespace("http://provenanceweb.org/ns/pml#"),
        sio: $.Namespace("http://semanticscience.org/resource/"),
        dcterms: $.Namespace("http://purl.org/dc/terms/"),
        local: $.Namespace("urn:redrugs:"),
    };
    // SADI services
    $scope.services = {
        search: $.SadiService("/api/search"),
        process: $.SadiService("/api/process"),
        upstream: $.SadiService("/api/upstream"),
        downstream: $.SadiService("/api/downstream"),
    };

    // JQuery Autocomplete UI widget
    $(".searchBox").autocomplete({
        minLength : 3,
        select: function( event, ui ) {
            if (ui.item.label === "No Matches Found") { ui.item.label = ""; }
            $scope.searchTerms = ui.item.label;
            $('.searchBox').val(ui.item.label);
            return false;
        },
        focus: function( event, ui ) {
            if (ui.item.label === "No Matches Found") { ui.item.label = ""; }
            $('.searchBox').val(ui.item.label);
            return false;
        },
        source: function(query, process) {
            var g = new $.Graph();
            var res = g.getResource($scope.ns.local("query"));
            res[$scope.ns.prov('value')] = [query.term];
            res[$scope.ns.rdf('type')] = [g.getResource($scope.ns.pml('Query'))];
            $scope.services.search(g,function(graph) {
                var keywords = graph.resources.map(function(d) {
                    return graph.getResource(d);
                    }).filter(function(d) {
                        return d[$scope.ns.pml('answers')];
                    }).map(function(d) {
                        var result = d[$scope.ns.rdfs('label')][0];
                        $scope.searchTermURIs[result] = d.uri;
                        return result;
                    })
                if (keywords.length === 0) {
                    keywords = ["No Matches Found"];
                    $(".search-btn").attr("disabled", "disabled");
                }
                else { $(".search-btn").removeAttr("disabled"); }
                process(keywords);
            }, $scope.graph, $scope.handleError);
        }
    });

    $scope.handleError = function(data,status, headers, config) {
        $scope.error = true;
        $scope.loading = false;
    };
    $scope.getSelected = function(attr) {
        if (!$scope.cy) return [];
        var selected = $scope.cy.$('node:selected');
        var query = [];
        selected.nodes().each(function(i,d) { query.push(d.data(attr)); });
        return query;
    };
    // Gets the details of the selected node
    $scope.getDetails = function(query) {
        var g = new $.Graph();
        query.forEach(function(uri) { window.open(uri); });
    };
    // Shows BFS animation starting from selected node
    $scope.showBFS = function(query) {
        var g = new $.Graph();
        query.forEach(function(id) {
            cy.elements().removeClass("highlighted");
            var root = "#" + id;
            var bfs = cy.elements().bfs(root, function(){}, true);
            var i = 0;
            var highlightNextEle = function(){
              bfs.path[i].addClass('highlighted');
              bfs.path[i].removeClass('faded');
              if( i < bfs.path.length - 1){
                i++;
                setTimeout(highlightNextEle, 100);
              }
            };
            highlightNextEle();
        });
    };
    // Used to filter edge interaction types based on color of edge
    $scope.filter = function(query) {
        $scope.cy.edges().each(function(i, ele){
            ele.addClass("hidden");
        });
        if (query.triangle === true) {
            $scope.cy.elements('edge[color="#9AFE2E"]').each(function(i, ele){ 
                ele.removeClass("hidden"); });
        } if (query.tee === true) {
            $scope.cy.elements('edge[color="#C71585"]').each(function(i, ele){ 
                ele.removeClass("hidden"); });
        } if (query.circle === true) {
            $scope.cy.elements('edge[color="#00FFFF"]').each(function(i, ele){ 
                ele.removeClass("hidden"); });
        } if (query.diamond === true) {
            $scope.cy.elements('edge[color="#FF2600"]').each(function(i, ele){ 
                ele.removeClass("hidden"); });
        } if (query.square === true) {
            $scope.cy.elements('edge[color="#000000"]').each(function(i, ele){ 
                ele.removeClass("hidden"); });
        } if (query.none === true) {
            $scope.cy.elements('edge[color="#FF0040"]').each(function(i, ele){ 
                ele.removeClass("hidden"); });
        } if (query.other === true) {
            $scope.cy.elements('edge[color="#BABABA"]').each(function(i, ele){ 
                ele.removeClass("hidden"); });
        }
    };

    // Maps edge interaction types to values for Cytoscape visualization
    $scope.edgeTypes = {
        "http://purl.obolibrary.org/obo/CHEBI_48705": "Agonist",                   
        "http://purl.obolibrary.org/obo/MI_0190": "Molecule Connection",  
        "http://purl.obolibrary.org/obo/CHEBI_23357": "Cofactor",                  
        "http://purl.obolibrary.org/obo/CHEBI_25212": "Metabolite",                
        "http://purl.obolibrary.org/obo/CHEBI_35224": "Effector",                   
        "http://purl.obolibrary.org/obo/CHEBI_48706": "Antagonist",                
        "http://purl.org/obo/owl/GO#GO_0048018": "Receptor Agonist Activity",                     
        "http://www.berkeleybop.org/ontologies/owl/GO#GO_0030547":"Receptor Inhibitor Activity",    
        "http://purl.obolibrary.org/obo/MI_0915": "Physical Association",          
        "http://purl.obolibrary.org/obo/MI_0407": "Direct Interaction",          
        "http://purl.obolibrary.org/obo/MI_0191": "Aggregation",                   
        "http://purl.obolibrary.org/obo/MI_0914": "Association",                    
        "http://purl.obolibrary.org/obo/MI_0217": "Phosphorylation Reaction",     
        "http://purl.obolibrary.org/obo/MI_0403": "Colocalization",               
        "http://purl.obolibrary.org/obo/MI_0570": "Protein Cleavage",              
        "http://purl.obolibrary.org/obo/MI_0194": "Cleavage Reaction"             
    }
    $scope.edgeShapes = {
        "http://purl.obolibrary.org/obo/CHEBI_48705": "triangle",
        "http://purl.obolibrary.org/obo/MI_0190": "none",
        "http://purl.obolibrary.org/obo/CHEBI_23357": "triangle",
        "http://purl.obolibrary.org/obo/CHEBI_25212": "triangle",
        "http://purl.obolibrary.org/obo/CHEBI_35224": "none",
        "http://purl.obolibrary.org/obo/CHEBI_48706": "tee",
        "http://purl.org/obo/owl/GO#GO_0048018": "triangle",
        "http://www.berkeleybop.org/ontologies/owl/GO#GO_0030547":"tee",
        "http://purl.obolibrary.org/obo/MI_0915": "circle",
        "http://purl.obolibrary.org/obo/MI_0407": "none",
        "http://purl.obolibrary.org/obo/MI_0191": "circle",
        "http://purl.obolibrary.org/obo/MI_0914": "none",
        "http://purl.obolibrary.org/obo/MI_0217": "diamond",
        "http://purl.obolibrary.org/obo/MI_0403": "circle",
        "http://purl.obolibrary.org/obo/MI_0570": "square",
        "http://purl.obolibrary.org/obo/MI_0194": "square",
    }
    $scope.edgeColors = {
        "http://purl.obolibrary.org/obo/CHEBI_48705": "#9AFE2E",//YELLOW
        "http://purl.obolibrary.org/obo/MI_0190": "#FF0040",//purple
        "http://purl.obolibrary.org/obo/CHEBI_23357": "#9AFE2E",//YELLOW
        "http://purl.obolibrary.org/obo/CHEBI_25212": "#9AFE2E",//YELLOW
        "http://purl.obolibrary.org/obo/CHEBI_35224": "#FF0040",//purple
        "http://purl.obolibrary.org/obo/CHEBI_48706": "#C71585",//WASSALMON#FA8072 NOW PINKRED
        "http://purl.org/obo/owl/GO#GO_0048018": "#9AFE2E",//YELLOW
        "http://www.berkeleybop.org/ontologies/owl/GO#GO_0030547":"#C71585",//PINKRED
        "http://purl.obolibrary.org/obo/MI_0915": "#00FFFF",//aqua
        "http://purl.obolibrary.org/obo/MI_0407": "#FF0040",//purple
        "http://purl.obolibrary.org/obo/MI_0191": "#00FFFF",//aqua
        "http://purl.obolibrary.org/obo/MI_0914": "#FF0040",//purple
        "http://purl.obolibrary.org/obo/MI_0217": "#9800FF",
        "http://purl.obolibrary.org/obo/MI_0403": "#00FFFF",//aqua
        "http://purl.obolibrary.org/obo/MI_0570": "#A0A0A0",
        "http://purl.obolibrary.org/obo/MI_0194": "#A0A0A0"
    }

    // Maps node types to values for Cytoscape visualization
    $scope.getShape = function (types) {
        if (types['http://semanticscience.org/resource/activator']) {
            return "triangle"
        } else if (types['http://semanticscience.org/resource/inhibitor']) {
            return "star"
        } else if (types['http://semanticscience.org/resource/protein']) {
            return "square"
        } else if (types['http://semanticscience.org/resource/SIO_010056']) {
            return "roundrectangle"
        } else {
            return "circle" //circle
        }
    };
    $scope.getSize = function (types) {
        if (types['http://semanticscience.org/resource/activator'] || types['http://semanticscience.org/resource/inhibitor']) { return '70'; }
        else if (types['http://semanticscience.org/resource/SIO_010056']) { return '60'; }
        else { return '50'; }
    };
    $scope.getColor = function (types) {
        if (types['http://semanticscience.org/resource/activator']) {
            return "#FFD700"//BLUE
        } else if (types['http://semanticscience.org/resource/inhibitor']) {
            return "#C71585"
        } else if (types['http://semanticscience.org/resource/protein']) {
            return "#FFA500"
        } else if (types['http://semanticscience.org/resource/SIO_010056']) {
            return "#112B49"
        } else {
            return "#FF7F50" //#FFFF00
        }
    };
    $scope.getTextlineColor = function (types) {
        if (types['http://semanticscience.org/resource/activator']) {
            return "#333333"//BLUE
        } else if (types['http://semanticscience.org/resource/inhibitor']) {
            return "#444444"
        } else if (types['http://semanticscience.org/resource/protein']) {
            return "#444444"
        } else {
            return "#333333" //#FFFF00
        }
    };

    // Functions to create and add values to graph
    $scope.createResource = function(uri, graph) {
        var entity = graph.getResource(uri,'uri');
        entity[$scope.ns.rdf('type')] = [
            graph.getResource($scope.ns.sio('process'),'uri'),
            graph.getResource($scope.ns.sio('material-entity'),'uri')
        ];
        return entity;
    };

    $scope.found = -1;          // How many edge connections found
    $scope.once = false;        // Is this the first iteration?
    $scope.query = "none";     
    // Initial search call
    $scope.addToGraph = function(query) {
        $scope.loading = true;
        $('#starting-box').css("display", "none");
        $('#interface').removeClass("hidden");
        $('#first-bfs').removeClass("hidden");
        var g = new $.Graph();
        $scope.createResource($scope.searchTermURIs[$.trim(query)],g);
        $scope.query = query;
        $scope.services.process(g,function(graph){
            $scope.services.downstream(g,$scope.appendToGraph,$scope.graph,$scope.handleError);
        },$scope.graph,$scope.handleError);
        $scope.cy.layout($scope.layout);
        $scope.once = false;
        $scope.found = -1;
    };
    $scope.getUpstream = function(query) {
        $scope.loading = true;
        var g = new $.Graph();
        query.forEach(function(d) {
            $scope.createResource(d,g);
        });
        // console.log(g.toJSON());
        $scope.services.upstream(g,$scope.appendToGraph,$scope.graph,$scope.handleError);
    };
    $scope.getDownstream = function(query) {
        $scope.loading = true;
        var g = new $.Graph();
        query.forEach(function(d) {
            $scope.createResource(d,g);
        });
        // console.log(g.toJSON());
        $scope.services.downstream(g,$scope.appendToGraph,$scope.graph,$scope.handleError);
    };
    // Used to replace non-working id URI with working URI
    $scope.newURI = function(oldURI) {
        var parser = document.createElement('a');
        parser.href = oldURI;
        var source = (parser.pathname).substring(1, parser.pathname.indexOf(':'));
        if (source === "uniprot") {
            return "http://www.uniprot.org/uniprot/" + (parser.pathname).substring(parser.pathname.indexOf(':') + 1);
        } else if (source === "refseq") { return oldURI; }
        return "http://" + source + ".bio2rdf.org/describe/?url=" + encodeURIComponent(oldURI);
    };
    // Used to get or create node from nodeMap. Node id was originally the res.uri
    $scope.getNode = function(res) {
        var node = $scope.nodeMap[res.uri];
        if (!node) {
            var newURI = $scope.newURI(res.uri);
            node = $scope.nodeMap[res.uri] = {
                group: "nodes",
                data: {
                    uri: res.uri,
                    details: newURI,
                    types: {},
                    resource: res
                }
            };
            // Remove all non-alphanumerical and replace space and underscore with hypen
            node.data.id = res[$scope.ns.rdfs('label')][0].replace(/[^a-z0-9\s]/gi, '').replace(/[_\s]/g, '-');
            node.data.label = res[$scope.ns.rdfs('label')];
            if (res[$scope.ns.rdf('type')]) res[$scope.ns.rdf('type')].forEach(function(d) {
                node.data.types[d.uri] = true;
            })
            node.data.shape = $scope.getShape(node.data.types);
            node.data.size = $scope.getSize(node.data.types);
            node.data.color = $scope.getColor(node.data.types);
            node.data.linecolor = "#FFFF00";
            node.data.textlinecolor = $scope.getTextlineColor(node.data.types);
            node.data.prob = 1;
        }
        return node;
    };
    // Parses all edge and node information returned by upstream or downstream query
    $scope.getElements = function(result) {
        var elements = [];
        // For every resulting resource, apply getResource()
        result.resources.map(function(d) {
            return result.getResource(d);
        })
            // For this list of resources, filter for edges who has a target
            .filter(function(d) {
                return d[$scope.ns.sio('has-target')];
            })

            // For those filtered entities, apply the following
            .forEach(function(d) {
                var s = d[$scope.ns.sio('has-participant')][0];
                var t = d[$scope.ns.sio('has-target')][0];
                var source = $scope.getNode(s);
                var target = $scope.getNode(t);
                elements.push(source);
                elements.push(target);
                var edgeTypes = d[$scope.ns.rdf('type')];
                var edge = {
                    group: "edges",
                    data: $().extend({}, d, {
                        id: d[$scope.ns.prov('wasDerivedFrom')][0].uri,
                        source: source.data.id,
                        target: target.data.id, 
                        shape: edgeTypes ? $scope.edgeShapes[edgeTypes[0].uri] : 'none',
                        types: (edgeTypes && !$scope.edgeTypes[edgeTypes[0].uri]) ? 'Interaction with Disease' : $scope.edgeTypes[edgeTypes[0].uri],
                        color: (edgeTypes && !$scope.edgeColors[edgeTypes[0].uri]) ? '#FF0040' : $scope.edgeColors[edgeTypes[0].uri],
                        probability: d[$scope.ns.sio('probability-value')][0],
                        zscore: d[$scope.ns.sio('likelihood')][0],  // z-score-value
                        width: (d[$scope.ns.sio('likelihood')][0] * 4) + 1,
                        data: d[$scope.ns.prov('data')],
                        prov: d[$scope.ns.prov('wasDerivedFrom')],
                        resource: d
                    })
                };
                elements.push(edge);
            });
        return elements;
    };
    // Adds elements to graph.
    $scope.appendToGraph = function(result) {
        var elements = $scope.getElements(result);
        $scope.found = elements.length;
        // If this is the first iteration and no results were found, find upstream entities
        if ($scope.found === 0 && !$scope.once) {
            var g = new $.Graph(); 
            $scope.createResource($scope.searchTermURIs[$.trim($scope.query)],g);
            $scope.services.process(g,function(graph){
                $scope.services.upstream(g,$scope.appendToGraph,$scope.graph,$scope.handleError);
            },$scope.graph,$scope.handleError);
            $scope.once = true;
        }
        $scope.cy.add(elements);
        if (!$scope.showLabel) { $scope.cy.elements().addClass("hideLabel"); }
        $scope.$apply(function(){ 
            $scope.cy.layout($scope.layout);
            $scope.loading = false;
        });
        $("#button-box").addClass('hidden');
        $scope.loaded = result.resources.length;
    };

    $scope.currStep = 0;
    $scope.prevEle = [];

    $scope.traces = {};

    $scope.diseaseToGraph = function(result) {
        // Source, target, edge
        var elements = $scope.getElements(result);

        // Populated with [source, target, edge] of disease edge interactions as well as the chain needed to find that disease
        var diseaseEle = [];
        // Populated with [source, target, edge] of non-disease edge interactions
        var notDiseaseEle = [];

        var probOfConnection = function(source) {
            var prev = $scope.currStep - 1;
            if (prev < 0) { return 1; }
            // Looking at all targets
            for (j = 1; j < $scope.prevEle[prev].length; j++) {
                if (source === $scope.prevEle[prev][j].data.id) {
                    return $scope.prevEle[prev][j].data.prob;
                }
            }
        };

        // Split elements in graph to disease or non-disease. Assumes all diseases are targets.
        for (i = 1; i < elements.length; i+=3) {
            var prob = probOfConnection(elements[i-1].data.id) * elements[i+1].data.probability;
            console.log(prob);
            if (prob >= $scope.probThreshold) {
                elements[i].data.prob = prob;
                var trace = [elements[i-1]];
                if ($scope.traces[elements[i-1].data.uri] != null) {
                    trace = $scope.traces[elements[i-1].data.uri].slice();
                } 
                trace.push(elements[i+1]);
                trace.push(elements[i]);
                $scope.traces[elements[i].data.uri] = trace;
                if (elements[i].data.types['http://semanticscience.org/resource/SIO_010056']) {
                    diseaseEle.push(elements[i]);
                }
                else {
                    notDiseaseEle.push(elements[i-1]);
                    notDiseaseEle.push(elements[i]);
                    notDiseaseEle.push(elements[i+1]);
                }
            }
        }
        // Saves the non-disease for linking further searches
        $scope.prevEle[$scope.currStep] = notDiseaseEle;

        var resultElements = [];
        // For all diseases found, create chain to original selected node source
        diseaseEle.forEach( function(element) {
            console.log("adding trace",$scope.traces[element.data.uri]);
            resultElements = resultElements.concat($scope.traces[element.data.uri]);
        });

        $scope.$apply(function(){ $scope.cy.add(resultElements); });

        // If the search is not the last...
        if($scope.currStep < $scope.numSearch) {
            var targets = [];
            for (i = 1; i < notDiseaseEle.length; i+=3) {
                targets[notDiseaseEle[i].data.uri] = true;
            }
            $scope.currStep += 1;
            // Need to do second downstream on all other nodes and then look for diseases. 
            var g = new $.Graph();
            Object.keys(targets).forEach(function(d) {
                $scope.createResource(d,g);
            });
            $scope.services.downstream(g, $scope.diseaseToGraph, $scope.graph, $scope.handleError);
        }
        else {
            if (!$scope.showLabel) { $scope.cy.elements().addClass("hideLabel"); }
            $scope.$apply(function(){
                $scope.cy.layout($scope.layout);
                $scope.loading = false;
            });
            $("#button-box").addClass('hidden');
            $scope.loaded = result.resources.length;
            return;
        }

    }

    $scope.getTwoStep = function(query) {
        $("#warning").removeClass("hidden");
        $("#warning").dialog({
            resizable: false,
            width: 310,
            height: 210,
            modal: true,
            buttons: {
                "Continue": function() {
                    $( this ).dialog( "close" );
                    $scope.numSearch = parseInt($('#numSearch').val(), 10);
                    $scope.probThreshold = parseFloat($('#numProb').val());
                    $scope.traces = {};
                    $scope.cy.$('node:selected').nodes().each(function(i,d) {$scope.selectedEle = d.data('id');});
                    $scope.currStep = 0;
                    $scope.prevEle = new Array($scope.numSearch + 1);
                    $scope.$apply(function(){ $scope.loading = true; });
                    var g = new $.Graph();
                    query.forEach(function(d) { $scope.createResource(d,g); });
                    $scope.services.downstream(g, $scope.diseaseToGraph, $scope.graph, $scope.handleError);
                },
                Cancel: function() { $( this ).dialog( "close" ); }
            }
        });
    }

    // Prevents negative numbers
    $("#numSearch").keypress(function(event) {
      if ( event.which == 45 || event.which == 189 ) {
          event.preventDefault();
       }
    });

    // Functionality for starting-page help
    $('.help').mouseover(function(){ $('.help-info').show(); });
    $('.help').mouseleave(function(){ $('.help-info').hide(); });

    // Hover functionality for selected node buttons
    $('#details').mouseover(function() { $('#details-hover').show(); });
    $('#details').mouseleave(function() { $('#details-hover').hide(); });
    $('#bfs').mouseover(function() { $('#bfs-hover').show(); });
    $('#bfs').mouseleave(function() { $('#bfs-hover').hide(); });
    $('#upstream').mouseover(function() { $('#upstream-hover').show(); });
    $('#upstream').mouseleave(function() { $('#upstream-hover').hide(); });
    $('#downstream').mouseover(function() { $('#downstream-hover').show(); });
    $('#downstream').mouseleave(function() { $('#downstream-hover').hide(); });
    $('#twoStep').mouseover(function() { $('#twoStep-hover').show(); });
    $('#twoStep').mouseleave(function() { $('#twoStep-hover').hide(); });


    // Toggle visibility function for top left button
    $("#min-search").click(function() {
        $("#max-search").toggle();
        if($('#min-search').html() === '<i class="fa fa-chevron-circle-left"></i>') {
            $('#min-search').html('<i class="fa fa-chevron-circle-right"></i>');
             $('#search-box').css("width", "35px");
             $('#search-box').css("height", "50px");        
        }
        else {
            $('#min-search').html('<i class="fa fa-chevron-circle-left"></i>');
            $('#search-box').css("width", "355px");
            $('#search-box').css("height", "");
        }
    });

    // Starts new Cytoscape visualization instead of adding to existing
    $(".search-btn").click(function() {
        $scope.createGraph();
        $scope.addToGraph($scope.searchTerms);
    });

    // Options functionality
    $("#zoom-fit").click(function() { $scope.cy.fit(50); });
    $("#zoom-in").click(function() {
        var midx = $(window).width() / 2;
        var midy = $(window).height() / 2;
        $scope.cy.zoom({
            level: $scope.cy.zoom() + 0.25,
            renderedPosition: { x: midx, y: midy }
        });
    });
    $("#zoom-out").click(function() {
        if ($scope.cy.zoom() >= 0.25) {
            var midx = $(window).width() / 2;
            var midy = $(window).height() / 2;
            $scope.cy.zoom({
                level: $scope.cy.zoom() - 0.25,
                renderedPosition: { x: midx, y: midy }
            });
        }
    });

    $("#show-lbl").click(function() {
        $scope.showLabel = true;
        $scope.cy.elements().removeClass('hideLabel');
    });
    $("#hide-lbl").click(function() {
        $scope.showLabel = false;
        $scope.cy.elements().addClass('hideLabel');
    });

    $("#bg-dark").click(function() {
        $('body').css("background", 'url("../img/congruent_outline.png")');
    });
    $("#bg-light").click(function() {
        $('body').css("background", 'white');
    });

    // First BFS function
    $('#first-bfs').click(function() {
        var found = false;
        $scope.cy.nodes().each(function(i, ele){
            if (!i) {
                cy.elements().removeClass("highlighted");
                var root = "#" + ele.id();
                var bfs = cy.elements().bfs(root, function(){}, true);
                if (bfs.path.length > 1) {
                    var i = 0;
                    var highlightNextEle = function(){
                      bfs.path[i].addClass('highlighted');
                      bfs.path[i].removeClass('faded');
                      
                      if( i < bfs.path.length - 1){
                        i++;
                        setTimeout(highlightNextEle, 100);
                      }
                    };
                    highlightNextEle();
                    found = true;
                }
            }
        });
    });
})
