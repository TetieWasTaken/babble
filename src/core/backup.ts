import { fetchAll } from './index.js';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import writeFileAtomic from 'write-file-atomic';
import logger from '../linker/logger.js';

const backupFolder = path.resolve(process.cwd(), 'backups');

/**
 * Writes to a file
 * @param data the data to write
 */
async function _write(data: Record<string, unknown>, uid: string): Promise<void> {
	const backupPath = path.resolve(backupFolder, uid);

	try {
		await fs.access(backupPath);
	} catch (err) {
		try {
			await fs.mkdir(backupPath);
		} catch (err) {
			logger.error(err);
		}

		logger.error(err);
	}

	const dataFile = path.resolve(backupFolder, `${uid}/${new Date().toISOString()}.json`);

	try {
		const json = JSON.stringify(data, null, 2);
		await writeFileAtomic(dataFile, json, 'utf8');
	} catch (error) {
		logger.error('Failed to write DB:', error);
	}
}

export async function createCopy(uid: string) {
	const db = await fetchAll(uid);
	await _write(db, uid);
}
