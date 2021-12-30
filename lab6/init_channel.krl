ruleset init_channel {
    meta {
        use module io.picolabs.wrangler alias wrangler
    }

    rule create_allow_all_channel {
        select when wrangler ruleset_installed where event:attrs{"rids"} >< ctx:rid

        pre {
            tags = ["allow-all"]
            eventPolicy = {"allow": [{"domain": "*", "name": "*"}], "deny": []}
            queryPolicy = {"allow": [{"rid": "*", "name": "*"}], "deny": []}
        }

        fired {
            raise wrangler event "new_channel_request" attributes {
                "tags":tags,
                "eventPolicy":eventPolicy,
                "queryPolicy":queryPolicy
            }
        }
    }
}