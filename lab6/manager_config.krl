ruleset manager_config {
    meta {
        configure using
            auth_token = meta:rulesetConfig{"auth_token"}
            SID = meta:rulesetConfig{"SID"}
            MessagingServiceSid = meta:rulesetConfig{"MessagingServiceSid"}
            notification_sender_number = meta:rulesetConfig{"notification_sender_number"}
            notification_recipient_number = meta:rulesetConfig{"notification_recipient_number"}
            temperature_threshold = meta:rulesetConfig{"temperature_threshold"}

        provides getConfig
        shares getConfig
    }

    global {
        getConfig = function() {
            {
                "auth_token": auth_token,
                "SID": SID,
                "MessagingServiceSid": MessagingServiceSid,
                "notification_sender_number": notification_sender_number,
                "notification_recipient_number": notification_recipient_number,
                "temperature_threshold": temperature_threshold
            }
        }
    }
}