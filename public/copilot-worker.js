// public/copilot-worker.js
// Web Worker for AI Copilot — offloads heavy API processing to a background thread
// This keeps the main UI thread completely unblocked during AI response streaming

self.onmessage = async function (e) {
  const { type, payload, requestId } = e.data;

  if (type === 'COPILOT_REQUEST') {
    try {
      const { prompt, contextSummary, history } = payload;

      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, contextSummary, history }),
      });

      if (!res.ok) {
        throw new Error(`API responded with ${res.status}`);
      }

      const json = await res.json();

      self.postMessage({
        type: 'COPILOT_RESPONSE',
        requestId,
        success: true,
        data: json,
      });
    } catch (err) {
      self.postMessage({
        type: 'COPILOT_RESPONSE',
        requestId,
        success: false,
        error: err.message || 'Worker fetch failed',
      });
    }
    return;
  }

  if (type === 'EMAIL_REQUEST') {
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      self.postMessage({ type: 'EMAIL_RESPONSE', requestId, success: json.success, data: json });
    } catch (err) {
      self.postMessage({ type: 'EMAIL_RESPONSE', requestId, success: false, error: err.message });
    }
    return;
  }

  if (type === 'PING') {
    self.postMessage({ type: 'PONG', requestId });
    return;
  }
};
