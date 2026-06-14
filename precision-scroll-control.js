"use strict";

(function () {
  const STYLE_ID = "precisionScrollControlStyles";
  const CONTROL_ID = "precisionScrollControl";

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #floatingScrollButton{display:none !important}
      .precision-scroll-control{
        position:fixed;
        right:14px;
        bottom:calc(18px + env(safe-area-inset-bottom));
        z-index:140;
        display:flex;
        flex-direction:column;
        gap:8px;
        align-items:center;
        pointer-events:auto;
      }
      .precision-scroll-btn{
        width:48px;
        height:48px;
        min-height:48px;
        padding:0;
        border-radius:999px;
        border:1px solid rgba(0,196,106,.78);
        background:linear-gradient(135deg, rgba(0,196,106,.95), rgba(0,169,91,.84));
        color:#fff;
        box-shadow:0 12px 30px rgba(0,0,0,.34);
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:1.22rem;
        font-weight:950;
        line-height:1;
        cursor:pointer;
        user-select:none;
        -webkit-user-select:none;
        touch-action:none;
        backdrop-filter:blur(14px);
        -webkit-backdrop-filter:blur(14px);
      }
      .precision-scroll-btn:active{
        transform:scale(.94);
        background:linear-gradient(135deg, rgba(0,196,106,1), rgba(0,135,73,.94));
      }
      .precision-scroll-hint{
        width:38px;
        min-height:24px;
        border-radius:999px;
        border:1px solid rgba(255,255,255,.16);
        background:rgba(15,17,21,.78);
        color:rgba(255,255,255,.78);
        font-size:.72rem;
        font-weight:900;
        display:flex;
        align-items:center;
        justify-content:center;
        box-shadow:0 8px 18px rgba(0,0,0,.22);
      }
      @media (max-width:420px){
        .precision-scroll-control{right:10px;bottom:calc(14px + env(safe-area-inset-bottom))}
        .precision-scroll-btn{width:46px;height:46px;min-height:46px}
      }
    `;
    document.head.appendChild(style);
  }

  function removeOldButton() {
    document.getElementById("floatingScrollButton")?.remove();
  }

  function scrollByAmount(direction, amount, smooth) {
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const next = Math.max(0, Math.min(maxScroll, window.scrollY + direction * amount));
    window.scrollTo({ top: next, behavior: smooth ? "smooth" : "auto" });
  }

  function createHoldScroll(button, direction) {
    let holdTimer = null;
    let scrollTimer = null;
    let pressed = false;

    function stop() {
      pressed = false;
      if (holdTimer) clearTimeout(holdTimer);
      if (scrollTimer) clearInterval(scrollTimer);
      holdTimer = null;
      scrollTimer = null;
    }

    function start(event) {
      event.preventDefault();
      pressed = true;

      holdTimer = setTimeout(() => {
        if (!pressed) return;
        scrollTimer = setInterval(() => scrollByAmount(direction, 28, false), 28);
      }, 230);
    }

    function end(event) {
      if (event) event.preventDefault();
      const wasHolding = Boolean(scrollTimer);
      stop();
      if (!wasHolding) scrollByAmount(direction, 150, true);
    }

    button.addEventListener("pointerdown", start);
    button.addEventListener("pointerup", end);
    button.addEventListener("pointercancel", stop);
    button.addEventListener("pointerleave", stop);
    button.addEventListener("touchend", event => event.preventDefault(), { passive: false });
  }

  function ensureControl() {
    injectStyles();
    removeOldButton();

    if (document.getElementById(CONTROL_ID)) return;

    const control = document.createElement("div");
    control.id = CONTROL_ID;
    control.className = "precision-scroll-control";
    control.innerHTML = `
      <button type="button" class="precision-scroll-btn" data-scroll-dir="-1" aria-label="Subir um pouco">↑</button>
      <div class="precision-scroll-hint" aria-hidden="true">scroll</div>
      <button type="button" class="precision-scroll-btn" data-scroll-dir="1" aria-label="Descer um pouco">↓</button>
    `;

    document.body.appendChild(control);

    control.querySelectorAll(".precision-scroll-btn").forEach(button => {
      createHoldScroll(button, Number(button.dataset.scrollDir || 1));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureControl);
  } else {
    ensureControl();
  }
}());
