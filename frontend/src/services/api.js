const API_BASE = `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api`;

export async function fetchHealth() {
  const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchTables() {
  const res = await fetch(`${API_BASE}/tables`);
  if (!res.ok) throw new Error('Failed to fetch tables');
  return res.json();
}

export async function fetchTableData(tableName) {
  const res = await fetch(`${API_BASE}/tables/${tableName}`);
  if (!res.ok) throw new Error(`Failed to fetch table ${tableName}`);
  return res.json();
}

export async function fetchExamples() {
  const res = await fetch(`${API_BASE}/examples`);
  if (!res.ok) throw new Error('Failed to fetch examples');
  return res.json();
}

export async function formatSql(query) {
  const res = await fetch(`${API_BASE}/format`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  if (!res.ok) throw new Error('Failed to format query');
  return res.json();
}

export async function visualizeQuery(query, datasetName = 'employees', customTables = null) {
  const res = await fetch(`${API_BASE}/visualize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      dataset_name: datasetName,
      custom_tables: customTables
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Network error' }));
    throw new Error(err.detail || 'Execution failed');
  }
  return res.json();
}

export async function createManualTable(tableName, columns, rows) {
  const res = await fetch(`${API_BASE}/tables/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table_name: tableName,
      columns,
      rows
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create table' }));
    throw new Error(err.detail || 'Failed to create table');
  }
  return res.json();
}

export async function uploadDatasets(files, tableName = null) {
  const formData = new FormData();
  if (tableName) {
    formData.append('table_name', tableName);
  }
  for (const file of files) {
    formData.append('files', file);
  }

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Upload failed');
  }
  return res.json();
}

export async function extractTableFromImage(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/ocr/extract-table`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'OCR extraction failed' }));
    throw new Error(err.detail || 'OCR extraction failed');
  }
  return res.json();
}

export async function extractQueryFromImage(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/ocr/extract-query`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Query extraction failed' }));
    throw new Error(err.detail || 'Query extraction failed');
  }
  return res.json();
}

// =============================================================================
// ADMIN API SERVICES
// =============================================================================

export async function verifyAdminPin(pin) {
  const res = await fetch(`${API_BASE}/admin/verify-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Invalid PIN' }));
    throw new Error(err.detail || 'Invalid Admin PIN');
  }
  return res.json();
}

export async function fetchAdminSettings() {
  const res = await fetch(`${API_BASE}/admin/settings`);
  if (!res.ok) throw new Error('Failed to fetch admin settings');
  return res.json();
}

export async function updateAdminSettings(settings) {
  const res = await fetch(`${API_BASE}/admin/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  if (!res.ok) throw new Error('Failed to update admin settings');
  return res.json();
}

export async function fetchLiveModels() {
  const res = await fetch(`${API_BASE}/admin/models`);
  if (!res.ok) throw new Error('Failed to fetch live models');
  return res.json();
}
