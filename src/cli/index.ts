import { select, editor, input, Separator } from '@inquirer/prompts';
import fetch from 'node-fetch';
import { Method } from '../server/routes.js';

type Action = {
	action: 'add' | 'fetch' | 'modify' | 'remove';
};

const methodMap: Record<Action['action'], Method> = {
	add: Method.POST,
	fetch: Method.GET,
	modify: Method.PATCH,
	remove: Method.DELETE,
};

export async function startCli() {
	let exit = false;

	/* eslint-disable no-await-in-loop */
	while (!exit) {
		const action = await select({
			message: 'Choose an action:',
			choices: [
				{ name: 'add', value: 'add' },
				{ name: 'fetch', value: 'fetch' },
				{ name: 'modify', value: 'modify' },
				{ name: 'delete', value: 'delete' },
				new Separator(),
				{ name: 'exit', value: 'exit' },
			],
		});

		if (action === 'exit') {
			exit = true;
			break;
		}

		const key = await input({ message: 'Document key:' });

		let body: Record<string, unknown> | undefined;
		if (action === 'add' || action === 'modify') {
			const json = await editor({
				message: 'Enter document as JSON:',
			});

			try {
				body = JSON.parse(json) as Record<string, unknown>;
			} catch {
				console.error('Invalid JSON, aborting this operation.');
				continue;
			}
		}

		const url = `http://localhost:6363/server/${action}/${encodeURIComponent(key)}`;
		const result = await fetch(url, {
			method: methodMap[action],
			headers: { 'Content-Type': 'application/json' },
			body: body ? JSON.stringify(body) : action === 'remove' ? '{}' : undefined,
		});

		const data = await result.json();
		console.log('→', data);
	}

	/* eslint-enable no-await-in-loop */
}
