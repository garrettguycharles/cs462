import {AbstractRule, AbstractRuleset} from "@entities/rulesets/standard/AbstractRuleset";
import {HandlerDeclaration, Pico} from "@entities/Pico";
import {PicoEvent, PicoQuery} from "@entities/PicoEvent";
import {v4} from "uuid";
import {PicoEngine} from "@entities/PicoEngine";
import {
    PicoSubscription,
    SubscriptionProposal,
    SubscriptionRuleset
} from "@entities/rulesets/standard/SubscriptionRuleset";
import {randomInt} from "crypto";
import {getRandomInt} from "@shared/functions";
import Logger from "jet-logger";

export class GossipMessage {
    source = "";
    /**
     * index is how many messages of this type have been sent
     */
    index = -1;
    message_type = "";
    body: any;
}

export class MessageTypeRecord {
    /*
        key is message index
     */
    messages: {[key: number]: GossipMessage} = {};
    highest_seen = -1;
}

export class PeerSourceRecord {
    /*
        key is message type
     */
    message_type_records: {[key: string]: MessageTypeRecord} = {};
}

export class MessageRecord {
    /**
     * key is peer id
     */
    source_records: {[key: string]: PeerSourceRecord} = {};

    getMessage(source: string, message_type: string, index: number): GossipMessage | undefined {
        try {
            return this.source_records[source]
                .message_type_records[message_type]
                .messages[index];
        } catch (e) {
            return undefined;
        }
    }

    /**
     * Saves a message in this MessageRecord.
     *
     * @param msg the message to save
     * @return true if message has not been seen before, else false
     */
    saveMessage(msg: GossipMessage): boolean {
        let alreadySeen = false;

        if (!this.source_records[msg.source]) {
            this.source_records[msg.source] = new PeerSourceRecord();
        }

        if (!this.source_records[msg.source].message_type_records[msg.message_type]) {
            this.source_records[msg.source]
                .message_type_records[msg.message_type] = new MessageTypeRecord();
        }

        if (this.source_records[msg.source]
            .message_type_records[msg.message_type]
            .messages[msg.index]) {
            alreadySeen = true;
        }

        this.source_records[msg.source]
            .message_type_records[msg.message_type]
            .messages[msg.index] = msg;

        this.updateHighestSeen(msg);

        return !alreadySeen;
    }

    getHighestSeen(source: string, type: string): number {
        if (!this.source_records[source]
        || !this.source_records[source].message_type_records[type]) {
            return -1;
        }

        return this.source_records[source].message_type_records[type].highest_seen;
    }

    updateHighestSeen(msg: GossipMessage): void {
        const previousHighest = this.getHighestSeen(msg.source, msg.message_type);

        let newHighest = previousHighest;

        while (this.getMessage(
            msg.source,
            msg.message_type,
            newHighest + 1)) {
            newHighest += 1;
        }

        this.source_records[msg.source]
            .message_type_records[msg.message_type]
            .highest_seen = newHighest;
    }
}

export class PeerMessageTypeRecord {
    /**
     * Key is message type.
     */
    types: {[key: string]: number} = {};
}

export class PeerSeenRecord {
    /**
     * Key is peer_id
     */
    peers: {[key: string]: PeerMessageTypeRecord} = {};

    getPeerHighestSeen(origin: string, message_type: string): number {
        try {
            if (this.peers[origin].types[message_type] === undefined) {
                return -1;
            }

            return this.peers[origin].types[message_type];
        } catch (e) {
            return -1;
        }
    }

    insertRecord(origin: string, message_type: string, highest_seen: number) {
        if (!this.peers[origin]) {
            this.peers[origin] = new PeerMessageTypeRecord();
        }

        this.peers[origin].types[message_type] = highest_seen;
    }

    updateRecord(update: PeerSeenRecord): void {
        for (const [peer_id, origin] of Object.entries(update.peers)) {
            for (const [message_type, highest_seen] of Object.entries(origin.types)) {
                this.insertRecord(peer_id, message_type, highest_seen);
            }
        }
    }
}

export interface GossipSubscriptionRequest {
    url: string;
    public_channel: string;
}

export interface GossipSendMessageRequest {
    message_type: string;
    body: any;
}

export interface PeerSeenRecordUpdate {
    peer_id: string;
    seen_record: PeerSeenRecord;
}

export class GossipNodeRuleset extends AbstractRuleset {
    public static RULESET_NAME = "ts-picos-gossip-ruleset";
    name = GossipNodeRuleset.RULESET_NAME;
    author = "Garrett Charles";

    getNodeId() {
        return this.context.id;
    }

