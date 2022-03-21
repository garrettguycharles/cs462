import {Pico} from "@entities/Pico";
import {PicoEvent, PicoQuery} from "@entities/PicoEvent";
import axios from "axios";
import picos from "./picos";
import {GossipSubscriptionRequest} from "@entities/rulesets/standard/GossipNodeRuleset";
import Logger from "jet-logger";

export class PicoEngine {
    picos: Pico[] = [];
    event_queue: PicoEvent[] = [];
    event_history: PicoEvent[] = [];

    self_host = "";
    setSelfHost(h: string): void {
        this.self_host = h;
    }

    getSelfHost(): string {
        return this.self_host;
    }

    private tick_scheduled = setImmediate(this.tick.bind(this));

    async handleEvent(e: PicoEvent): Promise<void> {

        const time_until_event = Date.now() - e.trigger_time;

        if (Date.now() < e.trigger_time) {
            setTimeout(() => {
                this.sendEvent.bind(this)(e);
            }, Math.abs(time_until_event) + 50);
        } else {
            this.addEventToHistory(e);

            for (const p of this.picos) {
                if (p.channels.includes(e.channel)) {
                    await p.handleEvent(e);
                }
            }
        }
    }

    public raiseEvent(e: PicoEvent): void {
        this.sendEvent(e);
    }

    sendEvent(e: PicoEvent) {
        if (!e.target_url) {
            this.addEventToQueue(e);
        } else {
            setImmediate(() => {
                axios.post(`${e.target_url}/api/sky/event/${e.channel}/${e.domain}/${e.name}`,
                    e.attributes
                );
            });
        }

        this.scheduleTick();
    }

    async handleQuery(channel: string, q: PicoQuery): Promise<void> {
        for (const p of this.picos) {
            if (p.channels.includes(channel)) {
                await p.handleQuery(q);
            }
        }
    }

    addEventToHistory(e: PicoEvent): void {
        this.event_history.push(e);
    }

    addEventToQueue(e: PicoEvent): void {
        this.event_queue.push(e);
        this.scheduleTick();
    }

    /**
     * Returns true if there are more messages to be processed.
     */
    async processNextEvent(): Promise<boolean> {
        if (this.event_queue.length > 0) {
            const nextEvent = this.event_queue.pop();

            if (nextEvent) {
                await this.handleEvent(nextEvent);
            }
        }

        return this.event_queue.length > 0;
    }

    scheduleTick(): void {
        clearImmediate(this.tick_scheduled);
        this.tick_scheduled = setImmediate(this.tick.bind(this));
    }

    async tick(): Promise<void> {

        const continueLoop = await this.processNextEvent();

        if (continueLoop) {
            this.scheduleTick();
        }
    }

    /**
     * Returns true if pico added, false if already there.
     * @param pico
     */
    registerPico(pico: Pico): boolean {
        for (const p of this.picos) {
            if (p.id === pico.id) {
                Logger.info("Pico with that ID already registered.Request to register pico ignored.");
                return false;
            }
        }

        this.picos.push(pico);
        return true;
    }

    /**
     * Returns deleted pico if found, else undefined.
     *
     * @param id
     */
    deletePico(id: string): Pico | undefined {
        const toDelete = this.picos.find(p => p.id === id);

        if (toDelete) {
            this.picos = this.picos.filter(p => p.id != toDelete.id);
        }

        return toDelete;
    }

    // singleton

    private static instance: PicoEngine;
    // eslint-disable-next-line @typescript-eslint/no-empty-function

    private constructor() {
        this.init();
        this.scheduleTick();
    }

    public static getInstance(): PicoEngine {
        if (!PicoEngine.instance) {
            PicoEngine.instance = new PicoEngine();
        }

        return PicoEngine.instance;
    }

    private init() {
        for (const p of picos) {
            this.registerPico(p);
        }

        // build node graph

// p1 <-> p2 <-> p3

        this.raiseEvent(
            new PicoEvent()
                .withChannel("default1")
                .withDomain("gossip")
                .withName("subscribe")
                .withAttribute<GossipSubscriptionRequest>("payload", {
                    url: "",
                    public_channel: "default2"
                })
        );

        this.raiseEvent(
            new PicoEvent()
                .withChannel("default2")
                .withDomain("gossip")
                .withName("subscribe")
                .withAttribute<GossipSubscriptionRequest>("payload", {
                    url: "",
                    public_channel: "default3"
                })
        );

        this.raiseEvent(
            new PicoEvent()
                .withChannel("default3")
                .withDomain("gossip")
                .withName("subscribe")
                .withAttribute<GossipSubscriptionRequest>("payload", {
                    url: "",
                    public_channel: "default4"
                })
        );

        for (const p of picos) {
            this.raiseEvent(
                new PicoEvent()
                    .withChannel(p.internal_channel)
                    .withDomain("gossip")
                    .withName("start")
            );
        }
    }
}