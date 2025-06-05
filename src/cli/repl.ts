import readline from 'node:readline';
import process from 'node:process';
import { type RequestResult, sendRequest } from './index.js';

enum Method {
	GET = 'GET',
	HEAD = 'HEAD',
	TRACE = 'TRACE',
	DELETE = 'DELETE',
	OPTIONS = 'OPTIONS',
	PATCH = 'PATCH',
	PUT = 'PUT',
	POST = 'POST',
}

const methodMap = {
	add: Method.POST,
	fetch: Method.GET,
	modify: Method.PATCH,
	remove: Method.DELETE,
} as const;

export async function startRepl(uid: string): Promise<'exit' | undefined> {
	return new Promise((resolve) => {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			prompt: '\u001B[1;32m›\u001B[0m ',
			historySize: 100,
		});

		console.log(`Connected to database: ${uid}`);
		console.log(`Type “help” for commands.`);
		rl.prompt();

		rl.on('line', async (line) => {
			const [cmd, key, ...rest] = line.trim().split(' ');
			if (!cmd) {
				rl.prompt();
				return;
			}

			try {
				switch (cmd) {
					case 'exit':
					case 'quit': {
						rl.close();
						return;
					}

					case 'help': {
						console.log(`
Available commands:
  • add <key> <JSON>      — create
  • fetch <key>           — read
  • modify <key> <JSON>   — update (merge)
  • remove <key>          — delete
  • exit|quit             — exit REPL
`);
						break;
					}

					case 'add':
					case 'modify': {
						if (!key || rest.length === 0) {
							console.log(`Usage: ${cmd} <key> <JSON>`);
							break;
						}

						const jsonBody = rest.join(' ');
						let body: Record<string, unknown>;
						try {
							body = JSON.parse(jsonBody) as Record<string, unknown>;
						} catch {
							console.error('❌ Invalid JSON');
							break;
						}

						{
							const result = await sendRequest(`${uid}/${cmd}/${key}`, methodMap[cmd], body);
							if (result.ok) {
								const index = (await result.json()) as RequestResult;
								console.log('✅', index.data.document);
							} else {
								console.error('❌', result.status, await result.text());
							}
						}

						break;
					}

					case 'fetch':
					case 'remove': {
						if (!key) {
							console.log(`Usage: ${cmd} <key>`);
							break;
						}

						{
							const result = await sendRequest(`${uid}/${cmd}/${key}`, methodMap[cmd]);
							if (result.ok) {
								const index = (await result.json()) as RequestResult;
								console.log(cmd === 'remove' ? `✅ ${index.data.key} removed` : index.data.document);
							} else {
								console.error('❌', result.status, await result.text());
							}
						}

						break;
					}

					default: {
						console.log(`Unknown command “${cmd}”. Type “help”.`);
					}
				}
			} catch (error) {
				console.error('❌ Error:', error);
			}

			rl.prompt();
		});

		rl.on('close', () => {
			console.log('\nGoodbye!');
			resolve('exit');
		});
	});
}
