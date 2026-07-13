(function () {
  "use strict";

  var root = document.documentElement;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var navStorageKey = "m1-nav-from";
  var leaveDelay = 130;
  var isLeaving = false;

  root.classList.add("motion-enabled");
  if (reducedMotion.matches) root.classList.add("page-ready");

  function routeKey(value) {
    var url = new URL(value, window.location.href);
    var segments = url.pathname.split("/");
    return (segments.pop() || "index.html").toLowerCase();
  }

  function readPreviousRoute() {
    try {
      var value = window.sessionStorage.getItem(navStorageKey);
      window.sessionStorage.removeItem(navStorageKey);
      return value;
    } catch (error) {
      return null;
    }
  }

  function rememberCurrentRoute() {
    var active = document.querySelector("#mainNav a.active");
    var currentRoute = active ? routeKey(active.href) : routeKey(window.location.href);
    try {
      window.sessionStorage.setItem(navStorageKey, currentRoute);
    } catch (error) {
      // Transitions still work when storage is unavailable.
    }
  }

  function setCurrentPageSemantics() {
    document.querySelectorAll("#mainNav a.active, #mobileNav a.active").forEach(function (link) {
      link.setAttribute("aria-current", "page");
    });
  }

  function setupNavIndicator() {
    var nav = document.getElementById("mainNav");
    if (!nav) return;

    var links = Array.from(nav.querySelectorAll("a"));
    var active = nav.querySelector("a.active");
    if (!active) return;

    var indicator = document.createElement("span");
    indicator.className = "nav-indicator";
    indicator.setAttribute("aria-hidden", "true");
    nav.prepend(indicator);

    function placeIndicator(link) {
      if (!link || nav.getClientRects().length === 0) return;
      var navRect = nav.getBoundingClientRect();
      var linkRect = link.getBoundingClientRect();
      indicator.style.width = linkRect.width + "px";
      indicator.style.height = linkRect.height + "px";
      indicator.style.transform =
        "translate3d(" + (linkRect.left - navRect.left) + "px," +
        (linkRect.top - navRect.top) + "px,0)";
    }

    var previousRoute = readPreviousRoute();
    var previousLink = links.find(function (link) {
      return routeKey(link.href) === previousRoute;
    });
    var startLink = !reducedMotion.matches && previousLink ? previousLink : active;

    function startIndicator() {
      placeIndicator(startLink);
      indicator.classList.add("is-visible");
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          indicator.classList.add("is-animated");
          placeIndicator(active);
        });
      });
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(startIndicator);
    } else {
      startIndicator();
    }

    var resizeFrame = 0;
    window.addEventListener("resize", function () {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(function () {
        placeIndicator(active);
      });
    }, { passive: true });

  }

  function isInternalPageLink(link, url) {
    if (link.hasAttribute("download") || link.dataset.noTransition !== undefined) return false;
    if (link.target && link.target.toLowerCase() !== "_self") return false;
    if (url.protocol !== window.location.protocol || url.host !== window.location.host) return false;
    if (url.pathname === window.location.pathname && url.search === window.location.search) return false;
    return url.pathname.toLowerCase().endsWith(".html");
  }

  function handlePageLink(event) {
    if (isLeaving || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    var link = event.target.closest("a[href]");
    if (!link) return;

    var url;
    try {
      url = new URL(link.href, window.location.href);
    } catch (error) {
      return;
    }

    var sameDocument =
      url.pathname === window.location.pathname &&
      url.search === window.location.search;
    if (sameDocument) {
      if (!url.hash || url.hash === window.location.hash) event.preventDefault();
      return;
    }

    if (!isInternalPageLink(link, url)) return;

    event.preventDefault();
    rememberCurrentRoute();

    if (reducedMotion.matches) {
      window.location.assign(url.href);
      return;
    }

    isLeaving = true;
    root.classList.add("page-leaving");
    window.setTimeout(function () {
      window.location.assign(url.href);
    }, leaveDelay);
  }

  function showPage() {
    root.classList.remove("page-leaving");
    isLeaving = false;
    if (reducedMotion.matches) {
      root.classList.add("page-ready");
      return;
    }
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        root.classList.add("page-ready");
      });
    });
  }

  function init() {
    setCurrentPageSemantics();
    setupNavIndicator();
    document.addEventListener("click", handlePageLink);
    showPage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.addEventListener("pageshow", showPage);
  function handleMotionPreference() {
    if (reducedMotion.matches) root.classList.add("page-ready");
  }

  if (reducedMotion.addEventListener) {
    reducedMotion.addEventListener("change", handleMotionPreference);
  } else if (reducedMotion.addListener) {
    reducedMotion.addListener(handleMotionPreference);
  }
})();
