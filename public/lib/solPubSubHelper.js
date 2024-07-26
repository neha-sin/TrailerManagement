////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Solace Systems Messaging SDK for JavaScript
// Copyright 2010-2012 Solace Systems Inc. All rights reserved.
// http://www.SolaceSystems.com
//
//                              * SolPubSubHelper *
//
// This sample demonstrates:
//  - Subscribing to a topic for direct messages.
//  - Receiving messages with callbacks
//
// This is the helper JavaScripts code, where we show the basics of creating a session, connecting a session, subscribing to a topic,
// and publishing direct messages to a topic.
// This script is invoked by wrapper methods from GUI based applications, and correspondingly calls them back upon receiving messages
// from its event callbacks 
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    var OPERATION_TIMEOUT = 30000;
    var ns = this;
    var connectedFlag = false;
    //alert("loaded");  
  
    /**
    * Change this variable to point it to the host:port of your web server. 
    * E.g. if you are serving your application on apache running on 192.168.0.12 on port 8080 
    * the below url should be
    * http://192.168.0.12:8080/smf/ignore
    */
    /*
    var my_web_server_url = "http://69.20.234.126:4081/smf"; //e.g. change this to F5 ip
    var my_client_username = "demouser1";
    var my_vpn = "demos";
    var my_password = "password"; 
   	*/
   	
   	/*
    var my_web_server_url = "ws://mr-cfitsqc51.messaging.datago.io:20227"; //e.g. change this to F5 ip
    var my_client_username = "datago-client-username";
    var my_vpn = "msgvpn-276vyjtzx";
    var my_password = "20khfv63vqrljevhr82mer07ja";
    */
    /*
    var my_web_server_url = "http://sgdemo1.solace.com"; //e.g. change this to F5 ip
    var my_client_username = "geoclient";
    var my_vpn = "geo-routing-demo";
    var my_password = "password";
    */    
            
 	/**
 	* Global variables which control the session (tcp connection)
 	*/           
    var mySessionProperties = null;
    var publishIntervalId = null;
    var statsIntervalId = null;
    var elapsedTimeInSecs = 0;
    var connectedOnce = false;
    var autoReconnect = true;
    var previousTick = 0;
    var mySession = null;

    /** Forward declarations of session callback and message callback methods
    * sessionEvenCb - a callback method defined later in this file, 
    * 		which is called by Solace in case a session event such as connect, disconnect, reconnect etc occurs
    *
    * messageEventCb - - a callback method defined later in this file,
    *		which is called by Solace to push messages into, whenever a new message matches the added subscriptions on the session
    */
    var sessionEventCb; // forward declaration
    var messageEventCb; // forward declaration


    // An array of subscriptions that cannot be sent temporarily due to network congestion
    // They will be resent upon receiving CAN_ACCEPT_DATA event.
    // The array will be cleared when session is disconnected.
    this.subscriptionsInWaiting = [];

 	
 	/**
     * Creates a session object, to be used for connection later
     * Connectivity parameters such as IP, Port, VPN, Username, Password etc 
     * are used to initialize the session object 
     *
     * Most importantly, as explained above, this method creates the session by associating it with 2 callback methods
     * message event callback method, for Solace to push the messages into 
     * session event callback method, for Solace to push session event messages into
     */
    this.connectSession = function(my_web_server_url, my_vpn, my_client_username, my_password) {
        if (connectedFlag) return;  // don't try to connect a 2nd time
  	//alert("connect");
        try {
        	//initialize session properties
        	mySessionProperties = new solace.SessionProperties();
        	mySessionProperties.userName = my_client_username;
            mySessionProperties.vpnName = my_vpn;
           
            mySessionProperties.password = my_password;
            mySessionProperties.url = my_web_server_url; 
            //alert (my_web_server_url+" "+my_client_username+"@"+my_vpn);
            mySessionProperties.connectTimeoutInMsecs = OPERATION_TIMEOUT;
            mySessionProperties.readTimeoutInMsecs = OPERATION_TIMEOUT;
            mySessionProperties.keepAliveIntervalsLimit = 10;
            
            mySessionProperties.reapplySubscriptions = autoReconnect;
            // The scheme setting is set to BASIC in order for samples to work with Jetty proxy server.
            // Jetty does not support STREAMING scheme due to its lack of support for chunked transfer encoding.
            // Applications should default the scheme setting to STREAMING for higher efficiency with proper
            // proxy support.
            //mySessionProperties.scheme = solace.Scheme.BASIC;
            
            //create the session object
            //solace.MessageRxCBInfo - maps the message callback method, messageEventCb in this case
            //solace.SessionEventCBInfo - maps the session event callback method, sessionEventCb in this case
            //both these methods were forward-declared, and are define further in this file
            mySession = solace.SolclientFactory.createSession(mySessionProperties,
                    new solace.MessageRxCBInfo(function(session, message) {
                            ns.messageEventCb(session, message);
                    }, this),
                    new solace.SessionEventCBInfo(function(session, event) {
                        ns.sessionEventCb(session, event);
                    }, this));
            
            //connect the session
            autoReconnect = false;
            
            //this is where the actual connection initiation begines. 
            //The connection may not have been established by the time this method returns.
            //Once the connection is established, an event - sessionEventCode=UP_NOTICE is sent to the session callback method
            //So subscriptions etc should only be added after the sessionEventCode=UP_NOTICE event has been received
            mySession.connect();
            ns.logUtil("Initiating Connection"); 
 		
 		} catch (error) {
           	ns.logUtil("Failed to connect session");
            ns.logUtil(error.toString());
            alert(error.toString());
        }
    };


    /**
     * Invoked when disconnect button is clicked. Disconnects the session, and then disposes it
     */
    this.disconnectSessionAndCleanup = function() {
        logUtil("About to disconnect session...");
        try {
            mySession.disconnect();
            mySession.dispose();
            mySession = null;
            autoReconnect = false;           
        } catch (error) {
            ns.logUtil("Failed to disconnect session");
            ns.logUtil(error.toString());
        }
    };


    /**
     * Invoked when add subscription button is clicked
     * This method injects the passed topic subscriptions into Solace, and ties them to the connected session.
     * Any new message arriving on a topic, which matches any of the injected subscription, in full or via wildcards
     * will be delivered to the message callback method registered with the session
     */
    this.addSubscription = function(topic_string) {
	
        //alert("About to add subscription '" + topic_string + "'");
        if (mySession !== null) {
            try {
                var topic = solace.SolclientFactory.createTopic(topic_string);
                try {
                    mySession.subscribe(topic, true, topic_string, OPERATION_TIMEOUT);
                } catch (e) {
                     if (e instanceof solace.OperationError && e.subcode === solace.ErrorSubcode.INSUFFICIENT_SPACE) {
                        ns.logUtil("Add subscription blocked");
                        ns.subscriptionsInWaiting.push(
                            {
                                subscription: topic,
                                add: true
                            });
                        return;
                    }
                    throw e;
                }

            } catch (error) {
                alert("Failed to add subscription '" + topic_string + "'");
                alert(error.toString());
            }
        }
    };

    /**
     * Invoked to remove subscriptions which have been added to a session
     */
    this.removeSubscription = function(topic_string) {
        ns.logUtil("About to remove subscription '" + topic_string + "'");
        if (mySession !== null) {
            try {
                var topic = solace.SolclientFactory.createTopic(topic_string);
                try {
                    mySession.unsubscribe(topic, true, topic_string, OPERATION_TIMEOUT);
                } catch (e) {
                    if (e instanceof solace.OperationError && e.subcode === solace.ErrorSubcode.INSUFFICIENT_SPACE) {
                        ns.logUtil("Remove subscription blocked");
                        ns.subscriptionsInWaiting.push(
                            {
                                subscription: topic,
                                add: false
                            });
                        return;
                    }
                    throw e;
                }

            } catch (error) {
                ns.logUtil("Failed to add subscription '" + topic_string);
                ns.logUtil(error.toString());
            }
        }
    };


    /**
     * Direct message receive callback. Solace pushes messages to this method as and when they are published
     * if they match the added subscriptions. This method should call handler methods to process the message data
     * In this example, this method calls the helloWorldMessageCallback() method and passes it the topic and message payload
     * The helloWorldMessageCallback() which is defined in the index.html file itself, and it modifies the GUI to display the text received in the messages
     * @param session - the session on which the messages are received
     * @param message - the actual message with payload and topic
     */
    this.messageEventCb = function (session, message) {
        
        var payload ="error";
    
            if (message.getType() == solace.MessageType.TEXT) {
                    payload = message.getSdtContainer().getValue();
            } else {
                    payload = message.getBinaryAttachment(); // binary attachment, all text
            }
        
        
        
    	//extract the payload and topic from the message
    	//var payload = message.getBinaryAttachment();
    	var topic_string = message.getDestination().getName();
		//alert(topic_string);
    	//alert(payload);  

    	this.paintUpdateData(topic_string, payload);
    
    };
    
  
  
    this.paintUpdateData = function (topic_string, payload) {

    	try { 
        	//alert("topic_string="+topic_string);
            
	    //var pretty = JSON.stringify(JSON.parse(payload),null,2);//.replace(/\n/g, "<br />");
            //var toPrintStatus = "Topic:<br><i>" +topic_string + "</i><br><br><b><pre>" + pretty +"</pre></b>";
            
            //$('#divStatus').html(toPrintStatus);
            
            if (topic_string.startsWith("geo")) {
                var pretty = JSON.stringify(JSON.parse(payload),null,2);//.replace(/\n/g, "<br />");
                var toPrintStatus = "Topic:<br><i>" +topic_string + "</i><br><br><b><pre>" + pretty +"</pre></b>";
                $('#divStatus').html(toPrintStatus);
                    //{"status":"OK","speed":19}
                    //alert(payload);
                    objJSON = $.parseJSON(payload);
                    //alert("speed="+objJSON.speed);
                    
                    data.setValue(0, 1, objJSON.speed);
                    chart.draw(data, options);
                    //alert(objJSON.status);
                    if (objJSON.status == "OK") {
                        trafficLight = "<img src='./images/green_traffic.png'>";
                        $('#busstop').html(trafficLight)
                    }
                    else {
                        trafficLight = "<img src='./images/red_traffic.png'>";
                        $('#busstop').html(trafficLight)
                    }
            }
            else {
                var toPrintStatus = "Topic:<br><i>" +topic_string + "</i><br><br><b><pre>" + payload +"</pre></b>";
                $('#divNotifications').html(toPrintStatus);
            }
            


            //alert(newDiv);
            /*
        	//objJSON = $.parseJSON(payload);
        	var tr_id = objJSON.flightNumber;
        	//alert(objJSON.flightNumber);

					trTick ="<tr id='"+tr_id+"'>";
					trTick += "<td>"+ objJSON.flightNumber + "</td>";
					trTick += "<td>"+ objJSON.departureDate + "</td>";
					trTick += "<td>"+ objJSON.alertMessage + "</td>";
					trTick +="</tr>";       
					
				
					if ($("#"+tr_id).length) {
						//update
						$("#"+tr_id).replaceWith(trTick);
					}
					else {
						//add
						$("#tab_flights").append(trTick);
					}
					
                    */
				   
					
			
		} catch (error) {
			alert("JSON PARSE ERROR="+error);
			console.log(error);
		}
    
    };  

    this.paintOnOffLight = function(colorClass) {
    	divOnOff="<div id='onoff' class='"+colorClass+"'></div>";
    	$("#onoff").replaceWith(divOnOff);
    }
    
    this.subscribeNotifications = function() {
        
        //add subscription
        var busNo = $("#txtBusNo").val();
        //var routeNo = $("#txtRouteNo").val();
       
        //var topic;
	//topic = "comms/"+routeNo+"/"+busNo+"/>"; 
        
        //alert("Adding Subscription: " + topic);
        //addSubscription(topic);
        
        topic = "vehicle_trak/comms/vehicle/"+busNo;
        addSubscription(topic);
        topic = "vehicle_trak/ctrl/vehicle/"+busNo+"/>";
        addSubscription(topic);
        
        //topic = "comms/route/"+routeNo;
        //addSubscription(topic);
        
        topic = "vehicle_trak/gps/v2/*/" + busNo.padStart(5,'0') + "/>";
        addSubscription(topic);
        
        //topic = "comms/route/"+routeNo+"/>";
        //addSubscription(topic);
        
        addSubscription("vehicle_trak/comms/broadcast");
    }
    
    this.sendClickMessage = function(topic, appmsg) {
    
        try {

            var msg = solace.SolclientFactory.createMessage();
           msg.setDestination(solace.SolclientFactory.createTopic(topic));
            
            // Set delivery mode
            msg.setDeliveryMode(solace.MessageDeliveryModeType.DIRECT);
            // Set binary attachment
            msg.setBinaryAttachment(appmsg);
            //alert("calling reply msg");
            //send the request message and wait for reply
            mySession.send(msg);
            /*
            mySession.sendRequest(msg, REQUEST_TIMEOUT, function(session, message) {
                replyReceivedNewApp(session, message);
            }, function(session, event) {
                replyFailedCb(session, event);
            }, null);
            */
        } catch (error) {
            alert("error="+error.toString());
            logUtil("Failed to send request");
            logUtil(error.toString());
        }    
    
    }

    
    
    /**
     * Session event callback method. This method is called by Solace to publish session lifecycle events
     * such as Connection UP, disconnect, added subscription etc
     * Any of these events can be handled from this method, e.g. reconnecting in case of a disconnect
     * @param session
     * @param event
     */
    this.sessionEventCb = function (session, event) {
        ns.logUtil(event.toString());
        if (event.sessionEventCode === solace.SessionEventCode.UP_NOTICE) {
            connectedFlag = true;
            ns.logUtil("Connected to Solace");
            //addSubscription("t/ac/flight/notification/>");
            //addSubscription("t/ac/flight/notification/AC300/04-OCT");
            this.paintOnOffLight("onoffGreen");
            this.subscribeNotifications();

        } else if (event.sessionEventCode === solace.SessionEventCode.CAN_ACCEPT_DATA) {
            while (ns.subscriptionsInWaiting.length > 0) {
                var sub = ns.subscriptionsInWaiting[0].subscription;
                var add = ns.subscriptionsInWaiting[0].add;
                ns.logUtil("Resend subscription '" + sub.m_name + "'");
                try {
                    if (add) {
                        mySession.subscribe(sub, true, sub.m_name, OPERATION_TIMEOUT);
                    }
                    else {
                        mySession.unsubscribe(sub, true, sub.m_name, OPERATION_TIMEOUT);
                    }
                    ns.subscriptionsInWaiting.shift();
                } catch (e) {
                    if (e instanceof solace.OperationError && e.subcode === solace.ErrorSubcode.INSUFFICIENT_SPACE) {
                        ns.logUtil("Resend subscription blocked");
                        return;
                    }
                    throw e;
                }
            }

        } else if (event.sessionEventCode === solace.SessionEventCode.DISCONNECTED) {
            ns.logUtil("Disconnected from Solace");
            this.paintOnOffLight("onoffRed");
            ns.subscriptionsInWaiting = [];
            // error occurred!
            if (autoReconnect) {
                setTimeout(
                   function(){
                       ns.connectSession();
                   }, 100);
            }
        } else if (event.sessionEventCode === solace.SessionEventCode.SUBSCRIPTION_OK) {
            ns.logUtil("Subscription added/removed: '" + event.correlationKey + "'");
        } else if (event.sessionEventCode === solace.SessionEventCode.SUBSCRIPTION_ERROR) {
            ns.logUtil("Failed to add subscription:  '" + event.correlationKey + "'");
        } else if (event.sessionEventCode === solace.SessionEventCode.LOGIN_FAILURE) {
            ns.logUtil("Login Failure!");
            this.paintOnOffLight("onoffRed");
        } else if (event.sessionEventCode === solace.SessionEventCode.CONNECTING) {
            ns.logUtil("Connecting...");
            this.paintOnOffLight("onoffAmber");
        } else {
            ns.logUtil("Error!");
            this.paintOnOffLight("onoffRed");
        }
    };




