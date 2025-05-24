import { select, editor, search, input, Separator } from '@inquirer/prompts';
import fetch, { type Response } from 'node-fetch';
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

/**
 * Sends an HTTP request to the babble server
 * @param endpoint the endpoint path to use `(/server/${endpoint})`
 * @param method the {@link Method} to use
 * @param body the body to send
 * @returns the result of the request
 */
async function sendRequest(
	endpoint: string,
	method: Method,
	body?: Record<string, unknown> | undefined,
): Promise<Response> {
	const url = `http://localhost:6363/server/${endpoint}`;

	const result = await fetch(url, {
		method,
		...(body === undefined
			? {}
			: {
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body),
				}),
	});

	return result;
}

/**
 * Filters and sorts options based on a given input string
 * @param input the input string
 * @param options an array of the possible options
 * @returns a list of best-matching options
 */
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

/**
 * Starts the CLI loop
 * @returns if the user exitted manually, 'exit'. Else, nothing.
 */
export async function startCli(): Promise<'exit' | undefined> {
	let exit = false;

	console.log('\u001B[1;91m BABBLE \u001B[0;32mv1.0.0 \u001B[0m');

	// fetch the list of existing database UIDs
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
				description: 'Choose an existing database',
				disabled: (uidList.data.uids?.length ?? 0) === 0 ? '(no database was found)' : false,
			},
			{ name: 'new', value: false, description: 'Create a new database' },
		],
		instructions,
		theme,
	});

	let uid: string;

	if (isExisting) {
		// use an existing database

		uid = await search({
			message: 'Database uid:',
			async source(input, { signal }) {
				return getAutocomplete(input, uidList.data.uids ?? []);
			},
			theme,
		});
	} else {
		// create a new database

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
		const action: Action['action'] | 'exit' = await select({
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
		if (result.ok) {
			const resultJson = (await result.json()) as RequestResult;
			console.log('→', resultJson.data.document ?? `${resultJson.data.key} removed`);
		} else {
			console.error('→', result);
		}
	}

	/* eslint-enable no-await-in-loop */

	return 'exit';
}
