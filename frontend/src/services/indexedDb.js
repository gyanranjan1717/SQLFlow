/**
 * IndexedDB Client-side Persistent Storage for SQLFlow
 * Features:
 * - 7-Day Smart Auto-Cleanup for stale unpinned tables
 * - "📌 Keep Forever / Pin" toggle for critical datasets
 * - Manual Table Deletion & Clear All
 */

const DB_NAME = 'SQLFlowDB';
const DB_VERSION = 2; // Incremented for pinning support
const STORE_NAME = 'custom_tables';

export function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'table_name' });
        store.createIndex('created_at', 'created_at', { unique: false });
        store.createIndex('updated_at', 'updated_at', { unique: false });
        store.createIndex('is_pinned', 'is_pinned', { unique: false });
      } else {
        const store = event.target.transaction.objectStore(STORE_NAME);
        if (!store.indexNames.contains('is_pinned')) {
          store.createIndex('is_pinned', 'is_pinned', { unique: false });
        }
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error || new Error('Failed to open IndexedDB.'));
    };
  });
}

/**
 * Save or update a table in IndexedDB
 */
export async function saveTableToIDB(tableName, schema, rows, source = 'manual', isPinned = false) {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const record = {
        table_name: tableName.toLowerCase().trim(),
        schema,
        rows,
        row_count: rows.length,
        source, // 'excel' | 'sqlite' | 'csv' | 'manual' | 'ocr'
        is_pinned: isPinned,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const request = store.put(record);

      request.onsuccess = () => resolve(record);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('Error saving table to IndexedDB:', err);
    throw err;
  }
}

/**
 * Fetch all persistent tables from IndexedDB
 */
export async function getAllTablesFromIDB() {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.warn('Failed to retrieve tables from IndexedDB:', err);
    return [];
  }
}

/**
 * Toggle Pin / Keep Forever status
 */
export async function togglePinTable(tableName, isPinned) {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getReq = store.get(tableName.toLowerCase().trim());

      getReq.onsuccess = () => {
        const item = getReq.result;
        if (item) {
          item.is_pinned = isPinned;
          item.updated_at = new Date().toISOString();
          const putReq = store.put(item);
          putReq.onsuccess = () => resolve(item);
          putReq.onerror = (e) => reject(e.target.error);
        } else {
          resolve(null);
        }
      };
      getReq.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('Error toggling pin status:', err);
    throw err;
  }
}

/**
 * Touch / refresh updated_at when a table is used
 */
export async function touchTable(tableName) {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getReq = store.get(tableName.toLowerCase().trim());

    getReq.onsuccess = () => {
      const item = getReq.result;
      if (item) {
        item.updated_at = new Date().toISOString();
        store.put(item);
      }
    };
  } catch (e) {
    // Non-blocking touch
  }
}

/**
 * Smart Auto-Cleanup of tables older than retentionDays (default 7 days)
 * Leaves pinned tables untouched.
 */
export async function cleanExpiredTables(retentionDays = 7) {
  try {
    const tables = await getAllTablesFromIDB();
    const now = Date.now();
    const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;
    const expiredTables = [];

    for (const tbl of tables) {
      if (tbl.is_pinned) continue; // Pinned tables are kept forever

      const timestamp = new Date(tbl.updated_at || tbl.created_at).getTime();
      if (now - timestamp > maxAgeMs) {
        expiredTables.push(tbl.table_name);
        await deleteTableFromIDB(tbl.table_name);
      }
    }

    if (expiredTables.length > 0) {
      console.log(`[IndexedDB Auto-Cleanup] Purged ${expiredTables.length} tables older than ${retentionDays} days:`, expiredTables);
    }
    return expiredTables;
  } catch (err) {
    console.warn('Auto-cleanup check failed:', err);
    return [];
  }
}

/**
 * Delete a specific table from IndexedDB
 */
export async function deleteTableFromIDB(tableName) {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(tableName.toLowerCase().trim());

      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error(`Error deleting table ${tableName} from IndexedDB:`, err);
    throw err;
  }
}

/**
 * Clear all custom tables from IndexedDB
 */
export async function clearAllTablesFromIDB() {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('Error clearing IndexedDB tables:', err);
    throw err;
  }
}
