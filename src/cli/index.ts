import { select, editor, search, input, Separator } from '@inquirer/prompts';
import fetch from 'node-fetch';
import { distance } from 'fastest-levenshtein';
import { Method } from '../server/routes.js';
import { getAllKeyPaths } from '../core/index.js';

type Action = {
	action: 'add' | 'fetch' | 'modify' | 'remove';
};

type RequestResult = {
	status: string;
	data: { key: string; document?: unknown; uids?: string[] };
	meta: { timestamp: Date };
};

const methodMap: Record<Action['action'], Method> = {
	add: Method.POST,
	fetch: Method.GET,
	modify: Method.PATCH,
	remove: Method.DELETE,
};

const instructions = { navigation: 'Move up or down using the arrow keys', pager: '' };
const theme = {
	helpMode: 'always' as const,
};

async function sendRequest(path: string, method: Method, body?: Record<string, unknown> | undefined) {
	const url = `http://localhost:6363/server/${path}`;

	const result = await fetch(url, {
		method,
		...(body
			? {
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body),
				}
			: {}),
	});

	return result;
}

function getAutocomplete(input: string | undefined, options: string[]) {
	if (!input || input.length < 2) {
		return [];
	}

	return options
		.map((k) => ({ key: k, dist: distance(k, input) }))
		.filter((item) => item.dist < 5)
		.sort((a, b) => a.dist - b.dist)
		.map((item) => item.key);
}

export async function startCli() {
	let exit = false;

	console.log('\x1b[1;91m BABBLE \x1b[0;32mv1.0.0 \x1b[0m');

	const uidResponse = await sendRequest('uid', Method.GET);
	if (!uidResponse.ok) {
		console.error(uidResponse);
		return;
	}

	const uidList = (await uidResponse.json()) as RequestResult;

	const isExisting = await select({
		message: 'Use an existing database, or choose a new one:',
		choices: [
			{
				name: 'existing',
				value: true,
				description: 'Chooses an existing database to use',
				disabled: (uidList.data.uids?.length ?? 0) === 0,
			},
			{ name: 'new', value: false, description: 'Exits the CLI and shuts down the server' },
		],
		instructions,
		theme,
	});

	let uid: string;

	if (isExisting) {
		uid = await search({
			message: 'Database uid:',
			async source(input, { signal }) {
				return getAutocomplete(input, uidList.data.uids ?? []);
			},
			theme,
		});
	} else {
		const newUid = await input({ message: 'New database uid:' });

		const result = await sendRequest(`new/${newUid}`, Method.POST);
		if (!result.ok) {
			console.error(result);
			return;
		}

		const jsonResult = (await result.json()) as RequestResult;
		uid = jsonResult.data.key;
	}

	/* eslint-disable no-await-in-loop */
	while (!exit) {
		const action = await select({
			message: 'Choose an action:',
			choices: [
				{ name: 'add', value: 'add', description: 'Add an entry to the database' },
				{ name: 'fetch', value: 'fetch', description: 'Fetch an entry from the database' },
				{ name: 'modify', value: 'modify', description: 'Modify an entry in the database' },
				{ name: 'remove', value: 'remove', description: 'Remove an entry in the database' },
				new Separator(),
				{ name: 'exit', value: 'exit', description: 'Exits the CLI and shuts down the server' },
			],
			instructions,
			theme,
		});

		if (action === 'exit') {
			exit = true;
			break;
		}

		const keys = await getAllKeyPaths(uid);
		let key = '';

		if (action === 'add') {
			key = await input({ message: 'Document key:' });
		} else {
			key = await search({
				message: 'Document key:',
				async source(input, { signal }) {
					return getAutocomplete(input, keys);
				},
				theme,
			});
		}

		let body: Record<string, unknown> | undefined;
		if (action === 'add' || action === 'modify') {
			let existing: RequestResult = {
				status: '',
				data: { key, document: {} },
				meta: { timestamp: new Date() },
			};

			if (action === 'modify') {
				const result = await sendRequest(`${uid}/fetch/${key}`, Method.GET);
				if (!result.ok) {
					console.error(result);
					return;
				}

				existing = (await result.json()) as RequestResult;
			}

			const json = await editor({
				message: 'Enter document as JSON:',
				postfix: '.json',
				default: JSON.stringify(existing.data.document),
			});

			try {
				body = JSON.parse(json) as Record<string, unknown>;
			} catch {
				console.error('Invalid JSON, aborting this operation.');
				continue;
			}
		}

		const result = await sendRequest(`${uid}/${action}/${key}`, methodMap[action], body);
		if (!result.ok) console.error('→', result);
		else {
			const resultJson = (await result.json()) as RequestResult;
			console.log('→', resultJson.data.document ?? `${resultJson.data.key} removed`);
		}
	}

	/* eslint-enable no-await-in-loop */
}
