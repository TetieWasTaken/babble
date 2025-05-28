import { generateKeyPairSync } from 'node:crypto';
import { writeFileSync } from 'fs';

export function generateKeys() {
	const { publicKey, privateKey } = generateKeyPairSync('rsa', {
		modulusLength: 2048,
		publicKeyEncoding: { type: 'spki', format: 'pem' },
		privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
	});

	writeFileSync('./keys/public.pem', publicKey);
	writeFileSync('./keys/private.pem', privateKey);
}
