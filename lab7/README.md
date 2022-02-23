
# Lab 7

## Screen Recording
https://youtu.be/ZWqV-sXqNYw

## Links to Rulesets
***I am only including new and edited rulesets.  See the code above for others used in this lab.)***
* [manage_sensors.krl](https://raw.githubusercontent.com/garrettguycharles/cs462/master/lab7/manage_sensors.krl)
* [sensor_profile.krl](https://raw.githubusercontent.com/garrettguycharles/cs462/master/lab6/sensor_profile.krl)
* [temperature_store.krl](https://raw.githubusercontent.com/garrettguycharles/cs462/master/lab7/temperature_store.krl)

## Questions

**Can a sensor be in more than one collection based on the code you wrote? Why or why not? What are the implications of a sensor being in more than one collection?**
* Yes, a sensor can belong to multiple collections, because the manager sends a "reply-to" for the sensors to send their report.  So multiple managers can manage a single sensor and the sensor will know where to send its reports when requested.  In this setup, the only implications are that multiple managers can view temperatures from a single temperature sensor.

**How could you ensure that only certain picos can raise an event that causes a temperature report to be generated?**
* I could easily have each sensor record the id of the manager it is allowed to respond to, so that any other manager which requests a report is ignored.

**How do the debug logs show that your scatter-gather system worked?**
* They show that the manager sent out requests for reports and then each sensor responded asynchronously, instead of the manager just calling the `currentTemperature` function on each sensor in turn.

**How can you know a report is done and all the sensors that are going to respond have reported?**
* When the number of sensors which have reported matches the number of total sensors from which a report was requested.

**Given your answer above, how would you recover if the number of responding sensors is less than the total number of sensors?**
* If I were writing code to be ready for this case, I would have each report contain the id of the responding sensor pico, so that I would know which picos have responded and which haven't, so that I could then try to request a report again from all those who have yet to respond.
