ruleset gossip_manager {
    meta {
        name "gossip_manager"
        use module io.picolabs.wrangler alias wrangler
        use module io.picolabs.subscription alias subscription

        shares get_node_channels, get_delay
        provides get_node_channels, get_delay
    }

    global {

        get_delay = function() {
            ent:repeat_delay
        }

        get_scheduled_events = function() {
            schedule:list()
        }

        get_node_channels = function() {
            subscription:established().filter(function(sub) {
                sub{"Rx_role"} == "manager" && sub{"Tx_role"} == "sensor"
            }).map(function(sub) {
                sub{"Tx"}
            });
        }
    }

    rule init {
        select when wrangler ruleset_installed where event:attrs{"rids"} >< ctx:rid


        always {
            ent:repeat_delay := 5
        }  
    }

    rule setDelay {
        select when gossip set_delay
        foreach get_scheduled_events() setting (e)

        pre {
            id = e{"id"}.defaultsTo("")
        }

        every {
            schedule:remove(id)
        }

        always {
            ent:repeat_delay := event:attrs{"delay"} on final
            schedule node event "force_send_message" repeat <<*/#{ent:repeat_delay}  *  * * * *>> on final
        }
    }

    rule startGossip {
        select when gossip start

        always {
            schedule node event "force_send_message" repeat "*/5  *  * * * *"
        }
    }

    rule forceGossip {
        select when node force_send_message
        foreach get_node_channels() setting (channel)

        event:send({
            "eci": channel,
            "domain": "node",
            "name": "send_message_to_peer",
            "attrs": {}
        })
    }
}