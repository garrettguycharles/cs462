# Lab 2

**Screen Recording**
https://youtu.be/InDkLT-37tU

**What parsing method did you choose?**
* I don't think I had to do any parsing for this lab.  If you're talking about parsing the event from the Wovyn emitter, that is automatically parsed for me and accessible from event:attrs.

**Did you accomplish step 5 with an event expression or a rule conditional statement? What are the advantages and disadvantages of the method you used compared with the other?**
* I used a rule conditional.  That is the last little `if` at the end of the `process_heartbeat`, and I like putting the condition there to keep it separate from the declaration of when to call the rule.

**What was the output of the testing your ruleset before the find_high_temps rule was added? How many directives were returned? How many rules do you think ran?**
* Well, it basically did nothing before I added the `find_high_temps` rule.  The only output was from the klog statements I used.  No directives were returned, as `send_directive` was never called.  I think only the `process_heartbeat` rule ran.

**What was the output of the test after the find_high_temps rule was added? How many directives were returned? How many rules do you think ran?**
* After that rule was added, the test pinged my cell phone with a text message.  No directives were returned, because `send_directive` was not called.  Inside the wovyn_base, 3 rules ran: `process_heartbeat`, `find_high_temps`, and `threshold_notification`.

**How do you account for the difference? Diagram the event flow within the pico (i.e. show the event flow from when the pico receives the first event to the directives being created) using a swimlane diagram (Links to an external site.).**
* What difference?  The difference in behavior?  I would say that it behaves differently because we programmed it to behave differently.  ![Sequence diagram](https://static.swimlanes.io/333954f71ca4c3e5f6fb052ceeb05ba7.png)


**Would you say that your find_high_temps rule is an event intermediary? If so, what kind? Justify your answer.**
* This rule is an event intermediary because it doesn't actually carry out any actions on its own, but it can fire another event if some condition is true.  It is a middle-man gateway of sorts.

**How do your logs show that the find_high_temps rule works? Pick out specific lines and explain them.**
* in `wovyn_base.krl`, on line 63, I have this line of code: 
```
raise wovyn event "threshold_violation".klog(<<threshold violation at temp: #{temperature} with threshold: #{ent:temperature_threshold}>>)
```
which produces this output 
```
{"level":40,"time":"2021-12-21T00:17:08.937Z","picoId":"ckx9quvrc0000btpz9sod0qwy","rid":"wovyn_base","txnId":"ckxfcxwl1005xvipze9nf0ola","val":"threshold_violation","msg":"threshold violation at temp: 74.2 with threshold: 30"}
```

I used these lines to display the temperature at which the violation occurred, as well as the threshold that was violated.  If this line is not logged, then there was no violation.