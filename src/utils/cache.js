const fs = require('fs').promises;
const path = require('path');
const LRU = require('lru-cache');
const EventEmitter = require('events');
const logger = require('./logger');

/**
 * UnifiedCache: Standardized cache utility for TanukiMCP tools
 * Supports in-memory (LRU), persistent (file), and hybrid modes
 * Provides TTL, max size, invalidation, and event hooks
 */
class UnifiedCache extends EventEmitter {
  /**
   * @param {Object} options
   * @param {string} [options.mode] - 'memory' | 'file' | 'hybrid'
   * @param {number} [options.max] - Max entries (for LRU)
   * @param {number} [options.ttl] - Time to live in ms
   * @param {string} [options.cacheDir] - Directory for file cache
   * @param {string} [options.prefix] - Key prefix (for file cache)
   */
  constructor({ mode = 'memory', max = 100, ttl = 5 * 60 * 1000, cacheDir, prefix = '' } = {}) {
    super();
    this.mode = mode;
    this.ttl = ttl;
    this.prefix = prefix;
    this.cacheDir = cacheDir || path.join(__dirname, '..', '..', 'data', 'cache');
    this.lru = new LRU({ max, ttl });
    if (mode !== 'memory') {
      fs.mkdir(this.cacheDir, { recursive: true }).catch(() => {});
    }
  }

  _getFilePath(key) {
    return path.join(this.cacheDir, `${this.prefix}${key}.json`);
  }

  async get(key) {
    // Try memory first
    let value = this.lru.get(key);
    if (value !== undefined) {
      this.emit('hit', key);
      return value;
    }
    // Try file if enabled
    if (this.mode !== 'memory') {
      try {
        const file = this._getFilePath(key);
        const data = JSON.parse(await fs.readFile(file, 'utf8'));
        if (Date.now() - data.cachedAt > this.ttl) {
          await fs.unlink(file).catch(() => {});
          this.emit('expired', key);
          return undefined;
        }
        this.lru.set(key, data.value);
        this.emit('hit', key);
        return data.value;
      } catch {
        this.emit('miss', key);
        return undefined;
      }
    }
    this.emit('miss', key);
    return undefined;
  }

  async set(key, value) {
    this.lru.set(key, value);
    if (this.mode !== 'memory') {
      const file = this._getFilePath(key);
      const data = { value, cachedAt: Date.now() };
      await fs.writeFile(file, JSON.stringify(data)).catch(err => logger.error('Cache file write error', { file, err }));
    }
    this.emit('set', key, value);
  }

  async del(key) {
    this.lru.delete(key);
    if (this.mode !== 'memory') {
      const file = this._getFilePath(key);
      await fs.unlink(file).catch(() => {});
    }
    this.emit('delete', key);
  }

  async clear() {
    this.lru.clear();
    if (this.mode !== 'memory') {
      try {
        const files = await fs.readdir(this.cacheDir);
        await Promise.all(files.filter(f => f.endsWith('.json')).map(f => fs.unlink(path.join(this.cacheDir, f))));
      } catch {}
    }
    this.emit('clear');
  }
}

module.exports = UnifiedCache; 