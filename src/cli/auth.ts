import fetch from 'node-fetch';

const pubPem = await fetch('http://localhost:6363/server/pubkey').then((res) => res.text());

function pemToArrayBuffer(pem: string) {
	const b64 = pem.replace(/-----(BEGIN|END) PUBLIC KEY-----/g, '').replace(/\s+/g, '');
	const raw = Buffer.from(b64, 'base64');
	return raw.buffer;
}

const key = await crypto.subtle.importKey(
	'spki',
	pemToArrayBuffer(pubPem),
	{ name: 'RSA-OAEP', hash: 'SHA-256' },
	false,
	['encrypt'],
);

export async function encryptPassword(password: string): Promise<string> {
	const enc = new TextEncoder();
	const ciphertext = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, enc.encode(password));
	return Buffer.from(ciphertext).toString('base64');
}
