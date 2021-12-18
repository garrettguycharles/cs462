#Lab 2: Modules and External API calls

**Why does this assignment ask you to create a function for messages but an action for sending the SMS message? What's the difference?**
* In pico KRL, functions are only used for GET operations.  For other operations which will change server-side data, a `defaction` is required.

**Why did we introduce the secrets for the Twilio module by configuring the rule that uses the module, rather than configuring the module directly?**
* For one, if the secrets were hardcoded into the Twilio module, the module would not be shareable.  It would also not be reusable by anyone other than us.  But since we defined the secrets in the config for the rule that uses the Twilio module, the Twilio module is reusable by anyone with the same authentication information (`sid`, `auth_token`, `MessagingServiceSid`).  Anyone can provide that information when they configure a rule to use with the Twilio module, and it will work just as well.