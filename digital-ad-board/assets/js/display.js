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
  let currentBoxScale = 0.86;
  let brandPalette = ["#0f766e", "#073b36", "#f6b453"];
  let currentOverlayClass = "overlay-bottom";

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
    slideOverlay.classList.remove(...overlayClasses);
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
    currentBoxScale = pickRandom([0.5, 0.58, 0.66, 0.74, 0.82]);
    applySafeImageBox();
  }

  function applySafeImageBox() {
    const safeMarginX = Math.max(88, Math.round(window.innerWidth * 0.1));
    const safeMarginY = Math.max(130, Math.round(window.innerHeight * 0.22));
    const availableWidth = Math.max(220, window.innerWidth - safeMarginX);
    const availableHeight = Math.max(220, window.innerHeight - safeMarginY);
    let boxWidth = Math.floor(availableWidth * currentBoxScale);
    let boxHeight = Math.floor(availableHeight * currentBoxScale);

    if (slideImage.naturalWidth && slideImage.naturalHeight) {
      const imageRatio = slideImage.naturalWidth / slideImage.naturalHeight;
      const boxRatio = boxWidth / boxHeight;

      if (imageRatio > boxRatio) {
        boxHeight = Math.floor(boxWidth / imageRatio);
      } else {
        boxWidth = Math.floor(boxHeight * imageRatio);
      }
    }

    slideImageBox.style.setProperty("--slide-box-width", `${boxWidth}px`);
    slideImageBox.style.setProperty("--slide-box-height", `${boxHeight}px`);
    placeImageBox(boxWidth, boxHeight, currentOverlayClass);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function placeImageBox(boxWidth, boxHeight, overlayClass) {
    const margin = Math.max(28, Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.035));
    const maxLeft = Math.max(margin, window.innerWidth - boxWidth - margin);
    const maxTop = Math.max(margin, window.innerHeight - boxHeight - margin);
    const centerLeft = (window.innerWidth - boxWidth) / 2;
    const centerTop = (window.innerHeight - boxHeight) / 2;
    const topSafe = margin + Math.max(96, window.innerHeight * 0.08);
    const bottomSafe = Math.max(margin, window.innerHeight - boxHeight - Math.max(170, window.innerHeight * 0.28));
    const rightSafe = Math.max(margin, window.innerWidth - boxWidth - Math.max(120, window.innerWidth * 0.1));

    const positionsByOverlay = {
      "overlay-bottom": [
        { left: margin, top: margin },
        { left: centerLeft, top: margin },
        { left: rightSafe, top: margin },
        { left: centerLeft, top: bottomSafe }
      ],
      "overlay-top-left": [
        { left: rightSafe, top: centerTop },
        { left: rightSafe, top: maxTop },
        { left: centerLeft, top: maxTop },
        { left: Math.max(window.innerWidth * 0.44, margin), top: topSafe }
      ],
      "overlay-center": [
        { left: margin, top: margin },
        { left: rightSafe, top: margin },
        { left: margin, top: maxTop },
        { left: rightSafe, top: maxTop }
      ],
      "overlay-minimal": [
        { left: margin, top: margin },
        { left: centerLeft, top: margin },
        { left: margin, top: centerTop },
        { left: margin, top: maxTop }
      ]
    };
    const position = pickRandom(positionsByOverlay[overlayClass] || positionsByOverlay["overlay-bottom"]);
    const left = clamp(position.left, margin, maxLeft);
    const top = clamp(position.top, margin, maxTop);

    slideImageBox.style.left = `${Math.round(left)}px`;
    slideImageBox.style.top = `${Math.round(top)}px`;
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

    window.addEventListener("resize", applySafeImageBox);
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