    message_counters: {[key: string]: number} = {};
    /**
     * key is the peer whose seen records are being kept
     */
    peer_seen_record: {[key: string]: PeerSeenRecord} = {};
    my_seen_messages = new MessageRecord();
    heartbeat_interval = 800;
    gossiping = false;

    getMySeenMessages(query: PicoQuery, context: Pico): void {
        context.setQueryResponse(query, this.my_seen_messages);
    }

    getMessageCounters(query: PicoQuery, context: Pico): void {
        context.setQueryResponse(query, this.message_counters);
    }

    getAllPeerSubscriptions(): PicoSubscription[] {
        const subs_rs: SubscriptionRuleset =
            this.context.rulesets[SubscriptionRuleset.RULESET_NAME] as SubscriptionRuleset;

        if (!subs_rs) {
            return [];
        }

        return subs_rs.subscriptions;
    }

    getAllMySeenMessagesAsArray(): GossipMessage[] {
        const toReturn: GossipMessage[] = [];

        for (const [key, source] of Object.entries(this.my_seen_messages.source_records)) {
            for (const [message_type, type_record] of Object.entries(source.message_type_records)) {
                for (const msg of Object.values(type_record.messages)) {
                    toReturn.push(msg);
                }
            }
        }

        return toReturn;
    }

    getNewMessagesForPeer(peer_id: string): GossipMessage[] {
        const all_my_messages = this.getAllMySeenMessagesAsArray();

        const peer_seen_record = this.peer_seen_record[peer_id];

        if (!peer_seen_record) {
            return all_my_messages;
        }

        const toReturn: GossipMessage[] = [];

        for (const msg of all_my_messages) {
            if (msg.index > peer_seen_record.getPeerHighestSeen(msg.source, msg.message_type)) {
                toReturn.push(msg);
            } else {
                // console.log(`Highest seen: ${peer_seen_record.getPeerHighestSeen(msg.source, msg.message_type)}
                // \n Message:${JSON.stringify(msg)}`);
            }
        }

        return toReturn;
    }

    queryNewMessagesForPeer(query: PicoQuery, context: Pico): void {
        const peer_id = query.getAttribute("peer_id", "");

        context.setQueryResponse(query, {
            peer_id: peer_id,
            messages: this.getNewMessagesForPeer(String(peer_id || ""))
        });
    }

    getRandomPeerSubscription(): PicoSubscription | undefined {
        const candidates = this.getAllPeerSubscriptions()
            .filter(s => s.roles.peer === "gossip_node"
                && s.roles.self === "gossip_node");


        if (candidates.length < 1) {
            return undefined;
        }

        return candidates[getRandomInt(0, candidates.length - 1)];
    }

    queryRandomPeerSubscription(query: PicoQuery, context: Pico): void {
        context.setQueryResponse(query, this.getRandomPeerSubscription());
    }

    generateMySeenRecordToSend(): PeerSeenRecord {
        const toReturn = new PeerSeenRecord();

        for (const [peer_id, peer_record] of Object.entries(this.my_seen_messages.source_records)) {
            for (const message_type of Object.keys(peer_record.message_type_records)) {
                toReturn.insertRecord(
                    peer_id,
                    message_type,
                    this.my_seen_messages.getHighestSeen(
                        peer_id,
                        message_type
                    ))
            }
        }

        return toReturn;
    }

    queryMySeenRecordToSend(query: PicoQuery, context: Pico): void {
        context.setQueryResponse(query, this.generateMySeenRecordToSend());
    }

    queryPeerSeenRecord(query: PicoQuery, context: Pico): void {
        context.setQueryResponse(query, this.peer_seen_record);
    }

    query_functions: { (query: PicoQuery, context: Pico): (Promise<void> | void) }[] = [
        this.queryMySeenRecordToSend.bind(this),
        this.getMessageCounters.bind(this),
        this.queryRandomPeerSubscription.bind(this),
        this.getMySeenMessages.bind(this),
        this.queryNewMessagesForPeer.bind(this),
        this.queryPeerSeenRecord.bind(this)
    ];

