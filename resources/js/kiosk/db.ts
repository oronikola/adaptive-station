/**
 * Local persistence for the kiosk client — IndexedDB, not localStorage,
 * since the people/cards cache can run into the thousands of rows and
 * localStorage's ~5MB string-only storage is the wrong tool for that. No
 * external dependency: IndexedDB's native API wrapped in a few promises is
 * small enough on its own that pulling in a library isn't worth it.
 *
 * Five object stores:
 * - meta: a single row (id 'meta') holding the device's own credential
 *   token, station identity, and master-data sync cursor.
 * - people / cards: the local mirror of Person/RfidCard, built from the
 *   master-data change feed (see sync.ts) so a tap can be resolved
 *   instantly and offline, without a round-trip to the server.
 * - pending_events: tap events recorded locally, awaiting upload.
 * - last_tap: last known event_type per person, driving the IN/OUT
 *   auto-toggle and the double-tap grace window.
 */

const DB_NAME = 'adaptive-station-kiosk';
const DB_VERSION = 2;

export interface MetaRecord {
    id: 'meta';
    credentialToken?: string;
    stationId?: string;
    stationName?: string;
    masterDataCursor: number;
}

export interface PersonRecord {
    id: string;
    external_id: string | null;
    person_type: string;
    display_name: string;
    grade_level: string | null;
    section: string | null;
    photo_url: string | null;
    is_active: boolean;
    metadata: Record<string, unknown> | null;
    updated_at: string | null;
}

export interface CardRecord {
    card_uid: string;
    id: string;
    person_id: string;
    is_active: boolean;
}

export type TapEventType = 'IN' | 'OUT';

export interface PendingEventRecord {
    id: string;
    card_uid: string;
    event_type: TapEventType;
    occurred_at: string;
    occurred_offset_minutes: number;
    metadata?: Record<string, unknown>;
}

export interface LastTapRecord {
    person_id: string;
    event_type: TapEventType;
    at: string;
}

/**
 * One idle-screen slide, cached locally so the idle carousel/video still
 * has something to show if the kiosk is offline when it goes idle.
 * `position` must be re-sorted on after every read — IndexedDB's getAll()
 * returns rows by primary key (`id`, a UUID), not insertion order, so the
 * server's intended display order would otherwise be lost on every reload.
 */
