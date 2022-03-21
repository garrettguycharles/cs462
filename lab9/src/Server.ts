import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import helmet from 'helmet';

import express, { NextFunction, Request, Response } from 'express';
import StatusCodes from 'http-status-codes';
import 'express-async-errors';

import apiRouter from './routes';
import logger from '@shared/Logger';
import bodyParser from "body-parser";
import {PicoEngine} from "@entities/PicoEngine";

const app = express();
const { BAD_REQUEST } = StatusCodes;



/************************************************************************************
 *                              Set basic express settings
 ***********************************************************************************/

// ALLOW CORS
app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());

app.use(bodyParser());

// Show routes called in console during development
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Security
if (process.env.NODE_ENV === 'production') {
    app.use(helmet());
}

app.use((req: Request, res: Response, next: NextFunction) => {
    const protocol = req.protocol;
    const host = req.hostname;
    const url = req.originalUrl;
    const port = process.env.PORT || 5000;

    const baseUrl = `${protocol}://${host}:${port}`;
    PicoEngine.getInstance().setSelfHost(baseUrl);

    next();
});

// Add APIs
app.use('/api', apiRouter);

// Print API errors
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.err(err, true);
    return res.status(BAD_REQUEST).json({
        error: err.message,
    });
});



/************************************************************************************
 *                              Serve front-end content
 ***********************************************************************************/

// const viewsDir = path.join(__dirname, 'views');
// app.set('views', viewsDir);
// const staticDir = path.join(__dirname, 'public');
// app.use(express.static(staticDir));
// app.get('*', (req: Request, res: Response) => {
//     res.sendFile('index.html', {root: viewsDir});
// });

// Export express instance
export default app;
