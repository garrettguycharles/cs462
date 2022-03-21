import {AbstractRule, AbstractRuleset} from "@entities/rulesets/standard/AbstractRuleset";
import {HandlerDeclaration, Pico} from "@entities/Pico";
import {PicoEvent, PicoQuery} from "@entities/PicoEvent";
import {getRandomInt} from "@shared/functions";
import {PicoEngine} from "@entities/PicoEngine";

export interface WovynSensorReading {
    timestamp: number;
    temperature: number;
}

export class WovynEmulatorRuleset extends AbstractRuleset {
    static RULESET_NAME = "WovynEmulatorRuleset";
    name = WovynEmulatorRuleset.RULESET_NAME;
    author = "Garrett Charles";

    heartbeat_interval = 5000;

    getNewSensorReadingToSend(): WovynSensorReading {
        return new class implements WovynSensorReading {
            temperature = getRandomInt(50, 80);
            timestamp = Date.now();
        }
    }

    query_functions: { (query: PicoQuery, context: Pico): (Promise<void> | void) }[] = [

    ];

    rules: AbstractRule<WovynEmulatorRuleset>[] = [
        new class extends AbstractRule<WovynEmulatorRuleset> {
            declare(): HandlerDeclaration {
                return new HandlerDeclaration("wovyn", "send_heartbeat");
            }

            handle(e: PicoEvent, context: Pico): Promise<void> | void {
                PicoEngine.getInstance().raiseEvent(
                    new PicoEvent()
                        .withChannel(context.internal_channel)
                        .withDomain("wovyn")
                        .withName("heartbeat")
                        .withAttribute<WovynSensorReading>("payload",
                            this.ruleset.getNewSensorReadingToSend())
                );

                // continue scheduled heartbeats
                PicoEngine.getInstance().raiseEvent(
                    new PicoEvent()
                        .withChannel(context.internal_channel)
                        .withDomain("wovyn")
                        .withName("send_heartbeat")
                        .withScheduledDelay(this.ruleset.heartbeat_interval)
                );
            }
        }(this)
    ];

    onInstall(context: Pico): Promise<void> | void {
        // start the automatic temperature heartbeat

        setImmediate(() => {
            PicoEngine.getInstance().raiseEvent(
                new PicoEvent()
                    .withChannel(context.internal_channel)
                    .withDomain("wovyn")
                    .withName("send_heartbeat")
            );
        });
    }
}