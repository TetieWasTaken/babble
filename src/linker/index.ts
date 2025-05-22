/**
 * Initialises and manages the core engine and interfaces
 *
 * @packageDocumentation
 */

import process from 'node:process';
import { startServer } from '../server/index.js';
import { startCli } from '../cli/index.js';
import logger from './logger.js';

export { add, fetch, modify, remove, getUids, createNew } from '../core/index.js';

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
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

logger.warn('Starting CLI');
await startCli().catch(async (error: unknown) => {
	if (error instanceof Error && error.message.includes('User force closed the prompt')) {
		await shutdown();
	} else {
		logger.error(error);

		if (error instanceof Error) {
			throw new TypeError(error.message);
		}

		throw new Error(String(error));
	}
});

await fastify.close();
