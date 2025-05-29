import { constants, generateKeyPairSync, privateDecrypt } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import logger from '../linker/logger.js';
import bcrypt from 'bcrypt';

const keyDir = join(process.cwd(), 'auth', 'keys');
const passDir = join(process.cwd(), 'auth', 'pass');

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

export async function getPubKey() {
	return readFileSync(join(keyDir, 'public.pem'), 'utf8');
}

export async function storePassword(password: string, uid: string) {
	if (!existsSync(passDir)) {
		mkdirSync(passDir, { recursive: true });
		logger.info(`Created directory: ${passDir}`);
	}

	const privPem = readFileSync(join(passDir, 'private.pem'), 'utf8');
	const buffer = Buffer.from(password, 'base64');
	const decrypted = privateDecrypt({ key: privPem, padding: constants.RSA_PKCS1_OAEP_PADDING }, buffer).toString(
		'utf8',
	);

	const hash = await bcrypt.hash(decrypted, 12);
	writeFileSync(join(passDir, `${uid}.hash`), hash, 'utf8');
}
