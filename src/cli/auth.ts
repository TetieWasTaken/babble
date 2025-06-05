import { constants, publicEncrypt } from 'node:crypto';
import fetch from 'node-fetch';
import { type RequestResult } from './index.js';

export async function encryptPassword(password: string): Promise<string> {
	const result = await fetch('http://localhost:6363/server/pubkey');
	const {
		data: { key: pubPem },
	} = (await result.json()) as RequestResult;

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
