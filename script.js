/* ==========================================================================
   M1 Radio — Website-fable-02
   Рабочий live-плеер на новом публичном API (PLAN/API.md, 2026-07-09):
   GET live.positive-story.co.il/api/public/stations?type=radio — CORS открыт,
   каталог тянется с любого домена. Встроенный снимок (2026-07-09) — только
   резерв на случай, если API недоступно.
   ========================================================================== */

const LIVE_BASE = "https://live.positive-story.co.il/";
const STATIONS_API = LIVE_BASE + "api/public/stations?type=radio";
const POSTS_API = LIVE_BASE + "api/v1/posts";
const MAIN_SLUG = "M1radio"; // главный канал (единственный настоящий LIVE)

/* Служебные каналы админки — на сайте не показываем */
function isService(slug) {
  return slug === "test";
}

/* Нормализация станции из ответа API: поток приходит готовым (stream_url),
   логотип берём, только если он настоящий (не пустой и не dummyimage). */
function normalizeStation(s) {
  return {
    id: s.slug,
    name: (s.name || "").trim(),
    stream: s.stream_url || LIVE_BASE + s.slug + "/shoutcast",
    logo: s.logo_url && !s.logo_url.includes("dummyimage") ? s.logo_url : "",
    def: s.slug === MAIN_SLUG,
  };
}

/* Главный канал — первым в сетке, остальные в порядке позиций из админки */
function mainFirst(list) {
  return [...list].sort((a, b) => (b.def ? 1 : 0) - (a.def ? 1 : 0));
}

function mk(slug, name, def) {
  return { id: slug, name: name, stream: LIVE_BASE + slug + "/shoutcast", logo: "", def: !!def };
}

// снимок API от 2026-07-09 (21 канал; станции mom больше нет)
let STATIONS = [
  mk("M1radio", "רדיו ראשי", true),
  mk("nazeret", "מורל האימהות והמשפחה"),
  mk("tveria", "מורל בעלי החיים"),
  mk("holon", "מ- השכונות"),
  mk("hedera", "מ- TV מחלקת ילדים"),
  mk("eilat", "מ-המשפט"),
  mk("rishon_lechion", "מ. הוותיקים"),
  mk("ber_sheva", "מ- ז. בדרכים"),
  mk("ashdod", "מ. הספורט"),
  mk("jerusalem", "ירושלים"),
  mk("kiryat_bialik", "M1 רוסית"),
  mk("kiryat_ata", "מורל -ART"),
  mk("haifa", "חיפה"),
  mk("acre", "עכו"),
  mk("kiryat_shmuel", "קריית שמואל"),
  mk("nesher", "נשר"),
  mk("nahariya", "נהריה"),
  mk("tal_aviv", "תל אביב"),
  mk("out", "אולפן חיצוני"),
  mk("kiryat_haim", "קריית חיים"),
  mk("kiryat_mochkin", "ילדים חדשות טובות"),
];

/* ---------- рендер сетки станций ---------- */

const grid = document.getElementById("stationGrid");

// 12 фото-заглушек станций, циклически по индексу (пока в API нет настоящих логотипов)
const STATION_PHOTOS = [
  "station-01-radio-team.jpg",
  "station-02-woman-broadcasting.jpg",
  "station-03-woman-speaking-radio.jpg",
  "station-04-radio-notebook.jpg",
  "station-05-radio-equipment-host.jpg",
  "station-06-women-broadcasting.jpg",
  "station-07-mother-daughter-music.jpg",
  "station-08-girl-headphones.jpg",
  "station-09-senior-listening.jpg",
  "station-10-man-headphones.jpg",
  "station-11-couple-music.jpg",
  "station-12-mother-children-tech.jpg",
];
const PHOTOS_BASE = "assets/placeholders/stations/";

function stationImg(s, i) {
  return s.logo || PHOTOS_BASE + STATION_PHOTOS[i % STATION_PHOTOS.length];
}

