import { program } from 'commander';

export enum Argtype {
	NONE,
	EXIT,
	SERVER,
}

program
	.helpOption(false)
	.helpCommand(false)
	.option('--first')
	.option('-s, --server', 'run babble in server-only mode (no CLI)')
	.option('-h, --help', 'display help for command');

function displayHelp(): Argtype {
	program.outputHelp();
	return Argtype.EXIT;
}

export async function startCommander(): Promise<Argtype> {
	program.parse();
	const options = program.opts();

	if (options.help) {
		return displayHelp();
	}

	if (options.server) {
		return Argtype.SERVER;
	}

	return Argtype.NONE;
}
