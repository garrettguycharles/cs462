
# Lab 8

## Screen Recording
https://youtu.be/YG-onuaMbC0

## Links to Rulesets
***I am only including new and edited rulesets.  See the code above for others used in this lab.)***
* [gossip.krl](https://raw.githubusercontent.com/garrettguycharles/cs462/master/lab8/gossip.krl)
* [gossip_manager.krl](https://raw.githubusercontent.com/garrettguycharles/cs462/master/lab8/gossip_manager.krl)
* [sensor_manager.krl](https://raw.githubusercontent.com/garrettguycharles/cs462/master/lab8/sensor_manager.krl)

## Questions

**This lab uses a vector clock (Links to an external site.) algorithm to create unique message IDs based on a sequence number. Could we replace the sequence number with a timestamp? What are the advantages and disadvantages of such an approach?**
* If we replaced the sequence number with a timestamp, we wouldn't be able to definitively know whether or not we've missed any messages.  For example, if we know about messages 0, 2, and 3, then we know without a doubt that we are still missing message 1, because we have an absolute knowledge of what numbers will appear in the sequence.  If we use a timestamp, then suppose that all of the messages are these: [2:00, 2:04, 2:06], but we only know about messages [2:00, 2:06].  There is no way to know about the 2:04 message because we don't have a previously-agreed-upon sequence that tells us we are missing message 2:04.  That is why the vector clock of integers is more useful in this situation.

**Are the temperature messages in order? Why or why not? If not, what could you do to fix this?**
* I kept my temperature messages in order based upon the vector clock by storing them by their messageID index.  This means that they are in order, grouped by origin node.  However, it would be simple to flatten my messages map into an array of temperatures sorted by timestamp if that was needed as well.

**How did you avoid looping (sending messages back to someone who already has it)? Why was the unique ID helpful?**
* I avoided this kind of looping in this way:  Say I am a node.  My neighbor informs me of the messages it has seen.  I calculate my neighbor's records against my own, and return the messages I have which my neighbor does not have.  This way, I will always send my neighbor at least one message that is useful, if I send any at all.  The unique ID was useful because it allowed me to keep track of which messages I had received from which origins, so that I was able to accurately calculate the difference between my records and my neighbor's records.

**The propagation algorithm sleeps for n seconds between each iteration. What are the trade-offs between a low and high value for n.**
* If you have a low value for n, your messages will propagate faster, but your engine will be spending more processing power propagating messages.  If you have a high value for n, your messages will not propagate very quickly, but your computer will not waste as much processing power propagating messages.  I'd say a good balance would be to propagate messages just a little bit faster than they come in, so that the new messages will not pool in certain areas of your node graph.

**Did new messages eventually end on all the nodes that were connected? Were the messages displayed in the same order on each node? Why or why not?**
* Yes, all new messages eventually reached all connected nodes.  They were not displayed in the same order on each node, but within each node's records of message origin, the messages were in the same order.  (All of Node 1's messages appeared in order, but Node 1's messages didn't necessarily appear before node 2's messages.)

**Why does temporarily disconnecting a node from the network not result in permanent gaps in the messages seen at that node?**
* As long as that node is not an isthmus (which would be very rare in an actual graph), there are always other paths for the messages to propagate around the hole.  Even if removing the node does disconnect two groups of nodes, when those groups are reconnected, the messages will continue to propagate until consistency is reached in the connected graph.

**Describe, in a paragraph or two, how you could use the basic scheme implemented here to add failure detection to the system using a reachability table.**
* I would have the messages carry ping data instead of temperatures.  Then, each node could keep track of the table of reachability, and when ping data goes missing from a node, eventually all of the nodes will receive messages saying that there were errors communicating with the failed node, and all nodes would know about the failed node.  In a more intelligent way, I might use something like Chord's finger tables to have each node keep track of its neighbors, and when one of its neighbors stops responding, it could propagate a message informing the other nodes of the failed neighbor.