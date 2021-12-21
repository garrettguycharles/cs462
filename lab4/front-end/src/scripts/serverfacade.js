import axios from "axios";

export class ServerFacade {
    constructor() {
        this.host = "localhost";
        this.port = "3000";
        this.eci = "ckxb800s90012k6pzd6gpgkt7";
    }

    getBaseURL() {
        return `http://${this.host}:${this.port}`;
    }

    async raiseEvent(domain, name, attrs={}) {
        let call_url = `${this.getBaseURL()}/sky/event/${this.eci}/none/${domain}/${name}`

        if (Object.keys(attrs).length) {

            call_url += '?' + Object.entries(attrs).map(([k, v]) => {
                return `${k}=${v}`;
            }).join('&');

        }

        // console.log(call_url);

        let res = await axios.post(call_url, {
            attrs
        })

        return res;
    }

    async callFunction(rid, name, args = {}) {
        let call_url = `${this.getBaseURL()}/sky/cloud/${this.eci}/${rid}/${name}`;

        let res = await axios.get(call_url, {
            params: args
        });

        return res;
    }

    async getListOfTemps(rid, function_name) {
        let res = await this.callFunction(rid, function_name);
        let temps = [];
        for (let [time, temp] of Object.entries(res.data)) {
            temps.push({
                time_millis: Date.parse(time),
                timestamp: new Date(Date.parse(time)).toLocaleTimeString(navigator.language, {hour: '2-digit', minute:'2-digit'}),
                temperature: temp
            });
        }

        temps = temps.sort((a, b) => {
            return b.time_millis - a.time_millis;
        });

        return temps;
    }
}