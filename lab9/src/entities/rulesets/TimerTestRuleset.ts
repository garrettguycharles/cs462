import {AbstractRule, AbstractRuleset} from "@entities/rulesets/standard/AbstractRuleset";
import {HandlerDeclaration, Pico} from "@entities/Pico";
import {PicoEvent, PicoQuery} from "@entities/PicoEvent";
import {PicoEngine} from "@entities/PicoEngine";

export class TimerTestRuleset extends AbstractRuleset {
    name = "TimerTestRuleset";
    author = "Garrett Charles";

    counter = 0;

    checkTimer(query: PicoQuery, context: Pico): void {
        context.setQueryResponse(query, this.counter);
    }

    query_functions: { (query: PicoQuery, context: Pico): Promise<void> | void }[] = [
        this.checkTimer.bind(this)
    ];

    rules: AbstractRule<TimerTestRuleset>[] = [
        new class extends AbstractRule<TimerTestRuleset> {
            declare(): HandlerDeclaration {
                return new HandlerDeclaration("test", "start_timer");
            }

            handle(e: PicoEvent, context: Pico): void {
                PicoEngine.getInstance().raiseEvent(
                    new PicoEvent()
                        .withChannel(context.internal_channel)
                        .withDomain("test").withName("increment")
                        .withScheduledDelay(1000)
                );
            }
        }(this),

        new class extends AbstractRule<TimerTestRuleset> {
            declare(): HandlerDeclaration {
                return new HandlerDeclaration("test", "increment");
            }

            handle(e: PicoEvent, context: Pico): void {
                this.ruleset.counter += 1;

                PicoEngine.getInstance().raiseEvent(
                    new PicoEvent()
                        .withChannel(context.internal_channel)
                        .withDomain("test").withName("increment")
                        .withScheduledDelay(1000)
                );
            }
        }(this)
    ];
}