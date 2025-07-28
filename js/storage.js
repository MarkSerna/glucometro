// js/storage.js

const DB_NAME = 'GlucometroDB';
const HISTORY_STORE_NAME = 'history';
const RANGES_STORE_NAME = 'ranges';

async function openDB() {
    return idb.openDB(DB_NAME, 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(HISTORY_STORE_NAME)) {
                db.createObjectStore(HISTORY_STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(RANGES_STORE_NAME)) {
                db.createObjectStore(RANGES_STORE_NAME, { keyPath: 'id' });
            }
        },
    });
}

export async function getHistory() {
    const db = await openDB();
    return db.getAll(HISTORY_STORE_NAME);
}

export async function saveHistory(history) {
    const db = await openDB();
    const tx = db.transaction(HISTORY_STORE_NAME, 'readwrite');
    await Promise.all(history.map(record => tx.store.put(record)));
    await tx.done;
}

export async function saveRecord(record) {
    const db = await openDB();
    await db.put(HISTORY_STORE_NAME, record);
}

export async function deleteRecord(recordId) {
    const db = await openDB();
    await db.delete(HISTORY_STORE_NAME, recordId);
}

export async function clearHistory() {
    const db = await openDB();
    await db.clear(HISTORY_STORE_NAME);
}

export async function getTargetRanges() {
    const db = await openDB();
    const ranges = await db.get(RANGES_STORE_NAME, 'targetRanges');
    if (ranges) {
        return ranges.value;
    }
    return {
        beforeMeal: 95,
        afterMeal: 140
    };
}

export async function saveTargetRanges(ranges) {
    const db = await openDB();
    await db.put(RANGES_STORE_NAME, { id: 'targetRanges', value: ranges });
}
