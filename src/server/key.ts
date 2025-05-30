import { constants, generateKeyPairSync, privateDecrypt } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import logger from '../linker/logger.js';
import bcrypt from 'bcrypt';
import fastifyPlugin from 'fastify-plugin';

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

	const privPem = readFileSync(join(keyDir, 'private.pem'), 'utf8');
	const buffer = Buffer.from(password, 'base64');
	const decrypted = privateDecrypt(
		{ key: privPem, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
		buffer,
	).toString('utf8');

	const hash = await bcrypt.hash(decrypted, 12);
	writeFileSync(join(passDir, `${uid}.hash`), hash, 'utf8');
}

export const verifyPassword = fastifyPlugin(async (fastify) => {
	const privPem = readFileSync(join(keyDir, 'private.pem'), 'utf8');

	fastify.addHook('preHandler', async (request, reply) => {
		const uid = (request.params as any).uid;
		const hashPath = join(passDir, `${uid}.hash`);

		if (!existsSync(hashPath)) return;

		const encrypted = (request.headers['x-password'] as string) || (request.body as any)?.password;
		if (!encrypted) {
			return reply.code(401).send({ error: 'Password required' });
		}

		let decrypted: string;
		try {
			const buffer = Buffer.from(encrypted, 'base64');
			decrypted = privateDecrypt({ key: privPem, padding: constants.RSA_PKCS1_OAEP_PADDING }, buffer).toString('utf8');
		} catch {
			return reply.code(400).send({ error: 'Invalid password blob' });
		}

		const storedHash = readFileSync(hashPath, 'utf8');
		const ok = await bcrypt.compare(decrypted, storedHash);
		if (!ok) {
			return reply.code(401).send({ error: 'Wrong password' });
		}
	});
});
