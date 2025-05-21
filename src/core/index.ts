/**
 * Manages the core engine
 *
 * @packageDocumentation
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import writeFileAtomic from 'write-file-atomic';
import logger from '../linker/logger.js';

const baseData = path.resolve(process.cwd(), 'data');

let cache: Record<string, unknown> | undefined;
let lastCacheUpdate = 0;
const timeToLive = 60_000;

/**
 * Reads the entire database
 * @returns the existing data
 */
async function _read(uid: string): Promise<Record<string, unknown>> {
	const now = Date.now();

	if (cache && now - lastCacheUpdate < timeToLive) {
		return cache;
	}

	const dataFile = path.resolve(process.cwd(), `${uid}.json`);

	try {
		const raw = await fs.readFile(dataFile, 'utf8');
		const parsed = JSON.parse(raw) as Record<string, unknown>;

		cache = parsed;
		lastCacheUpdate = now;

		return parsed;
	} catch (error) {
		logger.error('Failed to read DB:', error);

		cache = {};
		lastCacheUpdate = now;

		return {};
	}
}

/**
 * Overwrites the database
 * @param data the data to write
 */
async function _write(data: Record<string, unknown>, uid: string): Promise<void> {
	const dataFile = path.resolve(process.cwd(), `${uid}.json`);

	try {
		const json = JSON.stringify(data, null, 2);
		await writeFileAtomic(dataFile, json, 'utf8');

		cache = data;
		lastCacheUpdate = Date.now();
	} catch (error) {
		logger.error('Failed to write DB:', error);
	}
}

/**
 * Get any document in the given object
 * @param obj the object to read from
 * @param pathParts the path to read
 * @returns the document stored at that path
 */
function _get(object: Record<string, unknown>, pathParts: string[]): Record<string, unknown> | undefined {
	let current = object;
	for (const key of pathParts) {
		if (current === null || typeof current !== 'object' || !(key in current)) {
			return undefined;
		}

		current = current[key] as Record<string, unknown>;
	}

	return current;
}

/**
 * Sets any document in the given object
 * @param obj the object to set the document in
 * @param pathParts the path to write to
 * @param document the document to write
 */
function _set(object: Record<string, unknown>, pathParts: string[], document: unknown): void {
	const lastKey = pathParts.pop()!;
	let parent: Record<string, unknown> = object;

	for (const key of pathParts) {
		if (parent[key] === null || typeof parent[key] !== 'object') {
			parent[key] = {};
		}

		parent = parent[key] as Record<string, unknown>;
	}

	parent[lastKey] = document;
}

/**
 * Deletes any kv pair in the given object
 * @param obj the object to delete the kv from
 * @param pathParts the path to delete
 * @returns if the operation was successful
 */
function _delete(object: Record<string, unknown>, pathParts: string[]): boolean {
	const lastKey = pathParts.pop()!;
	let parent: Record<string, unknown> | undefined = object;

	for (const key of pathParts) {
		if (parent === null || typeof parent !== 'object') {
			parent = undefined;
			break;
		}

		parent = parent[key] as Record<string, unknown>;
	}

	if (parent !== null && typeof parent === 'object' && Object.hasOwn(parent, lastKey)) {
		Reflect.deleteProperty(parent, lastKey);
		return true;
	}

	return false;
}

/**
 * Adds a document to the database
 * @param path the slash-delimited key path to write to
 * @param document the document to write
 *
 * @remarks
 * internally similar to {@link modify}
 *
 * @returns the added document
 */
export async function add(path: string, document: unknown, uid: string) {
	const database = await _read(uid);
	const parts = path.split('/').filter(Boolean);
	_set(database, parts, document);
	await _write(database, uid);
	return document;
}

/**
 * Fetches a document from the database
 * @param path the slash-delimited key path to read
 * @returns the fetched document
 */
export async function fetch(path: string, uid: string) {
	const database = await _read(uid);
	const parts = path.split('/').filter(Boolean);
	return _get(database, parts);
}

/**
 * Modifies a document in the database
 * @param path the slash-delimited key path to modify
 * @param patch the new document
 * @returns the updated document
 */
export async function modify(path: string, patch: Record<string, unknown>, uid: string) {
	const database = await _read(uid);
	const parts = path.split('/').filter(Boolean);
	const existing = _get(database, parts);

	if (existing !== null && typeof existing === 'object') {
		const merged: Record<string, unknown> = { ...existing, ...patch };
		_set(database, [...parts], merged);
	} else {
		_set(database, [...parts], patch);
	}

	await _write(database, uid);
	return patch;
}

/**
 * Removes a kv pair from the database
 * @param path the slash-delimited key path to remove
 */
export async function remove(path: string, uid: string) {
	const database = await _read(uid);
	const parts = path.split('/').filter(Boolean);
	_delete(database, parts);
	await _write(database, uid);
}

/**
 * Recursively collect all key paths in an object
 * @param obj the object to walk
 * @param prefix the current key prefix (slash-delimited)
 * @returns an array of full key paths, e.g. ["foo", "foo/bar", "baz/qux"]
 */
export async function getAllKeyPaths(uid: string, object?: Record<string, unknown>, prefix = ''): Promise<string[]> {
	const paths: string[] = [];

	object ||= await _read(uid);

	const nestedWalks: Array<Promise<string[]>> = [];

	for (const key of Object.keys(object)) {
		const fullPath = prefix ? `${prefix}/${key}` : key;
		paths.push(fullPath);

		const document = object[key];
		if (document && typeof document === 'object' && !Array.isArray(document)) {
			nestedWalks.push(getAllKeyPaths(uid, document as Record<string, unknown>, fullPath));
		}
	}

	const nestedResults = await Promise.all(nestedWalks);
	for (const subPaths of nestedResults) {
		paths.push(...subPaths);
	}

	return paths;
}
