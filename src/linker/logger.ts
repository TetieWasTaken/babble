import { pino } from "pino";

import path from "node:path";
const logFile = path.resolve(process.cwd(), "logs.log");

const logger = pino({}, pino.destination(logFile));

export default logger;
