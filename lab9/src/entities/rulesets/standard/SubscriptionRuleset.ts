import {AbstractRule, AbstractRuleset} from "@entities/rulesets/standard/AbstractRuleset";
import {HandlerDeclaration, IEventHandler, Pico} from "@entities/Pico";
import {PicoEvent, PicoQuery} from "@entities/PicoEvent";
import {uuid} from "uuidv4";
import {PicoEngine} from "@entities/PicoEngine";

enum PicoSubscriptionState {
    Initial,
    Proposed,
    AccepterHandshakeSent,
    ProposerHandshakeSent,
    AccepterConfirmationSent,
    Established
}

const SUBSCRIPTIONS_ARRAY_VAR_KEY = uuid();

export class PicoSubscription {
    public_id = uuid();
    private_id = uuid();
    url = "";
    peer_id = "";

    channels = {
        send: "",
        receive: "",
        peer_public: ""
    };

    roles = {
        self: "",
        peer: ""
    }

    state = PicoSubscriptionState.Initial;

    withPublicId(id: string): PicoSubscription {
        this.public_id = id;
        return this;
    }

    withPrivateId(id: string): PicoSubscription {
        this.private_id = id;
        return this;
    }

    withUrl(url: string): PicoSubscription {
        this.url = url;
        return this;
    }

    withPeerId(id: string): PicoSubscription {
        this.peer_id = id;
        return this;
    }

    withSendChannel(channel: string): PicoSubscription {
        this.channels.send = channel;
        return this;
    }

    withReceiveChannel(channel: string): PicoSubscription {
        this.channels.receive = channel;
        return this;
    }

    withPeerPublicChannel(channel: string): PicoSubscription {
        this.channels.peer_public = channel;
        return this;
    }

    withSelfRole(role: string): PicoSubscription {
        this.roles.self = role;
        return this;
    }

    withPeerRole(role: string): PicoSubscription {
        this.roles.peer = role;
        return this;
    }

    withState(s: PicoSubscriptionState): PicoSubscription {
        this.state = s;
        return this;
    }
}

export interface SubscriptionProposal {
    proposer_id: string;
    subscription_public_id: string;
    proposer_public_channel: string;
    accepter_public_channel: string;
    proposer_role: string;
    receiver_role: string;
    proposer_url: string;
    accepter_url: string;
}

interface IPicoSubscriptionChannelCarrierHandshake {
    public_id: string;
    peer_channel: string;
    peer_id: string;
}

interface IPicoSubscriptionConfirmation {
    public_id: string;
}

export class SubscriptionRuleset extends AbstractRuleset {
    public static RULESET_NAME = "ts-picos-subscription-ruleset";
    public name = SubscriptionRuleset.RULESET_NAME;
    author = "Garrett Charles";

    publicSubscriptionChannel = uuid();

    subscriptions: PicoSubscription[] = [];

    updateSubscription(sub: PicoSubscription): void {
        this.subscriptions = this.subscriptions.map((s) => {
            if (s.public_id === sub.public_id) {
                return sub;
            }

            return s;
        });
    }

    getPublicSubscriptionChannel(query: PicoQuery, context: Pico): Promise<void> {
        context.setQueryResponse(query, this.publicSubscriptionChannel);

        return Promise.resolve();
    }

    getSubscriptions(query: PicoQuery, context: Pico): Promise<void> {
        // context.setQueryResponse(query, context.getVar(SUBSCRIPTIONS_ARRAY_VAR_KEY));
        context.setQueryResponse(query, this.subscriptions);

        return Promise.resolve();
    }

    query_functions: { (query: PicoQuery, context: Pico): Promise<void> }[] = [
        this.getPublicSubscriptionChannel.bind(this),
        this.getSubscriptions.bind(this)
    ];

