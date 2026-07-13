/* ==========================================================================
   M1 Radio — страница ערוצים (video-first)
   «Театр»-плеер: видео (HLS через hls.js / нативно в Safari) + радио-режим.
   Каталог — из нового публичного API (PLAN/API.md): CORS открыт, работает
   с любого домена. Видео-поток строится по шаблону {slug}/index.m3u8.
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
    radio: s.stream_url || LIVE_BASE + s.slug + "/shoutcast",
    video: LIVE_BASE + s.slug + "/index.m3u8",
    logo: s.logo_url && !s.logo_url.includes("dummyimage") ? s.logo_url : "",
    def: s.slug === MAIN_SLUG,
  };
}

function mainFirst(list) {
  return [...list].sort((a, b) => (b.def ? 1 : 0) - (a.def ? 1 : 0));
}

function mk(slug, name, def) {
  return {
    id: slug,
    name: name,
    radio: LIVE_BASE + slug + "/shoutcast",
    video: LIVE_BASE + slug + "/index.m3u8",
    logo: "",
    def: !!def,
  };
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

function photoFor(id) {
  const i = Math.max(0, STATIONS.findIndex((s) => s.id === id));
  const s = STATIONS[i];
  return (s && s.logo) || PHOTOS_BASE + STATION_PHOTOS[i % STATION_PHOTOS.length];
}
function findStation(id) { return STATIONS.find((s) => s.id === id) || STATIONS[0]; }
function defaultStation() { return STATIONS.find((s) => s.def) || STATIONS[0]; }
function isMain(id) { return id === defaultStation().id; }

/* ---------- элементы ---------- */

const video = document.getElementById("tvVideo");
const audio = new Audio();
audio.preload = "none";
let hls = null;

const radioPane = document.getElementById("radioPane");
const radioCover = document.getElementById("radioCover");
const stageMsg = document.getElementById("stageMsg");
const stageEq = document.getElementById("stageEq");
const npTitle = document.getElementById("npTitle");
const npStatus = document.getElementById("npStatus");
const playBtn = document.getElementById("playBtn");
const vol = document.getElementById("vol");
const grid = document.getElementById("stationGrid");

let mode = "video";   // 'video' | 'radio'
let current = null;
let isPlaying = false;

/* ---------- сетка станций ---------- */

function renderStations() {
  grid.innerHTML = "";
  const count = document.getElementById("stationsCount");
  if (count) count.textContent = STATIONS.length;
  STATIONS.forEach((s, i) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "station";
    card.dataset.id = s.id;
    card.dataset.name = s.name;
    card.setAttribute("aria-label", "נגן את " + s.name);
    card.innerHTML =
      '<span class="vbadge">📺 וידאו</span>' +
      '<span class="av">' +
        '<img src="' + (s.logo || PHOTOS_BASE + STATION_PHOTOS[i % STATION_PHOTOS.length]) + '" alt="" loading="lazy">' +
        '<span class="eq"><span></span><span></span><span></span><span></span></span>' +
      "</span>" +
      '<span class="nm">' + s.name + "</span>" +
      '<span class="st">▶ לחצו לנגינה</span>';
    card.addEventListener("click", () => {
      selectStation(s.id, true);
      document.querySelector(".theater").scrollIntoView({ behavior: "smooth", block: "center" });
    });
    grid.appendChild(card);
  });
}

renderStations();

fetch(STATIONS_API)
  .then((r) => (r.ok ? r.json() : Promise.reject()))
  .then((data) => {
    if (!Array.isArray(data) || !data.length) return;
    const list = data.filter((s) => !isService(s.slug)).map(normalizeStation);
    if (!list.length) return;
    STATIONS = mainFirst(list);
    renderStations();
    syncTiles();
  })
  .catch(() => {});

/* ---------- поиск ---------- */

const searchInput = document.getElementById("stationSearch");
searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim();
  let shown = 0;
  grid.querySelectorAll(".station").forEach((el) => {
    const hit = !q || el.dataset.name.includes(q);
    el.style.display = hit ? "" : "none";
    if (hit) shown++;
  });
  document.getElementById("noResults").hidden = shown > 0;
});

/* ---------- статусы ---------- */

function setStatus(text, live) {
  npStatus.innerHTML = (live ? '<i class="pulse"></i> ' : "") + text;
  npStatus.classList.toggle("is-live", !!live);
}

function playingLabel() {
  return current && isMain(current) ? "LIVE" : "מתנגן עכשיו";
}

function syncTiles() {
  grid.querySelectorAll(".station").forEach((el) => {
    const active = current && el.dataset.id === current && isPlaying;
    el.classList.toggle("is-live", active);
    const st = el.querySelector(".st");
    if (st) st.textContent = active ? (isMain(el.dataset.id) ? "● LIVE" : "● מתנגן עכשיו") : "▶ לחצו לנגינה";
  });
  stageEq.classList.toggle("paused", !(isPlaying && mode === "radio"));
  playBtn.textContent = isPlaying ? "❚❚" : "▶";
}

function showMsg(text) {
  stageMsg.textContent = text;
  stageMsg.hidden = false;
}

/* ---------- воспроизведение ---------- */

function stopVideo() {
  video.pause();
  if (hls) { hls.destroy(); hls = null; }
  video.removeAttribute("src");
  video.load();
}
function stopRadio() {
  audio.pause();
  audio.removeAttribute("src");
}

