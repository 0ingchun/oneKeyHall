import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

test('static pages, navigation, module graph and firmware resolve at root and GitHub project paths', async () => {
  const root = new URL('../host/', import.meta.url);
  for (const prefix of ['/', '/oneKeyHall/']) {
    const site = new URL(`https://example.github.io${prefix}`);
    const visited = new Set(), queue = [new URL('index.html', site)];
    function enqueue(reference, base) {
      if (/^(?:https?:|data:|mailto:|#)/.test(reference)) return;
      const url = new URL(reference, base);
      assert.equal(url.origin, site.origin);
      assert(url.pathname.startsWith(prefix), `URL escapes project path: ${url}`);
      queue.push(url);
    }
    while (queue.length) {
      const url = queue.shift();
      if (visited.has(url.href)) continue;
      visited.add(url.href);
      const relative = url.pathname.slice(prefix.length) || 'index.html';
      const file = new URL(relative, root);
      assert((await stat(file)).isFile(), `Missing static asset: ${url}`);
      if (!/\.(?:html|mjs|js|css)$/.test(relative)) continue;
      const source = await readFile(file, 'utf8');
      if (relative.endsWith('.html')) {
        for (const match of source.matchAll(/(?:href|src)="([^"]+)"/g)) enqueue(match[1], url);
      }
      // Covers standalone modules and inline module scripts in touch-test.html.
      for (const match of source.matchAll(/(?:from\s+|import\s*)['"](\.\.?\/[^'"]+)['"]/g)) enqueue(match[1], url);
      if (relative.endsWith('.css')) {
        for (const match of source.matchAll(/url\(['"]?([^'"\s)]+)['"]?\)/g)) enqueue(match[1], url);
      }
    }
    for (const relative of ['assets/app.mjs', 'assets/protocol.html', 'assets/touch-test.html', 'assets/i18n.mjs', 'firmware/latest.hex']) {
      assert(visited.has(new URL(relative, site).href), `Unreachable entry: ${relative}`);
    }
  }
});
