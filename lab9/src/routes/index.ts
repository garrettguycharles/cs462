import { Router } from 'express';
import {PicoEvent, PicoQuery, RequestAttribute} from "@entities/PicoEvent";
import {PicoEngine} from "@entities/PicoEngine";

// Export the base-router
const apiRouter = Router();

apiRouter.get("/queue", async (req, res) => {
    return res.status(200).send(PicoEngine.getInstance().event_queue);
});

apiRouter.get("/history", async (req, res) => {
    return res.status(200).send(PicoEngine.getInstance().event_history);
});

apiRouter.get("/picos", async (req, res) => {
    return res.status(200).json(PicoEngine.getInstance().picos.map(p => p.toObject()));
});

apiRouter.get('/sky/query/:channel/:ruleset_name/:function_name', async (req, res) => {
    const {channel, ruleset_name, function_name} = req.params;

    const queryObj = new PicoQuery();

    if (req && req.query) {
        queryObj.attributes = req.query;
    }

    queryObj.ruleset_name = ruleset_name;
    queryObj.function_name = function_name;

    await PicoEngine.getInstance().handleQuery(channel, queryObj);

    return res.status(200).json(queryObj.response.body);
});

apiRouter.post('/sky/event/:channel/:domain/:name', async (req, res) => {
    const {channel, domain, name} = req.params;

    console.log("body:", req.body, Object.entries(req.body));

    const eventObj = new PicoEvent()
        .withDomain(domain)
        .withName(name)
        .withTargetUrl(PicoEngine.getInstance().getSelfHost())
        .withChannel(channel);

    if (req && req.body) {
        eventObj.attributes = req.body;
    }

    eventObj.domain = domain;
    eventObj.name = name;

    await PicoEngine.getInstance().handleEvent(eventObj);

    return res.status(200).json(eventObj);
});

export default apiRouter;
