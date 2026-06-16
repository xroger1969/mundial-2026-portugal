"use strict";

(function () {
  if (window.__WC_FETCH_TIMEOUT_GUARD__) return;
  window.__WC_FETCH_TIMEOUT_GUARD__ = true;

  const originalFetch = window.fetch ? window.fetch.bind(window) : null;
  if (!originalFetch) return;

  const guardedFiles = /(?:results|weather|news)\.json/i;
  const TIMEOUT_MS = 2500;

  window.fetch = function guardedFetch(input, init) {
    const url = typeof input === "string" ? input : (input && input.url) || "";

    if (!guardedFiles.test(url)) {
      return originalFetch(input, init);
    }

    const controller = new AbortController();
    const currentInit = Object.assign({}, init || {});

    if (!currentInit.signal) {
      currentInit.signal = controller.signal;
    }

    const timer = setTimeout(() => {
      try { controller.abort(); } catch (error) { /* noop */ }
    }, TIMEOUT_MS);

    return originalFetch(input, currentInit).finally(() => clearTimeout(timer));
  };
}());
