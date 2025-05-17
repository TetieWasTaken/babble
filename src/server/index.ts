/**
 * Initialises and manages the babble server
 *
 * @remarks
 * Uses the fastify framework. See https://fastify.dev/.
 *
 * @packageDocumentation
 */

import Fastify from "fastify";
import logger from "../linker/logger.js";
import routes from "./routes.js";

export async function startServer() {
	const fastify = Fastify({ loggerInstance: logger });

	for (const route of routes) {
		fastify.route(route);
	}

	try {
		await fastify.listen({ port: 6363 });
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
}
