import {AbstractRule, AbstractRuleset} from "@entities/rulesets/standard/AbstractRuleset";
import {HandlerDeclaration, Pico} from "@entities/Pico";
import {PicoEvent, PicoQuery} from "@entities/PicoEvent";
import {pipeline} from "stream";
import {WovynSensorReading} from "@entities/rulesets/lab9/WovynEmulatorRuleset";
import {PicoEngine} from "@entities/PicoEngine";
import {
    GossipMessage,
    GossipSendMessageRequest
} from "@entities/rulesets/standard/GossipNodeRuleset";

export interface TemperatureReading {
    temperature: number;
    timestamp: number;
    current_threshold: number;
}

export enum VIOLATION_INCREMENTS {
    BEGIN_VIOLATION = 1,
    CONTINUING_VIOLATION = 0,
    END_VIOLATION = -1
}

export class SensorPicoRuleset extends AbstractRuleset {
    static RULESET_NAME = "SensorPicoRuleset";
    name = SensorPicoRuleset.RULESET_NAME;
    author = "Garrett Charles";

    violation_threshold = 65;
    inrange_temperatures: TemperatureReading[] = [];
    temperature_violations: TemperatureReading[] = [];
    current_temperature?: TemperatureReading;
    previous_temperature?: TemperatureReading;
    system_violation_count = 0;

    isTempViolation(temp: TemperatureReading): boolean {
        return temp.temperature > temp.current_threshold;
    }

    queryCurrentTemperature(query: PicoQuery, context: Pico): void {
        context.setQueryResponse(query, this.current_temperature);
    }

    querySystemViolationCount(query: PicoQuery, context: Pico): void {
        context.setQueryResponse(query, this.system_violation_count);
    }

    query_functions: { (query: PicoQuery, context: Pico): (Promise<void> | void) }[] = [
        this.queryCurrentTemperature.bind(this),
        this.querySystemViolationCount.bind(this)
    ];

    rules: AbstractRule<SensorPicoRuleset>[] = [
        new class extends AbstractRule<SensorPicoRuleset> {
            declare(): HandlerDeclaration {
                return new HandlerDeclaration("wovyn", "heartbeat");
            }

            handle(e: PicoEvent, context: Pico): Promise<void> | void {
                const {payload} = e.attributes;
                const heartbeat = payload as WovynSensorReading;

                const newTempReading = {
                    current_threshold: this.ruleset.violation_threshold,
                    temperature: heartbeat.temperature,
                    timestamp: heartbeat.timestamp
                }

                this.ruleset.previous_temperature = this.ruleset.current_temperature;
                this.ruleset.current_temperature = newTempReading;

                if (newTempReading.temperature > newTempReading.current_threshold) {
                    PicoEngine.getInstance().raiseEvent(
                        new PicoEvent()
                            .withChannel(context.internal_channel)
                            .withDomain("sensor")
                            .withName("threshold_violation")
                            .withAttribute<TemperatureReading>("payload", newTempReading)
                    );

                    this.ruleset.temperature_violations.push(newTempReading);
                }
                else {
                    PicoEngine.getInstance().raiseEvent(
                        new PicoEvent()
                            .withChannel(context.internal_channel)
                            .withDomain("sensor")
                            .withName("inrange_reading")
                            .withAttribute<TemperatureReading>("payload", newTempReading)
                    );

                    this.ruleset.inrange_temperatures.push(newTempReading);
                }

                // send out gossip message
                PicoEngine.getInstance().raiseEvent(
                    new PicoEvent()
                        .withChannel(context.internal_channel)
                        .withDomain("gossip")
                        .withName("send_message")
                        .withAttribute<GossipSendMessageRequest>("payload",
                            new class implements GossipSendMessageRequest {
                                message_type = "TEMPERATURE_SENSOR_READING";
                                body = newTempReading;
                            }
                        )
                );
            }
        }(this),

        /**
         * Respond to threshold violations
         */
        new class extends AbstractRule<SensorPicoRuleset> {
            declare(): HandlerDeclaration {
                return new HandlerDeclaration("sensor", "threshold_violation");
            }

            handle(e: PicoEvent, context: Pico): Promise<void> | void {
                // send threshold violation gossip message

                if (!this.ruleset.previous_temperature
                    || !this.ruleset.isTempViolation(this.ruleset.previous_temperature)) {
                    // new temperature violation
                    PicoEngine.getInstance().raiseEvent(
                        new PicoEvent()
                            .withChannel(context.internal_channel)
                            .withDomain("gossip")
                            .withName("send_message")
                            .withAttribute<GossipSendMessageRequest>("payload",
                                new class implements GossipSendMessageRequest {
                                    message_type = "VIOLATION_COUNT";
                                    body = VIOLATION_INCREMENTS.BEGIN_VIOLATION;
                                })
                    );

                }

                if (this.ruleset.previous_temperature
                    && this.ruleset.isTempViolation(this.ruleset.previous_temperature)) {
                    // continuing temperature violation
                    PicoEngine.getInstance().raiseEvent(
                        new PicoEvent()
                            .withChannel(context.internal_channel)
                            .withDomain("gossip")
                            .withName("send_message")
                            .withAttribute<GossipSendMessageRequest>("payload",
                                new class implements GossipSendMessageRequest {
                                    message_type = "VIOLATION_COUNT";
                                    body = VIOLATION_INCREMENTS.CONTINUING_VIOLATION;
                                })
                    );
                }
            }
        }(this),

        /**
         * Respond to inrange temperature readings
         */
        new class extends AbstractRule<SensorPicoRuleset> {
            declare(): HandlerDeclaration {
                return new HandlerDeclaration("sensor", "inrange_reading");
            }

            handle(e: PicoEvent, context: Pico): Promise<void> | void {
                if (this.ruleset.previous_temperature
                    && this.ruleset.isTempViolation(this.ruleset.previous_temperature)) {
                    // end temperature violation
                    PicoEngine.getInstance().raiseEvent(
                        new PicoEvent()
                            .withChannel(context.internal_channel)
                            .withDomain("gossip")
                            .withName("send_message")
                            .withAttribute<GossipSendMessageRequest>("payload",
                                new class implements GossipSendMessageRequest {
                                    message_type = "VIOLATION_COUNT";
                                    body = VIOLATION_INCREMENTS.END_VIOLATION;
                                })
                    );
                }
            }
        }(this),

        /**
         * Respond to VIOLATION_COUNT messages
         */
        new class extends AbstractRule<SensorPicoRuleset> {
            declare(): HandlerDeclaration {
                return new HandlerDeclaration("gossip", "message_received");
            }

            handle(e: PicoEvent, context: Pico): Promise<void> | void {
                const {payload} = e.attributes;

                const msg = payload as GossipMessage;

                if (!msg) {
                    return;
                }

                if (msg.message_type === "VIOLATION_COUNT") {
                    // apply increment to current violation counts
                    this.ruleset.system_violation_count += msg.body;
                    console.log(`Applying increment to ${context.id}: ${Number(msg.body)}`);
                }
            }
        }(this)
    ];
}