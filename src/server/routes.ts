import { type FastifyRequest, type FastifyReply } from 'fastify';
import { add, fetch, modify, remove } from '../linker/index.js';

export enum Method {
	GET = 'GET',
	HEAD = 'HEAD',
	TRACE = 'TRACE',
	DELETE = 'DELETE',
	OPTIONS = 'OPTIONS',
	PATCH = 'PATCH',
	PUT = 'PUT',
	POST = 'POST',
}

type Wildcard = { Params: { '*': string } };

type Route = {
	method: Method;
	url: string;
	handler: (request: FastifyRequest<Wildcard>, reply: FastifyReply) => void;
};

const routes: Route[] = [
	{
		method: Method.POST,
		url: '/server/add/*',
		async handler(request, reply) {
			const key = request.params['*'];
			const document = request.body as Record<string, unknown>;
			try {
				const created = await add(key, document);
				return reply.code(201).send({
					data: { key, document: created },
					meta: { timestamp: new Date() },
				});
			} catch (err) {
				return reply.code(500).send({
					errors: [{ code: 'failed', message: err.message }],
				});
			}
		},
	},
	{
		method: Method.GET,
		url: '/server/fetch/*',
		async handler(request, reply) {
			const key = request.params['*'];
			try {
				const result = await fetch(key);
				if (result === undefined) {
					return reply.code(404).send({
						errors: [{ code: 'not_found', message: `No document was found at key ${key}.` }],
					});
				}

				return reply.code(200).send({
					data: { key, document: result },
					meta: { timestamp: new Date() },
				});
			} catch (err) {
				return reply.code(500).send({
					errors: [{ code: 'failed', message: err.message }],
				});
			}
		},
	},
	{
		method: Method.PATCH,
		url: '/server/modify/*',
		async handler(request, reply) {
			const key = request.params['*'];
			const patch = request.body as Record<string, unknown>;
			try {
				const updated = await modify(key, patch);
				return reply.code(200).send({
					data: { key, document: updated },
					meta: { timestamp: new Date() },
				});
			} catch (err) {
				return reply.code(500).send({
					errors: [{ code: 'failed', message: err.message }],
				});
			}
		},
	},
	{
		method: Method.DELETE,
		url: '/server/remove/*',
		async handler(request, reply) {
			const key = request.params['*'];

			try {
				await remove(key);
				return reply.code(200).send({ data: { key }, meta: { timestamp: new Date() } });
			} catch (err) {
				return reply.code(500).send({
					errors: [{ code: 'failed', message: err.message }],
				});
			}
		},
	},
];

export default routes;
