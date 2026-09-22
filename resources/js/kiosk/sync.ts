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
    replaceAllKioskMedia,
    type PersonRecord,
    type CardRecord,
    type TapEventType,
} from './db';
import { fetchMasterData, uploadEventBatch, sendHeartbeat, fetchKioskMedia, type MasterDataChangeRow } from './api';

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
 *
 * Returns every accepted event's server-resolved direction, keyed by event
 * id — the server can toggle IN/OUT differently than this kiosk's own
 * optimistic local guess did (see TapEvent::resolveEventType()'s docblock),
 * so a caller that just submitted a tap uses this to correct its local
 * last_tap cache — and, if the tap's toast is still on screen, what it
 * already told the person — instead of silently drifting out of sync with
 * what the portal shows for the exact same tap.
 */
const MAX_BATCH_SIZE = 500;

export async function flushPendingEvents(): Promise<Record<string, TapEventType>> {
    const pending = await getAllPendingEvents();
    if (pending.length === 0) return {};

    const resolvedEventTypes: Record<string, TapEventType> = {};

    for (let i = 0; i < pending.length; i += MAX_BATCH_SIZE) {
        const chunk = pending.slice(i, i + MAX_BATCH_SIZE);
        const result = await uploadEventBatch(chunk);
        if (result.accepted_event_ids.length > 0) {
            await removePendingEvents(result.accepted_event_ids);
        }
        Object.assign(resolvedEventTypes, result.resolved_event_types ?? {});
    }

    return resolvedEventTypes;
}

export async function heartbeat(): Promise<void> {
    const pendingCount = await countPendingEvents();
    await sendHeartbeat(pendingCount);
}

/**
 * Refreshes the idle-screen media cache from the server — a plain
 * fetch-and-replace, not a delta feed (see replaceAllKioskMedia()'s
 * docblock for why). Left uncaught on purpose: an offline kiosk simply
 * keeps showing whatever it last cached, which is exactly the point of
 * caching it locally at all.
 */
export async function syncKioskMedia(): Promise<void> {
    const response = await fetchKioskMedia();
    await replaceAllKioskMedia(response.media);
}
