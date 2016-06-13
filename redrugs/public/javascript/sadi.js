(function ( $ ) {
    $.SadiService = function(endpoint) {
        function fn(graph, callback, outputGraph, error) {
            if (!outputGraph) {
                outputGraph = new $.Graph();
            }
            var data = JSON.stringify(graph.toJSON());
            console.log(data);
            $.ajax({
                url: endpoint,
                type: 'POST',
                data: data,
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                success: function(d) {
                    outputGraph.add(d);
                    callback(outputGraph);
                },
                error: error
            });
        }
        fn.description = function(callback) {
            var g = new $.Graph();
            g.load(endpoint, callback);
        }
        return fn;
    }
    $.Namespace = function(prefix) {
        function fn(localpart) {
            return prefix + localpart;
        }
        return fn;
    }
    $.Graph = function() {
        //this.endpoint = endpoint;
        this.resources = [];
        this.rdf = $.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
        this.rdfs = $.Namespace("http://www.w3.org/2000/01/rdf-schema#");
        this.owl = $.Namespace("http://www.w3.org/2002/07/owl#");
        this.xsd = $.Namespace("http://www.w3.org/2001/XMLSchema#");
    }
    $.Resource = function(uri,graph) {
        this.uri = uri;
        this.graph = graph;
        graph[uri] = this;
	      graph.resources.push(uri);
    };
    $.BNode = function(id,graph) {
        this.uri = id;
        this.graph = graph;
        graph[id] = this;
	      graph.resources.push(id);
    };
    $.Graph.prototype.getResource = function(uri, type) {
        //console.log(uri, type);
        var graph = this;
        if (!uri) {
            type = "bnode";
            uri = "_:node"+graph.length;
        }
        if (!type) {
            if (uri.indexOf("_:") == 0) type = "bnode";
            else type = "uri";
        }
        var result = this[uri];
        if (result == null) {
            if (type == "uri") result = new $.Resource(uri, this);
            else result = new $.BNode(uri,this);
        }
        return result;
    };
    $.Graph.prototype.byClass = function(c) {
        var graph = this;
        return d3.keys(graph).filter(function(k) {
            if (k == "getResource"|| k=="byClass") return false;
            var d = graph[k];
            if (d[graph.rdf("type")] == null) return false;
            return d[graph.rdf('type')].some(function(element) {
                return element.uri == c;
            });
        }).map(function(k) {
            return graph[k];
        });
    };
    $.Graph.prototype.getDatatype = function(o) {
        if (o instanceof Date ) return this.xsd("dateTime");
        if (parseInt(o) == o) return this.xsd("integer");
        if (o instanceof Number ) return this.xsd("decimal");
    }
    $.Graph.prototype.toJSON = function() {
        var that = this;
        result = {};
        $.each(this.resources, function(i,uri) {
            resource = that.getResource(uri);
            //console.log(resource);
            subject = {};
            $.each(resource,function(predicate,objects) {
                if (predicate == 'uri' || predicate == 'graph') return;
                objs = [];
                $.each(objects,function(j,value) {
                    obj = {
                        value: String(value),
                    };
                    objs.push(obj);
                    subject[predicate] = objs;
                    result[resource.uri] = subject;
                    if (value instanceof $.Resource) {
                        obj.type = "uri";
                        obj.value = value.uri;
                    } else if (value instanceof $.BNode) {
                        obj.type = "bnode";
                        obj.value = value.uri;
                    } else {
                        obj.type = "literal";
                        obj.datatype = that.getDatatype(value);
                    }
                })
            });
        });
        return result;
    }
    
    $.Graph.prototype.load = function(url, callback) {
        $.ajax({dataType: "json",
                url:url,
                success: function(d) {
                    this.add(d);
                    callback(this);
                }
               });
    }
    $.Graph.prototype.add = function(data) {
        var result = {}
        var graph = this;
        $.each(data, function(uri, s) {
            //console.log("Loading",uri);
            var subject = graph.getResource(uri);
            result[uri] = subject;
            $.each(s, function(predicate, objects) {
	        if (!subject[predicate]) {
		    subject[predicate] = [];
	        }
                objects.forEach(function(obj) {
                    if (obj.type == "literal") {
		        if (obj.datatype == "http://www.w3.org/2001/XMLSchema#dateTime")
			    subject[predicate].push(new Date(obj.value));
		        else if (obj.datatype == "http://www.w3.org/2001/XMLSchema#decimal")
			    subject[predicate].push(parseFloat(obj.value));
		        else if (obj.datatype == "http://www.w3.org/2001/XMLSchema#integer")
			    subject[predicate].push(parseInt(obj.value));
		        else
			    subject[predicate].push(obj.value);
                    } else {
                        subject[predicate].push(graph.getResource(obj.value, obj.type));
                    }
                })
            })
        });
        return result;
    };
    
    $.Graph.prototype.sparqlConstruct = function(query,endpoint, callback) {
        var encodedQuery = encodeURIComponent(query);
        var url = endpoint+"?query="+encodedQuery+"&output=json";
        console.log(query);
        this.load(url, callback);
    }
    
    $.Graph.prototype.sparqlSelect = function(query, endpoint, callback) {
        var encodedQuery = encodeURIComponent(query);
        var url = endpoint+"?query="+encodedQuery+"&output=json";
        console.log(query)
        $.getJSON(d3.json(url, callback));
    }
}( jQuery ));
