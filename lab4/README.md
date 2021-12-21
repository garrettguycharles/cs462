
# Lab 4

## Screen Recording
https://youtu.be/uZ0M8QeCNuo

## Links to Rulesets
[sensor_profile.krl](https://raw.githubusercontent.com/garrettguycharles/cs462/master/lab4/back-end/sensor_profile.krl)


## Questions
**What design decisions did you make in your rulesets that made this assignment easier or harder? Why?**
* The hardest part about this project was setting up my Vue frontend.  The back-end wasn't very complicated at all, I just had to add the `sensor_profile.krl` ruleset and add a rule on my `wovyn_base.krl` that would allow for the `update_profile` rule in the `sensor_profile` ruleset to update the settings that the `wovyn_base` is using for its behaviors.  So all around it worked out well.

**Explain how the sensor_profile ruleset isolates state and processes regarding the sensor profile from other rulesets.**
* The sensor profile/config has separate variables in the `sensor_profile` ruleset and in the `wovyn_base` ruleset.  If I wanted to, I could completely disconnect the `sensor_profile` from the `wovyn_base` by not raising an event to update the `wovyn_base` config.  So in that way, it has isolated its state.

**How do other rulesets use the sensor_profile to get data?**
* To get the profile, rulesets can call the `get_profile()` function that is made publicly available by the `sensor_profile` ruleset.

**Could they use it to store new values? How?**
* To edit the profile, rulesets can call the `update_profile` rule with a `sensor/profile_updated` event.