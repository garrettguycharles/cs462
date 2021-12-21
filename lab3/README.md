
# Lab 3

## Screen Recording
https://youtu.be/tQQRY5Unyhc

## Links to Rulesets
# TODO
[temperature_store.krl](https://raw.githubusercontent.com/garrettguycharles/cs462/master/lab3/temperature_store.krl)


## Questions

**Explain how the rule collect_temperatures and the temperatures function work as an event-query API.**
* These two sections of the program form an "event-query API" because one part handles model-changing events, and the other part handles simple queries to get the data without changing it.
    * `collect_temperatures` is an example of the "event" side of event-query.  Its job is to handle new temperature events and change the "persistent storage" of the entity variables.
    * the `temperatures` function is an example of the "query" side of event-query.  Its job is to fetch existing temperatures from the "persistent storage".

**Explain your strategy for finding temperatures that are in range.**
*

**What happens if provides doesn't list the name of the temperatures function?**
*

**What happens if shares doesn't list it?**
*