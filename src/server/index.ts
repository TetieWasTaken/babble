/**
 * Initialises and manages the babble server
 *
 * @remarks
 * Uses the fastify framework. See https://fastify.dev/.
 *
 * @packageDocumentation
 */

import fastifyFactory from 'fastify';
import basicAuth from '@fastify/basic-auth';
import logger from '../linker/logger.js';
import routes from './routes.js';

const users = {
	alice: 'password123',
	bob: 'hunter2',
};

export async function startServer() {
	const fastify = await fastifyFactory({ loggerInstance: logger });
	const authenticate = { realm: 'Westeros' };
	fastify.register(basicAuth, { validate, authenticate });
	async function validate(username, password, req, reply) {
		if (username !== 'bob' || password !== users.bob) {
			return new Error('Authorisation failed');
		}
	}

	fastify.after(() => {
		// @ts-ignore
		fastify.addHook('onRequest', fastify.basicAuth);
	});

	for (const route of routes) {
		fastify.route(route);
	}

	try {
		await fastify.listen({ port: 6363 });
	} catch (error) {
		fastify.log.error(error);
		throw error instanceof Error ? new TypeError(error.message) : new Error(String(error));
	}

	return fastify;
}
