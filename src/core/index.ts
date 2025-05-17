/**
 * Manages the core engine
 *
 * @packageDocumentation
 */

import { promises as fs } from "node:fs";
import writeFileAtomic from "write-file-atomic";
import path from "node:path";
import logger from "../linker/logger.js";

const dataFile = path.resolve(process.cwd(), "data", "db.json");

/**
 * Reads the entire database
 * @returns the existing data
 */
async function _read(): Promise<Record<string, any>> {
	try {
		const raw = await fs.readFile(dataFile, "utf-8");
		return JSON.parse(raw) as Record<string, any>;
	} catch (err) {
		logger.error("Failed to read DB:", err);
		return {};
	}
}

/**
 * Overwrites the database
 * @param data the data to write
 */
async function _write(data: Record<string, any>): Promise<void> {
	try {
		const json = JSON.stringify(data, null, 2);
		await writeFileAtomic(dataFile, json, "utf-8");
	} catch (err) {
		logger.error("Failed to write DB:", err);
	}
}

/**
 * Get any value in the given object
 * @param obj the object to read from
 * @param pathParts the path to read
 * @returns the value stored at that path
 */
function _get(obj: any, pathParts: string[]): any {
	return pathParts.reduce((acc, key) => (acc != null && typeof acc === "object" ? acc[key] : undefined), obj);
}

/**
 * Sets any value in the given object
 * @param obj the object to set the value in
 * @param pathParts the path to write to
 * @param value the value to write
 */
function _set(obj: any, pathParts: string[], value: any): void {
	const lastKey = pathParts.pop()!;
	const parent = pathParts.reduce((acc, key) => {
		if (acc[key] == null || typeof acc[key] !== "object") {
			acc[key] = {};
		}

		return acc[key];
	}, obj);

	parent[lastKey] = value;
}

/**
 * Deletes any kv pair in the given object
 * @param obj the object to delete the kv from
 * @param pathParts the path to delete
 * @returns if the operation was successful
 */
function _delete(obj: any, pathParts: string[]): boolean {
	const lastKey = pathParts.pop()!;
	const parent = pathParts.reduce((acc, key) => (acc != null && typeof acc === "object" ? acc[key] : undefined), obj);
	if (parent && Object.prototype.hasOwnProperty.call(parent, lastKey)) {
		delete parent[lastKey];
		return true;
	}

	return false;
}

/**
 * Adds a value to the database
 * @param path the slash-delimited key path to write to
 * @param doc the value to write
 *
 * @remarks
 * internally similar to {@link modify}
 *
 * @returns the updated database
 */
export async function add(path: string, doc: any) {
	const db = await _read();
	const parts = path.split("/").filter(Boolean);
	_set(db, parts, doc);
	await _write(db);
	return db;
}

/**
 * Fetches a value from the database
 * @param path the slash-delimited key path to read
 * @returns the fetched value
 */
export async function fetch(path: string) {
	const db = await _read();
	const parts = path.split("/").filter(Boolean);
	return _get(db, parts);
}

/**
 * Modifies a value in the database
 * @param path the slash-delimited key path to modify
 * @param patch the new value
 * @returns the updated database
 */
export async function modify(path: string, patch: any) {
	const db = await _read();
	const parts = path.split("/").filter(Boolean);
	const existing = _get(db, parts);

	if (existing !== null && typeof existing === "object") {
		const merged = { ...existing, ...patch };
		_set(db, [...parts], merged);
	} else {
		_set(db, [...parts], patch);
	}

	await _write(db);
	return db;
}

/**
 * Removes a kv pair from the database
 * @param path the slash-delimited key path to remove
 * @returns the updated database
 */
export async function remove(path: string) {
	const db = await _read();
	const parts = path.split("/").filter(Boolean);
	_delete(db, parts);
	await _write(db);
	return db;
}
