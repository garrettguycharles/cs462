export abstract class Attribute {
    key: string;
    value: any;


    constructor(key: string, value: any) {
        this.key = key;
        this.value = value;
    }
}

export class RequestAttribute extends Attribute {}

export class ResponseAttribute extends Attribute {
    fingerprint = "";

    withFingerprint(fp: string): ResponseAttribute {
        this.fingerprint = fp;
        return this;
    }
}

export class PicoEvent {
    domain = "";
    name = "";
    target_url = "";
    channel = "";
    attributes: {[key:string]: any} = {};
    responses: {[key:string]: any} = {};
    trigger_time = Date.now();

    withDomain(d: string): PicoEvent {
        this.domain = d;
        return this;
    }

    withName(n: string): PicoEvent {
        this.name = n;
        return this;
    }

    withTargetUrl(url: string): PicoEvent {
        this.target_url = url;
        return this;
    }

    withChannel(channel: string): PicoEvent {
        this.channel = channel;
        return this;
    }

    withTriggerTime(time: number): PicoEvent {
        this.trigger_time = time;
        return this;
    }

    withScheduledDelay(ms: number): PicoEvent {
        this.trigger_time = new Date(Date.now() + ms).getTime();
        return this;
    }

    withAttribute<T>(key: string, value: T): PicoEvent {
        this.attributes[key] = value;
        return this;
    }

    getAttribute(key: string, fallback: any = undefined): any {
        const val = this.attributes[key];

        if (val === undefined) {
            return fallback;
        }

        return val;
    }
}

class QueryResponse {
    fingerprint = "";
    body: any = null;

    withFingerprint(f: string): QueryResponse {
        this.fingerprint = f;
        return this;
    }

    withBody(b: any): QueryResponse {
        this.body = b;
        return this;
    }
}

export class PicoQuery {
    ruleset_name = "";
    function_name = "";
    attributes: {[key:string]: any} = {};
    response = new QueryResponse();

    getAttribute(key: string, fallback: any = undefined): any {
        const val = this.attributes[key];

        if (val === undefined) {
            return fallback;
        }

        return val;
    }
}

