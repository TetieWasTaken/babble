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
			await add(key, document);
			await reply.send({ status: 'ok', key, doc: document });
		},
	},
	{
		method: Method.GET,
		url: '/server/fetch/*',
		async handler(request, reply) {
			const key = request.params['*'];
			const result = await fetch(key);
			await reply.send({ status: 'ok', key, result });
		},
	},
	{
		method: Method.PATCH,
		url: '/server/modify/*',
		async handler(request, reply) {
			const key = request.params['*'];
			const patch = request.body as Record<string, unknown>;
			await modify(key, patch);
			await reply.send({ status: 'ok', key, patch });
		},
	},
	{
		method: Method.DELETE,
		url: '/server/remove/*',
		async handler(request, reply) {
			const key = request.params['*'];
			await remove(key);
			await reply.send({ status: 'ok', key });
		},
	},
];

export default routes;
