/**
 * Initialises and manages the core engine and interfaces
 *
 * @packageDocumentation
 */

import logger from "./logger.js";
import { startServer } from "../server/index.js";
import { startCLI } from "../cli/index.js";
export { add, fetch, modify, remove } from "../core/index.js";

logger.warn("Starting server");
startServer();

logger.warn("Starting CLI");
startCLI();
