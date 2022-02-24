
# Lab 5

## Screen Recording
https://youtu.be/gfuVZK2tmo0

https://www.youtube.com/watch?v=jLZzZCAAkl4 (explanation of testing)

## Links to Rulesets
[init_channel.krl](https://raw.githubusercontent.com/garrettguycharles/cs462/master/lab5/init_channel.krl)
[manage_sensors.krl](https://raw.githubusercontent.com/garrettguycharles/cs462/master/lab5/manage_sensors.krl)
(See previous labs for:)
* sensor_profile.krl
* temperature_store.krl
* twilio.krl
* wovyn_base.krl
* wovyn_emitter.krl

## Diagram of picos:
![Pico diagram](https://github.com/garrettguycharles/cs462/blob/master/lab5/screenshot.png?raw=true)


## Questions

**How did your rule that creates the sensor pico install rules in the new child pico?**
* It did so by sending a Wrangler event requesting that a ruleset be installed into the child pico.

**How did you ensure that your sensor picos were created before sending them the event telling them their profile was updated?**
* I sent the ```sensor/profile_updated``` event when I received the ```wrangler/child_initialized``` event.

**How did you create a test harness for your pico system?**
* I made the __testing object in the globals block.  I also wrote functions that could be used to test my picos.

**In this set up, the picos representing sensors don't need to talk to each other and the sensor management pico is the parent, so it has channels to each child. How could you provide channels between sensor picos if sensor-to-sensor interaction were necessary?**
* I would make sure that the parent keeps track of its children's ids, and then send events to each child with information of the sibling it needs to communicate with.
