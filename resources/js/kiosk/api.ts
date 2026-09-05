/**
 * Thin fetch wrapper over the v1/device API (routes/api.php) — the same
 * backend contract a real kiosk hardware client would call, just called
 * from this browser-based one instead. Every authenticated call attaches
 * the device's own bearer token (never the portal's session cookie — the
 * kiosk is not a logged-in user).
 */
import { getMeta, clearCredential, type TapEventType } from './db';

export class DeviceUnauthorizedError extends Error {}

async function deviceFetch(
    routeName: string,
    options: RequestInit = {},
    query?: Record<string, string | number>,
): Promise<Response> {
    const meta = await getMeta();
    const headers: Record<string, string> = {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(meta.credentialToken ? { Authorization: `Bearer ${meta.credentialToken}` } : {}),
    };

    const response = await fetch(route(routeName, query), { ...options, headers });

    if (response.status === 401) {
        await clearCredential();
        throw new DeviceUnauthorizedError('Device credential was revoked or is invalid.');
    }

    return response;
}

export interface ActivateResponse {
    station: { id: string; name: string; station_code: string };
    credential_token: string;
}

export async function activate(activationCode: string): Promise<ActivateResponse> {
    const response = await fetch(route('api.device.activate'), {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ activation_code: activationCode }),
    });

    if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? 'Activation failed.');
    }

    return response.json();
}

export interface MasterDataChangeRow {
    version: number;
    entity_type: 'person' | 'rfid_card' | 'tenant_config' | 'station_config';
    entity_id: string;
    operation: 'upsert' | 'deactivate' | 'delete';
    payload: Record<string, unknown>;
    changed_at: string;
}

export interface MasterDataResponse {
    changes: MasterDataChangeRow[];
    next_cursor: number;
    has_more: boolean;
}

export async function fetchMasterData(cursor: number): Promise<MasterDataResponse> {
    const response = await deviceFetch('api.device.master-data', {}, { cursor });
    if (!response.ok) throw new Error('Failed to fetch master data.');
    return response.json();
}

export interface BatchEvent {
    id: string;
    card_uid: string;
    event_type: TapEventType;
    occurred_at: string;
    occurred_offset_minutes: number;
    metadata?: Record<string, unknown>;
}

export interface BatchResponse {
    accepted_event_ids: string[];
    rejected_events: Array<{ id: unknown; errors: Record<string, unknown> }>;
}

export async function uploadEventBatch(events: BatchEvent[]): Promise<BatchResponse> {
    const response = await deviceFetch('api.device.events.batch', {
        method: 'POST',
        body: JSON.stringify({ events }),
    });
    if (!response.ok) throw new Error('Failed to upload tap events.');
    return response.json();
}

export async function sendHeartbeat(pendingEventCount: number): Promise<void> {
    const response = await deviceFetch('api.device.heartbeat', {
        method: 'POST',
        body: JSON.stringify({
            app_version: 'kiosk-web-1.0',
            pending_event_count: pendingEventCount,
        }),
    });
    if (!response.ok) throw new Error('Heartbeat failed.');
}

export interface DeviceConfigResponse {
    station: { id: string; name: string; station_code: string; configuration: Record<string, unknown> };
    tenant: { id: string; timezone: string; attendance_policy: Record<string, unknown> | null };
}

export async function fetchConfig(): Promise<DeviceConfigResponse> {
    const response = await deviceFetch('api.device.config');
    if (!response.ok) throw new Error('Failed to fetch device config.');
    return response.json();
}
