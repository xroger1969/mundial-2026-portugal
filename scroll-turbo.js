"use strict";

(function () {
  const CONTROL_ID = "scrollTurboControl";
  const STYLE_ID = "scrollTurboStyle";
  let timer = null;
  let direction = 0;

  function maxY() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    direction = 0;
    updateButtons();
  }

  function step(dir, amount) {
    const next = Math.max(0, Math.min(maxY(), window.scrollY + dir * amount));
    window.scrollTo(0, next);
    if (next <= 0 || next >= maxY() - 2) stop();
  }

  function start(dir) {
    if (direction === dir) {
      step(dir, Math.round(window.innerHeight * 0.9));
      return;
    }

    stop();
    direction = dir;
    updateButtons();
    step(dir, Math.round(window.innerHeight * 0.55));
    timer = setInterval(() => step(dir, Math.round(window.innerHeight * 0.28)), 14);
  }

  function updateButtons() {
    document.querySelectorAll("#" + CONTROL_ID + " button[data-dir]").forEach(button => {
      button.classList.toggle("active", Number(button.dataset.dir) === direction && direction !== 0);
    });
    document.querySelector("#" + CONTROL_ID + " .turbo-stop")?.classList.toggle("active", direction !== 0);
  }

  function styles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #floatingScrollButton,
      #precisionScrollControl{display:none !important}
      #scrollTurboControl{
        position:fixed;
        right:10px;
        bottom:calc(12px + env(safe-area-inset-bottom));
        z-index:999;
        display:flex;
        flex-direction:column;
        gap:8px;
        align-items:center;
      }
      #scrollTurboControl button{
        width:48px;
        height:48px;
        min-height:48px;
        padding:0;
        border-radius:999px;
        border:1px solid rgba(0,196,106,.85);
        background:#00c46a;
        color:#fff;
        font-weight:950;
        font-size:1.2rem;
        line-height:1;
        display:flex;
        align-items:center;
        justify-content:center;
        box-shadow:0 12px 28px rgba(0,0,0,.34);
        touch-action:manipulation;
        -webkit-user-select:none;
        user-select:none;
      }
      #scrollTurboControl button.active{
        background:#008a4f;
        transform:scale(.94);
      }
      #scrollTurboControl .turbo-stop{
        width:52px;
        height:38px;
        min-height:38px;
        font-size:.72rem;
        background:#171a21;
        border-color:rgba(255,255,255,.25);
        letter-spacing:.04em;
      }
      #scrollTurboControl .turbo-stop.active{
        background:#e24c4c;
        border-color:#e24c4c;
      }
    `;
    document.head.appendChild(style);
  }

  function mount() {
    styles();
    document.getElementById("floatingScrollButton")?.remove();
    document.getElementById("precisionScrollControl")?.remove();

    if (document.getElementById(CONTROL_ID)) return;

    const control = document.createElement("div");
    control.id = CONTROL_ID;
    control.innerHTML = `
      <button type="button" data-dir="-1" aria-label="Subir rápido">↑</button>
      <button type="button" class="turbo-stop" aria-label="Parar scroll">STOP</button>
      <button type="button" data-dir="1" aria-label="Descer rápido">↓</button>
    `;
    document.body.appendChild(control);

    control.querySelector('[data-dir="-1"]').addEventListener("click", event => {
      event.preventDefault();
      start(-1);
    });

    control.querySelector('[data-dir="1"]').addEventListener("click", event => {
      event.preventDefault();
      start(1);
    });

    control.querySelector(".turbo-stop").addEventListener("click", event => {
      event.preventDefault();
      stop();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
}());
