ruleset wovyn_base {
    meta {
        use module twilio
            with
                SID = meta:rulesetConfig{"SID"}
                MessagingServiceSid = meta:rulesetConfig{"MessagingServiceSid"}
                auth_token = meta:rulesetConfig{"auth_token"}

        shares get_config
    }

    global {
        get_config = function() {
            {
                "sender_number": ent:notification_sender_number,
                "recipient_number": ent:notification_recipient,
                "temperature_threshold": ent:temperature_threshold
            }
        }
    }

    rule init {
        select when wrangler ruleset_installed where event:attrs{"rids"} >< ctx:rid

        always {
            ent:notification_sender_number := meta:rulesetConfig{"notification_sender_number"}
            ent:notification_recipient := meta:rulesetConfig{"notification_recipient_number"}
            ent:temperature_threshold := meta:rulesetConfig{"temperature_threshold"}
        }
    }

    rule process_heartbeat {
        select when wovyn heartbeat

        pre {
            generic_thing = event:attrs{"genericThing"}
            timestamp = time:now().klog("Heartbeat:")
        }

        always {
            raise wovyn event "new_temperature_reading"

            attributes {
                "generic_thing": generic_thing,
                "timestamp": timestamp
            }

            if generic_thing
        }
    }



    rule find_high_temps {
        select when wovyn new_temperature_reading

        pre {
            temperature = event:attrs{"generic_thing"}{"data"}{"temperature"}[0]{"temperatureF"}.klog("Got temp:")
            timestamp = event:attrs{"timestamp"}
        }

        always {
            raise wovyn event "threshold_violation".klog(<<threshold violation at temp: #{temperature} with threshold: #{ent:temperature_threshold}>>)
            attributes {
                "temperature": temperature,
                "timestamp": timestamp
            }

            if temperature > ent:temperature_threshold
        }
    }

    rule threshold_notification {
        select when wovyn threshold_violation
        pre {
            temperature = event:attrs{"temperature"}.klog("Temp violation.  Sending message.  Temp:")
            timestamp = event:attrs{"timestamp"}
        }

        if temperature && timestamp then
            twilio:send_sms(
                ent:notification_recipient, 
                ent:notification_sender_number, 
                <<#{timestamp} [Temperature violation]: #{temperature} (too high)>>.klog("MESSAGE")
            ) setting(response)
    }
}