function selectStation(id, autoplay) {
  current = findStation(id).id;
  npTitle.textContent = findStation(id).name;
  radioCover.src = photoFor(current);
  video.poster = photoFor(current);
  stageMsg.hidden = true;
  if (autoplay) startPlayback();
  else setStatus("לחצו פליי כדי להצטרף לשידור", false);
  syncTiles();
}

function startPlayback() {
  if (!current) current = defaultStation().id;
  if (mode === "video") playVideo();
  else playRadio();
}

function playVideo() {
  stopRadio();
  radioPane.hidden = true;
  stageMsg.hidden = true;
  const src = findStation(current).video;
  setStatus("מתחבר…", false);
  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = src;
  } else if (window.Hls && Hls.isSupported()) {
    if (hls) hls.destroy();
    hls = new Hls();
    hls.loadSource(src);
    hls.attachMedia(video);
    hls.on(Hls.Events.ERROR, (e, data) => {
      if (data.fatal) {
        isPlaying = false;
        showMsg("שידור הווידאו לא זמין כרגע. נסו לעבור למצב רדיו 📻");
        setStatus("הווידאו לא זמין", false);
        syncTiles();
      }
    });
  } else {
    showMsg("הדפדפן לא תומך בווידאו חי. עברו למצב רדיו 📻");
    return;
  }
  video.volume = parseFloat(vol.value);
  // браузер может заблокировать автозапуск со звуком (переход с другой страницы) —
  // тогда оставляем станцию выбранной и просим нажать пליי
  video.play().catch(() => {
    isPlaying = false;
    setStatus("לחצו פליי כדי להצטרף לשידור", false);
    syncTiles();
  });
}

function playRadio() {
  stopVideo();
  radioPane.hidden = false;
  stageMsg.hidden = true;
  setStatus("מתחבר…", false);
  audio.src = findStation(current).radio;
  audio.volume = parseFloat(vol.value);
  audio.play().catch((e) =>
    setStatus(e && e.name === "NotAllowedError" ? "לחצו פליי כדי להצטרף לשידור" : "התחנה לא זמינה כרגע", false)
  );
}

[video, audio].forEach((m) => {
  m.addEventListener("playing", () => {
    isPlaying = true;
    setStatus(playingLabel(), true);
    syncTiles();
  });
  m.addEventListener("pause", () => {
    if (m !== (mode === "video" ? video : audio)) return;
    isPlaying = false;
    setStatus("מושהה", false);
    syncTiles();
  });
  m.addEventListener("waiting", () => setStatus("מתחבר…", false));
});
audio.addEventListener("error", () => {
  if (mode !== "radio" || !current) return;
  isPlaying = false;
  setStatus("התחנה לא זמינה כרגע", false);
  syncTiles();
});

playBtn.addEventListener("click", () => {
  const media = mode === "video" ? video : audio;
  if (isPlaying) media.pause();
  else startPlayback();
});

vol.addEventListener("input", () => {
  const v = parseFloat(vol.value);
  video.volume = v;
  audio.volume = v;
});

/* ---------- переключатель וידאו / רדיו ---------- */

document.querySelectorAll("#modeToggle .m").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.mode === mode) return;
    document.querySelectorAll("#modeToggle .m").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const wasPlaying = isPlaying;
    mode = btn.dataset.mode;
    radioPane.hidden = mode !== "radio";
    stageMsg.hidden = true;
    if (wasPlaying) startPlayback();
    else syncTiles();
  });
});

/* ---------- кнопки действий ---------- */

document.getElementById("fsBtn").addEventListener("click", () => {
  const stage = document.getElementById("stageMedia");
  if (document.fullscreenElement) document.exitFullscreen();
  else if (stage.requestFullscreen) stage.requestFullscreen();
});

const shareBtn = document.getElementById("shareBtn");
shareBtn.addEventListener("click", () => {
  const s = findStation(current || defaultStation().id);
  const url = location.href.split("#")[0] + "#" + s.id;
  if (navigator.share) {
    navigator.share({ title: "M1 Radio · " + s.name, url: url }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => {
      shareBtn.textContent = "✓ הועתק";
      setTimeout(() => (shareBtn.textContent = "↗ שתף"), 1800);
    });
  }
});

/* ---------- LIVE в шапке, deep-link, мобильное меню ---------- */

document.getElementById("headerPlay").addEventListener("click", () => selectStation(defaultStation().id, true));

// deep-link: #<slug> — выбрать станцию; #play=<slug> — выбрать и сразу запустить
// (с главной так приходят кнопки hero). Без учёта регистра — старые ссылки
// вида #m1radio тоже работают. #all — якорь сетки, браузер скроллит сам.
const rawHash = decodeURIComponent(location.hash.replace("#", ""));
const wantPlay = rawHash.startsWith("play=");
const hashId = (wantPlay ? rawHash.slice(5) : rawHash).toLowerCase();
const hashStation = hashId && STATIONS.find((s) => s.id.toLowerCase() === hashId);
if (hashStation) selectStation(hashStation.id, wantPlay);
else selectStation(defaultStation().id, false);

const header = document.getElementById("siteHeader");
const burger = document.getElementById("burgerBtn");
burger.addEventListener("click", () => {
  const open = header.classList.toggle("nav-open");
  burger.setAttribute("aria-expanded", open);
});

document.getElementById("year").textContent = new Date().getFullYear();