function renderStations() {
  grid.innerHTML = "";
  ["stationsCount", "stationsCount2"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = STATIONS.length;
  });
  STATIONS.forEach((s, i) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "station";
    card.dataset.id = s.id;
    card.setAttribute("aria-label", "נגן את " + s.name);
    card.innerHTML =
      '<span class="av">' +
        '<img src="' + stationImg(s, i) + '" alt="" loading="lazy">' +
        '<span class="eq"><span></span><span></span><span></span><span></span></span>' +
      "</span>" +
      '<span class="nm">' + s.name + "</span>" +
      '<span class="st">▶ לחצו לנגינה</span>';
    card.addEventListener("click", () => playStation(s.id));
    grid.appendChild(card);
  });
}

renderStations();

// свёртка сетки: две строки ↔ все станции
const stationsToggle = document.getElementById("stationsToggle");
stationsToggle.addEventListener("click", () => {
  const collapsed = grid.classList.toggle("collapsed");
  stationsToggle.innerHTML = collapsed
    ? 'לכל התחנות (<span id="stationsCount2">' + STATIONS.length + "</span>) ▾"
    : "פחות תחנות ▴";
  if (!collapsed) return;
  document.getElementById("stations").scrollIntoView({ behavior: "smooth", block: "start" });
});

// живой каталог из API (CORS открыт — работает с любого домена)
fetch(STATIONS_API)
  .then((r) => (r.ok ? r.json() : Promise.reject()))
  .then((data) => {
    if (!Array.isArray(data) || !data.length) return;
    const list = data.filter((s) => !isService(s.slug)).map(normalizeStation);
    if (!list.length) return;
    STATIONS = mainFirst(list);
    renderStations();
    syncActiveCard();
  })
  .catch(() => {});

/* ---------- плеер ---------- */

const audio = new Audio();
audio.preload = "none";

const dock = document.getElementById("dock");
const dockPlay = document.getElementById("dockPlay");
const dockName = document.getElementById("dockName");
const dockStatus = document.getElementById("dockStatus");
const dockEq = document.getElementById("dockEq");
const dockVol = document.getElementById("dockVol");

let current = null; // id играющей станции

function findStation(id) {
  return STATIONS.find((s) => s.id === id) || STATIONS[0];
}

function setStatus(text, live) {
  dockStatus.innerHTML = (live ? '<i class="pulse"></i>' : "") + text;
}

// «שידור חי / LIVE» — только אצל הערוץ הראשי; остальные — просто «מתנגן»
function isMain(id) {
  return id === defaultStation().id;
}

function syncActiveCard() {
  document.querySelectorAll(".station").forEach((el) => {
    const active = current && el.dataset.id === current && !audio.paused;
    el.classList.toggle("is-live", active);
    const st = el.querySelector(".st");
    if (st) st.textContent = active ? (isMain(el.dataset.id) ? "● LIVE" : "● מתנגן עכשיו") : "▶ לחצו לנגינה";
  });
  document.querySelectorAll(".hostcard").forEach((el) => {
    el.classList.toggle("is-live", !!current && el.dataset.station === current && !audio.paused);
  });
}

function openDock() {
  dock.hidden = false;
  document.body.classList.add("dock-open");
}

function playStation(id) {
  const s = findStation(id);
  // повторный клик по играющей станции — пауза
  if (current === s.id && !audio.paused) {
    audio.pause();
    return;
  }
  current = s.id;
  dockName.textContent = s.name;
  openDock();
  setStatus("מתחבר…", false);
  audio.src = s.stream;
  audio.volume = parseFloat(dockVol.value);
  audio.play().catch(() => setStatus("התחנה לא זמינה כרגע", false));
  syncActiveCard();
}

