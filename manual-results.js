"use strict";

(function () {
  const manualResults = {
    "2": {
      apiId: 537328,
      status: "FINISHED",
      homeTeam: "South Korea",
      awayTeam: "Czechia",
      homeScore: 2,
      awayScore: 1,
      winner: "HOME_TEAM",
      utcDate: "2026-06-12T02:00:00Z",
      lastUpdated: "2026-06-12T06:45:00Z",
      provider: "manual-confirmed"
    }
  };

  function hasScore(match) {
    return match
      && match.homeScore !== null
      && match.homeScore !== undefined
      && match.awayScore !== null
      && match.awayScore !== undefined;
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = async function patchedFetch(input, init) {
    const url = typeof input === "string" ? input : input?.url || "";
    const response = await originalFetch(input, init);

    if (!/results\.json(\?|$)/.test(url)) {
      return response;
    }

    try {
      const data = await response.clone().json();
      data.matches = data.matches || {};

      Object.entries(manualResults).forEach(([id, manual]) => {
        const existing = data.matches[id] || {};
        if (!hasScore(existing)) {
          data.matches[id] = { ...existing, ...manual };
        }
      });

      const headers = new Headers(response.headers);
      headers.set("Content-Type", "application/json; charset=utf-8");

      return new Response(JSON.stringify(data), {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch (error) {
      return response;
    }
  };
}());
