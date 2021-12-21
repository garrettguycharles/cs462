ruleset temperature_store {

    meta {
        provides temperatures, threshold_violations, inrange_temperatures
        shares temperatures, threshold_violations, inrange_temperatures
    }

    global {
        __testing = {
            "queries": 
            [
              { "name": "__testing" },
              { "name": "temperatures" },
              { "name": "threshold_violations" },
              { "name": "inrange_temperatures" }
            ],
            "events": 
            [
              { 
                "domain": "sensor", 
                "name": "reading_reset",
                "attrs": [] 
              }
            ]
        }


        temperatures = function() {
            ent:temp_log
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
}