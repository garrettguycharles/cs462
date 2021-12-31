
# Lab 6

## Screen Recording
***TODO***

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
![Pico diagram](https://github.com/garrettguycharles/cs462/blob/master/lab6/screenshot.png?raw=true)


## Questions

**Why might an auto-approval rule for subscriptions be considered insecure?**
* An auto-approval rule for subscriptions is insecure because it means that any subscription will be accepted, including from malicious picos.

**Can you put a sensor pico in more than one sensor management pico (i.e. can it have subscriptions to more than one sensor management pico)?**
* Yes, you can.  With how I have implemented the sensors, each sensor will only remember the `managerTx` from the most recent manager to subscribe to it, but every manager will be able to access any subscription it has made to any sensor.

**Imagine I have sensor types besides temperature sensors (e.g. pressure, humidity, air quality, etc.). How would you properly manage collections of sensors that include heterogeneous sensor types?**
* This would be accomplished simply enough by changing the Tx_role associated with each sensor (Tx_role from the viewpoint of the manager, Rx_role from the viewpoint of the sensor).  Then, the subscriptions could be queried according to their role in order to determine the sensor type.

**Describe how you'd use the techniques from this lesson to create collections of temperature sensors in particular rooms or areas of a building. For example, I would still have the sensor management pico, but might have collections for each floor in a building.**
* One idea that comes to mind is I could have multiple sensor manager picos.  Each sensor manager pico would monitor an area.  For example: one for each floor or one for each room.  In this case, I might also write another pico to be in charge of communicating with the sensor manager picos.
* Another idea would be to change the role tags to denote which group of temperature sensors a sensor is a part of.

**Can a sensor pico belong to more than one collection? After the modifications of this lab, if a sensor belonged to more than one collection and had a threshold violation, what would happen?**
* Using the multiple managers technique to manage collections, a sensor can definitely belong to multiple collections.  My implementation does not include this functionality, but in order to have the sensors communicate with all of their managers, you would have to maintain a list of managers inside each sensor pico.  Then, when a notification is raised to the managers, the notification can be sent in a loop so that each manager receives it.
* One extra thing I thought of would be to have the sensor keep track of its "main" manager and keep a list of secondary managers that have subscribed, so that it would be simpler to send a threshold notification to only one manager if that is the desired functionality.

**When you moved threshold violation notifications from the sensor to the management ruleset, did you add the rules to an existing ruleset or create a new one? Why?**
* I added rules to my existing `manage_sensors` ruleset, because I didn't see any reason to create a new ruleset to add functionality to the sensor manager.  Also, the Twilio configuration information was already available to the `manage_sensors` ruleset, so it was simplest to put the `twilio:send_sms()` call in that ruleset.

**When you moved threshold violation notifications from the sensor to the management ruleset, did you add only one rule or more than one rule to achieve this end? Which rules did you add and why (i.e. justify the architectural decisions did you made)?**
* I pretty much just copied the `threshold_notification` rule from `wovyn_base.krl` and pasted it into my `manage_sensors.krl`.  I did this to simplify the changes I had to make in order to get the system to work properly and still communicate with Twilio.
