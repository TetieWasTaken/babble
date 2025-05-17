/**
 * Initialises and manages the core engine and interfaces
 *
 * @packageDocumentation
 */

import { startServer } from '../server/index.js';
import { startCli } from '../cli/index.js';
import logger from './logger.js';
import process from 'node:process';

export { add, fetch, modify, remove } from '../core/index.js';

logger.warn('Starting server');
const fastify = await startServer().catch((error: unknown) => {
	logger.error(error);

	if (error instanceof Error) {
		throw new TypeError(error.message);
	}

	throw new Error(String(error));
});

const shutdown = async () => {
	logger.warn('Received shutdown signal');
	await fastify.close();
	process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

logger.warn('Starting CLI');
await startCli().catch((error: unknown) => {
	if (error instanceof Error && error.message.includes('User force closed the prompt')) {
		shutdown();
	} else {
		logger.error(error);

		if (error instanceof Error) {
			throw new TypeError(error.message);
		}

		throw new Error(String(error));
	}
});

await fastify.close();
