import process from 'node:process';
import path from 'node:path';
import { pino } from 'pino';

const logFile = path.resolve(process.cwd(), 'logs.log');
const destination = pino.destination({ dest: logFile, append: true, sync: true });
const logger = pino({}, destination);

export default logger;
