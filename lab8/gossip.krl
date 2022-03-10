ruleset gossip {
    meta {
        name "gossip"
        use module io.picolabs.wrangler alias wrangler
        use module io.picolabs.subscription alias subscription

        shares get_id, isProcessingMessages, get_peers, get_message_number, get_seen_record, get_seen_messages, getNumberFromMessageId, getOriginFromMessageId, getSeenMessageToSend, getPeerForSeenMessage, getNewMessagesToSendToPeer, get_node_id, get_scheduled_events
        provides get_id, isProcessingMessages, get_peers, get_message_number, get_seen_record, get_seen_messages, getNumberFromMessageId, getOriginFromMessageId, getSeenMessageToSend, getPeerForSeenMessage, getNewMessagesToSendToPeer, get_node_id, get_scheduled_events
    }

    global {

        get_scheduled_events = function() {
            schedule:list()
        }

        get_id = function() {
            wrangler:myself(){"id"}
        }

        get_node_id = function() {
            ent:node_id
        }

        get_message_number = function() {
            ent:message_number
        }

        get_seen_record = function() {
            ent:seen_record
        }

        get_seen_messages = function() {
            ent:seen_messages
        }

        get_peers = function() {
            subscription:established().filter(function(sub) {
                sub{"Rx_role"} == "node" && sub{"Tx_role"} == "node"
            })
        }

        isProcessingMessages = function () {
            ent:processing_messages
        }

        getNumberFromMessageId = function(id) {
            id.split(":").get(1)
        }

        getOriginFromMessageId = function(id) {
            id.split(":").get(0)
        }

        shouldIncrementSeenFromOrigin = function(origin) {
            ent:seen_messages{origin}.keys() >< ((ent:seen_messages{origin}{"highest_seen"} + 1).sprintf("%d")).klog("HIGHEST SEEN +1:")
        }

        getSeenMessageToSend = function() {
            {}.put("origin", ent:node_id)
                .put("seen", get_seen_messages().map(function(v, k) {
                        v{"highest_seen"}.defaultsTo(-1)
                    })
                )
        }

        shouldSendSeenMessage = function() {
            random:integer(1) == 1
        }

        getPeerForSeenMessage = function() {
            get_peers(){random:integer(get_peers().length() - 1)}
        }

        getNewMessagesToSendToPeer = function(peer_id) {
            get_seen_messages().map(function (v, k) {
                v.filter(function (vv, kk) {
                    kk != "highest_seen" &&
                    get_seen_record(){peer_id}.defaultsTo({}){k}.defaultsTo(-1).klog("Highest seen:") < kk.decode().klog("kk.decode() == ")
                })
            })
        }
    }

    rule init {
        select when wrangler ruleset_installed where event:attrs{"rids"} >< ctx:rid


        always {
            raise node event "reset"
        }  
    }

    rule reset {
        select when node reset

        always {
            ent:node_id := random:uuid()
            ent:message_number := 0
            ent:seen_record := {}
            ent:seen_messages := {}
            ent:processing_messages := true
            ent:message_timer := time:now()
            // raise node event "send_message_to_peer" // begin communications
        }
    }

    // rule autoAcceptSubscriptions {
    //     select when wrangler inbound_pending_subscription_added

    //     always {
    //         raise wrangler event "pending_subscription_approval"
    //             attributes event:attrs
    //     }
    // }

    rule subscribeToPeerNode {
        select when node subscribe_to_peer

        pre {
            node_wellknown = event:attrs{"wellknown"}
        }

        always {
            raise wrangler event "subscription"
                attributes {
                    "wellKnown_Tx": node_wellknown,
                    "Rx_role": "node",
                    "Tx_role": "node",
                    "name": "Node Peer",
                    "channel_type":"subscription"
                }
        }
    }

    // rule recordSubscriptionInfo {
    //     select when wrangler subscription_added

    //     pre {
    //         Tx = event:attrs{"Tx"}
    //     }

    //     always {
    //         ent:managerTx := Tx
    //     }
    // }

    rule turnOffProcessing {
        select when process off

        always {
            ent:processing_messages := false
        }
    }

    rule turnOnProcessing {
        select when process on

        always {
            ent:processing_messages := true
        }
    }

    rule clearScheduledEvents {
        select when sched cls
        foreach get_scheduled_events() setting (e)

        pre {
            id = e{"id"}.defaultsTo("")
        }

        every {
            schedule:remove(id)
        }

        always {
            schedule node event "send_message_to_peer" repeat "*/5  *  * * * *" on final
        }
    }

    rule sendRumorMessage {
        select when gossip send_rumor_message

        pre {
            peer = getPeerForSeenMessage()
            message_id = <<#{ent:node_id}:#{ent:message_number}>>
            send_to = peer{"Tx"}
            temperature = event:attrs{"temperature"}
            timestamp = event:attrs{"timestamp"}  
        }

        event:send({
            "eci": send_to,
            "domain": "gossip",
            "name": "rumor",
            "attrs": {
                "message_id": message_id,
                "temperature": temperature,
                "timestamp": timestamp
            }
        })

        always {
            ent:message_number := ent:message_number + 1
        }
    }

    rule reactToGossipRumorMessage {
        select when gossip rumor

        pre {
            message_id = event:attrs{"message_id"}
            message_origin = getOriginFromMessageId(message_id)
            message_number = getNumberFromMessageId(message_id)
            temperature = event:attrs{"temperature"}
            timestamp = event:attrs{"timestamp"}
        }

        always {
            ent:seen_messages{message_origin} := ent:seen_messages{message_origin}.defaultsTo({"highest_seen":-1}).put(message_number, {
                "message_id": message_id,
                "message_origin": message_origin,
                "temperature": temperature,
                "timestamp": timestamp
            }) if ent:processing_messages

            // ent:seen_messages{message_origin} := ent:seen_messages{message_origin}.put("highest_seen", message_number.decode()) if message_number.decode() == ent:seen_messages{message_origin}{"highest_seen"} + 1
            raise node event "increment_highest_seen" attributes {
                "message_origin": message_origin
            } if ent:processing_messages
        }
    }

    rule incrementHighestSeen {
        select when node increment_highest_seen
        
        pre {
            message_origin = event:attrs{"message_origin"}
            should_increment = shouldIncrementSeenFromOrigin(message_origin)
        }

        always {
            ent:seen_messages{message_origin} := ent:seen_messages{message_origin}.put("highest_seen", ent:seen_messages{message_origin}{"highest_seen"} + 1) if should_increment
            raise node event "increment_highest_seen" attributes event:attrs if should_increment
        }
    }

    rule sendSeenMessage {
        select when gossip send_seen_message

        pre {
            seen_message = getSeenMessageToSend()
            peer_to_send_to = getPeerForSeenMessage()
            send_to = peer_to_send_to{"Tx"}
        }

        if send_to != null && ent:processing_messages then
        event:send({
            "eci": send_to,
            "domain": "gossip",
            "name": "seen",
            "attrs": seen_message.put("reply_channel", peer_to_send_to{"Rx"})
        })
    
    }

    rule reactToEmptyGossipSeenMessage {
        select when gossip seen

        pre {
            peer = event:attrs{"origin"}
            is_empty = event:attrs{"seen"}.keys().length() == 0
        }

        always {
            ent:seen_record{peer} := ent:seen_record{peer}.defaultsTo({}) if is_empty && ent:processing_messages
            raise gossip event "send_seen_reply" attributes event:attrs if is_empty && ent:processing_messages
        }
    }

    rule reactToGossipSeenMessage {
        select when gossip seen
        foreach event:attrs{"seen"}.keys() setting (key) 

        pre {
            peer = event:attrs{"origin"}
            origin = key
            seen_map = event:attrs{"seen"}
            highest_seen = seen_map{key}
            // should_increment = get_seen_record(){peer}.defaultsTo({}){origin}.defaultsTo(-1) < highest_seen
        }


        always {
            ent:seen_record{peer} := ent:seen_record{peer}.defaultsTo({}).put(origin, highest_seen) if ent:processing_messages
            raise gossip event "send_seen_reply" attributes event:attrs on final
        }
    }

    rule sendGossipSeenResponse {
        select when gossip send_seen_reply

        pre {
            peer = event:attrs{"origin"}
        }

        if ent:processing_messages then
        event:send({
            "eci": event:attrs{"reply_channel"},
            "domain": "gossip",
            "name": "seen_reply",
            "attrs": {
                "messages": getNewMessagesToSendToPeer(peer)
            }
        })
    }

    rule recieveGossipSeenResponse {
        select when gossip seen_reply
        foreach event:attrs{"messages"}.values() setting (origin)
            foreach origin.values() setting (msg)

                always {
                    raise gossip event "rumor" attributes {
                        "message_id": msg{"message_id"},
                        "temperature": msg{"temperature"},
                        "timestamp": msg{"timestamp"}
                    } if ent:processing_messages
                }
    }

    rule sendMessageToPeer {
        select when node send_message_to_peer

        always {
            raise gossip event "send_seen_message" if ent:processing_messages
            // raise sched event "cls"
        }
    }

    // rule threshold_notification {
    //     select when wovyn threshold_violation
    //     pre {
    //         temperature = event:attrs{"temperature"}.klog("Temp violation.  Sending message.  Temp:")
    //         timestamp = event:attrs{"timestamp"}
    //     }

        
    //     if temperature && timestamp then
    //         // twilio:send_sms(
    //         //     ent:notification_recipient, 
    //         //     ent:notification_sender_number, 
    //         //     <<#{timestamp} [Temperature violation]: #{temperature} (too high)>>.klog("MESSAGE")
    //         // ) setting(response)
    //         event:send({
    //             "eci": ent:managerTx.klog("MANAGERTX"),
    //             "domain": "sensor",
    //             "name": "threshold_violation",
    //             "attrs": event:attrs
    //         })
    // }
}