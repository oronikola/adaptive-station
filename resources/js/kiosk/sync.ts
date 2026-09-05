/**
 * Background sync loops for the kiosk: pulling the master-data change feed
 * into the local cache, flushing queued tap events, and heartbeating. Kept
 * separate from kiosk-screen.tsx so the UI component stays focused on
 * rendering and input handling.
 */
import {
    getMeta,
    setMeta,
    upsertPerson,
    deletePerson,
    upsertCard,
    deleteCard,
    getAllPendingEvents,
    removePendingEvents,
    countPendingEvents,
    type PersonRecord,
    type CardRecord,
} from './db';
import { fetchMasterData, uploadEventBatch, sendHeartbeat, type MasterDataChangeRow } from './api';

async function applyChange(change: MasterDataChangeRow): Promise<void> {
    if (change.entity_type === 'person') {
        if (change.operation === 'delete') {
            await deletePerson(change.entity_id);
        } else {
            await upsertPerson(change.payload as unknown as PersonRecord);
        }
        return;
    }

    if (change.entity_type === 'rfid_card') {
        if (change.operation === 'delete') {
            await deleteCard(String(change.payload.card_uid ?? ''));
        } else {
            await upsertCard(change.payload as unknown as CardRecord);
        }
        return;
    }

    // tenant_config / station_config changes don't affect card/person
    // lookups — nothing for this kiosk to cache from them today.
}

/**
 * Pulls every available page of the master-data feed starting from the
 * locally stored cursor, applying changes as they arrive. Safe to call
 * repeatedly/concurrently-ish since it always resumes from the persisted
 * cursor, never a stale in-memory one.
 */
export async function syncMasterData(): Promise<void> {
    let hasMore = true;

    while (hasMore) {
        const meta = await getMeta();
        const page = await fetchMasterData(meta.masterDataCursor);

        for (const change of page.changes) {
            await applyChange(change);
        }

        await setMeta({ masterDataCursor: page.next_cursor });
        hasMore = page.has_more;
    }
}

/**
 * Uploads queued tap events in chunks (the batch endpoint bounds request
 * size — see config('device.max_batch_size')) and removes only the ones the
 * server actually accepted. Rejected events are left queued rather than
 * silently dropped, since they were already validated client-side and a
 * rejection here means something server-side disagrees worth investigating.
 */
const MAX_BATCH_SIZE = 500;

export async function flushPendingEvents(): Promise<void> {
    const pending = await getAllPendingEvents();
    if (pending.length === 0) return;

    for (let i = 0; i < pending.length; i += MAX_BATCH_SIZE) {
        const chunk = pending.slice(i, i + MAX_BATCH_SIZE);
        const result = await uploadEventBatch(chunk);
        if (result.accepted_event_ids.length > 0) {
            await removePendingEvents(result.accepted_event_ids);
        }
    }
}

export async function heartbeat(): Promise<void> {
    const pendingCount = await countPendingEvents();
    await sendHeartbeat(pendingCount);
}
