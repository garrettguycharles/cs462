ruleset manage_sensors {
    meta {
        use module io.picolabs.wrangler alias wrangler

        shares get_sensors, get_all_temperatures
    }

    global {
        generate_pico_name = function() {
            <<Sensor #{ent:next_sensor_number}>>
        }

        get_sensors = function() {
            ent:sensors
        }

        get_all_temperatures = function() {
            get_sensors().values().map(function(eci) {
                wrangler:picoQuery(eci, "temperature_store", "temperatures")
            })
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
                }
            ]
        }
    }

    rule init {
        select when wrangler ruleset_installed where event:attrs{"rids"} >< ctx:rid

        always {
            ent:sensors := {}
            ent:next_sensor_number := 1
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

            default_threshold = meta:rulesetConfig{"temperature_threshold"}
            twilio_auth = meta:rulesetConfig{"auth_token"}
            twilio_SID = meta:rulesetConfig{"SID"}
            twilio_MsSID = meta:rulesetConfig{"MessagingServiceSid"}
            twilio_sender_number = meta:rulesetConfig{"notification_sender_number"}
            twilio_recipient_number = meta:rulesetConfig{"notification_recipient_number"}
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
            raise sensor event "install_sensor_config_child"
                attributes event:attrs
        }
    }

    rule configure_sensor_profile_child {
        select when sensor install_sensor_config_child

        pre {
            eci = event:attrs{"eci"}
            default_threshold = meta:rulesetConfig{"temperature_threshold"}
            twilio_recipient_number = meta:rulesetConfig{"notification_recipient_number"}
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
            raise sensor event "install_wovyn_emitter_child"
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
            raise sensor event "init_channel"
                attributes event:attrs
        }
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
            ent:sensors{name} := eci
        }
    }

    rule clear_sensors {
        select when sensor clear_sensors

        always {
            ent:sensors := {}
        }
    }

    rule remove_sensor {
        select when sensor unneeded_sensor

        pre {
            name = event:attrs{"name"}
            eci = get_sensors(){name}
        }

        always {
            clear ent:sensors{name}
            raise wrangler event "child_deletion_request"
                attributes {
                    "eci": eci
                }
        }
    }
}