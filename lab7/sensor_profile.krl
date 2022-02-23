ruleset sensor_profile {
    meta {
        name "sensor_profile"
        use module io.picolabs.wrangler alias wrangler
        use module io.picolabs.subscription alias subscription

        shares get_profile, managerTx
        provides get_profile, managerTx
    }

    global {
        get_profile = function() {
            {
                "name": ent:name,
                "location": ent:location,
                "temperature_threshold": ent:temperature_threshold,
                "notification_recipient": ent:notification_recipient
            }
        }

        managerTx = function() {
            ent:managerTx
        }
    }

    rule init {
        select when wrangler ruleset_installed where event:attrs{"rids"} >< ctx:rid


        always {
          ent:name := ""
          ent:location := ""
          ent:temperature_threshold := null
          ent:notification_recipient := ""
          ent:managerTx := ""
        }
    }

    rule update_profile {
        select when sensor profile_updated

        pre {
            name = event:attrs{"name"}
            location = event:attrs{"location"}
            temperature_threshold = event:attrs{"temperature_threshold"}.decode()
            notification_recipient = event:attrs{"notification_recipient"}
        }

        always {
            ent:name := name
            ent:location := location
            ent:temperature_threshold := temperature_threshold
            ent:notification_recipient := notification_recipient

            raise wovyn event "config" attributes
            {
                "notification_recipient_number": ent:notification_recipient,
                "temperature_threshold": ent:temperature_threshold
            }
        }
    }

    rule autoAcceptSubscriptions {
        select when wrangler inbound_pending_subscription_added

        always {
            raise wrangler event "pending_subscription_approval"
                attributes event:attrs
        }
    }

    rule recordSubscriptionInfo {
        select when wrangler subscription_added

        pre {
            Tx = event:attrs{"Tx"}
        }

        always {
            ent:managerTx := Tx
        }
    }

    rule threshold_notification {
        select when wovyn threshold_violation
        pre {
            temperature = event:attrs{"temperature"}.klog("Temp violation.  Sending message.  Temp:")
            timestamp = event:attrs{"timestamp"}
        }

        
        if temperature && timestamp then
            // twilio:send_sms(
            //     ent:notification_recipient, 
            //     ent:notification_sender_number, 
            //     <<#{timestamp} [Temperature violation]: #{temperature} (too high)>>.klog("MESSAGE")
            // ) setting(response)
            event:send({
                "eci": ent:managerTx.klog("MANAGERTX"),
                "domain": "sensor",
                "name": "threshold_violation",
                "attrs": event:attrs
            })
    }
}