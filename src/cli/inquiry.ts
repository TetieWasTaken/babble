import { select, editor, search, input, Separator } from '@inquirer/prompts';
import { getAllKeyPaths } from '../core/index.js';
import { Method } from '../server/routes.js';
import { getAutocomplete, type RequestResult, sendRequest } from './index.js';

type Action = {
	action: 'add' | 'fetch' | 'modify' | 'remove';
};

const instructions = { navigation: 'Move up or down using the arrow keys', pager: '' };
const theme = {
	helpMode: 'always' as const,
};

const methodMap: Record<Action['action'], Method> = {
	add: Method.POST,
	fetch: Method.GET,
	modify: Method.PATCH,
	remove: Method.DELETE,
};

export async function startInquiry(uid: string) {
	let exit = false;

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