    rules: AbstractRule<SubscriptionRuleset>[] = [
        new class extends AbstractRule<SubscriptionRuleset> {
        // PROPOSER
            declare(): HandlerDeclaration {
                return new HandlerDeclaration("subscription", "propose");
            }

            handle(e: PicoEvent, context: Pico): Promise<void> {
                console.log(this.declare().name);
                const {payload} = e.attributes;

                const proposal = payload as SubscriptionProposal;

                proposal.proposer_id = context.id;
                proposal.subscription_public_id = uuid();
                proposal.proposer_public_channel = this.ruleset.publicSubscriptionChannel;
                proposal.proposer_url = e.target_url;

                const subscription = new PicoSubscription()
                    .withPeerId("")
                    .withPublicId(proposal.subscription_public_id)
                    .withPeerPublicChannel(proposal.accepter_public_channel)
                    .withPeerRole(String(proposal.receiver_role) || "")
                    .withSelfRole(String(proposal.proposer_role || ""))
                    .withUrl(proposal.accepter_url)
                    .withState(PicoSubscriptionState.Proposed);

                // initialize pico array if not initialized yet
                // context.getVarTypeInit(SUBSCRIPTIONS_ARRAY_VAR_KEY,
                //     new Array<PicoSubscription>()).push(subscription);

                this.ruleset.subscriptions.push(subscription);

                console.log(subscription.url);

                PicoEngine.getInstance().sendEvent(
                    new PicoEvent()
                        .withDomain("subscription")
                        .withName("proposal")
                        .withTargetUrl(subscription.url)
                        .withChannel(subscription.channels.peer_public)
                        .withAttribute<SubscriptionProposal>("payload", proposal)
                )

                // this.ruleset.updateSubscription(subscription);
                return Promise.resolve(undefined);
            }
        }(this),
        new class extends AbstractRule<SubscriptionRuleset> {
        // ACCEPTER
            // Handle incoming subscription proposals
            declare(): HandlerDeclaration {
                return new HandlerDeclaration("subscription", "proposal");
            }

            handle(e: PicoEvent, context: Pico): Promise<void> {
                console.log(this.declare().name);
                const {payload} = e.attributes;
                const proposal = payload as SubscriptionProposal;

                /*
                    proposer_id: string;
                    proposer_public_channel: string;
                    proposer_role: string;
                    receiver_role: string;
                    proposer_url: string;
                 */

                const proposedSub = new PicoSubscription()
                    .withPeerId(String(proposal.proposer_id || ""))
                    .withPublicId(proposal.subscription_public_id)
                    .withPeerPublicChannel(String(proposal.proposer_public_channel || ""))
                    .withPeerRole(String(proposal.proposer_role) || "")
                    .withSelfRole(String(proposal.receiver_role || ""))
                    .withUrl(proposal.proposer_url)
                    .withState(PicoSubscriptionState.Proposed);

                // initialize pico array if not initialized yet
                // context.getVarTypeInit(SUBSCRIPTIONS_ARRAY_VAR_KEY,
                //     new Array<PicoSubscription>()).push(proposedSub);

                this.ruleset.subscriptions.push(proposedSub);

                console.log("Sending proposal_received");
                PicoEngine.getInstance().raiseEvent(new PicoEvent()
                    .withDomain("subscription")
                    .withName("proposal_received")
                    .withTargetUrl(proposedSub.url)
                    .withChannel(context.internal_channel)
                    .withAttribute("payload", proposedSub)
                );

                return Promise.resolve();
            }
        }(this),
        new class extends AbstractRule<SubscriptionRuleset> {
        // ACCEPTER
            declare(): HandlerDeclaration {
                return new HandlerDeclaration("subscription", "accept_proposal");
            }

            handle(e: PicoEvent, context: Pico): Promise<void> {
                console.log(this.declare().name);
                const {payload} = e.attributes;

                const sub_id = String(payload || "");

                // const subscription =
                //     context.getVarTypeInit(SUBSCRIPTIONS_ARRAY_VAR_KEY,
                //         new Array<PicoSubscription>())
                //         .find(s => s.subscription_id === sub_id);

                const subscription = this.ruleset.subscriptions
                    .find(s => s.private_id === sub_id);

                if (!subscription
                    || subscription.state !== PicoSubscriptionState.Proposed) {
                    // ignore bad request
                    context.addEventResponse(e, "message",
                        "Could not find a pending subscription with that id.");
                    return Promise.resolve();
                }

                subscription.withReceiveChannel(uuid());

                subscription.withState(PicoSubscriptionState.AccepterHandshakeSent);

                PicoEngine.getInstance().sendEvent(
                    new PicoEvent()
                        .withDomain("subscription")
                        .withName("handshake_to_proposer")
                        .withTargetUrl(subscription.url)
                        .withChannel(subscription.channels.peer_public)
                        .withAttribute<IPicoSubscriptionChannelCarrierHandshake>("payload", {
                            public_id: subscription.public_id,
                            peer_channel: subscription.channels.receive,
                            peer_id: context.id
                        })
                );

                this.ruleset.updateSubscription(subscription);
                return Promise.resolve();
            }
        }(this),
        new class extends AbstractRule<SubscriptionRuleset> {
        // PROPOSER
            declare(): HandlerDeclaration {
                return new HandlerDeclaration(
                    "subscription", "handshake_to_proposer");
            }

            handle(e: PicoEvent, context: Pico): Promise<void> {
                console.log(this.declare().name);
                const {payload} = e.attributes;

                const handshake = payload as IPicoSubscriptionChannelCarrierHandshake;

                // const subscription =
                //     context.getVarTypeInit(SUBSCRIPTIONS_ARRAY_VAR_KEY,
                //         new Array<PicoSubscription>())
                //         .find(s => s.peer_id === handshake.peer_id);

                const subscription = this.ruleset.subscriptions
                    .find(s => s.public_id === handshake.public_id);

                context.addEventResponse(e, "sub", subscription);

                if (!subscription
                    || subscription.state !== PicoSubscriptionState.Proposed) {
                    // ignore bad request
                    context.addEventResponse(e, "message",
                        "Could not find a pending subscription with that id.");
                    return Promise.resolve();
                }

                subscription.withSendChannel(handshake.peer_channel);
                subscription.withReceiveChannel(uuid());
                subscription.withPeerId(handshake.peer_id);

                subscription.withState(PicoSubscriptionState.ProposerHandshakeSent);

                PicoEngine.getInstance().sendEvent(

                    new PicoEvent()
                        .withDomain("subscription")
                        .withName("handshake_to_accepter")
                        .withTargetUrl(subscription.url)
                        .withChannel(subscription.channels.peer_public)
                        .withAttribute<IPicoSubscriptionChannelCarrierHandshake>("payload",
                            {
                                public_id: subscription.public_id,
                                peer_channel: subscription.channels.receive,
                                peer_id: context.id
                            }
                        )
                );

                this.ruleset.updateSubscription(subscription);
                return Promise.resolve();
            }
        }(this),
        new class extends AbstractRule<SubscriptionRuleset> {
        // ACCEPTER
            declare(): HandlerDeclaration {
                return new HandlerDeclaration(
                    "subscription",
                    "handshake_to_accepter"
                );
            }

            handle(e: PicoEvent, context: Pico): Promise<void> {
                console.log(this.declare().name);
                const {payload} = e.attributes;

                const handshake = payload as IPicoSubscriptionChannelCarrierHandshake;

                // const subscription =
                //     context.getVarTypeInit(SUBSCRIPTIONS_ARRAY_VAR_KEY,
                //         new Array<PicoSubscription>())
                //         .find(s => s.peer_id === handshake.peer_id);

                const subscription = this.ruleset.subscriptions
                    .find(s => s.public_id === handshake.public_id);

                if (!subscription
                    || subscription.state !== PicoSubscriptionState.AccepterHandshakeSent) {
                    // ignore bad request
                    context.addEventResponse(e, "message",
                        "Could not find a pending subscription with that id.");
                    return Promise.resolve();
                }

                subscription.withSendChannel(handshake.peer_channel);
                subscription.withState(PicoSubscriptionState.AccepterConfirmationSent);

                PicoEngine.getInstance().sendEvent(
                    new PicoEvent()
                        .withDomain("subscription")
                        .withName("confirmation_from_accepter")
                        .withTargetUrl(subscription.url)
                        .withChannel(subscription.channels.peer_public)
                        .withAttribute<IPicoSubscriptionConfirmation>("payload", {
                            public_id: subscription.public_id
                        })
                );

                this.ruleset.updateSubscription(subscription);
                return Promise.resolve(undefined);
            }
        }(this),
        new class extends AbstractRule<SubscriptionRuleset> {
            declare(): HandlerDeclaration {
                return new HandlerDeclaration(
                    "subscription",
                    "confirmation_from_accepter"
                );
            }

            handle(e: PicoEvent, context: Pico): Promise<void> {
                console.log(this.declare().name);
                const {payload} = e.attributes;

                const confirmation = payload as IPicoSubscriptionConfirmation;

                // const subscription =
                //     context.getVarTypeInit(SUBSCRIPTIONS_ARRAY_VAR_KEY,
                //         new Array<PicoSubscription>())
                //         .find(s => s.peer_id === confirmation.peer_id);

                const subscription = this.ruleset.subscriptions
                    .find(s => s.public_id === confirmation.public_id);

                if (!subscription
                    || subscription.state !== PicoSubscriptionState.ProposerHandshakeSent) {
                    // ignore bad request
                    context.addEventResponse(e, "message",
                        "Could not find a pending subscription with that id.");
                    return Promise.resolve();
                }

                subscription.withState(PicoSubscriptionState.Established);
                context.channels.push(subscription.channels.receive);
                // context.channels.push(subscription.channels.send);

                PicoEngine.getInstance().sendEvent(
                    new PicoEvent()
                        .withDomain("subscription")
                        .withName("confirmation_from_proposer")
                        .withTargetUrl(subscription.url)
                        .withChannel(subscription.channels.peer_public)
                        .withAttribute<IPicoSubscriptionConfirmation>("payload", {
                            public_id: subscription.public_id
                        })
                );

                this.ruleset.updateSubscription(subscription);
                return Promise.resolve(undefined);
            }
        }(this),
        new class extends AbstractRule<SubscriptionRuleset> {
            declare(): HandlerDeclaration {
                return new HandlerDeclaration(
                    "subscription",
                    "confirmation_from_proposer"
                );
            }

            handle(e: PicoEvent, context: Pico): Promise<void> {
                console.log(this.declare().name);
                const {payload} = e.attributes;
                const confirmation = payload as IPicoSubscriptionConfirmation;

                // const subscription =
                //     context.getVarTypeInit(SUBSCRIPTIONS_ARRAY_VAR_KEY,
                //         new Array<PicoSubscription>())
                //         .find(s => s.peer_id === confirmation.peer_id);

                const subscription = this.ruleset.subscriptions
                    .find(s => s.public_id === confirmation.public_id);

                if (!subscription
                    || subscription.state !== PicoSubscriptionState.AccepterConfirmationSent) {
                    // ignore bad request
                    context.addEventResponse(e, "message",
                        "Could not find a pending subscription with that id.");
                    return Promise.resolve();
                }

                subscription.withState(PicoSubscriptionState.Established);
                context.channels.push(subscription.channels.receive);
                // context.channels.push(subscription.channels.send);

                this.ruleset.updateSubscription(subscription);
                return Promise.resolve(undefined);
            }
        }(this)
    ];

    onInstall(context: Pico): Promise<void> {
        // install public subscription channel
        context.channels.push(this.publicSubscriptionChannel);
        // context.setVar(SUBSCRIPTIONS_ARRAY_VAR_KEY, new Array<PicoSubscription>());

        return Promise.resolve();
    }
}