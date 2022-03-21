import {Pico} from "@entities/Pico";
import {WovynEmulatorRuleset} from "@entities/rulesets/lab9/WovynEmulatorRuleset";
import {SensorPicoRuleset} from "@entities/rulesets/lab9/SensorPicoRuleset";

const p1 = new Pico().withId("Pico1");
p1.installRuleset(new WovynEmulatorRuleset(p1));
p1.installRuleset(new SensorPicoRuleset(p1));
p1.channels.push("default1");

const p2 = new Pico().withId("Pico2");
p2.installRuleset(new WovynEmulatorRuleset(p2));
p2.installRuleset(new SensorPicoRuleset(p2));
p2.channels.push("default2");

const p3 = new Pico().withId("Pico3");
p3.installRuleset(new WovynEmulatorRuleset(p3));
p3.installRuleset(new SensorPicoRuleset(p3));
p3.channels.push("default3");

const p4 = new Pico().withId("Pico4");
p4.installRuleset(new WovynEmulatorRuleset(p4));
p4.installRuleset(new SensorPicoRuleset(p4));
p4.channels.push("default4");

export const picos: Pico[] = [
    p1, p2, p3, p4
];

export default picos;