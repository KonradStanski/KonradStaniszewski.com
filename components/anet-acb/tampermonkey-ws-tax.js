// ==UserScript==
// @name         Wealthsimple Tax - Capital Gains Bulk Entry
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Bulk-enter capital gains/losses transactions into Wealthsimple Tax
// @match        https://my.wealthsimple.com/*
// @match        https://app.wealthsimple.com/*
// @grant        unsafeWindow
// @run-at       document-end
// @sandbox      JavaScript
// ==/UserScript==

(function () {
  "use strict";

  // ============================================================
  // CONFIGURATION
  // ============================================================
  // Paste your transactions here. Each entry needs:
  //   type        - disposition type number (see below)
  //   description - up to 30 chars, e.g. "100 AAPL"
  //   proceeds    - proceeds of disposition (number)
  //   acb         - adjusted cost base (number)
  //   outlays     - expenses/commissions (number), default 0
  //   period      - 1 or 2 (default 2)
  //                 Period 1: Jan 1 - Jun 24, 2024
  //                 Period 2: Jun 25 - Dec 31, 2024
  //
  // Type values:
  //   1  = Publicly traded shares, mutual funds, other shares
  //   2  = Real estate, depreciable property
  //   3  = Bonds, debentures, promissory notes
  //   12 = Crypto-assets
  //   4  = Mortgage foreclosures
  //   5  = Personal use property
  //   6  = Listed personal property
  //   7  = Qualified small business corporation shares
  //   8  = Qualified farm & fishing property (most)
  //   9  = Qualified farm & fishing property (foreclosures)
  //   10 = Partnership interest sale (100% taxable)
  //   11 = Return of capital
  //   13 = Resource property
  //
  // Example:
  const TRANSACTIONS = [
    // { type: 1, description: "100 AAPL", proceeds: 15000.00, acb: 12000.00, outlays: 9.99, period: 2 },
    // { type: 12, description: "0.5 BTC", proceeds: 25000.00, acb: 18000.00, outlays: 0, period: 2 },
  ];

  // ============================================================
  // HELPERS
  // ============================================================

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Trigger jQuery + native events so SimpleTax's data-son-field framework picks up changes
  function triggerChange(el) {
    // Native events
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));

    // jQuery events (SimpleTax uses jQuery)
    if (typeof jQuery !== "undefined") {
      jQuery(el).trigger("input");
      jQuery(el).trigger("change");
      jQuery(el).trigger("blur");
    } else if (typeof $ !== "undefined") {
      $(el).trigger("input");
      $(el).trigger("change");
      $(el).trigger("blur");
    }
  }

  // Find an input by its data-son-field id
  function findFieldById(fieldId, container) {
    container = container || document;
    // data-son-field is a JSON string containing "id": "fieldId"
    const allFields = container.querySelectorAll("[data-son-field]");
    for (const el of allFields) {
      try {
        const config = JSON.parse(el.getAttribute("data-son-field"));
        if (config.id === fieldId) return el;
      } catch (e) {
        // Some fields may have malformed JSON, skip
      }
    }
    return null;
  }

  // Find all rows in a table (each <tr> with data-son-form is a disposition row)
  function getDispositionRows(period) {
    const subInputTarget = period === 1 ? "s3_t_temp" : "s3_t";
    const table = document.querySelector(`table[data-son-sub-input="${subInputTarget}"]`);
    if (!table) return [];
    // Each disposition row is a <tr> with data-son-form
    return Array.from(table.querySelectorAll("tbody > tr[data-son-form]"));
  }

  // Click the "Add another disposition" button for the given period
  function clickAddDisposition(period) {
    const target = period === 1 ? "s3_t_temp" : "s3_t";
    const btn = document.querySelector(
      `button.js-add-sub-input[data-son-sub-input-target="${target}"]`
    );
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }

  // Fill a single row with transaction data
  function fillRow(row, tx, period) {
    const suffix = period === 1 ? "_temp" : "";

    // Find fields within this specific row
    const typeSelect = findFieldById(`s3_type${suffix}`, row);
    const descInput = findFieldById(`s3_desc${suffix}`, row);
    const proceedsInput = findFieldById(`s3_pod${suffix}`, row);
    const acbInput = findFieldById(`s3_acb${suffix}`, row);
    const outlaysInput = findFieldById(`s3_outlays${suffix}`, row);

    // Set type (select dropdown)
    if (typeSelect) {
      typeSelect.value = String(tx.type);
      triggerChange(typeSelect);
    }

    // Set description
    if (descInput) {
      descInput.value = tx.description || "";
      triggerChange(descInput);
    }

    // Set proceeds
    if (proceedsInput) {
      proceedsInput.value = tx.proceeds != null ? String(tx.proceeds) : "";
      triggerChange(proceedsInput);
    }

    // Set ACB
    if (acbInput) {
      acbInput.value = tx.acb != null ? String(tx.acb) : "";
      triggerChange(acbInput);
    }

    // Set outlays/expenses
    if (outlaysInput) {
      outlaysInput.value = tx.outlays != null ? String(tx.outlays) : "";
      triggerChange(outlaysInput);
    }

    return { typeSelect, descInput, proceedsInput, acbInput, outlaysInput };
  }

  // ============================================================
  // MAIN FILL LOGIC
  // ============================================================

  async function fillAllTransactions(statusEl) {
    if (TRANSACTIONS.length === 0) {
      statusEl.textContent = "No transactions loaded! Edit TRANSACTIONS in the script.";
      statusEl.style.background = "#dc2626";
      return;
    }

    // Check that the Capital Gains section exists on the page
    const s3Section = document.getElementById("s3");
    if (!s3Section) {
      statusEl.textContent = 'Error: Capital Gains section not found. Make sure you\'ve added "Capital Gains (or Losses)" to your return first.';
      statusEl.style.background = "#dc2626";
      return;
    }

    statusEl.style.background = "#f59e0b";
    let filled = 0;
    let errors = [];

    for (let i = 0; i < TRANSACTIONS.length; i++) {
      const tx = TRANSACTIONS[i];
      const period = tx.period || 2;

      statusEl.textContent = `Filling ${i + 1} / ${TRANSACTIONS.length}: ${tx.description || "unnamed"}`;

      // Get current rows to see if we need to add one
      let rows = getDispositionRows(period);

      // Check if the last row is empty (we can use it)
      let targetRow = null;
      if (rows.length > 0) {
        const lastRow = rows[rows.length - 1];
        const suffix = period === 1 ? "_temp" : "";
        const lastType = findFieldById(`s3_type${suffix}`, lastRow);
        const lastProceeds = findFieldById(`s3_pod${suffix}`, lastRow);
        if (lastType && lastType.value === "None" && (!lastProceeds || !lastProceeds.value)) {
          targetRow = lastRow;
        }
      }

      // If no empty row available, click "Add another disposition"
      if (!targetRow) {
        const added = clickAddDisposition(period);
        if (!added) {
          errors.push(`Row ${i + 1}: Could not find "Add another disposition" button for Period ${period}`);
          continue;
        }
        await sleep(300); // Wait for DOM to update

        // Get the newly added row (should be the last one)
        rows = getDispositionRows(period);
        targetRow = rows[rows.length - 1];
      }

      if (!targetRow) {
        errors.push(`Row ${i + 1}: Could not find target row`);
        continue;
      }

      // Fill the row
      const result = fillRow(targetRow, tx, period);
      if (!result.typeSelect) {
        errors.push(`Row ${i + 1}: Could not find type field`);
      }

      filled++;
      await sleep(150); // Brief pause between rows
    }

    if (errors.length > 0) {
      console.warn("[WS Bulk Entry] Errors:", errors);
      statusEl.textContent = `Done: ${filled}/${TRANSACTIONS.length} filled. ${errors.length} errors (check console).`;
      statusEl.style.background = "#f59e0b";
    } else {
      statusEl.textContent = `Done! ${filled} transactions entered. Please review before submitting.`;
      statusEl.style.background = "#22c55e";
    }
  }

  // ============================================================
  // LOAD FROM JSON (paste or file)
  // ============================================================

  function loadFromJSON(jsonStr, statusEl) {
    try {
      const data = JSON.parse(jsonStr);
      if (!Array.isArray(data)) throw new Error("Expected an array of transactions");

      // Clear and reload
      TRANSACTIONS.length = 0;
      data.forEach((tx) => TRANSACTIONS.push(tx));

      statusEl.textContent = `Loaded ${TRANSACTIONS.length} transactions from JSON.`;
      statusEl.style.background = "#6366f1";

      // Update counter
      const counter = shadowRoot.getElementById("tx-count");
      if (counter) counter.textContent = `${TRANSACTIONS.length} transactions loaded`;
    } catch (e) {
      statusEl.textContent = `JSON parse error: ${e.message}`;
      statusEl.style.background = "#dc2626";
    }
  }

  // ============================================================
  // UI PANEL — Shadow DOM so SimpleTax can't remove it
  // ============================================================

  const PANEL_HOST_ID = "ws-bulk-entry-host";
  let panelHost = null;
  let shadowRoot = null;

  function createPanel() {
    if (document.getElementById(PANEL_HOST_ID)) return;

    panelHost = document.createElement("div");
    panelHost.id = PANEL_HOST_ID;
    panelHost.style.cssText = `
      position: fixed; top: 80px; right: 0; z-index: 2147483647;
      width: 320px; height: auto; max-height: calc(100vh - 100px);
    `;
    document.documentElement.appendChild(panelHost);

    shadowRoot = panelHost.attachShadow({ mode: "open" });

    const panel = document.createElement("div");
    panel.innerHTML = `
      <style>
        :host { all: initial; font-family: system-ui, -apple-system, sans-serif; }
        * { box-sizing: border-box; }
        .panel {
          background: #1a1a2e; color: #eee; padding: 16px;
          border-radius: 12px 0 0 12px;
          font-size: 13px; box-shadow: -4px 4px 24px rgba(0,0,0,0.4);
          border: 1px solid #333; border-right: none;
          max-height: calc(100vh - 100px); overflow-y: auto;
        }
        .title {
          font-weight: bold; margin-bottom: 4px; font-size: 15px;
          display: flex; justify-content: space-between; align-items: center;
        }
        .subtitle { color: #aaa; margin-bottom: 12px; font-size: 11px; }
        .count { margin-bottom: 8px; color: #8b8bff; font-weight: 600; }
        .status {
          margin-bottom: 12px; padding: 8px; border-radius: 6px;
          background: #333; font-size: 12px; min-height: 20px;
          word-break: break-word;
        }
        .section {
          margin-bottom: 12px; padding: 10px; background: #222;
          border-radius: 8px; border: 1px solid #444;
        }
        .section-title { font-weight: 600; margin-bottom: 6px; font-size: 12px; color: #ccc; }
        button {
          padding: 8px 14px; border-radius: 6px; border: none;
          color: white; cursor: pointer; font-size: 12px;
          font-family: inherit; width: 100%; margin-bottom: 6px;
          transition: opacity 0.2s;
        }
        button:hover { opacity: 0.85; }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-fill { background: #22c55e; font-size: 14px; font-weight: 600; padding: 10px; }
        .btn-load { background: #6366f1; }
        .btn-close { background: #666; }
        .btn-small { padding: 6px 10px; font-size: 11px; }
        textarea {
          width: 100%; height: 80px; border-radius: 6px; border: 1px solid #555;
          background: #111; color: #eee; font-family: monospace; font-size: 11px;
          padding: 6px; resize: vertical;
        }
        .hint { font-size: 10px; color: #888; margin-top: 4px; line-height: 1.4; }
        .instructions {
          background: #2a2a3e; padding: 10px; border-radius: 8px;
          margin-bottom: 12px; border: 1px solid #444;
        }
        .instructions p { margin: 0 0 6px 0; font-size: 11px; color: #ccc; line-height: 1.5; }
        .instructions strong { color: #fff; }
        .instructions ol { margin: 4px 0 0 16px; padding: 0; }
        .instructions li { font-size: 11px; color: #ccc; margin-bottom: 4px; line-height: 1.4; }
        .step-num {
          display: inline-block; width: 18px; height: 18px; border-radius: 50%;
          background: #6366f1; color: white; text-align: center; line-height: 18px;
          font-size: 10px; font-weight: bold; margin-right: 4px;
        }
        .collapse-btn {
          background: none; border: none; color: #888; cursor: pointer;
          font-size: 18px; padding: 0; width: auto; margin: 0; line-height: 1;
        }
        .collapse-btn:hover { color: #fff; }
      </style>
      <div class="panel">
        <div class="title">
          <span>Capital Gains Bulk Entry</span>
          <button class="collapse-btn" id="collapse-btn" title="Minimize">−</button>
        </div>
        <div id="panel-body">
          <div class="subtitle">Wealthsimple Tax Schedule 3 Auto-filler</div>

          <div class="instructions">
            <p><strong>Before you start:</strong></p>
            <ol>
              <li>Search <strong>"Capital Gains"</strong> in Wealthsimple Tax and add the section to your return</li>
              <li>Scroll down to the Capital Gains (or Losses) section on this page</li>
              <li>Paste your transaction JSON below or edit the TRANSACTIONS array in the script</li>
              <li>Click <strong>"Fill All Transactions"</strong></li>
            </ol>
          </div>

          <div id="tx-count" class="count">${TRANSACTIONS.length} transactions loaded</div>
          <div class="status" id="status">Ready — waiting for transactions</div>

          <div class="section">
            <div class="section-title">Load Transactions (JSON)</div>
            <textarea id="json-input" placeholder='[
  { "type": 1, "description": "100 AAPL", "proceeds": 15000, "acb": 12000, "outlays": 0, "period": 2 }
]'></textarea>
            <button class="btn-load" id="load-btn">Load JSON</button>
            <div class="hint">
              <strong>type:</strong> 1=stocks, 12=crypto, 2=real estate, 3=bonds<br>
              <strong>period:</strong> 1=Jan-Jun24, 2=Jun25-Dec31
            </div>
          </div>

          <button class="btn-fill" id="fill-btn" disabled>Fill All Transactions</button>

          <button class="btn-close" id="close-btn">Close Panel</button>
        </div>
      </div>
    `;

    shadowRoot.appendChild(panel);

    // Wire up events
    const statusEl = shadowRoot.getElementById("status");
    const fillBtn = shadowRoot.getElementById("fill-btn");
    const loadBtn = shadowRoot.getElementById("load-btn");
    const jsonInput = shadowRoot.getElementById("json-input");
    const collapseBtn = shadowRoot.getElementById("collapse-btn");
    const panelBody = shadowRoot.getElementById("panel-body");

    if (TRANSACTIONS.length > 0) fillBtn.disabled = false;

    loadBtn.addEventListener("click", () => {
      loadFromJSON(jsonInput.value, statusEl);
      fillBtn.disabled = TRANSACTIONS.length === 0;
    });

    fillBtn.addEventListener("click", () => {
      fillBtn.disabled = true;
      fillAllTransactions(statusEl).then(() => {
        fillBtn.disabled = false;
      });
    });

    shadowRoot.getElementById("close-btn").addEventListener("click", () => {
      panelHost.remove();
    });

    let collapsed = false;
    collapseBtn.addEventListener("click", () => {
      collapsed = !collapsed;
      panelBody.style.display = collapsed ? "none" : "block";
      collapseBtn.textContent = collapsed ? "+" : "−";
      panelHost.style.width = collapsed ? "180px" : "320px";
    });

    console.log("[WS Bulk Entry] Panel injected with Shadow DOM");
  }

  // ============================================================
  // PERSISTENCE — re-inject if removed
  // ============================================================

  function ensurePanel() {
    if (!document.getElementById(PANEL_HOST_ID)) {
      createPanel();
    }
  }

  const observer = new MutationObserver(ensurePanel);

  function init() {
    createPanel();
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setInterval(ensurePanel, 2000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
