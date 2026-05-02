(function () {
  const overlayClasses = [
    "overlay-bottom",
    "overlay-top-left",
    "overlay-center",
    "overlay-minimal"
  ];
  const boardStyleClasses = [
    "board-style-angled",
    "board-style-ribbon",
    "board-style-corners",
    "board-style-bands",
    "board-style-bubbles",
    "board-style-stripes",
    "board-style-dashes",
    "board-style-waves",
    "board-style-confetti",
    "board-style-checks",
    "board-style-jigsaw",
    "board-style-puzzle-scatter"
  ];

  const config = window.AD_BOARD_SUPABASE;
  const slideFrame = document.getElementById("slideFrame");
  const slideImageBox = document.getElementById("slideImageBox");
  const slideImage = document.getElementById("slideImage");
  const slideOverlay = document.getElementById("slideOverlay");
  const slideHeader = document.getElementById("slideHeader");
  const slideCaption = document.getElementById("slideCaption");
  const slideLogo = document.getElementById("slideLogo");
  const emptyState = document.getElementById("emptyState");
  const statusBanner = document.getElementById("statusBanner");

  let supabaseClient;
  let slides = [];
  let logos = [];
  let currentIndex = -1;
  let timerId;
  let exitSequence = "";
  let brandPalette = ["#0f766e", "#073b36", "#f6b453"];
  let currentOverlayClass = "overlay-bottom";
  let currentImageZone = null;

  function showStatus(message) {
    statusBanner.textContent = message;
    statusBanner.hidden = !message;
  }

  function shuffle(items) {
    return [...items].sort(() => Math.random() - 0.5);
  }

  function pickRandom(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function normalizeColours(colours) {
    const validColours = (Array.isArray(colours) ? colours : [])
      .map((colour) => String(colour || "").trim())
      .filter((colour) => /^#[0-9a-f]{6}$/i.test(colour));

    return validColours.length ? validColours : ["#0f766e", "#073b36", "#f6b453"];
  }

  function getOverlayClass(style) {
    if (style === "random") {
      return pickRandom(overlayClasses);
    }

    return `overlay-${style || "bottom"}`;
  }

  function setOverlayStyle(style) {
    slideOverlay.classList.remove(...overlayClasses, "caption-over-image", "logo-avoid-left");
    const overlayClass = getOverlayClass(style);
    slideOverlay.classList.add(overlayClass);
    currentOverlayClass = overlayClass;
    return overlayClass;
  }

  function setRandomBoardStyle() {
    setRandomBoardColours();
    slideFrame.classList.remove(...boardStyleClasses);
    slideFrame.classList.add(pickRandom(boardStyleClasses));
  }

  function setRandomBoardColours() {
    const palette = normalizeColours(brandPalette);
    const primary = pickRandom(palette);
    const secondary = pickRandom(palette);
    const accent = pickRandom(palette);
    const extra = pickRandom(palette);

    document.documentElement.style.setProperty("--brand-matte", primary);
    document.documentElement.style.setProperty("--brand-matte-dark", secondary);
    document.documentElement.style.setProperty("--brand-matte-warm", accent);
    document.documentElement.style.setProperty("--brand-matte-extra", extra);
  }

  function setRandomImageBox(overlayClass) {
    currentOverlayClass = overlayClass || currentOverlayClass;
    currentImageZone = pickImageZone(currentOverlayClass);
    applySafeImageBox();
  }

  function applySafeImageBox() {
    const zone = currentImageZone || pickImageZone(currentOverlayClass);
    currentImageZone = zone;

    const zoneWidth = Math.max(180, zone.right - zone.left);
    const zoneHeight = Math.max(180, zone.bottom - zone.top);
    const scale = pickRandom(zone.scales);
    let boxWidth = Math.floor(zoneWidth * scale);
    let boxHeight = Math.floor(zoneHeight * scale);
    const minWidth = Math.min(Math.max(520, window.innerWidth * 0.34), window.innerWidth * 0.72);
    const minHeight = Math.min(Math.max(300, window.innerHeight * 0.34), window.innerHeight * 0.72);

    if (slideImage.naturalWidth && slideImage.naturalHeight) {
      const imageRatio = slideImage.naturalWidth / slideImage.naturalHeight;
      const boxRatio = boxWidth / boxHeight;

      if (imageRatio > boxRatio) {
        boxHeight = Math.floor(boxWidth / imageRatio);
      } else {
        boxWidth = Math.floor(boxHeight * imageRatio);
      }

      if (boxWidth < minWidth && boxHeight < minHeight) {
        if (imageRatio >= 1) {
          boxWidth = Math.min(zoneWidth, minWidth);
          boxHeight = Math.floor(boxWidth / imageRatio);
        } else {
          boxHeight = Math.min(zoneHeight, minHeight);
          boxWidth = Math.floor(boxHeight * imageRatio);
        }
      }
    }

    slideImageBox.style.setProperty("--slide-box-width", `${boxWidth}px`);
    slideImageBox.style.setProperty("--slide-box-height", `${boxHeight}px`);
    placeImageBox(boxWidth, boxHeight, zone);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function randomBetween(min, max) {
    if (max <= min) {
      return min;
    }

    return min + Math.random() * (max - min);
  }

  function makeZone(left, top, right, bottom, scales) {
    const margin = Math.max(28, Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.035));
    return {
      left: clamp(left, margin, window.innerWidth - margin),
      top: clamp(top, margin, window.innerHeight - margin),
      right: clamp(right, margin, window.innerWidth - margin),
      bottom: clamp(bottom, margin, window.innerHeight - margin),
      scales
    };
  }

  function pickImageZone(overlayClass) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const margin = Math.max(28, Math.round(Math.min(width, height) * 0.035));
    const logoClearance = Math.max(190, width * 0.18);
    const centreZones = [
      makeZone(width * 0.18, height * 0.14, width * 0.82, height * 0.72, [0.72, 0.82, 0.94]),
      makeZone(width * 0.24, height * 0.18, width * 0.76, height * 0.78, [0.78, 0.9, 1]),
      makeZone(width * 0.14, height * 0.2, width * 0.72, height * 0.74, [0.76, 0.88, 1]),
      makeZone(width * 0.28, height * 0.16, width * 0.86, height * 0.72, [0.72, 0.84, 0.96])
    ];
    const zonesByOverlay = {
      "overlay-bottom": [
        ...centreZones,
        makeZone(width * 0.22, margin, width * 0.78, height * 0.64, [0.78, 0.9, 1]),
        makeZone(width * 0.34, margin + logoClearance * 0.2, width * 0.88, height * 0.62, [0.74, 0.86, 0.98])
      ],
      "overlay-top-left": [
        makeZone(width * 0.34, height * 0.26, width * 0.88, height * 0.82, [0.78, 0.9, 1]),
        makeZone(width * 0.26, height * 0.38, width * 0.84, height * 0.86, [0.76, 0.88, 1]),
        makeZone(width * 0.44, margin + logoClearance * 0.35, width * 0.9, height * 0.76, [0.74, 0.86, 0.98])
      ],
      "overlay-center": [
        makeZone(width * 0.14, height * 0.12, width * 0.5, height * 0.5, [0.9, 1]),
        makeZone(width * 0.5, height * 0.12 + logoClearance * 0.1, width * 0.86, height * 0.5, [0.84, 0.96, 1]),
        makeZone(width * 0.14, height * 0.5, width * 0.5, height * 0.88, [0.88, 1]),
        makeZone(width * 0.5, height * 0.5, width * 0.86, height * 0.88, [0.86, 0.98, 1])
      ],
      "overlay-minimal": [
        ...centreZones,
        makeZone(width * 0.18, margin, width * 0.76, height * 0.6, [0.78, 0.9, 1]),
        makeZone(width * 0.16, height * 0.3, width * 0.72, height * 0.84, [0.76, 0.88, 1])
      ]
    };
    return pickRandom(zonesByOverlay[overlayClass] || zonesByOverlay["overlay-bottom"]);
  }

  function placeImageBox(boxWidth, boxHeight, zone) {
    const margin = Math.max(28, Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.035));
    const maxLeft = Math.max(zone.left, zone.right - boxWidth);
    const maxTop = Math.max(zone.top, zone.bottom - boxHeight);
    const left = clamp(randomBetween(zone.left, maxLeft), margin, window.innerWidth - boxWidth - margin);
    const top = clamp(randomBetween(zone.top, maxTop), margin, window.innerHeight - boxHeight - margin);

    slideImageBox.style.left = `${Math.round(left)}px`;
    slideImageBox.style.top = `${Math.round(top)}px`;
  }

  function getPaddedRect(element, padding) {
    const rect = element.getBoundingClientRect();

    return {
      left: rect.left - padding,
      top: rect.top - padding,
      right: rect.right + padding,
      bottom: rect.bottom + padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2
    };
  }

  function rectsOverlap(first, second) {
    return first.left < second.right &&
      first.right > second.left &&
      first.top < second.bottom &&
      first.bottom > second.top;
  }

  function moveImageAwayFromLogo() {
    if (!slideLogo.classList.contains("is-visible")) {
      return;
    }

    const padding = Math.max(18, window.innerWidth * 0.015);
    const logoRect = getPaddedRect(slideLogo, padding);
    let imageRect = getPaddedRect(slideImageBox, padding);

    if (!rectsOverlap(imageRect, logoRect)) {
      return;
    }

    const margin = Math.max(28, Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.035));
    const currentTop = parseFloat(slideImageBox.style.top || "0");
    const currentLeft = parseFloat(slideImageBox.style.left || "0");
    const leftCandidate = Math.max(margin, logoRect.left - imageRect.width - padding);
    const lowerCandidate = Math.min(window.innerHeight - imageRect.height - margin, logoRect.bottom + padding);

    if (leftCandidate > margin) {
      slideImageBox.style.left = `${Math.round(leftCandidate)}px`;
    } else if (lowerCandidate > currentTop) {
      slideImageBox.style.top = `${Math.round(lowerCandidate)}px`;
    } else {
      slideImageBox.style.left = `${Math.round(Math.max(margin, currentLeft - imageRect.width * 0.2))}px`;
    }

    imageRect = getPaddedRect(slideImageBox, padding);

    if (rectsOverlap(imageRect, logoRect)) {
      const width = Math.max(360, imageRect.width * 0.82);
      const height = Math.max(240, imageRect.height * 0.82);
      slideImageBox.style.setProperty("--slide-box-width", `${Math.round(width)}px`);
      slideImageBox.style.setProperty("--slide-box-height", `${Math.round(height)}px`);
      slideImageBox.style.left = `${Math.round(Math.max(margin, logoRect.left - width - padding))}px`;
    }
  }

  function resolveCaptionCollisions() {
    slideOverlay.classList.remove("caption-over-image", "logo-avoid-left");

    if (!slideOverlay.classList.contains("is-visible")) {
      return;
    }

    const padding = Math.max(18, window.innerWidth * 0.014);
    const logoVisible = slideLogo.classList.contains("is-visible");
    const logoRect = logoVisible ? getPaddedRect(slideLogo, padding) : null;

    if (logoRect && rectsOverlap(getPaddedRect(slideOverlay, padding), logoRect)) {
      slideOverlay.classList.add("logo-avoid-left");
    }

    const overlayRect = getPaddedRect(slideOverlay, padding);
    const imageRect = getPaddedRect(slideImageBox, padding);

    if (rectsOverlap(overlayRect, imageRect)) {
      slideOverlay.classList.add("caption-over-image");
    }
  }

  function resolveLayoutCollisions() {
    window.requestAnimationFrame(() => {
      moveImageAwayFromLogo();
      resolveCaptionCollisions();
    });
  }

  function applyBoardColours(settings) {
    if (!settings) {
      return;
    }

    brandPalette = normalizeColours(settings.brand_colours || [
      settings.brand_primary,
      settings.brand_secondary,
      settings.brand_accent
    ]);
    setRandomBoardColours();
  }

  function getPublicImageUrl(imagePath) {
    const result = supabaseClient.storage
      .from(config.storageBucket)
      .getPublicUrl(imagePath);

    return result.data.publicUrl;
  }

  function showSlide(slide) {
    const imageUrl = getPublicImageUrl(slide.image_path);
    const header = slide.header || "";
    const caption = slide.caption || "";
    const logo = logos.length ? logos[0] : null;

    slideOverlay.classList.remove("is-visible");
    slideImage.classList.remove("is-visible");
    slideLogo.classList.remove("is-visible");
    currentImageZone = null;

    window.setTimeout(() => {
      slideImage.onload = applySafeImageBox;
      slideImage.src = imageUrl;
      slideImage.alt = header || caption || "Advert slide";
      slideHeader.textContent = header;
      slideCaption.textContent = caption;
      setRandomBoardStyle();
      const overlayClass = setOverlayStyle(slide.overlay_style);
      setRandomImageBox(overlayClass);

      slideImage.classList.add("is-visible");
      slideOverlay.classList.toggle("is-visible", Boolean(header || caption));
      showLogo(logo);
      resolveLayoutCollisions();
      emptyState.hidden = true;
    }, 250);
  }

  function showLogo(logo) {
    if (!logo) {
      slideLogo.removeAttribute("src");
      slideLogo.alt = "";
      return;
    }

    slideLogo.src = getPublicImageUrl(logo.image_path);
    slideLogo.alt = logo.name || "Logo";
    slideLogo.classList.add("is-visible");
    slideLogo.onload = resolveLayoutCollisions;
  }

  function scheduleNextSlide(slide) {
    const seconds = Number(slide.duration_seconds || 8);
    window.clearTimeout(timerId);
    timerId = window.setTimeout(showNextSlide, Math.max(seconds, 3) * 1000);
  }

  function showNextSlide() {
    if (!slides.length) {
      emptyState.hidden = false;
      slideImage.classList.remove("is-visible");
      slideOverlay.classList.remove("is-visible");
      slideLogo.classList.remove("is-visible");
      return;
    }

    currentIndex = (currentIndex + 1) % slides.length;

    if (currentIndex === 0) {
      slides = shuffle(slides);
    }

    const slide = slides[currentIndex];
    showSlide(slide);
    scheduleNextSlide(slide);
  }

  async function loadSlides() {
    const { data, error } = await supabaseClient
      .from("ad_board_slides")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      showStatus("Could not load slides. Check Supabase settings.");
      return;
    }

    showStatus("");
    slides = shuffle(data || []);
    currentIndex = -1;
    showNextSlide();
  }

  async function loadLogos() {
    const { data, error } = await supabaseClient
      .from("ad_board_logos")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (error) {
      showStatus("Slides loaded, but logos could not load.");
      logos = [];
      return;
    }

    logos = data || [];
  }

  async function loadBoardSettings() {
    const { data, error } = await supabaseClient
      .from("ad_board_settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (!error) {
      applyBoardColours(data);
    }
  }

  function exitToAdmin() {
    window.location.href = "admin.html";
  }

  function setupHiddenExitControls() {
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        exitToAdmin();
        return;
      }

      if (event.key.length !== 1) {
        return;
      }

      exitSequence = `${exitSequence}${event.key.toLowerCase()}`.slice(-5);

      if (exitSequence === "admin") {
        exitToAdmin();
      }
    });

    window.addEventListener("resize", () => {
      applySafeImageBox();
      resolveLayoutCollisions();
    });
  }

  async function init() {
    if (!config || !config.url || !config.anonKey) {
      showStatus("Missing Supabase config file.");
      return;
    }

    supabaseClient = window.supabase.createClient(config.url, config.anonKey);
    setupHiddenExitControls();
    setRandomBoardStyle();
    await loadBoardSettings();
    await loadLogos();
    await loadSlides();
    window.setInterval(async () => {
      await loadBoardSettings();
      await loadLogos();
      await loadSlides();
    }, 5 * 60 * 1000);
  }

  init();
})();
