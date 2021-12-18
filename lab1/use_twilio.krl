ruleset use_twilio {
    meta {
        use module twilio
            with
                SID = meta:rulesetConfig{"SID"}
                MessagingServiceSid = meta:rulesetConfig{"MessagingServiceSid"}
                auth_token = meta:rulesetConfig{"auth_token"}

        shares __testing
    }

    global {
        __testing = {
            "queries": [{"name": "__testing"}],
            "events": [
                {"domain": "test", "name": "send_message", "attrs": ["to", "fro", "message"]},
                {"domain": "test", "name": "get_messages", "attrs": ["to", "fro", "page_size"]}
            ]
        }
    }

    rule test_send {
        select when test send_message
        twilio:send_sms(event:attrs{"to"}, event:attrs{"fro"}, event:attrs{"message"})
    }

    rule test_get {
        select when test get_messages

        pre {
            messages = twilio:messages(event:attrs{"to"}, event:attrs{"fro"}, event:attrs{"page_size"})
        }

        send_directive("messages", {"messages": messages})
    }
}