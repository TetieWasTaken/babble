import inquirer from 'inquirer';
import fetch from 'node-fetch';

type ActionAnswer = {
	action: 'add' | 'fetch' | 'modify' | 'remove' | 'exit';
};

type KeyAnswer = {
	key: string;
};

type JsonAnswer = {
	json: string;
};

const methodMap: Record<ActionAnswer['action'], 'GET' | 'POST' | 'PATCH' | 'DELETE'> = {
	add: 'POST',
	fetch: 'GET',
	modify: 'PATCH',
	remove: 'DELETE',
	exit: 'GET', // Unused
};

export async function startCli() {
	let exit = false;

	/* eslint-disable no-await-in-loop */
	while (!exit) {
		const { action } = await inquirer.prompt<ActionAnswer>({
			type: 'list',
			name: 'action',
			message: 'Choose an action:',
			choices: ['add', 'fetch', 'modify', 'remove', 'exit'],
		});

		if (action === 'exit') {
			exit = true;
			break;
		}

		const { key } = await inquirer.prompt<KeyAnswer>({
			type: 'input',
			name: 'key',
			message: 'Document key:',
		});

		let body: Record<string, unknown> | undefined;
		if (action === 'add' || action === 'modify') {
			const { json } = await inquirer.prompt<JsonAnswer>({
				type: 'editor',
				name: 'json',
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
