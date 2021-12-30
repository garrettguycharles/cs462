ruleset twilio {
    meta {
      name "twilio"
      description <<
  module for handling Twilio requests
  >>
      author "Garrett Charles"

      configure using
        SID = ""
        MessagingServiceSid = ""
        auth_token = ""

      provides
        send_sms, messages
    }
     
    global {
      send_sms = defaction(to, fro, message) {
        base_url = <<https://api.twilio.com/2010-04-01/Accounts/#{SID}/Messages>>

        http:post(base_url, form = {
          "From":fro.klog("from: "),
          "To": to.klog("to: "),
          "Body": message.klog("message: "),
          "MessagingServiceSid": MessagingServiceSid.klog("MSSid: ")
        }, auth = {
          "username": SID.klog("sid: "),
          "password": auth_token.klog("auth_token: ")
        })
      }

      messages = function(to, fro, page_size) {
        base_url = <<https://api.twilio.com/2010-04-01/Accounts/#{SID}/Messages.json>>;
        qstra = {};

        qstrb = (page_size.isnull() || page_size == "") => qstra | qstra.put({"PageSize": page_size});
        qstrc = (to.isnull() || to == "") => qstrb | qstrb.put({"To": to});
        qstrfinal = (fro.isnull() || fro == "") => qstrc | qstrc.put({"From":fro});

        // qstrfinal.klog("Testing:");

        response = http:get(base_url, qs = qstrfinal, auth = {
          "username": SID.klog("sid: "),
          "password": auth_token.klog("auth_token: ")
        });

        response{"content"}.decode(){"messages"}
      }
    }     
  }