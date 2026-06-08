import type AINoteCompanionPlugin from "../main";
import { endpointDomain } from "./endpoints";

export interface AuditLogEntry {
	timestamp: string;
	endpointDomain: string;
	requestType: "explain" | "summarize" | "infographic" | "test-connection" | "error";
	linkedNotesIncluded: boolean;
	message?: string;
}

export async function appendAuditLog(plugin: AINoteCompanionPlugin, entry: Omit<AuditLogEntry, "timestamp" | "endpointDomain">): Promise<void> {
	const logs = await loadAuditLog(plugin);
	logs.push({
		timestamp: new Date().toISOString(),
		endpointDomain: endpointDomain(plugin.settings.endpointUrl),
		...entry
	});
	await plugin.saveData({
		...plugin.settings,
		auditLog: logs.slice(-200)
	});
}

export async function loadAuditLog(plugin: AINoteCompanionPlugin): Promise<AuditLogEntry[]> {
	const data = await plugin.loadData();
	if (typeof data !== "object" || data === null || !Array.isArray((data as { auditLog?: unknown }).auditLog)) {
		return [];
	}
	return ((data as { auditLog: unknown[] }).auditLog).filter(isAuditEntry);
}

export async function clearAuditLog(plugin: AINoteCompanionPlugin): Promise<void> {
	await plugin.saveData({
		...plugin.settings,
		auditLog: []
	});
}

export function formatAuditLog(entries: AuditLogEntry[]): string {
	if (entries.length === 0) {
		return "No audit log entries.";
	}
	return entries
		.map((entry) => `${entry.timestamp} | ${entry.requestType} | ${entry.endpointDomain} | linked=${entry.linkedNotesIncluded}${entry.message ? ` | ${entry.message}` : ""}`)
		.join("\n");
}

function isAuditEntry(value: unknown): value is AuditLogEntry {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const candidate = value as AuditLogEntry;
	return typeof candidate.timestamp === "string" &&
		typeof candidate.endpointDomain === "string" &&
		typeof candidate.requestType === "string" &&
		typeof candidate.linkedNotesIncluded === "boolean";
}
