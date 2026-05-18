/* ============================================================
   Andrei Angelescu — Portfolio
   - Intro/startup screen (animated greeting)
   - Photo carousel
   - Motion One reveal animations
   Motion (motion.dev) is loaded as an ES module and exposed on
   `window.motion`. We wait for the "motion:ready" event before
   running any Motion-driven animations.
   ============================================================ */

(() => {
  /* ---------- Intro / startup screen ---------- */
  const intro = document.getElementById("intro");
  const introText = document.getElementById("introText");

  function partOfDay(hour) {
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 17) return "afternoon";
    if (hour >= 17 && hour < 21) return "evening";
    return "night";
  }

  function cityFromTimezone() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!tz || !tz.includes("/")) return null;
      const last = tz.split("/").pop();
      return last ? last.replace(/_/g, " ") : null;
    } catch (_) {
      return null;
    }
  }

  function buildIntroText() {
    const hour = new Date().getHours();
    const city = cityFromTimezone() || "your city";
    return `It's a great ${partOfDay(hour)} in ${city}`;
  }

  /* Scale the font down until the text fits on one line within the viewport
     (with horizontal padding). Walks from a target font-size downward — fast
     and reliable across viewports. */
  function fitIntroFontSize(el) {
    const sidePad = 32; // matches .intro padding
    const maxWidth = Math.max(240, window.innerWidth - sidePad * 2);
    // Pick a starting size that scales with viewport
    let size = Math.min(60, Math.max(20, Math.floor(window.innerWidth * 0.07)));
    el.style.fontSize = size + "px";
    // Force layout
    let safety = 60;
    while (el.scrollWidth > maxWidth && size > 14 && safety-- > 0) {
      size -= 2;
      el.style.fontSize = size + "px";
    }
  }

  function renderIntro(text) {
    introText.innerHTML = "";
    introText.textContent = text; // set first so we can measure scrollWidth
    fitIntroFontSize(introText);
    // Re-render as per-char spans for the stagger animation
    introText.innerHTML = "";
    const chars = Array.from(text);
    chars.forEach((ch, i) => {
      const span = document.createElement("span");
      span.className = "intro__char";
      span.textContent = ch;
      span.style.setProperty("--char-delay", `${i * 30}ms`);
      introText.appendChild(span);
    });
    return chars.length * 30 + 600;
  }

  function startIntro() {
    if (!intro || !introText) return;
    document.body.classList.add("intro-active");
    const animDuration = renderIntro(buildIntroText());
    const holdAfter = 1400;
    const dismiss = () => {
      intro.classList.add("is-leaving");
      setTimeout(() => {
        intro.classList.add("is-gone");
        document.body.classList.remove("intro-active");
      }, 750);
    };
    const dismissTimer = setTimeout(dismiss, animDuration + holdAfter);
    const skip = () => {
      clearTimeout(dismissTimer);
      dismiss();
    };
    intro.addEventListener("click", skip, { once: true });
    document.addEventListener("keydown", function onKey(e) {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        document.removeEventListener("keydown", onKey);
        skip();
      }
    });
    // Re-fit on resize while intro is visible
    const onResize = () => {
      if (!intro.classList.contains("is-gone")) {
        const text = introText.textContent;
        // Avoid re-rendering chars (would restart animation). Resize only.
        introText.style.whiteSpace = "nowrap";
        introText.style.fontSize = ""; // reset
        // Use a clone to measure raw text width
        const probe = document.createElement("span");
        probe.style.cssText =
          "position:absolute;visibility:hidden;white-space:nowrap;";
        probe.textContent = text;
        introText.appendChild(probe);
        fitIntroFontSize(probe);
        introText.style.fontSize = probe.style.fontSize;
        probe.remove();
      }
    };
    window.addEventListener("resize", onResize);
  }

  /* ---------- Carousel ---------- */
  function initCarousel() {
    const slides = Array.from(document.querySelectorAll(".carousel__slide"));
    const dots = Array.from(
      document.querySelectorAll('#carouselDots button[data-index]')
    );
    if (slides.length === 0 || dots.length === 0) return;

    const total = slides.length;
    let current = 0;
    let timer = null;
    const INTERVAL = 3000;

    function show(index) {
      const next = ((index % total) + total) % total;
      slides[current].classList.remove("is-active");
      dots[current].setAttribute("aria-selected", "false");
      slides[next].classList.add("is-active");
      dots[next].setAttribute("aria-selected", "true");
      current = next;
    }
    function next() { show(current + 1); }
    function start() { stop(); timer = setInterval(next, INTERVAL); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        const i = parseInt(dot.dataset.index, 10);
        if (Number.isNaN(i)) return;
        show(i);
        start();
      });
    });

    const carousel = document.getElementById("carousel");
    if (carousel) {
      carousel.addEventListener("mouseenter", stop);
      carousel.addEventListener("mouseleave", start);
    }
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else start();
    });

    start();
  }

  /* ---------- Motion One reveals ----------
     After the intro screen dismisses, every `data-reveal` and
     `data-reveal-stagger` element is animated in cascade, top-to-bottom,
     so the home page assembles itself one section after another. Below-
     fold elements still get their initial opacity:0 from CSS and get
     scheduled into the cascade — by the time the user scrolls down they
     are already visible. */
  function initMotionReveals() {
    const motion = window.motion;
    if (!motion || !motion.animate) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      document
        .querySelectorAll("[data-reveal], [data-reveal-stagger] > *")
        .forEach((el) => {
          el.style.opacity = "1";
          el.style.transform = "none";
        });
      return;
    }

    const easing = [0.22, 1, 0.36, 1];
    const baseStagger = 0.1; // 100 ms gap between top-level sections

    function reveal(el, delay = 0, duration = 0.65) {
      motion.animate(
        el,
        { opacity: [0, 1], y: [28, 0] },
        { duration, delay, easing }
      );
    }

    function groupByRow(elements, tolerance = 24) {
      const items = elements.map((el) => ({
        el,
        y: el.getBoundingClientRect().top + window.scrollY,
      }));
      items.sort((a, b) => a.y - b.y);
      const rows = [];
      let currentRow = [];
      let currentY = null;
      items.forEach(({ el, y }) => {
        if (currentY === null || Math.abs(y - currentY) <= tolerance) {
          currentRow.push(el);
          if (currentY === null) currentY = y;
        } else {
          rows.push(currentRow);
          currentRow = [el];
          currentY = y;
        }
      });
      if (currentRow.length) rows.push(currentRow);
      return rows;
    }

    function runCascade() {
      let cumDelay = 0;
      const targets = document.querySelectorAll(
        "[data-reveal], [data-reveal-stagger]"
      );
      targets.forEach((el) => {
        if (el.hasAttribute("data-reveal-stagger")) {
          const children = Array.from(el.children);
          if (children.length === 0) return;
          const rows = groupByRow(children);
          rows.forEach((row, rowIdx) => {
            row.forEach((c, colIdx) => {
              reveal(c, cumDelay + rowIdx * 0.1 + colIdx * 0.03, 0.6);
            });
          });
          // Reserve cumulative time for this group's rows
          cumDelay += rows.length * 0.1 + 0.15;
        } else {
          reveal(el, cumDelay, 0.65);
          cumDelay += baseStagger;
        }
      });
    }

    // Gate the cascade on intro dismissal so the page assembles itself
    // only after the greeting fades away.
    const introEl = document.getElementById("intro");
    if (introEl && !introEl.classList.contains("is-gone")) {
      const observer = new MutationObserver(() => {
        if (introEl.classList.contains("is-gone")) {
          runCascade();
          observer.disconnect();
        }
      });
      observer.observe(introEl, {
        attributes: true,
        attributeFilter: ["class"],
      });
      // Fallback if the intro never finishes for some reason
      setTimeout(runCascade, 6000);
    } else {
      runCascade();
    }
  }

  /* ---------- Reflection card 3D tilt (Section 4) ----------
     Pointer-tracked perspective tilt. The grid has `perspective: 1200px`
     and each card has `transform-style: preserve-3d`, so rotating each
     card on rotateX / rotateY produces a proper 3D effect that follows
     the cursor. */
  function initReflectionTilt() {
    const motion = window.motion;
    if (!motion || !motion.animate) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    document.querySelectorAll(".reflect-card").forEach((card) => {
      let rafScheduled = false;
      let lastEvent = null;
      function update() {
        rafScheduled = false;
        if (!lastEvent) return;
        const rect = card.getBoundingClientRect();
        const x = (lastEvent.clientX - rect.left) / rect.width - 0.5;
        const y = (lastEvent.clientY - rect.top) / rect.height - 0.5;
        motion.animate(
          card,
          { rotateY: x * 12, rotateX: -y * 8, scale: 1.02 },
          { duration: 0.2, easing: "ease-out" }
        );
      }
      card.addEventListener("pointermove", (e) => {
        lastEvent = e;
        if (!rafScheduled) {
          rafScheduled = true;
          requestAnimationFrame(update);
        }
      });
      card.addEventListener("pointerleave", () => {
        lastEvent = null;
        motion.animate(
          card,
          { rotateY: 0, rotateX: 0, scale: 1 },
          { duration: 0.55, easing: [0.22, 1, 0.36, 1] }
        );
      });
    });
  }

  /* ---------- macOS-style Home Dock ----------
     Cosine magnification on hover, position recalculated each frame so
     icons "push" each other smoothly. Tooltip is a CSS-driven sibling on
     each item. Click triggers a small bounce. A vertical divider sits
     between the 4th and 5th icons. */
  function initDock() {
    const dock = document.getElementById("dock");
    const inner = document.getElementById("dockInner");
    if (!dock || !inner) return;

    const items = Array.from(inner.querySelectorAll(".dock__item"));
    const divider = inner.querySelector(".dock__divider");
    if (items.length === 0) return;

    // index AFTER which the divider sits (0-based). Default: after AI (i=3).
    const DIVIDER_AFTER = 3;

    function getConfig() {
      const dim = Math.min(window.innerWidth, window.innerHeight);
      if (dim < 480) {
        return { base: Math.max(40, Math.round(dim * 0.085)), maxScale: 1.45, effectWidth: dim * 0.45, gap: 6 };
      }
      if (dim < 768) {
        return { base: 48, maxScale: 1.5, effectWidth: dim * 0.4, gap: 8 };
      }
      if (dim < 1024) {
        return { base: 54, maxScale: 1.6, effectWidth: dim * 0.32, gap: 10 };
      }
      return { base: 58, maxScale: 1.75, effectWidth: 280, gap: 10 };
    }

    let cfg = getConfig();
    let mouseX = null;
    let scales = items.map(() => 1);
    let positions = items.map(() => 0);
    let rafId = null;

    function targetScales(mx) {
      if (mx === null) return items.map(() => 1);
      return items.map((_, i) => {
        // Base (unmagnified) center, including the divider gap shift.
        const baseSpacing = cfg.gap;
        const dividerOffset = i > DIVIDER_AFTER ? cfg.gap + 1 : 0;
        const center =
          i * (cfg.base + baseSpacing) + cfg.base / 2 + dividerOffset;
        const minX = mx - cfg.effectWidth / 2;
        const maxX = mx + cfg.effectWidth / 2;
        if (center < minX || center > maxX) return 1;
        const theta = ((center - minX) / cfg.effectWidth) * 2 * Math.PI;
        const t = Math.min(Math.max(theta, 0), 2 * Math.PI);
        const factor = (1 - Math.cos(t)) / 2;
        return 1 + factor * (cfg.maxScale - 1);
      });
    }

    function calcPositions(scaleArr) {
      const out = new Array(scaleArr.length);
      let x = 0;
      for (let i = 0; i < scaleArr.length; i++) {
        if (i === DIVIDER_AFTER + 1 && divider) {
          divider.style.left = `${x}px`;
          x += 1 + cfg.gap;
        }
        const w = cfg.base * scaleArr[i];
        out[i] = x + w / 2;
        x += w + cfg.gap;
      }
      return out;
    }

    function applyState(scaleArr, posArr) {
      items.forEach((item, i) => {
        const s = scaleArr[i];
        const w = cfg.base * s;
        item.style.width = `${w}px`;
        item.style.height = `${w}px`;
        item.style.left = `${posArr[i] - w / 2}px`;
        item.style.zIndex = String(Math.round(s * 10));
      });
      if (divider) {
        divider.style.bottom = `${cfg.base * 0.18}px`;
        divider.style.height = `${cfg.base * 0.6}px`;
      }
      const rightmost = posArr.reduce((max, p, i) => {
        const right = p + (cfg.base * scaleArr[i]) / 2;
        return right > max ? right : max;
      }, 0);
      inner.style.width = `${rightmost}px`;
      inner.style.height = `${cfg.base}px`;
    }

    function tick() {
      const tgt = targetScales(mouseX);
      const lerp = mouseX !== null ? 0.22 : 0.14;
      let active = mouseX !== null;
      scales = scales.map((s, i) => {
        const diff = tgt[i] - s;
        if (Math.abs(diff) > 0.002) active = true;
        return s + diff * lerp;
      });
      positions = calcPositions(scales);
      applyState(scales, positions);
      rafId = active ? requestAnimationFrame(tick) : null;
    }

    function start() { if (!rafId) rafId = requestAnimationFrame(tick); }

    // Initial layout
    positions = calcPositions(scales);
    applyState(scales, positions);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    if (supportsHover && !reduce) {
      let lastMove = 0;
      dock.addEventListener("mousemove", (e) => {
        const now = performance.now();
        if (now - lastMove < 16) return;
        lastMove = now;
        const rect = inner.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        start();
      });
      dock.addEventListener("mouseleave", () => {
        mouseX = null;
        start();
      });
    }

    // Bounce + click handler — each icon has its own behaviour:
    //   data-action="reload" → reload the page (Home)
    //   data-href=URL        → open in a new tab (Portfolio, Quantum Pill)
    //   data-app="andrei"    → open the About popup
    //   no attribute         → no-op (AI Coming Soon)
    items.forEach((item) => {
      item.addEventListener("click", () => {
        item.classList.remove("is-bouncing");
        void item.offsetWidth;
        item.classList.add("is-bouncing");
        setTimeout(() => item.classList.remove("is-bouncing"), 600);
        const app = item.dataset.app;
        const action = item.dataset.action;
        const href = item.dataset.href;
        if (action === "reload") {
          // Wait for the bounce animation to finish before reloading
          setTimeout(() => location.reload(), 280);
          return;
        }
        if (href) {
          setTimeout(() => window.open(href, "_blank", "noopener,noreferrer"), 180);
          return;
        }
        if (app === "andrei") openAbout();
      });
    });

    // Re-layout on resize
    window.addEventListener("resize", () => {
      cfg = getConfig();
      positions = calcPositions(scales);
      applyState(scales, positions);
    });

    // Make the dock visible after the intro has dismissed so it doesn't
    // distract from the greeting.
    function reveal() { dock.classList.add("is-ready"); }
    if (document.querySelector(".intro.is-gone")) {
      reveal();
    } else {
      const observer = new MutationObserver(() => {
        if (document.querySelector(".intro.is-gone")) {
          reveal();
          observer.disconnect();
        }
      });
      const introEl = document.getElementById("intro");
      if (introEl) {
        observer.observe(introEl, { attributes: true, attributeFilter: ["class"] });
        // Safety fallback in case the intro never finishes for some reason
        setTimeout(reveal, 5000);
      } else {
        reveal();
      }
    }
  }

  /* ---------- Dynamic Island ----------
     - Hamburger ↔ X toggle (CSS-driven via .is-open)
     - Closes on click outside / Escape
     - Fetches current weather + temperature from Open-Meteo and picks the
       matching icon based on weather code + day/night
     - City is derived from the user's timezone so we don't need any API key
       or geolocation permission prompt to render a meaningful number. */
  const TZ_COORDS = {
    "Europe/Madrid": [40.42, -3.7],
    "Europe/London": [51.51, -0.13],
    "Europe/Paris": [48.86, 2.35],
    "Europe/Berlin": [52.52, 13.41],
    "Europe/Bucharest": [44.43, 26.1],
    "Europe/Rome": [41.9, 12.5],
    "Europe/Amsterdam": [52.37, 4.9],
    "Europe/Zurich": [47.38, 8.55],
    "Europe/Lisbon": [38.72, -9.14],
    "Europe/Dublin": [53.35, -6.26],
    "Europe/Athens": [37.98, 23.73],
    "Europe/Warsaw": [52.23, 21.01],
    "Europe/Stockholm": [59.33, 18.07],
    "Europe/Oslo": [59.91, 10.75],
    "Europe/Copenhagen": [55.68, 12.57],
    "America/New_York": [40.71, -74.01],
    "America/Chicago": [41.88, -87.63],
    "America/Denver": [39.74, -104.99],
    "America/Los_Angeles": [34.05, -118.24],
    "America/Toronto": [43.65, -79.38],
    "America/Vancouver": [49.28, -123.12],
    "America/Sao_Paulo": [-23.55, -46.63],
    "America/Mexico_City": [19.43, -99.13],
    "Asia/Tokyo": [35.68, 139.69],
    "Asia/Shanghai": [31.23, 121.47],
    "Asia/Singapore": [1.35, 103.82],
    "Asia/Dubai": [25.27, 55.3],
    "Asia/Seoul": [37.57, 126.98],
    "Asia/Hong_Kong": [22.32, 114.17],
    "Asia/Kolkata": [28.61, 77.21],
    "Australia/Sydney": [-33.87, 151.21],
    "Pacific/Auckland": [-36.85, 174.76],
    "Africa/Johannesburg": [-26.2, 28.04],
  };

  function weatherIconFor(code, isNight) {
    if (code == null) return "weather-sun";
    if ([0, 1].includes(code)) return isNight ? "weather-night" : "weather-sun";
    if ([2, 3, 45, 48].includes(code)) return "weather-cloudy";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "weather-snow";
    if (
      [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(
        code
      )
    )
      return "weather-rain";
    return isNight ? "weather-night" : "weather-sun";
  }

  function isNightLocal() {
    const h = new Date().getHours();
    return h < 6 || h >= 20;
  }

  async function fetchWeather() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const coords = TZ_COORDS[tz];
      if (!coords) return null;
      const [lat, lon] = coords;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`;
      const r = await fetch(url, { cache: "default" });
      if (!r.ok) return null;
      const data = await r.json();
      const c = data && data.current;
      if (!c) return null;
      return {
        temp: Math.round(c.temperature_2m),
        code: c.weather_code,
        isDay: c.is_day === 1,
      };
    } catch (_) {
      return null;
    }
  }

  function initDynamicIsland() {
    const di = document.getElementById("dynamicIsland");
    const btn = document.getElementById("diMenuBtn");
    const menu = document.getElementById("diMenu");
    const tempEl = document.getElementById("diTempNum");
    const iconEl = document.getElementById("diWeatherIcon");
    if (!di || !btn) return;

    function setOpen(open) {
      di.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      if (menu) menu.setAttribute("aria-hidden", open ? "false" : "true");
    }
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      setOpen(!di.classList.contains("is-open"));
    });
    document.addEventListener("click", (e) => {
      if (!di.contains(e.target) && di.classList.contains("is-open")) {
        setOpen(false);
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && di.classList.contains("is-open")) {
        setOpen(false);
        btn.focus();
      }
    });
    // Close after clicking any menu link so navigation feels responsive
    di.querySelectorAll(".di__menu a").forEach((a) => {
      a.addEventListener("click", () => setOpen(false));
    });

    // Fetch weather, then update temp + icon
    fetchWeather().then((w) => {
      if (!w) return;
      if (tempEl) tempEl.textContent = String(w.temp);
      if (iconEl) {
        const icon = weatherIconFor(w.code, !w.isDay);
        iconEl.src = `images/${icon}.svg?v=17`;
      }
    });

    // Reveal in sync with the intro screen
    function reveal() { di.classList.add("is-ready"); }
    if (document.querySelector(".intro.is-gone")) reveal();
    else {
      const introEl = document.getElementById("intro");
      if (introEl) {
        const observer = new MutationObserver(() => {
          if (document.querySelector(".intro.is-gone")) {
            reveal();
            observer.disconnect();
          }
        });
        observer.observe(introEl, { attributes: true, attributeFilter: ["class"] });
        setTimeout(reveal, 5000);
      } else reveal();
    }
  }

  /* ---------- About me popup ----------
     Opens when the "Andrei" dock icon is clicked. Closes on Escape, on
     a click anywhere outside the panel, or on the explicit X button. */
  function openAbout() {
    const el = document.getElementById("aboutPopup");
    if (!el) return;
    el.classList.add("is-open");
    el.setAttribute("aria-hidden", "false");
    document.body.classList.add("about-open");
    const close = el.querySelector(".about__close");
    if (close) close.focus({ preventScroll: true });
  }
  function closeAbout() {
    const el = document.getElementById("aboutPopup");
    if (!el) return;
    el.classList.remove("is-open");
    el.setAttribute("aria-hidden", "true");
    document.body.classList.remove("about-open");
  }
  function initAbout() {
    const el = document.getElementById("aboutPopup");
    if (!el) return;
    // Any element marked data-about-close (backdrop + X button) dismisses
    el.querySelectorAll("[data-about-close]").forEach((t) => {
      t.addEventListener("click", closeAbout);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && el.classList.contains("is-open")) closeAbout();
    });
  }

  /* ---------- Boot ---------- */
  function boot() {
    startIntro();
    initCarousel();
    initDock();
    initDynamicIsland();
    initAbout();
    function onMotionReady() {
      initMotionReveals();
      initReflectionTilt();
    }
    if (window.motion) onMotionReady();
    else window.addEventListener("motion:ready", onMotionReady, { once: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
