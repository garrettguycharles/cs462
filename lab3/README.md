
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
* As can be seen in the screen recording, I take the `ent:temp_log`, and then apply a filter which discludes any temperatures which are found in the `ent:temp_violation_log`.  The resulting map of timestamps and temperatures are those which were in range.  Depending on the underlying implementation of a KRL map, this operation seems to run in O(n^2) time, which seems rather slow. But for now it works.

**What happens if provides doesn't list the name of the temperatures function?**
* In this case, the `temperatures()` function would be unavailable for use in other modules.

**What happens if shares doesn't list it?**
* In this case, the `temperatures()` function would not be callable by the Sky Cloud API, and it would not be usable in the Testing tab.
    * Use in the testing tab yields this error: 
    ```
{
  "error": "Error: Ruleset temperature_store does not have query function \"temperatures\""
}
    ```