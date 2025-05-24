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
	} catch {
		try {
			await fs.mkdir(backupPath, { recursive: true });
		} catch (err) {
			logger.error('Failed to create backup directory:', err);
			return;
		}
	}

	try {
		const files = await fs.readdir(backupPath);
		const now = Date.now();
		const threshold = 3 * 24 * 60 * 60 * 1000; // three days

		for (const file of files) {
			if (file.endsWith('.json')) {
				const timestamp = Date.parse(file.replace('.json', ''));
				if (!isNaN(timestamp) && now - timestamp > threshold) {
					await fs.unlink(path.resolve(backupPath, file));
				}
			}
		}
	} catch (err) {
		logger.error('Failed to clean up old backups:', err);
	}

	const dataFile = path.resolve(backupPath, `${new Date().toISOString()}.json`);

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
