#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(__dirname, '..');

export function normalizeBaseUrl(baseUrl) {
  if (!baseUrl) throw new Error('Missing 1Panel base URL. Set ONEPANEL_BASE_URL or pass --base-url.');
  return String(baseUrl).replace(/\/+$/, '');
}

export function normalizeApiPath(path) {
  if (!path) throw new Error('Missing API path.');
  let p = String(path).trim();
  if (!p.startsWith('/')) p = `/${p}`;
  if (!p.startsWith('/api/')) p = `/api/v2${p}`;
  return p;
}

export function makeAuthHeaders(apiKey, timestamp = Math.floor(Date.now() / 1000)) {
  if (!apiKey) throw new Error('Missing 1Panel API key. Set ONEPANEL_API_KEY or pass --api-key.');
  const token = createHash('md5').update(`1panel${apiKey}${timestamp}`).digest('hex');
  return {
    '1Panel-Token': token,
    '1Panel-Timestamp': String(timestamp),
    'Content-Type': 'application/json',
  };
}

function buildUrl(baseUrl, path, query) {
  const url = new URL(normalizeApiPath(path), `${normalizeBaseUrl(baseUrl)}/`);
  if (query && typeof query === 'object') {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        for (const item of value) url.searchParams.append(key, String(item));
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url;
}

export async function onePanelRequest({
  baseUrl = process.env.ONEPANEL_BASE_URL || process.env.ONEPANEL_URL,
  apiKey = process.env.ONEPANEL_API_KEY,
  method = 'GET',
  path,
  query,
  body,
  timeoutMs = Number(process.env.ONEPANEL_TIMEOUT_MS || 30000),
  insecure = ['1', 'true', 'yes'].includes(String(process.env.ONEPANEL_INSECURE || '').toLowerCase()),
} = {}) {
  if (insecure) process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const upperMethod = String(method || 'GET').toUpperCase();
  const url = buildUrl(baseUrl, path, query);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const options = {
    method: upperMethod,
    headers: makeAuthHeaders(apiKey),
    signal: controller.signal,
  };
  if (!['GET', 'HEAD'].includes(upperMethod) && body !== undefined) {
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let data = text;
    const contentType = res.headers.get('content-type') || '';
    if (text && contentType.includes('application/json')) {
      try { data = JSON.parse(text); } catch { /* keep raw text */ }
    } else if (text) {
      try { data = JSON.parse(text); } catch { /* keep raw text */ }
    }
    return {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      url: url.toString(),
      data,
    };
  } finally {
    clearTimeout(timer);
  }
}

function parseDocFile(filePath) {
  const moduleName = filePath
    .replace(/^SKILL-/, '')
    .replace(/\.md$/, '')
    .replace(/_/g, '/');
  const text = readFileSync(join(repoRoot, 'docs', filePath), 'utf8');
  const lines = text.split(/\r?\n/);
  const endpoints = [];
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^#{3,4}\s+(GET|POST|PUT|DELETE|PATCH)\s+(\/\S+)/i);
    if (!match) continue;
    const method = match[1].toUpperCase();
    const path = match[2].trim();
    let summary = '';
    for (let j = i + 1; j < Math.min(lines.length, i + 10); j += 1) {
      const fn = lines[j].match(/^\*\*功能\*\*[:：]\s*(.+)$/);
      if (fn) { summary = fn[1].trim(); break; }
    }
    endpoints.push({ module: moduleName, method, path, summary, doc: `docs/${filePath}`, line: i + 1 });
  }
  return endpoints;
}

export function loadEndpoints() {
  const docsDir = join(repoRoot, 'docs');
  if (!existsSync(docsDir)) return [];
  return readdirSync(docsDir)
    .filter((name) => /^SKILL-.+\.md$/.test(name))
    .flatMap(parseDocFile)
    .sort((a, b) => `${a.module} ${a.path}`.localeCompare(`${b.module} ${b.path}`));
}

export function searchEndpoints({ keyword = '', module, method, limit = 30 } = {}) {
  const terms = String(keyword || '').toLowerCase().split(/\s+/).filter(Boolean);
  const m = module ? String(module).toLowerCase() : '';
  const meth = method ? String(method).toUpperCase() : '';
  return loadEndpoints().filter((ep) => {
    if (meth && ep.method !== meth) return false;
    if (m && !ep.module.toLowerCase().includes(m)) return false;
    if (terms.length === 0) return true;
    const haystack = [ep.module, ep.method, ep.path, ep.summary].join(' ').toLowerCase();
    return terms.every((term) => haystack.includes(term));
  }).slice(0, Number(limit) || 30);
}

export function listModules() {
  return [...new Set(loadEndpoints().map((ep) => ep.module))];
}

export function toJson(value) {
  return JSON.stringify(value, null, 2);
}
