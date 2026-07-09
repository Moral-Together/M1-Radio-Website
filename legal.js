/* ==========================================================================
   M1 Radio — служебные страницы (מדיניות פרטיות, הצהרת נגישות)
   ========================================================================== */

const MAIN_STREAM = "https://live.positive-story.co.il/M1radio/shoutcast";

const audio = new Audio();
audio.preload = "none";

const dock = document.getElementById("dock");
const dockPlay = document.getElementById("dockPlay");
const dockStatus = document.getElementById("dockStatus");
const dockEq = document.getElementById("dockEq");
const dockVol = document.getElementById("dockVol");
const headerPlay = document.getElementById("headerPlay");

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

if (headerPlay) headerPlay.addEventListener("click", playMain);
dockPlay.addEventListener("click", playMain);
dockVol.addEventListener("input", () => (audio.volume = parseFloat(dockVol.value)));
document.getElementById("dockClose").addEventListener("click", () => {
  audio.pause();
  audio.removeAttribute("src");
  dock.hidden = true;
  document.body.classList.remove("dock-open");
});

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
