import { type FastifyRequest, type FastifyReply } from 'fastify';
import { add, fetch, modify, remove, getUids, createNew, fetchAll } from '../linker/index.js';
import { getPubKey } from './key.js';

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

type ParameterRequest = { Params: { uid: string; '*': string } };

type Route = {
	method: Method;
	url: string;
	handler: (request: FastifyRequest<ParameterRequest>, reply: FastifyReply) => void;
};

const routes: Route[] = [
	{
		method: Method.POST,
		url: '/server/:uid/add/*',
		async handler(request, reply) {
			const uid = request.params.uid;
			const key = request.params['*'];
			const document = request.body as Record<string, unknown>;

			try {
				const created = await add(key, document, uid);
				return await reply.code(201).send({
					data: { key, document: created },
					meta: { timestamp: new Date() },
				});
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error';

				return reply.code(500).send({
					errors: [{ code: 'failed', message }],
				});
			}
		},
	},
	{
		method: Method.GET,
		url: '/server/:uid/fetch/*',
		async handler(request, reply) {
			const uid = request.params.uid;
			const key = request.params['*'];

			try {
				const result = await fetch(key, uid);
				if (result === undefined) {
					return await reply.code(404).send({
						errors: [{ code: 'not_found', message: `No document was found at key ${key}.` }],
					});
				}

				return await reply.code(200).send({
					data: { key, document: result },
					meta: { timestamp: new Date() },
				});
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error';

				return reply.code(500).send({
					errors: [{ code: 'failed', message }],
				});
			}
		},
	},
	{
		method: Method.PATCH,
		url: '/server/:uid/modify/*',
		async handler(request, reply) {
			const uid = request.params.uid;
			const key = request.params['*'];
			const patch = request.body as Record<string, unknown>;

			try {
				const updated = await modify(key, patch, uid);
				return await reply.code(200).send({
					data: { key, document: updated },
					meta: { timestamp: new Date() },
				});
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error';

				return reply.code(500).send({
					errors: [{ code: 'failed', message }],
				});
			}
		},
	},
	{
		method: Method.DELETE,
		url: '/server/:uid/remove/*',
		async handler(request, reply) {
			const uid = request.params.uid;
			const key = request.params['*'];

			try {
				await remove(key, uid);
				return await reply.code(200).send({ data: { key }, meta: { timestamp: new Date() } });
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error';

				return reply.code(500).send({
					errors: [{ code: 'failed', message }],
				});
			}
		},
	},
	{
		method: Method.GET,
		url: '/server/uid',
		async handler(_, reply) {
			try {
				const uids = await getUids();
				return await reply.code(200).send({ data: { uids }, meta: { timestamp: new Date() } });
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error';

				return reply.code(500).send({
					errors: [{ code: 'failed', message }],
				});
			}
		},
	},
	{
		method: Method.POST,
		url: '/server/new/:uid',
		async handler(request, reply) {
			const uid = request.params.uid;

			try {
				const created = await createNew(uid);
				return await reply.code(201).send({ data: { key: created }, meta: { timestamp: new Date() } });
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error';

				return reply.code(500).send({
					errors: [{ code: 'failed', message }],
				});
			}
		},
	},
	{
		method: Method.GET,
		url: '/server/:uid/export',
		async handler(request, reply) {
			const uid = request.params.uid;

			try {
				const data = await fetchAll(uid);
				return await reply.code(201).send({ data: { document: data }, meta: { timestamp: new Date() } });
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error';

				return reply.code(500).send({
					errors: [{ code: 'failed', message }],
				});
			}
		},
	},
	{
		method: Method.GET,
		url: '/server/pubkey',
		async handler(request, reply) {
			try {
				const key = await getPubKey();
				return await reply.code(201).send({ data: { key }, meta: { timestamp: new Date() } });
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error';

				return reply.code(500).send({
					errors: [{ code: 'failed', message }],
				});
			}
		},
	},
];

export default routes;
