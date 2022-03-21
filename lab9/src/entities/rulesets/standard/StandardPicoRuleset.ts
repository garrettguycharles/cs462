import {AbstractRule, AbstractRuleset} from "@entities/rulesets/standard/AbstractRuleset";
import {HandlerDeclaration, Pico} from "@entities/Pico";
import {PicoEvent, PicoQuery} from "@entities/PicoEvent";
import {SubscriptionRuleset} from "@entities/rulesets/standard/SubscriptionRuleset";
import {PicoEngine} from "@entities/PicoEngine";

export interface PicoCreateChildRequest {
    new_child_id: string;
}

interface PicoDeleteChildRequest {
    child_id: string;
}

export class StandardPicoRuleset extends AbstractRuleset {
    public static RULESET_NAME = "ts-picos-standard-pico-ruleset";

    name = StandardPicoRuleset.RULESET_NAME;
    author = "Garrett Charles";

    queryChildren(query: PicoQuery, context: Pico) {
        const toReturn = Object.values(this.context.children).map(c => c.toObject());

        context.setQueryResponse(query, toReturn);
    }

    query_functions: { (query: PicoQuery, context: Pico): (Promise<void> | void) }[] = [
        this.queryChildren.bind(this)
    ];

    rules: AbstractRule<StandardPicoRuleset>[] = [
        new class extends AbstractRule<StandardPicoRuleset> {
            declare(): HandlerDeclaration {
                return new HandlerDeclaration("pico", "create_child");
            }

            handle(e: PicoEvent, context: Pico): Promise<void> | void {
                const {payload} = e.attributes;

                const req = payload as PicoCreateChildRequest

                let newChild: Pico;

                if (req.new_child_id) {
                    newChild = new Pico()
                        .withId(req.new_child_id);

                    context.addChild(newChild);
                } else {
                    newChild = context.createChild();
                }

                context.addEventResponse(
                    e,
                    "message",
                    `New child created with id: ${newChild.id}`
                );

                PicoEngine.getInstance().raiseEvent(
                    new PicoEvent()
                        .withChannel(context.internal_channel)
                        .withDomain("pico")
                        .withName("child_added")
                        .withAttribute<Pico>("payload", newChild)
                );
            }
        }(this),

        new class extends AbstractRule<StandardPicoRuleset> {
            declare(): HandlerDeclaration {
                return new HandlerDeclaration("pico", "delete_child");
            }

            handle(e: PicoEvent, context: Pico): Promise<void> | void {
                const {payload} = e.attributes;

                const delReq = payload as PicoDeleteChildRequest;

                const outcome = context.deleteChild(delReq.child_id || "");

                if (outcome) {
                    context.addEventResponse(e, "message", `Child id ${outcome.id} deleted.`);
                } else {
                    context.addEventResponse(
                        e,
                        "message",
                        `No child found with that id.  No child deleted.`);
                }
            }
        }(this)
    ];


}