export interface KioskMediaRecord {
    id: string;
    type: 'image' | 'video';
    url: string;
    duration_seconds: number | null;
    position: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('meta')) {
                db.createObjectStore('meta', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('people')) {
                db.createObjectStore('people', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('cards')) {
                db.createObjectStore('cards', { keyPath: 'card_uid' });
            }
            if (!db.objectStoreNames.contains('pending_events')) {
                db.createObjectStore('pending_events', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('last_tap')) {
                db.createObjectStore('last_tap', { keyPath: 'person_id' });
            }
            if (!db.objectStoreNames.contains('kiosk_media')) {
                db.createObjectStore('kiosk_media', { keyPath: 'id' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    return dbPromise;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function store(name: string, mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const db = await openDb();
    return db.transaction(name, mode).objectStore(name);
}

// ── meta ────────────────────────────────────────────────────────────────

export async function getMeta(): Promise<MetaRecord> {
    const s = await store('meta', 'readonly');
    const existing = await requestToPromise(s.get('meta') as IDBRequest<MetaRecord | undefined>);
    return existing ?? { id: 'meta', masterDataCursor: 0 };
}

export async function setMeta(patch: Partial<Omit<MetaRecord, 'id'>>): Promise<void> {
    const current = await getMeta();
    const s = await store('meta', 'readwrite');
    await requestToPromise(s.put({ ...current, ...patch, id: 'meta' }));
}

/**
 * Called on a 401 from any device-API call (credential revoked) and on the
 * kiosk's own "deactivate" admin action — clears the credential and every
 * locally-cached person/card/tap record, so the device starts genuinely
 * blank rather than possibly re-activating into stale data.
 */
export async function clearCredential(): Promise<void> {
    const s = await store('meta', 'readwrite');
    await requestToPromise(s.put({ id: 'meta', masterDataCursor: 0 } satisfies MetaRecord));
    await resetKioskCache();
}

/**
 * Wipes every locally-cached person/card/tap record — everything the
 * master-data sync built up, plus anything still queued to upload. This
 * IndexedDB database is scoped to the browser's *origin*, not to a tenant
 * or station, so re-pairing this same browser to a different station
 * (different tenant) without this would leave the previous tenant's
 * card_uid → person mappings sitting in `cards`/`people` — a card that
 * happens to share a UID with a prior tenant's (e.g. the same physical
 * test card reused across schools) would then resolve instantly from that
 * stale entry instead of ever asking the newly-paired station's own
 * tenant. Called on every successful pairing/activation, and on the
 * kiosk's own "deactivate" admin action, so a fresh credential always
 * starts from a genuinely empty cache.
 */
export async function resetKioskCache(): Promise<void> {
    await Promise.all(
        (['people', 'cards', 'pending_events', 'last_tap', 'kiosk_media'] as const).map(async (name) => {
            const s = await store(name, 'readwrite');
            await requestToPromise(s.clear());
        }),
    );
}

// ── people ──────────────────────────────────────────────────────────────

export async function upsertPerson(person: PersonRecord): Promise<void> {
    const s = await store('people', 'readwrite');
    await requestToPromise(s.put(person));
}

export async function deletePerson(id: string): Promise<void> {
    const s = await store('people', 'readwrite');
    await requestToPromise(s.delete(id));
}

export async function getPerson(id: string): Promise<PersonRecord | undefined> {
    const s = await store('people', 'readonly');
    return requestToPromise(s.get(id) as IDBRequest<PersonRecord | undefined>);
}

// ── cards ───────────────────────────────────────────────────────────────

export async function upsertCard(card: CardRecord): Promise<void> {
    const s = await store('cards', 'readwrite');
    await requestToPromise(s.put(card));
}

export async function deleteCard(cardUid: string): Promise<void> {
    const s = await store('cards', 'readwrite');
    await requestToPromise(s.delete(cardUid));
}

export async function getCardByUid(cardUid: string): Promise<CardRecord | undefined> {
    const s = await store('cards', 'readonly');
    return requestToPromise(s.get(cardUid) as IDBRequest<CardRecord | undefined>);
}

// ── pending_events ──────────────────────────────────────────────────────

export async function addPendingEvent(event: PendingEventRecord): Promise<void> {
    const s = await store('pending_events', 'readwrite');
    await requestToPromise(s.put(event));
}

export async function getAllPendingEvents(): Promise<PendingEventRecord[]> {
    const s = await store('pending_events', 'readonly');
    return requestToPromise(s.getAll() as IDBRequest<PendingEventRecord[]>);
}

export async function removePendingEvents(ids: string[]): Promise<void> {
    const s = await store('pending_events', 'readwrite');
    await Promise.all(ids.map((id) => requestToPromise(s.delete(id))));
}

export async function countPendingEvents(): Promise<number> {
    const s = await store('pending_events', 'readonly');
    return requestToPromise(s.count());
}

// ── last_tap ────────────────────────────────────────────────────────────

export async function getLastTap(personId: string): Promise<LastTapRecord | undefined> {
    const s = await store('last_tap', 'readonly');
    return requestToPromise(s.get(personId) as IDBRequest<LastTapRecord | undefined>);
}

export async function setLastTap(record: LastTapRecord): Promise<void> {
    const s = await store('last_tap', 'readwrite');
    await requestToPromise(s.put(record));
}

// ── kiosk_media ─────────────────────────────────────────────────────────

export async function getAllKioskMedia(): Promise<KioskMediaRecord[]> {
    const s = await store('kiosk_media', 'readonly');
    const items = await requestToPromise(s.getAll() as IDBRequest<KioskMediaRecord[]>);
    // getAll() returns rows by primary key (id, a UUID), not insertion
    // order — see KioskMediaRecord's docblock. Re-sorting here, in the one
    // place every caller reads through, means no caller can forget it.
    return items.sort((a, b) => a.position - b.position);
}

/**
 * Wholesale replace, not an upsert-by-id sync — the list is small (a
 * handful of slides at most) and the device API always returns the
 * complete current set, so there's no partial-change feed to reconcile
 * against and a removed slide needs to actually disappear locally.
 */
export async function replaceAllKioskMedia(items: KioskMediaRecord[]): Promise<void> {
    const s = await store('kiosk_media', 'readwrite');
    // Every request issued synchronously (no await between them) so they
    // all land on the same transaction, in call order — clear() first, then
    // each put(). Awaiting the clear() individually before issuing the
    // put()s would let the transaction auto-commit in between (its last
    // queued request having already resolved) and throw
    // TransactionInactiveError on the first put().
    const clearRequest = s.clear();
    const putRequests = items.map((item) => s.put(item));
    await Promise.all([
        requestToPromise(clearRequest),
        ...putRequests.map((request) => requestToPromise(request)),
    ]);
}
