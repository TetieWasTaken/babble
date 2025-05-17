import process from 'node:process';
import path from 'node:path';
import { pino } from 'pino';

const logFile = path.resolve(process.cwd(), 'logs.log');

const logger = pino({}, pino.destination(logFile));

export default logger;
