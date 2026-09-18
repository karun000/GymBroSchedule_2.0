// Persist successful summaries per account. Only newly added records invalidate them.
export const createSummaryCache = storage => {
  const pending = new Map();
  const memory = new Map();
  return async (uid, records, generate) => {
    const key = `@gymbro_ai_summary_additions_v1:${uid}`;
    // Serialize requests for an account, including requests with different data.
    while (pending.has(key)) {
      try { await pending.get(key); } catch { /* Allow a failed request to retry. */ }
    }
    const request = (async () => {
      let cached = memory.get(key);
      if (!cached) {
        try { cached = JSON.parse(await storage.getItem(key)); } catch { /* Cache miss. */ }
      }
      const ids = [
        ...records.prs.map(record => `pr:${record.id}`),
        ...records.measurements.map(record => `measurement:${record.id}`),
      ];
      const seen = new Set(cached?.recordIds || []);
      if (cached?.result && ids.every(id => seen.has(id))) return cached.result;
      const result = await generate();
      const entry = { recordIds: [...new Set([...seen, ...ids])], result };
      memory.set(key, entry);
      try { await storage.setItem(key, JSON.stringify(entry)); } catch { /* Keep the in-memory cache. */ }
      return result;
    })();
    pending.set(key, request);
    try { return await request; } finally { pending.delete(key); }
  };
};