audio.addEventListener("playing", () => {
  setStatus(current && isMain(current) ? "LIVE" : "מתנגן עכשיו", true);
  dockPlay.textContent = "❚❚";
  dockEq.classList.remove("paused");
  syncActiveCard();
});
audio.addEventListener("pause", () => {
  setStatus("מושהה", false);
  dockPlay.textContent = "▶";
  dockEq.classList.add("paused");
  syncActiveCard();
});
audio.addEventListener("waiting", () => setStatus("מתחבר…", false));
audio.addEventListener("error", () => {
  if (current) setStatus("התחנה לא זמינה כרגע", false);
  dockPlay.textContent = "▶";
  dockEq.classList.add("paused");
  syncActiveCard();
});

dockPlay.addEventListener("click", () => {
  if (!current) return playStation(defaultStation().id);
  if (audio.paused) {
    setStatus("מתחבר…", false);
    audio.play().catch(() => setStatus("התחנה לא זמינה כרגע", false));
  } else {
    audio.pause();
  }
});

dockVol.addEventListener("input", () => (audio.volume = parseFloat(dockVol.value)));

document.getElementById("dockClose").addEventListener("click", () => {
  audio.pause();
  audio.removeAttribute("src");
  current = null;
  dock.hidden = true;
  document.body.classList.remove("dock-open");
  syncActiveCard();
});

function defaultStation() {
  return STATIONS.find((s) => s.def) || STATIONS[0];
}

// кнопка LIVE в шапке — играет главный канал в доке; кнопки hero — ссылки
// на stations.html#play=M1radio (театр-плеер с автозапуском главного канала)
document.getElementById("headerPlay").addEventListener("click", () => playStation(defaultStation().id));

// кнопки «слушать» в карточках каналов
document.querySelectorAll("[data-play]").forEach((btn) => {
  btn.addEventListener("click", () => playStation(btn.dataset.play));
});

/* ---------- блог-тизер на главной: последние 4 поста из API ----------
   GET /api/v1/posts?limit=4 (см. PLAN/API.md). Пока постов в админке нет —
   остаётся статичный пример с бейджем «בקרוב · תוכן לדוגמה». */

const BLOG_FALLBACK_IMG = "assets/placeholders/stations/station-01-radio-team.jpg";

function postImg(p) {
  return p.imageUrl || BLOG_FALLBACK_IMG;
}

fetch(POSTS_API + "?limit=4")
  .then((r) => (r.ok ? r.json() : Promise.reject()))
  .then((posts) => {
    if (!Array.isArray(posts) || !posts.length) return;
    const blogSec = document.getElementById("blog");
    if (!blogSec) return;
    const badge = blogSec.querySelector(".soon-badge");
    if (badge) badge.hidden = true;

    const lead = posts[0];
    const magazine = blogSec.querySelector(".magazine");
    magazine.innerHTML =
      '<article class="mag-lead">' +
        '<div class="mimg"><img src="' + postImg(lead) + '" alt="" loading="lazy"></div>' +
        '<div class="mbody">' +
          '<span class="mtag">' + (lead.category || "") + "</span>" +
          "<h3>" + lead.title + "</h3>" +
          "<p>" + (lead.excerpt || "") + "</p>" +
        "</div>" +
      "</article>" +
      '<div class="mag-list">' +
        posts.slice(1).map((p) =>
          '<article class="mag-item">' +
            '<div class="mimg"><img src="' + postImg(p) + '" alt="" loading="lazy"></div>' +
            '<div class="mi-body">' +
              '<span class="mtag">' + (p.category || "") + "</span>" +
              "<h3>" + p.title + "</h3>" +
            "</div>" +
          "</article>"
        ).join("") +
      "</div>";
  })
  .catch(() => {});

/* ---------- мобильное меню ---------- */

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

/* ---------- формы: success-state на клиенте ---------- */

["adsForm"].forEach((id) => {
  const form = document.getElementById(id);
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    form.querySelectorAll("input, textarea, button").forEach((el) => (el.disabled = true));
    form.querySelector(".form-success").hidden = false;
  });
});

/* ---------- текущий год в футере ---------- */

document.getElementById("year").textContent = new Date().getFullYear();
