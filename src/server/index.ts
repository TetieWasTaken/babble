/**
 * Initialises and manages the babble server
 *
 * @remarks
 * Uses the fastify framework. See https://fastify.dev/.
 *
 * @packageDocumentation
 */

import fastifyFactory from 'fastify';
import logger from '../linker/logger.js';
import routes from './routes.js';
import { generateKeys } from './key.js';

export async function startServer() {
	logger.info('Generating new keys');
	generateKeys();

	logger.info('Initialising Fastify');
	const fastify = fastifyFactory({ loggerInstance: logger });

	for (const route of routes) {
		fastify.route(route);
	}

	try {
		logger.info('Listening on 6363');
		await fastify.listen({ port: 6363 });
	} catch (error: unknown) {
		fastify.log.error(error);

		if (error instanceof Error) {
			throw new TypeError(error.message);
		}

		throw new Error(String(error));
	}

	return fastify;
}
