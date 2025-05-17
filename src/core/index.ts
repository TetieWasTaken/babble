/**
 * Manages the core engine
 *
 * @packageDocumentation
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import logger from "../linker/logger.js";

const dataFile = path.resolve(process.cwd(), "data", "db.json");

async function _read(): Promise<Record<string, any>> {
	try {
		const raw = await fs.readFile(dataFile, "utf-8");
		return JSON.parse(raw) as Record<string, any>;
	} catch (err) {
		logger.error("Failed to read DB:", err);
		return {};
	}
}

async function _write(data: Record<string, any>): Promise<void> {
	try {
		const json = JSON.stringify(data, null, 2);
		await fs.writeFile(dataFile, json, "utf-8");
	} catch (err) {
		logger.error("Failed to write DB:", err);
	}
}

export async function add(key: string, doc: object): Promise<Record<string, any>> {
	const db = await _read();
	db[key] = doc;
	await _write(db);
	return db;
}

export async function fetch(key: string): Promise<any> {
	const db = await _read();
	return db[key];
}

export async function modify(key: string, patch: object): Promise<Record<string, any>> {
	const db = await _read();
	const existing = (db[key] as Record<string, any>) || {};
	db[key] = { ...existing, ...patch };
	await _write(db);
	return db;
}

export async function remove(key: string): Promise<Record<string, any>> {
	const db = await _read();
	delete db[key];
	await _write(db);
	return db;
}