    rules: AbstractRule<GossipNodeRuleset>[] = [
        new class extends AbstractRule<GossipNodeRuleset> {
            declare(): HandlerDeclaration {
                return new HandlerDeclaration("gossip", "start");
            }

            handle(e: PicoEvent, context: Pico): Promise<void> | void {
                if (!this.ruleset.gossiping) {
                    PicoEngine.getInstance().sendEvent(
                        new PicoEvent()
                            .withChannel(context.internal_channel)
                            .withDomain("gossip")
                            .withName("heartbeat")
                            .withScheduledDelay(this.ruleset.heartbeat_interval)
                    );
                    context.addEventResponse(e, "message", "Started gossip!");
                    this.ruleset.gossiping = true;
                } else {
                    context.addEventResponse(e, "message", "Already gossipping.");
                }
            }
        }(this),

        new class extends AbstractRule<GossipNodeRuleset> {
            declare(): HandlerDeclaration {
                return new HandlerDeclaration("gossip", "stop");
            }

            handle(e: PicoEvent, context: Pico): Promise<void> | void {
                if (this.ruleset.gossiping) {
                    this.ruleset.gossiping = false;
                    context.addEventResponse(e, "message", "Gossip stopped.");
                } else {
                    context.addEventResponse(e, "message", "Gossip is already stopped.");
                }
            }
        }(this),

        new class extends AbstractRule<GossipNodeRuleset> {
            declare(): HandlerDeclaration {
                return new HandlerDeclaration("gossip", "set_heartbeat_interval");
            }

            handle(e: PicoEvent, context: Pico): Promise<void> | void {
                const {payload} = e.attributes;

                const newInterval = payload as number;

                if (newInterval === undefined) {
                    context.addEventResponse(e, "message",
                        "Bad payload.  Interval reset to 5000ms.");
                    return;
                }

                this.ruleset.heartbeat_interval = newInterval;
                context.addEventResponse(e, "message",
                    `Interval set to ${newInterval}ms.`);
            }
        }(this),

        new class extends AbstractRule<GossipNodeRuleset> {
            declare(): HandlerDeclaration {
                return new HandlerDeclaration("gossip", "heartbeat");
            }

            handle(e: PicoEvent, context: Pico): Promise<void> | void {
                console.log(`Heartbeat in ${context.id}.  Interval set to: ${this.ruleset.heartbeat_interval}ms.`);
                const peer = this.ruleset.getRandomPeerSubscription();

                const message = this.ruleset.generateMySeenRecordToSend();

                if (peer) {
                    PicoEngine.getInstance().sendEvent(
                        new PicoEvent()
                            .withTargetUrl(peer.url)
                            .withChannel(peer.channels.send)
                            .withDomain("gossip")
                            .withName("update_seen")
                            .withAttribute<PeerSeenRecordUpdate>("payload", {
                                peer_id: this.ruleset.getNodeId(),
                                seen_record: message
                            })
                    );
                }

                if (this.ruleset.gossiping) {
                    PicoEngine.getInstance().sendEvent(
                        new PicoEvent()
                            .withChannel(context.internal_channel)
                            .withDomain("gossip")
                            .withName("heartbeat")
                            .withScheduledDelay(this.ruleset.heartbeat_interval)
                    );
                }
            }
        }(this),

        // respond to seen messages with updates
        new class extends AbstractRule<GossipNodeRuleset> {
            declare(): HandlerDeclaration {
                return new HandlerDeclaration("gossip", "update_seen");
            }

            handle(e: PicoEvent, context: Pico): Promise<void> | void {
                const {payload} = e.attributes;
                const update = payload as PeerSeenRecordUpdate;

                this.ruleset.peer_seen_record[update.peer_id] =
                    this.ruleset.peer_seen_record[update.peer_id] || new PeerSeenRecord();

                this.ruleset.peer_seen_record[update.peer_id].updateRecord(update.seen_record);

                // decide which messages to send to peer
                const messagesToSend = this.ruleset.getNewMessagesForPeer(update.peer_id);

                const subscription = this.ruleset.getAllPeerSubscriptions()
                    .find(s => s.channels.receive === e.channel);

                if (!subscription) {
                    return;
                }

                PicoEngine.getInstance().sendEvent(
                    new PicoEvent()
                        .withTargetUrl(subscription.url)
                        .withChannel(subscription.channels.send)
                        .withDomain("gossip")
                        .withName("seen_response_with_messages")
                        .withAttribute<GossipMessage[]>("payload", messagesToSend)
                );
            }
        }(this),

        new class extends AbstractRule<GossipNodeRuleset> {
            declare(): HandlerDeclaration {
                return new HandlerDeclaration("gossip", "seen_response_with_messages");
            }

            handle(e: PicoEvent, context: Pico): Promise<void> | void {
                const {payload} = e.attributes;

                const messages = payload as GossipMessage[];

                for (const msg of messages) {
                    PicoEngine.getInstance().raiseEvent(
                        new PicoEvent()
                            .withChannel(context.internal_channel)
                            .withDomain("gossip")
                            .withName("message")
                            .withAttribute<GossipMessage>("payload", msg)
                    );
                }
            }
        }(this),

        new class extends AbstractRule<GossipNodeRuleset> {
            declare(): HandlerDeclaration {
                return new HandlerDeclaration("gossip", "send_message");
            }

            handle(e: PicoEvent, context: Pico): Promise<void> | void {
                const {payload} = e.attributes;

                const msgSendReq = payload as GossipSendMessageRequest;

                const msgToSend = new GossipMessage();
                msgToSend.source = this.ruleset.getNodeId();
                msgToSend.message_type = msgSendReq.message_type;
                if (this.ruleset.message_counters[msgSendReq.message_type] === undefined) {
                    this.ruleset.message_counters[msgSendReq.message_type] = -1;
                }

                this.ruleset.message_counters[msgSendReq.message_type] += 1;
                msgToSend.index = this.ruleset.message_counters[msgSendReq.message_type];
                msgToSend.body = msgSendReq.body;

                // save message in own storage
                // this.ruleset.my_seen_messages.saveMessage(msgToSend);
                // Actually send to self in event. This will allow for
                // the gossip:message handler to raise a
                // gossip:message_received event IFF an event has not been seen before.
                PicoEngine.getInstance().raiseEvent(
                    new PicoEvent()
                        .withChannel(context.internal_channel)
                        .withDomain("gossip")
                        .withName("message")
                        .withAttribute<GossipMessage>("payload", msgToSend)
                );


                // send message to random peer
                const randPeer = this.ruleset.getRandomPeerSubscription();

                if (!randPeer) {
                    context.addEventResponse(e, "message", "Message saved.  No peers to send to.");
                    return;
                }

                PicoEngine.getInstance().sendEvent(
                    new PicoEvent()
                        .withTargetUrl(randPeer.url)
                        .withChannel(randPeer.channels.send)
                        .withDomain("gossip")
                        .withName("message")
                        .withAttribute<GossipMessage>("payload", msgToSend)
                );

                context.addEventResponse(e, "message", `Message sent to ${randPeer.peer_id}`)
            }
        }(this),

        new class extends AbstractRule<GossipNodeRuleset> {
            declare(): HandlerDeclaration {
                return new HandlerDeclaration("gossip", "message");
            }

            handle(e: PicoEvent, context: Pico): Promise<void> | void {
                const {payload} = e.attributes;

                const msg = payload as GossipMessage;

                const isNewMessage = this.ruleset.my_seen_messages.saveMessage(msg);

                if (isNewMessage) {
                    PicoEngine.getInstance().raiseEvent(
                        new PicoEvent()
                            .withChannel(context.internal_channel)
                            .withDomain("gossip")
                            .withName("message_received")
                            .withAttribute("payload", msg)
                    );
                }
            }
        }(this),

        // auto-accept subscriptions
        new class extends AbstractRule<GossipNodeRuleset> {
            declare(): HandlerDeclaration {
                return new HandlerDeclaration("subscription", "proposal_received");
            }

            handle(e: PicoEvent, context: Pico): Promise<void> | void {
                const {payload} = e.attributes;
                const sub = payload as PicoSubscription;

                if (sub.roles.peer === "gossip_node" && sub.roles.self === "gossip_node") {
                    PicoEngine.getInstance().raiseEvent(
                        new PicoEvent()
                            .withDomain("subscription")
                            .withName("accept_proposal")
                            .withChannel(context.internal_channel)
                            .withAttribute("payload", sub.private_id)
                    );
                }
            }
        }(this),

        /**
         * Use this event to establish gossip subscriptions between nodes.
         */
        new class extends AbstractRule<GossipNodeRuleset> {
            declare(): HandlerDeclaration {
                return new HandlerDeclaration("gossip", "subscribe");
            }

            handle(e: PicoEvent, context: Pico): Promise<void> | void {
                const {payload} = e.attributes;

                const subReq = payload as GossipSubscriptionRequest;

                const eventToSend = new PicoEvent()
                    .withDomain("subscription")
                    .withName("propose")
                    .withChannel(context.internal_channel)
                    .withAttribute<SubscriptionProposal>("payload",
                        new class implements SubscriptionProposal {
                            subscription_public_id = "";
                            accepter_url = subReq.url;
                            proposer_id = context.id;
                            proposer_public_channel = context.getPublicChannel();
                            accepter_public_channel = subReq.public_channel;
                            proposer_role = "gossip_node";
                            proposer_url = "";
                            receiver_role = "gossip_node";
                        }
                    );

                PicoEngine.getInstance().sendEvent(
                    eventToSend
                );
            }
        }(this)
    ];
}