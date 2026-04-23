/**
 * TaxPilot — IndexedDB Layer
 * Persistent storage for ingested documents, extracted field values, and LLM judge verdicts.
 * Works in both MV3 service workers (background.js) and extension pages (sidepanel.js).
 *
 * Stores:
 *   documents   — one record per ingested PDF (metadata + status)
 *   fieldValues — one record per extracted field (typed, confidence-scored, source-linked)
 *   judgments   — LLM judge verdict per document
 */

'use strict';

const DB_NAME    = 'TaxPilotDB';
const DB_VERSION = 1;

let _db = null;

async function openDB() {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains('documents')) {
        const s = db.createObjectStore('documents', { keyPath: 'id' });
        s.createIndex('status',     'status',     { unique: false });
        s.createIndex('docType',    'docType',    { unique: false });
        s.createIndex('uploadedAt', 'uploadedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('fieldValues')) {
        // key = `${docId}::${globalKey}` — unique per doc+field
        // globalKey alone is NOT unique (multiple docs may have the same field)
        const s = db.createObjectStore('fieldValues', { keyPath: 'key' });
        s.createIndex('globalKey',    'globalKey',    { unique: false });
        s.createIndex('sourceDocId',  'sourceDocId',  { unique: false });
        s.createIndex('confidence',   'confidence',   { unique: false });
      }

      if (!db.objectStoreNames.contains('judgments')) {
        db.createObjectStore('judgments', { keyPath: 'docId' });
      }
    };

    req.onsuccess  = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror    = ()  => reject(req.error);
  });
}

// ── Generic helpers ───────────────────────────────────────────────────────────

function idbGet(store, key) {
  return openDB().then(db => new Promise((res, rej) => {
    const req = db.transaction(store, 'readonly').objectStore(store).get(key);
    req.onsuccess = () => res(req.result ?? null);
    req.onerror   = () => rej(req.error);
  }));
}

function idbGetAll(store) {
  return openDB().then(db => new Promise((res, rej) => {
    const req = db.transaction(store, 'readonly').objectStore(store).getAll();
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  }));
}

function idbPut(store, value) {
  return openDB().then(db => new Promise((res, rej) => {
    const tx  = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(value);
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  }));
}

function idbPutMany(store, values) {
  if (!values.length) return Promise.resolve();
  return openDB().then(db => new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite');
    const s  = tx.objectStore(store);
    for (const v of values) s.put(v);
    tx.oncomplete = () => res();
    tx.onerror    = () => rej(tx.error);
  }));
}

function idbDelete(store, key) {
  return openDB().then(db => new Promise((res, rej) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).delete(key);
    req.onsuccess = () => res();
    req.onerror   = () => rej(req.error);
  }));
}

function idbClear(store) {
  return openDB().then(db => new Promise((res, rej) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).clear();
    req.onsuccess = () => res();
    req.onerror   = () => rej(req.error);
  }));
}

// ── Documents API ─────────────────────────────────────────────────────────────

export const saveDocument   = doc => idbPut('documents', doc);
export const getDocument    = id  => idbGet('documents', id);
export const getAllDocuments = ()  => idbGetAll('documents');
export const deleteDocument = id  => idbDelete('documents', id);

// ── Field values API ──────────────────────────────────────────────────────────

export const saveFieldValues  = values => idbPutMany('fieldValues', values);
export const getAllFieldValues = ()     => idbGetAll('fieldValues');
export const clearFieldValues = ()     => idbClear('fieldValues');

/** Delete all field value records belonging to a specific document. */
export async function deleteDocumentFieldValues(docId) {
  const all = await getAllFieldValues();
  const keys = all.filter(fv => fv.sourceDocId === docId).map(fv => fv.key);
  if (!keys.length) return;
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction('fieldValues', 'readwrite');
    const s  = tx.objectStore('fieldValues');
    for (const key of keys) s.delete(key);
    tx.oncomplete = () => res();
    tx.onerror    = () => rej(tx.error);
  });
}

// ── Judgments API ─────────────────────────────────────────────────────────────

export const saveJudgment   = j     => idbPut('judgments', j);
export const getJudgment    = docId => idbGet('judgments', docId);
export const getAllJudgments = ()    => idbGetAll('judgments');

// ── Maintenance ───────────────────────────────────────────────────────────────

export async function clearAllData() {
  await Promise.all([
    idbClear('documents'),
    idbClear('fieldValues'),
    idbClear('judgments'),
  ]);
}

export async function getStats() {
  const [docs, fields] = await Promise.all([getAllDocuments(), getAllFieldValues()]);
  return {
    documentCount:   docs.length,
    fieldValueCount: fields.length,
    approvedCount:   docs.filter(d => d.status === 'approved').length,
    flaggedCount:    docs.filter(d => d.status === 'flagged').length,
    failedCount:     docs.filter(d => d.status === 'failed').length,
  };
}
