ruleset manage_sensors {
    meta {
        use module io.picolabs.wrangler alias wrangler
        use module io.picolabs.subscription alias subscription
        use module manager_config alias config
        use module twilio
            with
                SID = config:getConfig(){"SID"}
                MessagingServiceSid = config:getConfig(){"MessagingServiceSid"}
                auth_token = config:getConfig(){"auth_token"}

        shares get_sensors, get_all_temperatures, get_subscriptions, get_temperature_sensors, getAllTemperatureReports, getLatestTemperatureReports
    }

    global {
        generate_pico_name = function() {
            <<Sensor #{ent:next_sensor_number}>>
        }

        get_sensors = function() {
            ent:sensors
        }

        get_subscriptions = function() {
            subscription:established()
        }

        get_all_temperatures = function() {
            get_subscriptions().values()
                .filter(function(sub) { sub{"Tx_role"} == "sensor" })
                .map(function(sub) {
                wrangler:picoQuery(sub{"Tx"}, "temperature_store", "temperatures")
            })
        }

        get_temperature_sensors = function() {
            get_subscriptions().values()
                .filter(function(sub) { sub{"Tx_role"} == "sensor" })
        }

        getAllTemperatureReports = function() {
            ent:temperatureReports
        }

        getLatestTemperatureReports = function() {
            reportKeys = ent:temperatureReports.keys()

            reportsArray = reportKeys.map(function(key) {ent:temperatureReports{key}.put("id", key)})
                .sort(function(a, b) {a{"id"} < b{"id"} => -1 | 1})

            reportsArray.length() < 5 => reportsArray | reportsArray.slice(4)
        }

        __testing = {
            "queries": [
                {
                    "name": "__testing"
                },

                {
                    "name": "get_sensors"
                },

                {
                    "name": "get_all_temperatures"
                }, 

                {
                    "name": "get_subscriptions"
                },

                {
                    "name": "getAllTemperatureReports"
                },

                {
                    "name": "getLatestTemperatureReports"
                }
            ],
            "events": [
                {
                    "domain": "sensor",
                    "name": "clear_sensors",
                    "attrs": []
                },
                {
                    "domain": "sensor",
                    "name": "new_sensor",
                    "attrs": []
                },
                {
                    "domain": "sensor",
                    "name": "unneeded_sensor",
                    "attrs": [
                        "name"
                    ]
                },
                {
                    "domain": "sensor",
                    "name": "identify_sensor",
                    "attrs": ["name", "eci"]
                },
                {
                    "domain": "manager",
                    "name": "new_temperature_report",
                    "attrs": []
                },
                {
                    "domain": "manager",
                    "name": "request_temperature_report",
                    "attrs": ["reportId", "num_sensors"]
                },
                {
                    "domain": "manager",
                    "name": "collect_temperature_report",
                    "attrs": ["reportId", "mostRecentTemperature", "sensorId"]
                },
                {
                    "domain": "manager",
                    "name": "clear_temperature_reports",
                    "attrs": []
                }
            ]
        }
    }

    rule init {
        select when wrangler ruleset_installed where event:attrs{"rids"} >< ctx:rid

        always {
            ent:sensors := {}
            ent:subscriptions := {}
            ent:next_sensor_number := 1
            ent:next_report_id := 1
            ent:temperatureReports := {}
        }
    }

    rule new_sensor {
        select when sensor new_sensor

        pre {
            new_pico_name = generate_pico_name()
        }

        always {
            ent:next_sensor_number := ent:next_sensor_number + 1
            raise wrangler event "new_child_request"
                attributes {
                    "name": new_pico_name
                }
        }
    }

    rule on_new_child_created {
        select when wrangler new_child_created

        pre {
            eci = event:attrs{"eci"}
            name = event:attrs{"name"}
        }

        fired {
            raise sensor event "temperature_store_child"
                attributes event:attrs
        }
    }

    rule install_temperature_store_child {
        select when sensor temperature_store_child

        pre {
            eci = event:attrs{"eci"}
            name = event:attrs{"name"}
        }

        event:send(
            {
                "eci": eci,
                "eid": "install-ruleset",
                "domain": "wrangler",
                "type": "install_ruleset_request",
                "attrs": {
                    "absoluteURL": meta:rulesetURI,
                    "rid": "temperature_store",
                    "config": {}
                }
            }
        )

        always {
            raise sensor event "install_twilio_child"
                attributes event:attrs
        }
    }

    rule install_twilio_child {
        select when sensor install_twilio_child

        pre {
            eci = event:attrs{"eci"}
            name = event:attrs{"name"}
        }

        event:send(
            {
                "eci": eci,
                "eid": "install-ruleset",
                "domain": "wrangler",
                "type": "install_ruleset_request",
                "attrs": {
                    "absoluteURL": meta:rulesetURI,
                    "rid": "twilio",
                    "config":  {"SID":"","MessagingServiceSid":"","auth_token":""}
                }
            }
        )

        always {
            raise sensor event "install_wovyn_base_child"
                attributes event:attrs
        }
    }

    rule install_wovyn_base_child {
        select when sensor install_wovyn_base_child

        pre {
            eci = event:attrs{"eci"}
            name = event:attrs{"name"}

            default_threshold = config:getConfig(){"temperature_threshold"}
            twilio_auth = config:getConfig(){"auth_token"}
            twilio_SID = config:getConfig(){"SID"}
            twilio_MsSID = config:getConfig(){"MessagingServiceSid"}
            twilio_sender_number = config:getConfig(){"notification_sender_number"}
            twilio_recipient_number = config:getConfig(){"notification_recipient_number"}
        }

        event:send(
            {
                "eci": eci,
                "eid": "install-ruleset",
                "domain": "wrangler",
                "type": "install_ruleset_request",
                "attrs": {
                    "absoluteURL": meta:rulesetURI,
                    "rid": "wovyn_base",
                    "config":  {
                        "auth_token":twilio_auth,
                        "SID":twilio_SID,
                        "MessagingServiceSid":twilio_MsSID,
                        "notification_sender_number":twilio_sender_number,
                        "notification_recipient_number":twilio_recipient_number,
                        "temperature_threshold":default_threshold
                    }
                }
            }
        )

        always {
            raise sensor event "install_sensor_profile_child"
                attributes event:attrs
        }
    }

    rule install_sensor_profile_child {
        select when sensor install_sensor_profile_child

        pre {
            eci = event:attrs{"eci"}
            name = event:attrs{"name"}
        }
    
        event:send(
            {
                "eci": eci,
                "eid": "install-ruleset",
                "domain": "wrangler", "type": "install_ruleset_request",
                "attrs": {
                "absoluteURL": meta:rulesetURI,
                "rid": "sensor_profile",
                "config": {}
                }
            }
        )
    
        always {
            raise sensor event "install_wovyn_emitter_child"
                attributes event:attrs
        }
    }

    rule configure_sensor_profile_child {
        select when wrangler child_initialized

        pre {
            eci = event:attrs{"eci"}
            default_threshold = config:getConfig(){"temperature_threshold"}
            twilio_recipient_number = config:getConfig(){"notification_recipient_number"}
        }

        event:send(
            {
                "eci": eci,
                "eid": "install-ruleset",
                "domain": "sensor", "type": "profile_updated",
                "attrs": {
                    "name": "emulator defaultName",
                    "location": "virtual",
                    "temperature_threshold": default_threshold,
                    "notification_recipient": twilio_recipient_number
                }
            }
        )

        always {
            raise sensor event "init_channel"
                attributes event:attrs
        }
    }

    rule install_wovyn_emitter_child {
        select when sensor install_wovyn_emitter_child

        pre {
            eci = event:attrs{"eci"}
            name = event:attrs{"name"}
        }
    
        event:send(
            {
                "eci": eci,
                "eid": "install-ruleset",
                "domain": "wrangler", "type": "install_ruleset_request",
                "attrs": {
                "absoluteURL": meta:rulesetURI,
                "rid": "wovyn_emitter",
                "config": {}
                }
            }
        )

        always {
            raise sensor event "install_gossip"
                attributes event:attrs
        }
    }

    rule install_gossip_child {
        select when sensor install_gossip

        pre {
            eci = event:attrs{"eci"}
            name = event:attrs{"name"}
        }

        event:send(
            {
                "eci": eci,
                "eid": "install-ruleset",
                "domain": "wrangler", "type": "install_ruleset_request",
                "attrs": {
                "absoluteURL": meta:rulesetURI,
                "rid": "gossip",
                "config": {}
                }
            }
        )
    }

    rule install_allow_channel_child {
        select when sensor init_channel

        pre {
            eci = event:attrs{"eci"}
            name = event:attrs{"name"}
        }

        event:send(
            {
                "eci": eci,
                "eid": "install-ruleset",
                "domain": "wrangler",
                "type": "install_ruleset_request",
                "attrs": {
                    "absoluteURL": meta:rulesetURI,
                    "rid": "init_channel",
                    "config": {}
                }
            }
        )

        always {
            raise sensor event "register_new_sensor"
                attributes event:attrs
        }
    }

    rule register_new_sensor {
        select when sensor register_new_sensor

        pre {
            name = event:attrs{"name"}
            eci = event:attrs{"eci"}
        }

        always {
            raise sensor event "identify_sensor"
                attributes {
                    "name": name,
                    "eci": eci
                }
        }
    }

    rule clear_sensors {
        select when sensor clear_sensors

        always {
            ent:sensors := {}
            ent:subscriptions := {}
        }
    }

    rule remove_sensor {
        select when sensor unneeded_sensor

        pre {
            name = event:attrs{"name"}
            eci = get_sensors(){name}{"eci"}
        }

        always {
            clear ent:sensors{name}
            raise wrangler event "child_deletion_request"
                attributes {
                    "eci": eci
                }
        }
    }

    rule identify_sensor {
        select when sensor identify_sensor

        pre {
            name = event:attrs{"name"}
            child_eci = event:attrs{"eci"}
            child_wellKnown = wrangler:picoQuery(event:attrs{"eci"}, "io.picolabs.subscription", "wellKnown_Rx"){"id"}
        }

        always {
            ent:sensors{name} := {
                "eci":child_eci,
                "wellKnown_eci": child_wellKnown
            }

            raise manager event "send_subscription_to_child"
                attributes {
                    "name": name,
                    "wellKnown_eci": child_wellKnown
                }
        }
    }

    rule send_subscription_to_child {
        select when manager send_subscription_to_child

        pre {
            name = event:attrs{"name"}
            wellKnown = event:attrs{"wellKnown_eci"}
        }

        always {
            raise wrangler event "subscription"
                attributes {
                    "wellKnown_Tx": wellKnown,
                    "Rx_role": "manager",
                    "Tx_role": "sensor",
                    "name": name,
                    "channel_type":"subscription"
                }
        }
    }

    rule recordSensorSubscriptionInfo {
        select when wrangler subscription_added

        pre {
            id = event:attrs{"Id"}
            Tx = event:attrs{"Tx"}
            Tx_role = event:attrs{"Tx_role"}
        }

        always {
            ent:subscriptions{id} := Tx

            if Tx_role == "sensor"
        }
    }

    rule threshold_notification {
        select when sensor threshold_violation
        pre {
            temperature = event:attrs{"temperature"}.klog("Temp violation.  Sending message.  Temp:")
            timestamp = event:attrs{"timestamp"}
            notification_recipient = config:getConfig(){"notification_recipient_number"}
            notification_sender_number = config:getConfig(){"notification_sender_number"}
        }

        if temperature && timestamp then
            twilio:send_sms(
                notification_recipient, 
                notification_sender_number, 
                <<#{timestamp} [Temperature violation]: #{temperature} (too high)>>.klog("MESSAGE")
            ) setting(response)
    }

    rule setup_temperature_report {

        // {
        //     "domain": "manager",
        //     "name": "new_temperature_report",
        //     "attrs": []
        // }

        select when manager new_temperature_report

        pre {
            reportId = ent:next_report_id
            num_sensors = get_temperature_sensors().length()
            reportExists = ent:temperatureReports.keys().any(function(key) {key == reportId})
        }

        always {
            ent:next_report_id := ent:next_report_id + 1

            ent:temperatureReports{reportId} := {
                "num_temperature_sensors": num_sensors,
                "responding": 0,
                "temperatures": {}
            } if not reportExists

            raise manager event "request_temperature_report"
                attributes {
                    "reportId": reportId,
                    "num_sensors": num_sensors
                }
        }
    }

    rule request_temperature_report {

        // {
        //     "domain": "manager",
        //     "name": "request_temperature_report",
        //     "attrs": ["reportId", "num_sensors"]
        // }

        select when manager request_temperature_report

        foreach get_temperature_sensors() setting (sensor)
            pre {
                sensorTx = sensor{"Tx"}
                myRx = sensor{"Rx"}
                reportId = event:attrs{"reportId"}
                num_sensors = event:attrs{"num_sensors"}
            }

            every {
                event:send({
                    "eci": sensorTx,
                    "domain": "manager",
                    "name": "request_temperature_report", 
                    "attrs": {
                        "reportId": reportId,
                        "replyTo": myRx
                    }
                })
            }
    }

    rule collect_temperature_report {

        // {
        //     "domain": "manager",
        //     "name": "collect_temperature_report",
        //     "attrs": ["reportId", "mostRecentTemperature", "sensorId"]
        // }

        select when manager collect_temperature_report

        pre {
            reportId = event:attrs{"reportId"}
            mostRecentTemp = event:attrs{"mostRecentTemperature"}
            sensorId = event:attrs{"sensorId"}
            
        }

        always {
            ent:temperatureReports{reportId} := {
                "num_temperature_sensors": ent:temperatureReports{reportId}.get("num_temperature_sensors"),
                "responding": ent:temperatureReports{reportId}{"responding"} + 1,
                "temperatures": ent:temperatureReports{reportId}{"temperatures"}.put(sensorId, {
                    "temperature": mostRecentTemp
                })
            }
        }
    }

    rule clearTemperatureReports {

        // {
        //     "domain": "manager",
        //     "name": "clear_temperature_reports",
        //     "attrs": []
        // }

        select when manager clear_temperature_reports

        always {
            ent:temperatureReports := {}
        }
    }
}