#!/usr/bin/env node
import { createInterface } from 'node:readline';
import { onePanelRequest, searchEndpoints, listModules } from './1panel-lib.js';

const toolSchemas = [
  {
    name: 'onepanel_request',
    description: 'Call any 1Panel API endpoint. Use this instead of writing curl manually.',
    inputSchema: {
      type: 'object',
      required: ['method', 'path'],
      properties: {
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
        path: { type: 'string', description: 'Endpoint path, e.g. /containers/status. /api/v2 prefix is added automatically when omitted.' },
        query: { type: 'object', description: 'Query string parameters.' },
        body: { type: ['object', 'array', 'string', 'null'], description: 'JSON request body for non-GET requests.' },
        timeoutMs: { type: 'number', description: 'Request timeout in milliseconds.' },
      },
    },
  },
  {
    name: 'onepanel_get',
    description: 'GET a 1Panel API endpoint. Shortcut for onepanel_request with method=GET.',
    inputSchema: {
      type: 'object',
      required: ['path'],
      properties: {
        path: { type: 'string' },
        query: { type: 'object' },
        timeoutMs: { type: 'number' },
      },
    },
  },
  {
    name: 'onepanel_post',
    description: 'POST to a 1Panel API endpoint. Shortcut for onepanel_request with method=POST.',
    inputSchema: {
      type: 'object',
      required: ['path'],
      properties: {
        path: { type: 'string' },
        query: { type: 'object' },
        body: { type: ['object', 'array', 'string', 'null'] },
        timeoutMs: { type: 'number' },
      },
    },
  },
  {
    name: 'onepanel_endpoint_search',
    description: 'Search the bundled 1Panel endpoint index before calling an API.',
    inputSchema: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: 'Keyword in module, path, method, or summary.' },
        module: { type: 'string', description: 'Optional module filter, e.g. containers, websites, settings.' },
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
        limit: { type: 'number', default: 30 },
      },
    },
  },
  {
    name: 'onepanel_modules',
    description: 'List modules available in the bundled 1Panel endpoint index.',
    inputSchema: { type: 'object', properties: {} },
  },
];

function textResult(value) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}

async function callTool(name, args = {}) {
  switch (name) {
    case 'onepanel_request':
      return textResult(await onePanelRequest(args));
    case 'onepanel_get':
      return textResult(await onePanelRequest({ ...args, method: 'GET' }));
    case 'onepanel_post':
      return textResult(await onePanelRequest({ ...args, method: 'POST' }));
    case 'onepanel_endpoint_search':
      return textResult({ endpoints: searchEndpoints(args) });
    case 'onepanel_modules':
      return textResult({ modules: listModules() });
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function handle(message) {
  const { id, method, params = {} } = message;
  if (method === 'initialize') {
    return {
      jsonrpc: '2.0', id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: '1panel-skills', version: '0.2.0' },
      },
    };
  }
  if (method === 'notifications/initialized') return null;
  if (method === 'tools/list') return { jsonrpc: '2.0', id, result: { tools: toolSchemas } };
  if (method === 'tools/call') {
    const result = await callTool(params.name, params.arguments || {});
    return { jsonrpc: '2.0', id, result };
  }
  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', async (line) => {
  if (!line.trim()) return;
  try {
    const response = await handle(JSON.parse(line));
    if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
  } catch (error) {
    let id = null;
    try { id = JSON.parse(line).id ?? null; } catch { /* ignore */ }
    process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32000, message: error.message } })}\n`);
  }
});
