/**
 * Initialises and manages the core engine and interfaces
 *
 * @packageDocumentation
 */

import process from 'node:process';
import { type FastifyInstance } from 'fastify';
import { startServer } from '../server/index.js';
import { startCli } from '../cli/index.js';
import { job } from '../core/index.js';
import logger from './logger.js';
import { Argtype, startCommander } from './arguments.js';

export { add, fetch, modify, remove, getUids, createNew, fetchAll } from '../core/index.js';

let fastify: FastifyInstance;

logger.info('start');
const shutdown = async () => {
	logger.warn('Received shutdown signal');
	if (job) await job.stop();
	if (fastify) await fastify.close();
};

logger.warn('Starting commander');
const commanderResult = await startCommander();
if (commanderResult === Argtype.EXIT) {
	await shutdown();
	process.exit(0);
}

logger.warn('Starting server');
fastify = await startServer().catch((error: unknown) => {
	logger.error(error);

	if (error instanceof Error) {
		throw new TypeError(error.message);
	}

	throw new Error(String(error));
});

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

logger.warn('Starting CLI');
if (commanderResult !== Argtype.SERVER) {
	await startCli().catch(async (error: unknown) => {
		if (error instanceof Error && error.message.includes('User force closed the prompt')) {
			await shutdown();
			return 'exit';
		}

		logger.error(error);

		if (error instanceof Error) {
			throw new TypeError(error.message);
		}

		throw new Error(String(error));
	});

	await shutdown();
}
