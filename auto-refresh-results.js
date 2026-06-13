"use strict";

(function () {
  const RESULTS_FILE = "results.json";
  const CHECK_INTERVAL_MS = 60 * 1000;
  let lastSignature = null;

  function buildSignature(data) {
    return JSON.stringify({
      updatedAt: data?.updatedAt || null,
      matches: data?.matches || {}
    });
  }

  async function fetchResultsSignature() {
    const response = await fetch(`${RESULTS_FILE}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return null;
    const data = await response.json();
    return buildSignature(data);
  }

  async function checkForUpdates() {
    try {
      const signature = await fetchResultsSignature();
      if (!signature) return;

      if (lastSignature === null) {
        lastSignature = signature;
        return;
      }

      if (signature !== lastSignature) {
        window.location.reload();
      }
    } catch (error) {
      // Silencioso: o site continua a funcionar mesmo que esta verificação falhe.
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      checkForUpdates();
      setInterval(checkForUpdates, CHECK_INTERVAL_MS);
    });
  } else {
    checkForUpdates();
    setInterval(checkForUpdates, CHECK_INTERVAL_MS);
  }
}());
