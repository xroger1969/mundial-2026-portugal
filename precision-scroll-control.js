"use strict";

(function () {
  const STYLE_ID = "precisionScrollControlStyles";
  const CONTROL_ID = "precisionScrollControl";
  let scrollTimer = null;
  let activeDirection = 0;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #floatingScrollButton{display:none !important}
      .precision-scroll-control{
        position:fixed;
        right:12px;
        bottom:calc(16px + env(safe-area-inset-bottom));
        z-index:160;
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
        border:1px solid rgba(0,196,106,.82);
        background:linear-gradient(135deg, rgba(0,196,106,.95), rgba(0,169,91,.84));
        color:#fff;
        box-shadow:0 12px 30px rgba(0,0,0,.34);
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:1.18rem;
        font-weight:950;
        line-height:1;
        cursor:pointer;
        user-select:none;
        -webkit-user-select:none;
        -webkit-touch-callout:none;
        touch-action:manipulation;
        backdrop-filter:blur(14px);
        -webkit-backdrop-filter:blur(14px);
      }
      .precision-scroll-btn.active{
        transform:scale(.94);
        background:linear-gradient(135deg, rgba(0,196,106,1), rgba(0,125,68,.96));
        box-shadow:0 0 0 4px rgba(0,196,106,.18), 0 12px 30px rgba(0,0,0,.36);
      }
      .precision-scroll-stop{
        width:42px;
        height:42px;
        min-height:42px;
        border-color:rgba(255,255,255,.24);
        background:rgba(15,17,21,.88);
        font-size:.95rem;
      }
      .precision-scroll-stop.active{
        background:rgba(226,76,76,.9);
        border-color:rgba(226,76,76,.9);
      }
      @media (max-width:420px){
        .precision-scroll-control{right:9px;bottom:calc(12px + env(safe-area-inset-bottom))}
        .precision-scroll-btn{width:46px;height:46px;min-height:46px}
        .precision-scroll-stop{width:40px;height:40px;min-height:40px}
      }
    `;
    document.head.appendChild(style);
  }

  function removeOldButton() {
    document.getElementById("floatingScrollButton")?.remove();
  }

  function maxScrollTop() {
    return Math.max(
      0,
      Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight
    );
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function updateActiveButtons() {
    document.querySelectorAll(".precision-scroll-btn").forEach(button => {
      const direction = Number(button.dataset.scrollDir || 0);
      button.classList.toggle("active", direction !== 0 && direction === activeDirection);
    });
    document.querySelector(".precision-scroll-stop")?.classList.toggle("active", activeDirection !== 0);
  }

  function stopAutoScroll() {
    if (scrollTimer) clearInterval(scrollTimer);
    scrollTimer = null;
    activeDirection = 0;
    updateActiveButtons();
  }

  function scrollStep(direction, amount) {
    const next = clamp(window.scrollY + direction * amount, 0, maxScrollTop());
    window.scrollTo(0, next);

    const atTop = next <= 0;
    const atBottom = next >= maxScrollTop() - 2;
    if ((direction < 0 && atTop) || (direction > 0 && atBottom)) {
      stopAutoScroll();
    }
  }

  function startAutoScroll(direction) {
    if (activeDirection === direction) {
      // Segundo toque no mesmo botão aumenta um pouco o avanço e dá sensação de controlo.
      scrollStep(direction, 260);
      return;
    }

    stopAutoScroll();
    activeDirection = direction;
    updateActiveButtons();

    scrollStep(direction, 90);
    scrollTimer = setInterval(() => scrollStep(direction, 38), 28);
  }

  function shortStep(direction) {
    stopAutoScroll();
    window.scrollBy({ top: direction * 190, behavior: "smooth" });
  }

  function bindButton(button) {
    const direction = Number(button.dataset.scrollDir || 0);
    let touchStarted = false;

    button.addEventListener("click", event => {
      event.preventDefault();
      if (direction === 0) {
        stopAutoScroll();
        return;
      }
      startAutoScroll(direction);
    });

    button.addEventListener("dblclick", event => {
      event.preventDefault();
      if (direction !== 0) shortStep(direction);
    });

    button.addEventListener("touchstart", () => {
      touchStarted = true;
      setTimeout(() => { touchStarted = false; }, 350);
    }, { passive: true });
  }

  function ensureControl() {
    injectStyles();
    removeOldButton();

    if (document.getElementById(CONTROL_ID)) return;

    const control = document.createElement("div");
    control.id = CONTROL_ID;
    control.className = "precision-scroll-control";
    control.innerHTML = `
      <button type="button" class="precision-scroll-btn" data-scroll-dir="-1" aria-label="Subir automaticamente">↑</button>
      <button type="button" class="precision-scroll-btn precision-scroll-stop" data-scroll-dir="0" aria-label="Parar scroll">■</button>
      <button type="button" class="precision-scroll-btn" data-scroll-dir="1" aria-label="Descer automaticamente">↓</button>
    `;

    document.body.appendChild(control);

    control.querySelectorAll(".precision-scroll-btn").forEach(bindButton);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopAutoScroll();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureControl);
  } else {
    ensureControl();
  }
}());
