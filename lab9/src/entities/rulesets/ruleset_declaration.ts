import {AbstractRuleset} from "@entities/rulesets/standard/AbstractRuleset";
import {SubscriptionRuleset} from "@entities/rulesets/standard/SubscriptionRuleset";

/**
 * Use this to declare installable rulesets.
 */
export const rulesets: {[key: string]: AbstractRuleset} = {};