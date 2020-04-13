module.exports = function (RED) {
    function SoapCall(n) {
        var soap = require('soap');
        RED.nodes.createNode(this, n);
        this.topic = n.topic;
        this.name = n.name;
        this.wsdl = n.wsdl;
        this.server = RED.nodes.getNode(this.wsdl);
        this.method = n.method;
        this.payload = n.payload;
        var node = this;
        this.status({});
        
        node.on('input', function (msg, send, done) {
            try {
                var server = (msg.server)?{wsdl:msg.server, auth:0}:node.server;
                var lastFiveChar = server.wsdl.substr(server.wsdl.length-5);
                if(server.wsdl.indexOf("://")>0 && lastFiveChar !== '?wsdl'){
                    server.wsdl += '?wsdl';
                }
                soap.createClient(server.wsdl, msg.options||{}, function (err, client) {
                    if (err) {
                        node.status({fill: "red", shape: "dot", text: "WSDL Config Error: " + err});
                        done("WSDL Config Error: " + err);
                        return;
                    }
                    switch (node.server.auth) {
                        case '1':
                            client.setSecurity(new soap.BasicAuthSecurity(server.user, server.pass));
                            break;
                        case '2':
                            client.setSecurity(new soap.ClientSSLSecurity(server.key, server.cert, {}));
                            break;
                        case '3':
                            client.setSecurity(new soap.WSSecurity(server.user, server.pass));
                            break;
                        case '4':
                            client.setSecurity(new soap.BearerSecurity(server.token));
                            break;
                    }
                    node.status({fill: "yellow", shape: "dot", text: "SOAP Request..."});
                    if(msg.headers){
                        client.addSoapHeader(msg.headers);
                    }

                    if(client.hasOwnProperty(node.method)){
                        client[node.method](msg.payload, function (err, result) {
                            if (err) {
                                node.status({fill: "red", shape: "dot", text: "Service Call Error: " + err});
                                done("Service Call Error: " + err);
                                return;
                            }
                            node.status({fill:"green", shape:"dot", text:"SOAP result received"});
                            msg.payload = result;
                            send(msg);
                            done();
                        });
                    } else {
                        node.status({fill:"red", shape:"dot", text:"Method does not exist"});
                        done("Method does not exist!");
                    };
                });
            } catch (err) {
                node.status({fill: "red", shape: "dot", text: err.message});
                done(err.message);
            }
        });

    }
    RED.nodes.registerType("soap request", SoapCall);
};
