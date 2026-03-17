const store = new Map();

const redis = {
  async set(code, url) {
    const data = {
      url,
      createdAt: new Date().toISOString(),
      clicks: 0,
      enabled: true
    };
    store.set(code, JSON.stringify(data));
  },

  async get(code) {
    const raw = store.get(code);
    if (!raw) return null;

    try {
      const { url, enabled } = JSON.parse(raw);
      if (enabled === false) return null;
      return url;
    } catch {
      return raw;
    }
  },

  async del(code) {
    return store.delete(code);
  },

  async list() {
    const entries = [];

    for (const [code, raw] of store.entries()) {
      try {
        const { url, createdAt, clicks, enabled } = JSON.parse(raw);
        entries.push({
          code,
          url,
          createdAt,
          clicks: clicks || 0,
          enabled: enabled !== false
        });
      } catch {
        entries.push({
          code,
          url: raw,
          createdAt: null,
          clicks: 0,
          enabled: true
        });
      }
    }

    return entries.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  },

  async incr(key) {
    const code = key.replace("count:", "");
    const raw = store.get(code);
    if (!raw) return 0;

    const data = JSON.parse(raw);
    data.clicks = (data.clicks || 0) + 1;

    store.set(code, JSON.stringify(data));
    return data.clicks;
  },

  async incrementClick(code) {
    return this.incr(`count:${code}`);
  },

  async toggle(code) {
    const raw = store.get(code);
    if (!raw) return null;

    const data = JSON.parse(raw);
    data.enabled = !(data.enabled !== false);

    store.set(code, JSON.stringify(data));
    return data.enabled;
  }
};

module.exports = redis;