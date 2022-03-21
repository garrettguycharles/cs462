import {HandlerDeclaration, IEventHandler, Pico} from "@entities/Pico";
import {PicoEvent, PicoQuery} from "@entities/PicoEvent";

export abstract class AbstractRule <T extends AbstractRuleset> implements IEventHandler {
    ruleset: T;

    constructor(ruleset: T) {
        this.ruleset = ruleset;
    }

    abstract declare(): HandlerDeclaration;

    abstract handle(e: PicoEvent, context: Pico): Promise<void> | void;
}

export abstract class AbstractRuleset {
    abstract name: string;
    abstract author: string;
    context: Pico;

    /**
     * List functions here if you want them to respond to queries.
     *
     * Declare them like normal class functions in the ruleset, and then
     * bind them to "this" in the array.  Example:
     *
     * testFunction(q: PicoQuery, context: Pico): Promise<void> {do stuff}
     *
     * callable_functions = [
     *   this.testFunction.bind(this),
     *   ...
     * ];
     */
    abstract query_functions: { (query: PicoQuery, context: Pico): Promise<void> | void }[];
    abstract rules: AbstractRule<AbstractRuleset>[];


    constructor(context: Pico) {
        this.context = context;
    }

    /**
     * Will be called by the context Pico when this ruleset is installed.
     *
     * @param context
     */
    public onInstall(context: Pico): Promise<void> | void {
        return Promise.resolve();
    }

    async callFunction(query: PicoQuery, context: Pico): Promise<void> {
        for (const f of this.query_functions) {
            const fnamearr = f.name.split(/\s+/);

            const fname = (fnamearr.length) ? fnamearr[fnamearr.length - 1] : f.name;

            if (fname.trim() === query.function_name.trim()) {
                await f(query, context);
            }
        }
    }

    async handleEvent(e: PicoEvent, context: Pico): Promise<void> {
        for (const rule of this.rules) {
            if (rule.declare().domain === e.domain && rule.declare().name === e.name) {
                await rule.handle(e, context);
            } else {
                // console.log(rule.declare(), e.domain, e.name);
            }
        }

        return Promise.resolve();
    }
}