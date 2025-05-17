import { select, editor, search, input, Separator } from '@inquirer/prompts';
import fetch from 'node-fetch';
import { Method } from '../server/routes.js';
import { getAllKeyPaths } from '../core/index.js';
import { distance } from 'fastest-levenshtein';

type Action = {
	action: 'add' | 'fetch' | 'modify' | 'remove';
};

type RequestResult = {
	status: string;
	key: string;
	result: Record<string, unknown>;
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

async function sendRequest(key: string, action: string, body?: Record<string, unknown> | undefined) {
	const url = `http://localhost:6363/server/${action}/${encodeURIComponent(key)}`;

	const result = await fetch(url, {
		method: methodMap[action],
		headers: { 'Content-Type': 'application/json' },
		body: body ? JSON.stringify(body) : action === 'remove' ? '{}' : undefined,
	});

	const data = await result.json();
	return data;
}

export async function startCli() {
	let exit = false;

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
			instructions: instructions,
			theme: theme,
		});

		if (action === 'exit') {
			exit = true;
			break;
		}

		const keys = await getAllKeyPaths();
		let key = '';

		if (action === 'add') {
			key = await input({ message: 'Document key:' });
		} else {
			key = await search({
				message: 'Document key:',
				source: async (input, { signal }) => {
					if (!input || input.length < 2) return [];

					return keys
						.map((k) => ({ key: k, dist: distance(k, input) }))
						.filter((item) => item.dist < 5)
						.sort((a, b) => a.dist - b.dist)
						.map((item) => item.key);
				},
				theme,
			});
		}

		let body: Record<string, unknown> | undefined;
		if (action === 'add' || action === 'modify') {
			let existing = { result: {} };
			if (action === 'modify') {
				existing = (await sendRequest(key, 'fetch')) as RequestResult;

				console.log(existing);
			}

			const json = await editor({
				message: 'Enter document as JSON:',
				postfix: '.json',
				default: JSON.stringify(existing.result),
			});

			try {
				body = JSON.parse(json) as Record<string, unknown>;
			} catch {
				console.error('Invalid JSON, aborting this operation.');
				continue;
			}
		}

		const data = await sendRequest(key, action, body);
		console.log('→', data);
	}

	/* eslint-enable no-await-in-loop */
}
