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

function _get(obj: any, pathParts: string[]): any {
	return pathParts.reduce((acc, key) => (acc != null && typeof acc === "object" ? acc[key] : undefined), obj);
}

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

function _delete(obj: any, pathParts: string[]): boolean {
	const lastKey = pathParts.pop()!;
	const parent = pathParts.reduce((acc, key) => (acc != null && typeof acc === "object" ? acc[key] : undefined), obj);
	if (parent && Object.prototype.hasOwnProperty.call(parent, lastKey)) {
		delete parent[lastKey];
		return true;
	}
	return false;
}

export async function add(path: string, doc: any) {
	const db = await _read();
	const parts = path.split("/").filter(Boolean);
	_set(db, parts, doc);
	await _write(db);
	return db;
}

export async function fetch(path: string) {
	const db = await _read();
	const parts = path.split("/").filter(Boolean);
	return _get(db, parts);
}

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

export async function remove(path: string) {
	const db = await _read();
	const parts = path.split("/").filter(Boolean);
	_delete(db, parts);
	await _write(db);
	return db;
}
