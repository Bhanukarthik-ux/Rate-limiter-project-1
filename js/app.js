(() => {
  "use strict";

  const cfg = window.RLTI_CONFIG || {};
  const state = {
    rateLimit: Number(cfg.defaultRateLimit || 10),
    mode: "sim",
    counts: { total: 0, ok: 0, throttled: 0 },
    recent: [],
    requestNo: 0,
    windowRequests: [],
    busy: false,
    filter: "all"
  };

  const $ = id => document.getElementById(id);
  const el = {
    modeBadge: $("modeBadge"), awsToggle: $("awsToggle"), awsBox: $("awsBox"),
    rateLimit: $("rateLimit"), rateLimitVal: $("rateLimitVal"),
    endpoint: $("endpoint"), singleBtn: $("singleBtn"), tenBtn: $("tenBtn"),
    burstBtn: $("burstBtn"), demoBtn: $("demoBtn"), resetBtn: $("resetBtn"),
    apiUrl: $("apiUrl"), apiKey: $("apiKey"), liveBtn: $("liveBtn"),
    indicator: $("indicator"), statusChip: $("statusChip"), statusCode: $("statusCode"),
    statusTitle: $("statusTitle"), statusMessage: $("statusMessage"),
    currentRate: $("currentRate"), rateFill: $("rateFill"), limitCaption: $("limitCaption"),
    totalCount: $("totalCount"), allowedCount: $("allowedCount"),
    throttledCount: $("throttledCount"), throttleRate: $("throttleRate"),
    logBody: $("logBody")
  };

  el.rateLimit.value = state.rateLimit;
  el.rateLimitVal.textContent = state.rateLimit;
  el.limitCaption.textContent = `Limit ${state.rateLimit} req/s`;
  if (cfg.apiEndpoint) el.apiUrl.value = cfg.apiEndpoint;
  if (cfg.apiKey) el.apiKey.value = cfg.apiKey;

  el.rateLimit.addEventListener("input", () => {
    state.rateLimit = Number(el.rateLimit.value);
    el.rateLimitVal.textContent = state.rateLimit;
    el.limitCaption.textContent = `Limit ${state.rateLimit} req/s`;
    updateRateMeter();
  });

  el.awsToggle.addEventListener("click", () => {
    el.awsBox.hidden = !el.awsBox.hidden;
  });

  el.singleBtn.addEventListener("click", () => sendOne());
  el.tenBtn.addEventListener("click", () => sendBatch(10, 80));
  el.burstBtn.addEventListener("click", () => sendBatch(25, 20));
  el.demoBtn.addEventListener("click", runFullDemo);
  el.resetBtn.addEventListener("click", reset);

  el.liveBtn.addEventListener("click", () => {
    const url = el.apiUrl.value.trim();
    if (!url) {
      setStatus("error", "—", "AWS URL required", "Enter your API Gateway invoke URL first.");
      return;
    }
    state.mode = "live";
    el.modeBadge.innerHTML = '<span class="dot"></span> AWS LIVE API';
    el.liveBtn.textContent = "AWS Live API Enabled";
    el.liveBtn.disabled = true;
  });

  document.querySelectorAll(".filter").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.filter = btn.dataset.filter;
      renderLog();
    });
  });

  async function sendOne() {
    if (state.busy) return;
    const result = state.mode === "live" ? await liveRequest() : simulateRequest();
    record(result);
  }

  function simulateRequest() {
    const now = performance.now();
    state.windowRequests = state.windowRequests.filter(t => now - t < 1000);
    const allowed = state.windowRequests.length < state.rateLimit;
    if (allowed) state.windowRequests.push(now);

    return {
      status: allowed ? "ok" : "throttled",
      code: allowed ? 200 : 429,
      source: "Software simulation"
    };
  }

  async function liveRequest() {
    const url = el.apiUrl.value.trim();
    const headers = {};
    const key = el.apiKey.value.trim();
    if (key) headers["x-api-key"] = key;

    const start = performance.now();
    try {
      const response = await fetch(url, { method: "GET", headers });
      return {
        status: response.status === 200 ? "ok" : response.status === 429 ? "throttled" : "error",
        code: response.status,
        source: "AWS API Gateway",
        latency: Math.round(performance.now() - start)
      };
    } catch (err) {
      return { status: "error", code: "NETWORK", source: "AWS Live API", note: err.message };
    }
  }

  function record(result) {
    state.requestNo += 1;
    state.counts.total += 1;
    if (result.status === "ok") state.counts.ok += 1;
    if (result.status === "throttled") state.counts.throttled += 1;

    state.recent.unshift({
      no: state.requestNo,
      time: new Date().toLocaleTimeString(),
      status: result.status,
      code: result.code,
      source: result.source
    });
    if (state.recent.length > 50) state.recent.pop();

    updateMetrics();
    renderLog();
    setStatus(
      result.status,
      result.code,
      result.status === "ok" ? "Request allowed" :
      result.status === "throttled" ? "API throttled" : "Request error",
      result.status === "ok"
        ? "The request was within the configured rate limit."
        : result.status === "throttled"
        ? "The request exceeded the configured rate limit and was rejected."
        : (result.note || "The request could not be completed.")
    );
  }

  async function sendBatch(count, delay) {
    if (state.busy) return;
    state.busy = true;
    disableControls(true);
    for (let i = 0; i < count; i++) {
      const result = state.mode === "live" ? await liveRequest() : simulateRequest();
      record(result);
      await sleep(delay);
    }
    state.busy = false;
    disableControls(false);
  }

  async function runFullDemo() {
    if (state.busy) return;
    reset();
    await sleep(250);
    await sendBatch(5, 120);
    await sleep(500);
    await sendBatch(15, 20);
  }

  function setStatus(status, code, title, message) {
    el.indicator.dataset.state = status === "error" ? "pending" : status;
    el.statusCode.textContent = code === "—" ? "—" : `HTTP ${code}`;
    el.statusTitle.textContent = title;
    el.statusMessage.textContent = message;
    el.statusChip.textContent =
      status === "ok" ? "NORMAL" :
      status === "throttled" ? "THROTTLED" : "ERROR";
  }

  function updateMetrics() {
    el.totalCount.textContent = state.counts.total;
    el.allowedCount.textContent = state.counts.ok;
    el.throttledCount.textContent = state.counts.throttled;
    const pct = state.counts.total ? Math.round(state.counts.throttled / state.counts.total * 100) : 0;
    el.throttleRate.textContent = `${pct}%`;
    updateRateMeter();
  }

  function updateRateMeter() {
    const now = performance.now();
    state.windowRequests = state.windowRequests.filter(t => now - t < 1000);
    const current = state.windowRequests.length;
    const pct = Math.min(100, current / state.rateLimit * 100);
    el.currentRate.textContent = `${current} req/s`;
    el.rateFill.style.width = `${pct}%`;
  }

  setInterval(updateRateMeter, 100);

  function renderLog() {
    const rows = state.recent.filter(r => state.filter === "all" || r.status === state.filter);
    if (!rows.length) {
      el.logBody.innerHTML = '<tr class="empty"><td colspan="6">No matching requests.</td></tr>';
      return;
    }
    el.logBody.innerHTML = rows.map(r => `
      <tr>
        <td>${r.no}</td>
        <td>${r.time}</td>
        <td>GET</td>
        <td>/api/v1/data</td>
        <td><span class="status-pill ${r.status === "ok" ? "ok" : r.status === "throttled" ? "throttled" : ""}">
          ${r.status === "ok" ? "200 OK" : r.status === "throttled" ? "429 THROTTLED" : `ERROR ${r.code}`}
        </span></td>
        <td>${escapeHtml(r.source)}</td>
      </tr>
    `).join("");
  }

  function reset() {
    state.counts = { total: 0, ok: 0, throttled: 0 };
    state.recent = [];
    state.requestNo = 0;
    state.windowRequests = [];
    state.busy = false;
    updateMetrics();
    renderLog();
    setStatus("idle", "—", "Ready for traffic", "Use the buttons on the left to generate API requests.");
  }

  function disableControls(disabled) {
    [el.singleBtn, el.tenBtn, el.burstBtn, el.demoBtn, el.resetBtn].forEach(b => b.disabled = disabled);
  }

  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
  }
})();
