"use strict";

window.WC2026_RESULT_OVERRIDES = {
  "1": {
    apiId: 537327,
    status: "FINISHED",
    homeTeam: "Mexico",
    awayTeam: "South Africa",
    homeScore: 2,
    awayScore: 0,
    winner: "HOME_TEAM",
    utcDate: "2026-06-11T19:00:00Z",
    lastUpdated: "2026-06-11T23:10:00Z",
    provider: "Resultado confirmado"
  }
};

(function () {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async function patchedFetch(input, init) {
    const response = await originalFetch(input, init);
    const url = typeof input === "string" ? input : input?.url || "";

    if (!String(url).includes("results.json")) {
      return response;
    }

    try {
      const data = await response.clone().json();
      const headers = new Headers(response.headers);
      headers.set("content-type", "application/json; charset=utf-8");

      data.matches = {
        ...(data.matches || {}),
        ...(window.WC2026_RESULT_OVERRIDES || {})
      };

      return new Response(JSON.stringify(data), {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch {
      return response;
    }
  };
}());
