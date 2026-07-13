/* ==========================================================================
   M1 Radio — страница מה חדש (блог)
   Эндпойнт GET /api/v1/posts реализован (PLAN/API.md, живёт на
   live.positive-story.co.il, CORS открыт). Пока в админке нет реальных
   постов — показываем статьи-примеры; как только посты появятся,
   fetch ниже подменит примеры автоматически и скроет бейдж «תוכן לדוגמה».
   ========================================================================== */

const POSTS_API = "https://live.positive-story.co.il/api/v1/posts";
const IMG_BASE = "assets/placeholders/";
const FALLBACK_IMG = IMG_BASE + "stations/station-01-radio-team.jpg"; // у поста без обложки (imageUrl: "")

// тексты — примеры рубрик, заменить на реальные посты из админки
let POSTS = [
  {
    slug: "new-station-launch",
    title: "איך נולדת תחנה חדשה ב-M1",
    excerpt: "הצצה לאולפן: מהרעיון הראשון, דרך בחירת המוזיקה והשדרן ועד הרגע שהערוץ עולה לאוויר.",
    category: "מאחורי הקלעים",
    publishedAt: "2026-07-08",
    image: "stations/station-01-radio-team.jpg",
  },
  {
    slug: "meet-the-hosts",
    title: "שיחה עם המגישים שמאחורי הערוצים",
    excerpt: "מה שומעים בבית של מי שמשדר כל היום? המגישים שלנו מספרים על הרגעים הקטנים שמאחורי המיקרופון.",
    category: "ראיון",
    publishedAt: "2026-07-06",
    image: "stations/station-06-women-broadcasting.jpg",
  },
  {
    slug: "community-stories",
    title: "הסיפורים והברכות ששלחתם השבוע",
    excerpt: "מהקהילה שלנו: הסיפורים החיוביים, הברכות והרגעים שעשו לנו טוב השבוע.",
    category: "קהילה",
    publishedAt: "2026-07-05",
    image: "stations/station-07-mother-daughter-music.jpg",
  },
  {
    slug: "morning-playlist",
    title: "הפלייליסט שמלווה את הבוקר",
    excerpt: "השירים שפותחים את היום באולפן והסיבות שבגללן בחרנו דווקא בהם. הכירו את פלייליסט הבוקר של הערוץ הראשי.",
    category: "פלייליסט",
    publishedAt: "2026-07-03",
    image: "stations/station-08-girl-headphones.jpg",
  },
  {
    slug: "studio-day",
    title: "סיור באולפן: כך נראה יום שידור",
    excerpt: "מהקפה של הבוקר ועד השיר האחרון של הלילה. הצטרפו ליום אחד מאחורי הקלעים של M1.",
    category: "מאחורי הקלעים",
    publishedAt: "2026-07-01",
    image: "backgrounds/bg-02-home-podcast-studio.jpg",
  },
  {
    slug: "kids-channel-talk",
    title: "חמש דקות עם ערוץ הילדים",
    excerpt: "איך מכינים חדשות טובות לילדים? הצצה לערוץ שכולו חיוך.",
    category: "ראיון",
    publishedAt: "2026-06-28",
    image: "stations/station-12-mother-children-tech.jpg",
  },
  {
    slug: "summer-songs",
    title: "הקהילה בחרה: השירים של הקיץ",
    excerpt: "ביקשנו וקיבלנו. אלה השירים שאתם הכי אוהבים לשמוע בקיץ, לפי ההצבעות שלכם.",
    category: "קהילה",
    publishedAt: "2026-06-25",
    image: "stations/station-11-couple-music.jpg",
  },
];

/* ---------- рендер ---------- */

const featuredEl = document.getElementById("featured");
const grid = document.getElementById("postGrid");
const filtersEl = document.getElementById("filters");
const noPosts = document.getElementById("noPosts");
const postsTitle = document.getElementById("postsTitle");

let activeCat = null; // null = הכול

function imgSrc(p) {
  if (p.imageUrl) return p.imageUrl;
  return p.image ? IMG_BASE + p.image : FALLBACK_IMG;
}

function fmtDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return dd + "." + mm + "." + d.getFullYear();
}

function sorted() {
  return [...POSTS].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

function renderFilters() {
  const cats = [...new Set(sorted().map((p) => p.category).filter(Boolean))];
  filtersEl.innerHTML = "";
  const all = document.createElement("button");
  all.type = "button";
  all.className = "fchip" + (activeCat === null ? " active" : "");
  all.textContent = "הכול";
  all.addEventListener("click", () => { activeCat = null; render(); });
  filtersEl.appendChild(all);
  cats.forEach((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "fchip" + (activeCat === c ? " active" : "");
    b.textContent = c;
    b.addEventListener("click", () => { activeCat = c; render(); });
    filtersEl.appendChild(b);
  });
}

function postCard(p) {
  const card = document.createElement("article");
  card.className = "post";
  card.innerHTML =
    '<div class="mimg"><img src="' + imgSrc(p) + '" alt="" loading="lazy"></div>' +
    '<div class="pbody">' +
      '<span class="mtag">' + (p.category || "") + "</span>" +
      "<h3>" + p.title + "</h3>" +
      "<p>" + (p.excerpt || "") + "</p>" +
      '<div class="pdate">' + fmtDate(p.publishedAt) + "</div>" +
    "</div>";
  return card;
}

function render() {
  renderFilters();
  const list = sorted();
  grid.innerHTML = "";

  if (activeCat === null) {
    // главная статья + остальные
    const feat = list[0];
    featuredEl.hidden = !feat;
    if (feat) {
      featuredEl.innerHTML =
        '<div class="fbody">' +
          '<span class="mtag">' + (feat.category || "") + "</span>" +
          "<h3>" + feat.title + "</h3>" +
          "<p>" + (feat.excerpt || "") + "</p>" +
          '<div class="pdate">' + fmtDate(feat.publishedAt) + " · הכתבה האחרונה</div>" +
        "</div>" +
        '<div class="mimg"><img src="' + imgSrc(feat) + '" alt=""></div>';
    }
    list.slice(1).forEach((p) => grid.appendChild(postCard(p)));
    noPosts.hidden = true;
    postsTitle.hidden = false;
  } else {
    // фильтр по рубрике: без главной, все подходящие
    featuredEl.hidden = true;
    const filtered = list.filter((p) => p.category === activeCat);
    filtered.forEach((p) => grid.appendChild(postCard(p)));
    noPosts.hidden = filtered.length > 0;
    postsTitle.hidden = filtered.length === 0;
  }
}

render();

// реальные посты из админки подменяют примеры (пусто `[]` — остаёмся на примерах)
fetch(POSTS_API)
  .then((r) => (r.ok ? r.json() : Promise.reject()))
  .then((data) => {
    if (!Array.isArray(data) || !data.length) return;
    POSTS = data;
    activeCat = null;
    const badge = document.querySelector(".soon-badge");
    if (badge) badge.hidden = true;
    render();
  })
  .catch(() => {});

/* ---------- плеер: кнопка LIVE в шапке (главный канал) ---------- */

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
