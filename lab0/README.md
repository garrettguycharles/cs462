
# Lab 0

## Screen Recording
https://youtu.be/FDJbLconnjk

## Links to Rulesets 
[hello_world.krl](https://raw.githubusercontent.com/garrettguycharles/cs462/master/lab0/hello_world.krl)


## Questions

**Create a new channel (pick any name and type you like, leave the policy open. **
* Send an event to the pico using the new channel and the original (default) channel. 
* **Do you get the same result on both? Why or why not?**
    * I don't get the same result on both channels because on one channel, the "echo" domain is blocked and on another channel, nothing is blocked.

**Delete the channel.**
* Resend the event using the deleted channel. 
* **What happens? Why?**
    * Here is my result from the deleted channel request:
    ```
    {
        "error": "Error: ECI not found ckx9rffof000rbtpz7dema5i7"
    }
    ```
    This makes perfect sense because I deleted the channel with that ECI.

**Send the event echo/hello to your pico. What do you observe? Why?**
* I observe that the hello_world rule is invoked, because that is the one set up to handle the echo/hello request.

**Send the misspelled event ecco/hello to your pico. What do you observe? Why?**
* Here is the response:
```
{
  "eid": "ckxb83ky9001ak6pzbkeb98pg",
  "directives": []
}
```
This also makes sense because none of the rules matched up with the request I made, so it sent back basically an empty response.