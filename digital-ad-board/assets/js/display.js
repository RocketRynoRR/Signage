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
    "board-style-bands"
  ];

  const config = window.AD_BOARD_SUPABASE;
  const slideFrame = document.getElementById("slideFrame");
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

  function getOverlayClass(style) {
    if (style === "random") {
      return pickRandom(overlayClasses);
    }

    return `overlay-${style || "bottom"}`;
  }

  function getLogoClass(overlayClass) {
    const positionsByOverlay = {
      "overlay-bottom": ["logo-top-right", "logo-top-left"],
      "overlay-top-left": ["logo-bottom-right", "logo-top-right"],
      "overlay-center": ["logo-top-right", "logo-bottom-right"],
      "overlay-minimal": ["logo-top-left", "logo-top-right"]
    };

    return pickRandom(positionsByOverlay[overlayClass] || positionsByOverlay["overlay-bottom"]);
  }

  function setOverlayStyle(style) {
    slideOverlay.classList.remove(...overlayClasses);
    const overlayClass = getOverlayClass(style);
    slideOverlay.classList.add(overlayClass);
    return overlayClass;
  }

  function setRandomBoardStyle() {
    slideFrame.classList.remove(...boardStyleClasses);
    slideFrame.classList.add(pickRandom(boardStyleClasses));
  }

  function applyBoardColours(settings) {
    if (!settings) {
      return;
    }

    document.documentElement.style.setProperty("--brand-matte", settings.brand_primary || "#0f766e");
    document.documentElement.style.setProperty("--brand-matte-dark", settings.brand_secondary || "#073b36");
    document.documentElement.style.setProperty("--brand-matte-warm", settings.brand_accent || "#f6b453");
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
    const logo = logos.length ? pickRandom(logos) : null;

    slideOverlay.classList.remove("is-visible");
    slideImage.classList.remove("is-visible");
    slideLogo.classList.remove("is-visible");

    window.setTimeout(() => {
      slideImage.src = imageUrl;
      slideImage.alt = header || caption || "Advert slide";
      slideHeader.textContent = header;
      slideCaption.textContent = caption;
      setRandomBoardStyle();
      const overlayClass = setOverlayStyle(slide.overlay_style);

      slideImage.classList.add("is-visible");
      slideOverlay.classList.toggle("is-visible", Boolean(header || caption));
      showLogo(logo, overlayClass);
      emptyState.hidden = true;
    }, 250);
  }

  function showLogo(logo, overlayClass) {
    slideLogo.classList.remove("logo-top-right", "logo-top-left", "logo-bottom-right");

    if (!logo) {
      slideLogo.removeAttribute("src");
      slideLogo.alt = "";
      return;
    }

    slideLogo.src = getPublicImageUrl(logo.image_path);
    slideLogo.alt = logo.name || "Logo";
    slideLogo.classList.add(getLogoClass(overlayClass), "is-visible");
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
