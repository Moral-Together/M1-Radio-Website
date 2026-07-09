/* ==========================================================================
   M1 Radio — страница פרסום (реклама)
   Питч + форматы + форма заявки (без прайса). Отправки на сервер пока нет —
   success-state на клиенте, как на главной.
   ========================================================================== */

const STATIONS_API = "https://live.positive-story.co.il/api/public/stations?type=radio";
const FALLBACK_COUNT = 21; // снимок 2026-07-09, служебная test не в счёт

function setCount(n) {
  ["bandCount", "pitchCount", "statCount"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = n;
  });
}

setCount(FALLBACK_COUNT);

fetch(STATIONS_API)
  .then((r) => (r.ok ? r.json() : Promise.reject()))
  .then((data) => {
    if (!Array.isArray(data)) return;
    const n = data.filter((s) => s.slug !== "test").length;
    if (n) setCount(n);
  })
  .catch(() => {});

/* ---------- форма заявки: success-state на клиенте ---------- */

const form = document.getElementById("adsForm");
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  form.querySelectorAll("input, textarea, button").forEach((el) => (el.disabled = true));
  form.querySelector(".form-success").hidden = false;
});

/* ---------- плеер: LIVE в шапке (главный канал) ---------- */

const MAIN_STREAM = "https://live.positive-story.co.il/M1radio/shoutcast";

const audio = new Audio();
audio.preload = "none";

const dock = document.getElementById("dock");
const dockPlay = document.getElementById("dockPlay");
const dockStatus = document.getElementById("dockStatus");
const dockEq = document.getElementById("dockEq");
const dockVol = document.getElementById("dockVol");

function setStatus(text, live) {
  dockStatus.innerHTML = (live ? '<i class="pulse"></i>' : "") + text;
}

function playMain() {
  if (!audio.paused) {
    audio.pause();
    return;
  }
  dock.hidden = false;
  document.body.classList.add("dock-open");
  setStatus("מתחבר…", false);
  if (!audio.src) audio.src = MAIN_STREAM;
  audio.volume = parseFloat(dockVol.value);
  audio.play().catch(() => setStatus("התחנה לא זמינה כרגע", false));
}

audio.addEventListener("playing", () => {
  setStatus("LIVE", true);
  dockPlay.textContent = "❚❚";
  dockEq.classList.remove("paused");
});
audio.addEventListener("pause", () => {
  setStatus("מושהה", false);
  dockPlay.textContent = "▶";
  dockEq.classList.add("paused");
});
audio.addEventListener("waiting", () => setStatus("מתחבר…", false));
audio.addEventListener("error", () => {
  if (audio.src) setStatus("התחנה לא זמינה כרגע", false);
  dockPlay.textContent = "▶";
  dockEq.classList.add("paused");
});

document.getElementById("headerPlay").addEventListener("click", playMain);
dockPlay.addEventListener("click", playMain);
dockVol.addEventListener("input", () => (audio.volume = parseFloat(dockVol.value)));
document.getElementById("dockClose").addEventListener("click", () => {
  audio.pause();
  audio.removeAttribute("src");
  dock.hidden = true;
  document.body.classList.remove("dock-open");
});

/* ---------- мобильное меню, год ---------- */

const header = document.getElementById("siteHeader");
const burger = document.getElementById("burgerBtn");
burger.addEventListener("click", () => {
  const open = header.classList.toggle("nav-open");
  burger.setAttribute("aria-expanded", open);
});
document.querySelectorAll(".mobile-nav a").forEach((a) =>
  a.addEventListener("click", () => {
    header.classList.remove("nav-open");
    burger.setAttribute("aria-expanded", "false");
  })
);

document.getElementById("year").textContent = new Date().getFullYear();
