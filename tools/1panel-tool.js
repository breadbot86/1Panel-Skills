#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { onePanelRequest, searchEndpoints, listModules, toJson } from './1panel-lib.js';

function usage() {
  console.log(`1panel-tool - Node.js tool runner for 1Panel API

Usage:
  1panel-tool request --method GET --path /containers/status [--query '{"a":1}'] [--body '{...}']
  1panel-tool get /containers/status
  1panel-tool post /containers/search --body '{"page":1,"pageSize":20}'
  1panel-tool endpoints [--keyword container] [--module containers] [--method POST] [--limit 20]
  1panel-tool modules
  1panel-tool tool-call '{"tool":"onepanel_request","args":{"method":"GET","path":"/containers/status"}}'

Environment:
  ONEPANEL_BASE_URL   e.g. http://127.0.0.1:8888
  ONEPANEL_API_KEY    1Panel API key from Settings -> API key
  ONEPANEL_INSECURE   set true to allow self-signed HTTPS certificates
`);
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) { out._.push(arg); continue; }
    const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else { out[key] = next; i += 1; }
  }
  return out;
}

function parseJsonOption(value, name) {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === '-') return JSON.parse(readFileSync(0, 'utf8'));
  try { return JSON.parse(value); }
  catch (error) { throw new Error(`Invalid JSON for --${name}: ${error.message}`); }
}

async function runToolCall(input) {
  const payload = typeof input === 'string' ? JSON.parse(input) : input;
  const tool = payload.tool || payload.name;
  const args = payload.args || payload.arguments || {};
  switch (tool) {
    case 'onepanel_request':
      return onePanelRequest(args);
    case 'onepanel_get':
      return onePanelRequest({ ...args, method: 'GET' });
    case 'onepanel_post':
      return onePanelRequest({ ...args, method: 'POST' });
    case 'onepanel_endpoint_search':
      return { endpoints: searchEndpoints(args) };
    case 'onepanel_modules':
      return { modules: listModules() };
    default:
      throw new Error(`Unknown tool: ${tool}`);
  }
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') return usage();

  if (cmd === 'request') {
    const result = await onePanelRequest({
      baseUrl: args.baseUrl,
      apiKey: args.apiKey,
      method: args.method || 'GET',
      path: args.path || args._[0],
      query: parseJsonOption(args.query, 'query'),
      body: parseJsonOption(args.body, 'body'),
      timeoutMs: args.timeoutMs ? Number(args.timeoutMs) : undefined,
    });
    console.log(toJson(result));
    process.exitCode = result.ok ? 0 : 2;
    return;
  }

  if (cmd === 'get' || cmd === 'post') {
    const result = await onePanelRequest({
      baseUrl: args.baseUrl,
      apiKey: args.apiKey,
      method: cmd.toUpperCase(),
      path: args.path || args._[0],
      query: parseJsonOption(args.query, 'query'),
      body: parseJsonOption(args.body, 'body'),
      timeoutMs: args.timeoutMs ? Number(args.timeoutMs) : undefined,
    });
    console.log(toJson(result));
    process.exitCode = result.ok ? 0 : 2;
    return;
  }

  if (cmd === 'endpoints') {
    console.log(toJson({ endpoints: searchEndpoints(args) }));
    return;
  }

  if (cmd === 'modules') {
    console.log(toJson({ modules: listModules() }));
    return;
  }

  if (cmd === 'tool-call') {
    const json = args._[0] || readFileSync(0, 'utf8');
    console.log(toJson(await runToolCall(json)));
    return;
  }

  throw new Error(`Unknown command: ${cmd}`);
}

main().catch((error) => {
  console.error(toJson({ ok: false, error: error.message }));
  process.exit(1);
});
