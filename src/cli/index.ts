import { select, search, input, password } from '@inquirer/prompts';
import fetch, { type Response } from 'node-fetch';
import { distance } from 'fastest-levenshtein';
import { Method } from '../server/routes.js';
import logger from '../linker/logger.js';
import { startRepl } from './repl.js';
import { startInquiry } from './inquiry.js';
import { encryptPassword } from './auth.js';

enum ActionSelection {
	NEW,
	EXISTING,
	DESTROY,
}

export type RequestResult = {
	status: string;
	data: { key: string; document?: unknown; uids?: string[] };
	meta: { timestamp: Date };
};

const instructions = { navigation: 'Move up or down using the arrow keys', pager: '' };
const theme = {
	helpMode: 'always' as const,
};

/**
 * Filters and sorts options based on a given input string
 * @param input the input string
 * @param options an array of the possible options
 * @returns a list of best-matching options
 */
export function getAutocomplete(input: string | undefined, options: string[]) {
	if (!input || input.length < 2) {
		return [];
	}

	return options
		.map((k) => ({ key: k, dist: distance(k, input) }))
		.filter((item) => item.dist < 5)
		.sort((a, b) => a.dist - b.dist)
		.map((item) => item.key);
}

let selectedPassword: string | undefined;

/**
 * Sends an HTTP request to the babble server
 * @param endpoint the endpoint path to use `(/server/${endpoint})`
 * @param method the {@link Method} to use
 * @param body the body to send
 * @returns the result of the request
 */
export async function sendRequest(
	endpoint: string,
	method: Method,
	body?: Record<string, unknown> | undefined,
): Promise<Response> {
	const headers: Record<string, string> = {};
	if (body !== undefined) headers['Content-Type'] = 'application/json';
	if (selectedPassword) {
		headers['X-Password'] = selectedPassword;
	}

	const url = `http://localhost:6363/server/${endpoint}`;

	const result = await fetch(url, {
		method,
		headers,
		body: body === undefined ? undefined : JSON.stringify(body),
	});

	return result;
}

/**
 * Starts the CLI loop
 * @returns if the user exitted manually, 'exit'. Else, nothing.
 */
export async function startCli(): Promise<'exit' | undefined> {
	console.log('\u001B[1;91m BABBLE \u001B[0;32mv1.0.0 \u001B[0m');

	// Fetch the list of existing database UIDs
	const uidResponse = await sendRequest('uid', Method.GET);
	if (!uidResponse.ok) {
		console.error(uidResponse);
		return;
	}

	const uidList = (await uidResponse.json()) as RequestResult;

	const action = await select({
		message: 'Use an existing database, or choose a new one:',
		choices: [
			{
				name: 'existing',
				value: ActionSelection.EXISTING,
				description: 'Choose an existing database',
				disabled: (uidList.data.uids?.length ?? 0) === 0 ? '(no database was found)' : false,
			},
			{ name: 'new', value: ActionSelection.NEW, description: 'Create a new database' },
			{
				name: 'destroy',
				value: ActionSelection.DESTROY,
				description: 'Remove an existing database',
				disabled: (uidList.data.uids?.length ?? 0) === 0 ? '(no database was found)' : false,
			},
		],
		instructions,
		theme,
	});

	let uid: string;

	if (action === ActionSelection.NEW) {
		// Create a new database

		const newUid = await input({
			message: 'New database uid:',
			validate(input: string) {
				if (input.length === 0) return false;
				return true;
			},
		});

		const enteredPassword = await password({ message: 'Enter authentication password, if any:', mask: true });

		let encrypted: string | undefined;

		if (enteredPassword !== null) {
			encrypted = await encryptPassword(enteredPassword);
		}

		const result = await sendRequest(`new/${newUid}`, Method.POST, { password: encrypted });
		if (!result.ok) {
			logger.error(result);
			console.error(result);
			return;
		}

		selectedPassword = encrypted;

		const jsonResult = (await result.json()) as RequestResult;
		uid = jsonResult.data.key;
	} else {
		// Use an existing database or destroy one

		uid = await search({
			message: 'Database uid:',
			async source(input, { signal }) {
				return getAutocomplete(input, uidList.data.uids ?? []);
			},
			theme,
		});

		const enteredPassword = await password({ message: 'Enter authentication password, if any:', mask: true });
		if (enteredPassword !== null) {
			selectedPassword = await encryptPassword(enteredPassword);
		}

		if (action === ActionSelection.DESTROY) {
			const confirmation = await input({
				message: "Type 'confirm' to delete the database or anything else to exit.",
			});

			if (confirmation === 'confirm') {
				const result = await sendRequest(`delete/${uid}`, Method.DELETE, { password: selectedPassword });
				if (!result.ok) {
					logger.error(result);
					console.error(result);
					return;
				}
			}

			return;
		}
	}

	const useRepl = await select({
		message: 'Would you like to use the REPL interface, or an interactive CLI?',
		choices: [
			{
				name: 'REPL',
				value: true,
			},
			{
				name: 'Interactive CLI',
				value: false,
			},
		],
		instructions,
		theme,
	});

	if (useRepl) return startRepl(uid);
	return startInquiry(uid);
}
