
# Lab 9

## Screen Recording
https://www.youtube.com/watch?v=86EB2rNY940

## Links to Rulesets
* [GossipNodeRuleset.ts](https://raw.githubusercontent.com/garrettguycharles/cs462/master/lab9/src/entities/rulesets/standard/GossipNodeRuleset.ts)
* [WovynEmulatorRuleset.ts](https://raw.githubusercontent.com/garrettguycharles/cs462/master/lab9/src/entities/rulesets/lab9/WovynEmulatorRuleset.ts)
* [SensorPicoRuleset.ts](https://raw.githubusercontent.com/garrettguycharles/cs462/master/lab9/src/entities/rulesets/lab9/SensorPicoRuleset.ts)

## Questions

**Did you use a single message identifier for all message types in your system, or different one for each type of message? Why?**
* I used a different message type for the different types of messages in the system.  Simple temperature messages had type "TEMPERATURE_SENSOR_READING" and violation incrementor messages had type "VIOLATION_COUNT". This allowed me to easily distinguish between messages that were temperatures, and messages which informed me of changes in the violation count.

**Did you have to change how your seen messages worked? Why or why not?**
* I did not change how my seen messages worked. I did, however, want to make sure I only notified my pico ONCE on each new message, so I had to change the mechanism that saved the messages to allow it to recognize whether or not it had seen that message before. This allowed me to raise `gossip:message_received` events exactly once for each new message. From there, I could be confident that each new message would be processed exactly once.

**How did the state-oriented CRDT we used for Lab 8 differ from the operation-oriented CRDT we used in this lab?**
* In lab 8, we were replicating all of the temperature records into every single node's storage. In this lab, we are still doing that. However, with the violation count, we are instead making use of the command pattern, where the messages carry commands to be executed instead of data to be saved, and therefore the messages themselves do not need to be saved (even though at this point, they still are saved in the gossip records), because they are processed once, and then they have fulfilled their purpose.

**Is it possible for a node to issue two positive threshold violation messages (i.e. value = 1) without an intervening negative threshold violation messages (i.e. value = -1)? Justify your analysis. What are the consequences of such a scenario?**
* In my implementation, it is not possible. This is because it always keeps track of the current temperature and the previous temperature, and it is impossible for the `BEGIN_VIOLATION` situation (where the previous temperature is NOT a violation and the current temperature IS a violation) to happen twice in a row. Were that to happen, the entire system would permanently show one more violation than there actually is, which would be a problem.

**How does gossip messaging combined with CRDT compare with Paxos? Consider the threshold counter we implemented for this lab. How would it be different if you tried to use Paxos to implement it?**
* Gossip messaging combined with CRDT is different from Paxos because Paxos is a specific mechanism for selecting a winner when presented with multiple candidates, but gossip messaging combined with CRDT is just a tool that can be used to share eventually-consistent messages between nodes. Gossip messaging with CRDT is a tool: it can be used to implement distributed systems algorithms, like Paxos.

**How does gossip messaging combined with CRDT compare with Byzantine consensus (like in a blockchain)?**
* Gossip messaging combined with CRDT is different from Byzantine consensus because Byzantine consensus is a specific mechanism for selecting a winner when presented with multiple candidates, but gossip messaging combined with CRDT is just a tool that can be used to share eventually-consistent messages between nodes. Gossip messaging with CRDT is a tool: it can be used to implement distributed systems algorithms, like Byzantine consensus.

