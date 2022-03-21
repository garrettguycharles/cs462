import {AbstractRule, AbstractRuleset} from "@entities/rulesets/standard/AbstractRuleset";
import {HandlerDeclaration, IEventHandler, Pico} from "@entities/Pico";
import {PicoEvent, PicoQuery} from "@entities/PicoEvent";
import {PicoEngine} from "@entities/PicoEngine";
import {
    PicoSubscription,
    SubscriptionProposal,
    SubscriptionRuleset
} from "@entities/rulesets/standard/SubscriptionRuleset";

export class SubscriptionTestRuleset extends AbstractRuleset {
    name = "SubscriptionTester";
    author = "Me";

    query_functions: { (query: PicoQuery, context: Pico): Promise<void> }[] = [

    ];

    rules: AbstractRule<SubscriptionTestRuleset>[] = [
        new class extends AbstractRule<SubscriptionTestRuleset> {
        // AUTO-ACCEPT
            declare(): HandlerDeclaration {
                return new HandlerDeclaration("subscription", "proposal_received");
            }

            handle(e: PicoEvent, context: Pico): Promise<void> {
                const {payload} = e.attributes;
                const sub = payload as PicoSubscription;

                PicoEngine.getInstance().raiseEvent(
                    new PicoEvent()
                        .withDomain("subscription")
                        .withName("accept_proposal")
                        .withChannel(context.internal_channel)
                        .withAttribute("payload", sub.private_id)
                );

                return Promise.resolve();
            }
        }(this),

        new class extends AbstractRule<SubscriptionTestRuleset> {
            declare(): HandlerDeclaration {
                return new HandlerDeclaration("test", "subscription");
            }

            handle(e: PicoEvent, context: Pico): Promise<void> {
                const {payload} = e.attributes;
                const url = String(payload.url || "");
                const publicChannel = String(payload.public_channel || "");

                const eventToSend = new PicoEvent()
                    .withDomain("subscription")
                    .withName("propose")
                    .withTargetUrl(url)
                    .withChannel(context.getPublicChannel())
                    .withAttribute<SubscriptionProposal>("payload",
                        new class implements SubscriptionProposal {
                            subscription_public_id = "";
                            accepter_url = url;
                            proposer_id = context.id;
                            proposer_public_channel = context.getPublicChannel();
                            accepter_public_channel = publicChannel;
                            proposer_role = "proposer";
                            proposer_url = "";
                            receiver_role = "receiver";
                        }
                    );

                PicoEngine.getInstance().raiseEvent(
                    eventToSend
                );

                console.log("EVENT TO SEND:", eventToSend.getAttribute("payload"));

                return Promise.resolve(undefined);
            }
        }(this)
    ];
}