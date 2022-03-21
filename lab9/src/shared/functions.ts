import logger from './Logger';

export const pErr = (err: Error) => {
    if (err) {
        logger.err(err);
    }
};

export const getRandomInt = (lo: number, hi: number): number => {
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
};
