import {PicoEvent, PicoQuery, ResponseAttribute} from "@entities/PicoEvent";
import {uuid} from 'uuidv4';
import {AbstractRuleset} from "@entities/rulesets/standard/AbstractRuleset";
import {PicoEngine} from "@entities/PicoEngine";
import {SubscriptionRuleset} from "@entities/rulesets/standard/SubscriptionRuleset";
import {GossipNodeRuleset} from "@entities/rulesets/standard/GossipNodeRuleset";
import {StandardPicoRuleset} from "@entities/rulesets/standard/StandardPicoRuleset";

/**
 * This object allows handlers to declare
 * which events and queries they would like to respond to.
 */
export class HandlerDeclaration {
    domain: string;
    name: string;

    constructor(domain: string, name: string) {
        this.domain = domain;
        this.name = name;
    }
}

export interface IEventHandler {
    declare(): HandlerDeclaration;
    handle(e: PicoEvent, context: Pico): Promise<void> | void;
}

export class Pico {
    id = "";
    rulesets: {[key: string]: AbstractRuleset} = {};
    channels: string[] = [];
    variables: {[key: string]: any} = {};
    internal_channel: string;
    parent: Pico | undefined;
    children: {[key: string]: Pico} = {};

    constructor() {
        this.id = uuid();
        this.initStandardRulesets();
        this.initRulesets();
        this.internal_channel = uuid();
        this.channels.push(this.internal_channel);
    }

    private initStandardRulesets(): void {
        this.installRuleset(new SubscriptionRuleset(this));
        this.installRuleset(new GossipNodeRuleset(this));
        this.installRuleset(new StandardPicoRuleset(this));
    }

    /**
     * Override this method to install your initial rulesets
     * in your custom picos.
     *
     * @protected
     */
    protected initRulesets(): void {
        return;
    }

    getPublicChannel(): string {
        return (this.rulesets[SubscriptionRuleset.RULESET_NAME] as SubscriptionRuleset)
            .publicSubscriptionChannel;
    }

    withId(id: string): Pico {
        this.id = id;
        return this;
    }

    withParent(parent: Pico): Pico {
        this.parent = parent;
        return this;
    }

    async handleEvent(e: PicoEvent): Promise<void> {
        for (const rs of Object.values(this.rulesets)) {
            await rs.handleEvent(e, this);
        }
    }

    async handleQuery(q: PicoQuery) {
        for (const rs of Object.values(this.rulesets)) {
            if (rs.name === q.ruleset_name) {
                await rs.callFunction(q, this);
            } else {
                // console.log(rs.name);
            }
        }
    }

    setVar<T>(name: string, value: T): void {
        this.variables[name] = value;
    }

    getVar(name: string, fallback: any = undefined): any {
        const toReturn = this.variables[name];
        if (toReturn === undefined) {
            return fallback;
        }

        return toReturn;
    }

    /**
     * This gets a variable using the fallback initialization
     * if the var does not exist or is the wrong type.
     *
     * WARNING:
     * If the var DOES exist, and is the wrong type, this call
     * will try to coerce the var into the wrong type.
     * So be careful.
     *
     * @param name
     * @param fallbackInitialization
     */
    getVarTypeInit<T>(name: string, fallbackInitialization: T): T {
        this.setVar(name,
            this.getVar(name, fallbackInitialization)
        );

        return this.getVar(name) as T;
    }

    async installRuleset(r: AbstractRuleset): Promise<void> {
        this.rulesets[r.name] = r;
        await r.onInstall(this);
    }

    createChild(): Pico {
        const newChild = new Pico();
        this.addChild(newChild);

        return newChild;
    }

    addChild(child: Pico): Pico {
        if (child.parent) {
            child.parent.removeChild(child.id);
        }

        child.withParent(this)

        PicoEngine.getInstance().registerPico(child);

        this.children[child.id] = child;
        return child;
    }

    getChild(id: string): Pico | undefined {
        return this.children[id];
    }

    removeChild(id: string): Pico | undefined {
        const child = this.children[id];

        if (child) {
            delete this.children[id];
        }

        return child;
    }

    /**
     * Deletes child and all of child's children, recursively
     * @param id
     */
    deleteChild(id: string): Pico | undefined {
        const child = this.getChild(id);

        if (child) {
            for (const grandchild_id of Object.keys(child.children)) {
                child.deleteChild(grandchild_id);
            }
        }

        this.removeChild(id);
        PicoEngine.getInstance().deletePico(id);

        return child;
    }

    addEventResponse(e: PicoEvent, key: string, value: any): void {
        // initialize my responses if not yet initialized
        e.responses[this.id] = e.responses[this.id] || {};

        e.responses[this.id][key] = value;
    }

    setQueryResponse(query: PicoQuery, val: any): void {
        query.response.withFingerprint(this.id).withBody(val);
    }

    /**
     * Custom serialization
     */
    toObject(): {[key: string]: any} {
        return {
            id: this.id,
            rulesets: Object.values(this.rulesets).map(r => r.name),
            channels: this.channels,
            children: Object.values(this.children).map(p => p.toObject())
        };
    }
}