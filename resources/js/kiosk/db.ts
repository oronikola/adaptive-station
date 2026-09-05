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
const DB_VERSION = 1;

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

/** Called on a 401 from any device-API call — the credential was revoked. */
export async function clearCredential(): Promise<void> {
    const s = await store('meta', 'readwrite');
    await requestToPromise(s.put({ id: 'meta', masterDataCursor: 0 } satisfies MetaRecord));
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
