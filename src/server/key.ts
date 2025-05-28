import { generateKeyPairSync } from 'crypto';
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import logger from '../linker/logger.js';

const keyDir = join(process.cwd(), 'keys');

export function generateKeys() {
	if (!existsSync(keyDir)) {
		mkdirSync(keyDir, { recursive: true });
		logger.info(`Created directory: ${keyDir}`);
	}

	const { publicKey, privateKey } = generateKeyPairSync('rsa', {
		modulusLength: 2048,
		publicKeyEncoding: { type: 'spki', format: 'pem' },
		privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
	});

	writeFileSync(join(keyDir, 'public.pem'), publicKey);
	writeFileSync(join(keyDir, 'private.pem'), privateKey);
}
