import { constants, generateKeyPairSync, privateDecrypt } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync, writeFileSync, promises as fs } from 'node:fs';
import process from 'node:process';
import { join } from 'node:path';
import bcrypt from 'bcrypt';
import fastifyPlugin from 'fastify-plugin';
import logger from '../linker/logger.js';

const keyDirectory = join(process.cwd(), 'auth', 'keys');
const passDirectory = join(process.cwd(), 'auth', 'pass');

export function generateKeys() {
	if (!existsSync(keyDirectory)) {
		mkdirSync(keyDirectory, { recursive: true });
		logger.info(`Created directory: ${keyDirectory}`);
	}

	const { publicKey, privateKey } = generateKeyPairSync('rsa', {
		modulusLength: 2048,
		publicKeyEncoding: { type: 'spki', format: 'pem' },
		privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
	});

	writeFileSync(join(keyDirectory, 'public.pem'), publicKey);
	writeFileSync(join(keyDirectory, 'private.pem'), privateKey);
}

export async function getPubKey() {
	return readFileSync(join(keyDirectory, 'public.pem'), 'utf8');
}

export async function storePassword(password: string, uid: string) {
	if (!existsSync(passDirectory)) {
		mkdirSync(passDirectory, { recursive: true });
		logger.info(`Created directory: ${passDirectory}`);
	}

	const privPem = readFileSync(join(keyDirectory, 'private.pem'), 'utf8');
	const buffer = Buffer.from(password, 'base64');
	const decrypted = privateDecrypt(
		{ key: privPem, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
		buffer,
	).toString('utf8');

	const hash = (await bcrypt.hash(decrypted, 12)) as string;
	writeFileSync(join(passDirectory, `${uid}.hash`), hash, 'utf8');
}

export const verifyPassword = fastifyPlugin(async (fastify) => {
	const privPem = readFileSync(join(keyDirectory, 'private.pem'), 'utf8');

	fastify.addHook('preHandler', async (request, reply) => {
		const uid = (request.params as any).uid;
		const hashPath = join(passDirectory, `${uid}.hash`);

		if (!existsSync(hashPath)) return;

		const encrypted = (request.headers['x-password'] as string) || ((request.body as any)?.password as string);
		if (!encrypted) {
			return reply.code(401).send({ error: 'Password required' });
		}

		let decrypted: string;
		try {
			const buffer = Buffer.from(encrypted, 'base64');
			decrypted = privateDecrypt(
				{ key: privPem, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
				buffer,
			).toString('utf8');
		} catch {
			return reply.code(400).send({ error: 'Invalid password blob' });
		}

		const storedHash = readFileSync(hashPath, 'utf8');
		const ok = (await bcrypt.compare(decrypted, storedHash)) as boolean;
		if (!ok) {
			return reply.code(401).send({ error: 'Wrong password' });
		}
	});
});

export async function destroyPassword(uid: string) {
	try {
		await fs.unlink(join(passDirectory, `${uid}.hash`));
	} catch (error) {
		if (error.message) return new Error(error.message);
		return new Error('unknown error');
	}
}
