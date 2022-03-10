ruleset test {
  rule addNewTemperature {
    select when temperature added
    // PRE: unpack event
    pre {
        sensorId = event:attrs{"sensorId"}
        temperature = event:attrs{"temperature"}
        temp_record = {"sensorId": sensorId, "temperature": temperature}
    }

    // actions
    send_directive(((temperature > 50.0) => ("received temperature (warning) of " + temperature + " from sensor ") 
      | "received temp " + temperature + " from sensor ") + sensorId + ".")

    // postlude
    always {
        ent:temp_records := ent:temp_records.defaultsTo([]).append(temp_record);
        ent:temp_warnings := ent:temp_warnings.defaultsTo([]).append(temp_record) if temperature > 50.0;
    }
  }
}
