#!/usr/bin/env node
import http from 'node:http';
import { WebSocket } from 'ws';

const DEVTOOLS_HOST = 'localhost';
const DEVTOOLS_PORT = 9222;
const PORT = Number(process.env.MCP_PORT || '7777');

const server = http.createServer(async (req, res) => {
  try {
    if (req.method !== 'POST') { res.writeHead(405); return res.end(); }
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      const { method, params } = JSON.parse(body || '{}');
      const out = await handle(method, params || {});
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(out));
    });
  } catch (e) {
    res.writeHead(500); res.end(JSON.stringify({ error: e?.message || String(e) }));
  }
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Try: MCP_PORT=7778 node scripts/devtools-mcp-bridge.js`);
  }
  process.exit(1);
});

server.listen(PORT, () => console.log(`DevTools MCP bridge listening on :${PORT}`));

async function handle(method, params) {
  if (method === 'targets') {
    const tabs = await fetch(`http://${DEVTOOLS_HOST}:${DEVTOOLS_PORT}/json`).then(r => r.json());
    return { tabs };
  }
  if (method === 'evaluate') {
    const { targetId, expression } = params;
    const wsUrl = await wsUrlForTarget(targetId);
    const result = await sendCDP(wsUrl, 'Runtime.evaluate', { expression, returnByValue: true });
    return { result };
  }
  if (method === 'getResourceContent') {
    const { targetId, url } = params;
    const wsUrl = await wsUrlForTarget(targetId);
    // Enable Page domain (often optional but safe)
    await sendCDP(wsUrl, 'Page.enable', {});
    const tree = await sendCDP(wsUrl, 'Page.getFrameTree', {});
    const frameId = tree?.frameTree?.frame?.id || tree?.frame?.id;
    if (!frameId) return { error: 'frameId not found' };
    const content = await sendCDP(wsUrl, 'Page.getResourceContent', { frameId, url });
    return content; // { content, base64Encoded }
  }
  if (method === 'getHTML') {
    const { targetId } = params;
    const wsUrl = await wsUrlForTarget(targetId);
    const { result: doc } = await sendCDP(wsUrl, 'DOM.getDocument', { depth: -1 });
    const outer = await sendCDP(wsUrl, 'DOM.getOuterHTML', { nodeId: doc.root.nodeId });
    return outer;
  }
  if (method === 'fetchResourceBase64') {
    const { targetId, url } = params;
    const wsUrl = await wsUrlForTarget(targetId);
    const out = await fetchResourceBase64(wsUrl, url);
    return out; // { body, base64Encoded, mime }
  }
  return { error: 'unknown method' };
}

async function wsUrlForTarget(targetId) {
  const tabs = await fetch(`http://${DEVTOOLS_HOST}:${DEVTOOLS_PORT}/json`).then(r => r.json());
  const t = tabs.find(t => t.id === targetId) || tabs[0];
  if (!t) throw new Error('no targets');
  return t.webSocketDebuggerUrl;
}

async function sendCDP(wsUrl, method, params) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  return await new Promise((resolve, reject) => {
    const send = (m, p) => { id += 1; const thisId = id; ws.send(JSON.stringify({ id: thisId, method: m, params: p })); return thisId; };
    const callbacks = new Map();
    ws.on('open', () => {
      const reqId = send(method, params);
      callbacks.set(reqId, (result) => { resolve(result); ws.close(); });
    });
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(String(data));
        if ('id' in msg && callbacks.has(msg.id)) {
          const cb = callbacks.get(msg.id); callbacks.delete(msg.id);
          cb(msg.result || msg);
        }
      } catch (e) { reject(e); }
    });
    ws.on('error', reject);
  });
}

async function fetchResourceBase64(wsUrl, url) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const send = (m, p) => { id += 1; const thisId = id; ws.send(JSON.stringify({ id: thisId, method: m, params: p })); return thisId; };
  const cbs = new Map();
  let targetRequestId = null;
  let mime = 'application/octet-stream';
  return await new Promise((resolve, reject) => {
    ws.on('open', () => {
      const enableId = send('Network.enable', {});
      cbs.set(enableId, () => {
        // Trigger fetch in page context; we only listen for network
        send('Runtime.evaluate', { expression: `fetch(${JSON.stringify(url)}, {credentials:'include'}).catch(()=>{})` });
        // Also force a reload to ensure network request is observed (useful on image-only tabs)
        send('Page.reload', {});
      });
    });
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(String(data));
        if (msg.id && cbs.has(msg.id)) { const cb = cbs.get(msg.id); cbs.delete(msg.id); cb(msg.result || msg); }
        if (msg.method === 'Network.responseReceived') {
          const resp = msg.params?.response;
          if (resp?.url === url) {
            targetRequestId = msg.params.requestId;
            mime = resp.mimeType || mime;
            const getId = send('Network.getResponseBody', { requestId: targetRequestId });
            cbs.set(getId, (result) => { resolve({ body: result.body, base64Encoded: !!result.base64Encoded, mime }); ws.close(); });
          }
        }
      } catch (e) { reject(e); }
    });
    ws.on('error', reject);
    ws.on('close', () => { if (!targetRequestId) reject(new Error('request not captured')); });
  });
}



