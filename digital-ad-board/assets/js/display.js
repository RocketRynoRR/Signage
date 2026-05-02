(function () {
  const overlayClasses = [
    "overlay-bottom",
    "overlay-top-left",
    "overlay-center",
    "overlay-minimal"
  ];

  const config = window.AD_BOARD_SUPABASE;
  const slideImage = document.getElementById("slideImage");
  const slideOverlay = document.getElementById("slideOverlay");
  const slideHeader = document.getElementById("slideHeader");
  const slideCaption = document.getElementById("slideCaption");
  const emptyState = document.getElementById("emptyState");
  const statusBanner = document.getElementById("statusBanner");

  let supabaseClient;
  let slides = [];
  let currentIndex = -1;
  let timerId;

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

  function setOverlayStyle(style) {
    slideOverlay.classList.remove(...overlayClasses);
    slideOverlay.classList.add(getOverlayClass(style));
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

    slideOverlay.classList.remove("is-visible");
    slideImage.classList.remove("is-visible");

    window.setTimeout(() => {
      slideImage.src = imageUrl;
      slideImage.alt = header || caption || "Advert slide";
      slideHeader.textContent = header;
      slideCaption.textContent = caption;
      setOverlayStyle(slide.overlay_style);

      slideImage.classList.add("is-visible");
      slideOverlay.classList.toggle("is-visible", Boolean(header || caption));
      emptyState.hidden = true;
    }, 250);
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

  function init() {
    if (!config || !config.url || !config.anonKey) {
      showStatus("Missing Supabase config file.");
      return;
    }

    supabaseClient = window.supabase.createClient(config.url, config.anonKey);
    loadSlides();
    window.setInterval(loadSlides, 5 * 60 * 1000);
  }

  init();
})();
