ruleset temperature_store {

    meta {
        use module io.picolabs.wrangler alias wrangler

        provides temperatures, threshold_violations, inrange_temperatures, rid, current_temp
        shares temperatures, threshold_violations, inrange_temperatures, rid, current_temp
    }

    global {
        __testing = {
            "queries": 
            [
              { "name": "__testing" },
              { "name": "temperatures" },
              { "name": "rid" },
              { "name": "current_temp" },
              { "name": "threshold_violations" },
              { "name": "inrange_temperatures" }
            ],
            "events": 
            [
              { 
                "domain": "sensor", 
                "name": "reading_reset",
                "attrs": [] 
              },
              {
                "domain": "manager",
                "name": "request_temperature_report",
                "attrs": ["reportId", "replyTo"]
              }
            ]
        }


        temperatures = function() {
            ent:temp_log
        }

        current_temp = function() {
            ent:current_temp
        }

        rid = function() {
            meta:rid
        }

        threshold_violations = function() {
            ent:temp_violation_log
        }

        inrange_temperatures = function() {
            ent:temp_log.filter(function(v, k) {
                ent:temp_violation_log.keys().none(function(t) {
                    k == t
                });
            });
        }
    }

    rule init {
        select when wrangler ruleset_installed where event:attrs{"rids"} >< ctx:rid

        always {
            ent:temp_log := {}
            ent:temp_violation_log := {}
            ent:current_temp := 0
        }
    }

    rule collect_temperatures {
        select when wovyn new_temperature_reading

        pre {
            timestamp = event:attrs{"timestamp"}
            temperature = event:attrs{"generic_thing"}{"data"}{"temperature"}[0]{"temperatureF"}
        }

        always {
            ent:temp_log{timestamp} := temperature
            ent:current_temp := temperature
        }
    }

    rule collect_threshold_violations {
        select when wovyn threshold_violation

        pre {
            temperature = event:attrs{"temperature"}
            timestamp = event:attrs{"timestamp"}
        }

        always {
            ent:temp_violation_log{timestamp} := temperature
        }
    }

    rule clear_temperatures {
        select when sensor reading_reset

        always {
            ent:temp_log := {}
            ent:temp_violation_log := {}
        }
    }

    rule temperatureReportRequested {
        select when manager request_temperature_report

        pre {
            reportId = event:attrs{"reportId"}
            replyTo = event:attrs{"replyTo"}
        }

        event:send({
            "eci": replyTo,
            "domain": "manager",
            "name": "collect_temperature_report", 
            "attrs": {
                "reportId": reportId,
                "sensorId": wrangler:myself(){"id"},
                "mostRecentTemperature": current_temp()
            }
        })
    }
}