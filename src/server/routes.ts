import { add, fetch, modify, remove } from "../linker/index.js";
import logger from "../linker/logger.js";

enum Method {
	GET = "GET",
	HEAD = "HEAD",
	TRACE = "TRACE",
	DELETE = "DELETE",
	OPTIONS = "OPTIONS",
	PATCH = "PATCH",
	PUT = "PUT",
	POST = "POST",
}

interface Route {
	method: Method;
	url: string;
	handler: (request: any, reply: any) => void;
}

const routes: Route[] = [
	{
		method: Method.POST,
		url: "/server/add/:key",
		async handler(request, reply) {
			const { key } = request.params;
			const doc = request.body;
			logger.warn(doc);
			await add(key, doc);
			reply.send({ status: "ok", key, doc });
		},
	},
	{
		method: Method.GET,
		url: "/server/fetch/:key",
		async handler(request, reply) {
			const { key } = request.params;
			const result = await fetch(key);
			reply.send({ status: "ok", key, result });
		},
	},
	{
		method: Method.PATCH,
		url: "/server/modify/:key",
		async handler(request, reply) {
			const { key } = request.params;
			const patch = request.body;
			await modify(key, patch);
			reply.send({ status: "ok", key, patch });
		},
	},
	{
		method: Method.DELETE,
		url: "/server/remove/:key",
		async handler(request, reply) {
			const { key } = request.params;
			await remove(key);
			reply.send({ status: "ok", key });
		},
	},
];

export default routes;
