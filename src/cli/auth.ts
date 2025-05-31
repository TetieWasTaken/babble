import fetch from 'node-fetch';
import { RequestResult } from './index.js';
import { constants, publicEncrypt } from 'node:crypto';

export async function encryptPassword(password: string): Promise<string> {
	const res = await fetch('http://localhost:6363/server/pubkey');
	const {
		data: { key: pubPem },
	} = (await res.json()) as RequestResult;

	const ciphertext = publicEncrypt(
		{
			key: pubPem,
			padding: constants.RSA_PKCS1_OAEP_PADDING,
			oaepHash: 'sha256',
		},
		Buffer.from(password, 'utf8'),
	);

	return ciphertext.toString('base64');
}
