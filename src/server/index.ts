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

export async function startServer() {
	const fastify = fastifyFactory({ loggerInstance: logger });

	for (const route of routes) {
		fastify.route(route);
	}

	try {
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
