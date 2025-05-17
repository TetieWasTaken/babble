/**
 * Initialises and manages the core engine and interfaces
 *
 * @packageDocumentation
 */

import { startServer } from '../server/index.js';
import { startCli } from '../cli/index.js';
import logger from './logger.js';

export { add, fetch, modify, remove } from '../core/index.js';

logger.warn('Starting server');
await startServer().catch((error: unknown) => {
	logger.error(error);

	if (error instanceof Error) {
		throw new TypeError(error.message);
	}

	throw new Error(String(error));
});

logger.warn('Starting CLI');
await startCli().catch((error: unknown) => {
	logger.error(error);

	if (error instanceof Error) {
		throw new TypeError(error.message);
	}

	throw new Error(String(error));
});
