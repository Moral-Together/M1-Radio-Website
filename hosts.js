/* ==========================================================================
   M1 Radio — страница שדרנים (ведущие)
   Канал = ведущий: карточка на каждый канал, кнопка играет живой поток.
   Каталог — из нового публичного API (PLAN/API.md), CORS открыт.
   Имена/фото ведущих — заглушки «נכריז בקרוב», пока заказчик не дал данные.
   ========================================================================== */

const LIVE_BASE = "https://live.positive-story.co.il/";
const STATIONS_API = LIVE_BASE + "api/public/stations?type=radio";
const MAIN_SLUG = "M1radio";

function isService(slug) {
  return slug === "test";
}

function normalizeStation(s) {
  return {
    id: s.slug,
    name: (s.name || "").trim(),
    stream: s.stream_url || LIVE_BASE + s.slug + "/shoutcast",
    logo: s.logo_url && !s.logo_url.includes("dummyimage") ? s.logo_url : "",
    def: s.slug === MAIN_SLUG,
  };
}

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

/* ---------- фото-заглушки ---------- */

// каналам, у которых на главной уже закреплены «ведущие», оставляем те же лица
// (mom из каталога исчезла — её лицо перешло к nazeret, «מורל האימהות והמשפחה»)
const PEOPLE = {
  M1radio:        "person-05-smiley-man-podcast.jpg",
  nazeret:        "person-03-woman-host-headset.jpg",
  kiryat_mochkin: "person-01-smiling-presenter.jpg",
  kiryat_ata:     "person-04-man-podcast-studio.jpg",
  tveria:         "person-02-smiling-influencer.jpg",
};
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

function photoFor(s, i) {
  if (PEOPLE[s.id]) return "assets/placeholders/people/" + PEOPLE[s.id];
  return "assets/placeholders/stations/" + STATION_PHOTOS[i % STATION_PHOTOS.length];
}

function defaultStation() {
  return STATIONS.find((s) => s.def) || STATIONS[0];
}
function findStation(id) {
  return STATIONS.find((s) => s.id === id) || STATIONS[0];
}
function isMain(id) {
  return id === defaultStation().id;
}

/* ---------- сетка ведущих ---------- */

const grid = document.getElementById("hostGrid");

function renderHosts() {
  grid.innerHTML = "";
  const count = document.getElementById("hostsCount");
  if (count) count.textContent = STATIONS.length;
  STATIONS.forEach((s, i) => {
    const card = document.createElement("article");
    card.className = "hostcard";
    card.dataset.station = s.id;
    card.innerHTML =
      '<img src="' + photoFor(s, i) + '" alt="שדרן הערוץ ' + s.name + '" loading="lazy">' +
      '<span class="hc-badge"><i class="pulse light"></i> ' + (isMain(s.id) ? "LIVE" : "מתנגן עכשיו") + "</span>" +
      '<div class="hc-body">' +
        "<h3>" + s.name + "</h3>" +
        '<p class="hc-host">בהנחיית · נכריז בקרוב</p>' +
        '<button class="hc-play" type="button">▶ האזינו לערוץ</button>' +
      "</div>";
    card.querySelector(".hc-play").addEventListener("click", () => playStation(s.id));
    grid.appendChild(card);
  });
}

renderHosts();

// живой каталог из API (CORS открыт — работает с любого домена)
fetch(STATIONS_API)
  .then((r) => (r.ok ? r.json() : Promise.reject()))
  .then((data) => {
    if (!Array.isArray(data) || !data.length) return;
    const list = data.filter((s) => !isService(s.slug)).map(normalizeStation);
    if (!list.length) return;
    STATIONS = mainFirst(list);
    renderHosts();
    syncActiveCard();
  })
  .catch(() => {});

/* ---------- плеер (док внизу, как на главной) ---------- */

const audio = new Audio();
audio.preload = "none";

const dock = document.getElementById("dock");
const dockPlay = document.getElementById("dockPlay");
const dockName = document.getElementById("dockName");
const dockStatus = document.getElementById("dockStatus");
const dockEq = document.getElementById("dockEq");
const dockVol = document.getElementById("dockVol");

let current = null;

function setStatus(text, live) {
  dockStatus.innerHTML = (live ? '<i class="pulse"></i>' : "") + text;
}

function syncActiveCard() {
  document.querySelectorAll(".hostcard").forEach((el) => {
    el.classList.toggle("is-live", !!current && el.dataset.station === current && !audio.paused);
  });
}

function playStation(id) {
  const s = findStation(id);
  if (current === s.id && !audio.paused) {
    audio.pause();
    return;
  }
  current = s.id;
  dockName.textContent = s.name;
  dock.hidden = false;
  document.body.classList.add("dock-open");
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

// кнопка LIVE в шапке — главный канал
document.getElementById("headerPlay").addEventListener("click", () => playStation(defaultStation().id));

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
