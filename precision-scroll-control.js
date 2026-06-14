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
        width:50px;
        height:50px;
        min-height:50px;
        padding:0;
        border-radius:999px;
        border:1px solid rgba(0,196,106,.82);
        background:linear-gradient(135deg, rgba(0,196,106,.95), rgba(0,169,91,.84));
        color:#fff;
        box-shadow:0 12px 30px rgba(0,0,0,.34);
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:1.24rem;
        font-weight:950;
        line-height:1;
        cursor:pointer;
        user-select:none;
        -webkit-user-select:none;
        -webkit-touch-callout:none;
        touch-action:none;
        backdrop-filter:blur(14px);
        -webkit-backdrop-filter:blur(14px);
      }
      .precision-scroll-btn.active{
        transform:scale(.94);
        background:linear-gradient(135deg, rgba(0,196,106,1), rgba(0,125,68,.96));
        box-shadow:0 0 0 4px rgba(0,196,106,.16), 0 12px 30px rgba(0,0,0,.36);
      }
      .precision-scroll-hint{
        width:40px;
        min-height:24px;
        border-radius:999px;
        border:1px solid rgba(255,255,255,.16);
        background:rgba(15,17,21,.78);
        color:rgba(255,255,255,.78);
        font-size:.69rem;
        font-weight:900;
        display:flex;
        align-items:center;
        justify-content:center;
        box-shadow:0 8px 18px rgba(0,0,0,.22);
      }
      @media (max-width:420px){
        .precision-scroll-control{right:10px;bottom:calc(14px + env(safe-area-inset-bottom))}
        .precision-scroll-btn{width:48px;height:48px;min-height:48px}
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

  function scrollStep(direction, amount) {
    const next = clamp(window.scrollY + direction * amount, 0, maxScrollTop());
    window.scrollTo(0, next);
  }

  function createHoldScroll(button, direction) {
    let pressTimer = null;
    let animationFrame = null;
    let isPressed = false;
    let didLongScroll = false;
    let lastFrameTime = 0;

    function cancelTimers() {
      if (pressTimer) clearTimeout(pressTimer);
      if (animationFrame) cancelAnimationFrame(animationFrame);
      pressTimer = null;
      animationFrame = null;
    }

    function stop(event) {
      if (event?.cancelable) event.preventDefault();

      const shouldDoShortStep = isPressed && !didLongScroll;
      isPressed = false;
      button.classList.remove("active");
      cancelTimers();

      if (shouldDoShortStep) {
        window.scrollBy({ top: direction * 180, behavior: "smooth" });
      }
    }

    function continuousScroll(time) {
      if (!isPressed) return;

      if (!lastFrameTime) lastFrameTime = time;
      const delta = Math.min(32, time - lastFrameTime);
      lastFrameTime = time;

      // Velocidade ajustada para iPhone: suficientemente rápida, mas controlável.
      scrollStep(direction, Math.max(5, delta * 1.25));
      didLongScroll = true;

      const atTop = window.scrollY <= 0;
      const atBottom = window.scrollY >= maxScrollTop() - 2;
      if ((direction < 0 && atTop) || (direction > 0 && atBottom)) {
        stop();
        return;
      }

      animationFrame = requestAnimationFrame(continuousScroll);
    }

    function start(event) {
      if (event?.cancelable) event.preventDefault();
      if (isPressed) return;

      isPressed = true;
      didLongScroll = false;
      lastFrameTime = 0;
      button.classList.add("active");

      pressTimer = setTimeout(() => {
        if (!isPressed) return;
        animationFrame = requestAnimationFrame(continuousScroll);
      }, 170);
    }

    button.addEventListener("pointerdown", start);
    button.addEventListener("pointerup", stop);
    button.addEventListener("pointercancel", stop);

    button.addEventListener("touchstart", start, { passive: false });
    button.addEventListener("touchend", stop, { passive: false });
    button.addEventListener("touchcancel", stop, { passive: false });

    button.addEventListener("mousedown", start);
    window.addEventListener("mouseup", stop);
    window.addEventListener("blur", stop);
  }

  function ensureControl() {
    injectStyles();
    removeOldButton();

    if (document.getElementById(CONTROL_ID)) return;

    const control = document.createElement("div");
    control.id = CONTROL_ID;
    control.className = "precision-scroll-control";
    control.innerHTML = `
      <button type="button" class="precision-scroll-btn" data-scroll-dir="-1" aria-label="Manter pressionado para subir">↑</button>
      <div class="precision-scroll-hint" aria-hidden="true">manter</div>
      <button type="button" class="precision-scroll-btn" data-scroll-dir="1" aria-label="Manter pressionado para descer">↓</button>
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
