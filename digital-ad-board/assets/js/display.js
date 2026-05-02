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
  const slideGroup = document.getElementById("slideGroup");
  const slideOverlay = document.getElementById("slideOverlay");
  const slideHeader = document.getElementById("slideHeader");
  const slideCaption = document.getElementById("slideCaption");
  const slideLogo = document.getElementById("slideLogo");
  const emptyState = document.getElementById("emptyState");
  const statusBanner = document.getElementById("statusBanner");

  let supabaseClient;
  let slides = [];
  let logos = [];
  let tagSettings = [];
  let currentIndex = -1;
  let timerId;
  let exitSequence = "";
  let brandPalette = ["#0f766e", "#073b36", "#f6b453"];
  let currentOverlayClass = "overlay-bottom";
  let currentImageZone = null;
  let currentSlideSet = [];
  let currentTagSetting = null;

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
    slideOverlay.removeAttribute("style");
    slideHeader.removeAttribute("style");
    slideCaption.removeAttribute("style");
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
    const margin = Math.max(28, Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.035));
    const logoClearanceX = slideLogo.classList.contains("is-visible")
      ? Math.max(260, slideLogo.getBoundingClientRect().width + margin * 2)
      : 0;
    const availableWidth = Math.max(260, window.innerWidth - margin * 2 - logoClearanceX * 0.45);
    const availableHeight = Math.max(220, window.innerHeight - margin * 2);
    let boxWidth = Math.floor(availableWidth * 0.86);
    let boxHeight = Math.floor(availableHeight * 0.86);

    if (slideImage.naturalWidth && slideImage.naturalHeight) {
      const imageRatio = slideImage.naturalWidth / slideImage.naturalHeight;

      if (imageRatio >= 1) {
        boxWidth = Math.min(Math.max(window.innerWidth * 0.8, boxWidth), availableWidth);
        boxHeight = Math.floor(boxWidth / imageRatio);

        if (boxHeight > availableHeight) {
          boxHeight = availableHeight;
          boxWidth = Math.floor(boxHeight * imageRatio);
        }
      } else {
        boxHeight = Math.min(Math.max(window.innerHeight * 0.8, boxHeight), availableHeight);
        boxWidth = Math.floor(boxHeight * imageRatio);

        if (boxWidth > availableWidth) {
          boxWidth = availableWidth;
          boxHeight = Math.floor(boxWidth / imageRatio);
        }
      }
    }

    boxWidth = Math.min(boxWidth, window.innerWidth - margin * 2);
    boxHeight = Math.min(boxHeight, window.innerHeight - margin * 2);
    slideImage.style.objectFit = "contain";
    slideImage.style.objectPosition = "center center";
    slideImageBox.style.setProperty("--slide-box-width", `${boxWidth}px`);
    slideImageBox.style.setProperty("--slide-box-height", `${boxHeight}px`);
    placeImageBox(boxWidth, boxHeight, currentImageZone);
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
      makeZone(width * 0.14, height * 0.12, width * 0.86, height * 0.82, [1]),
      makeZone(width * 0.18, height * 0.16, width * 0.82, height * 0.86, [1]),
      makeZone(width * 0.1, height * 0.18, width * 0.8, height * 0.82, [1]),
      makeZone(width * 0.2, height * 0.12, width * 0.9, height * 0.78, [1])
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
    boxWidth = Math.min(boxWidth, window.innerWidth - margin * 2);
    boxHeight = Math.min(boxHeight, window.innerHeight - margin * 2);
    const centerLeft = (window.innerWidth - boxWidth) / 2;
    const centerTop = (window.innerHeight - boxHeight) / 2;
    const wiggleX = Math.max(18, (window.innerWidth - boxWidth) * 0.16);
    const wiggleY = Math.max(18, (window.innerHeight - boxHeight) * 0.14);
    let left = randomBetween(centerLeft - wiggleX, centerLeft + wiggleX);
    let top = randomBetween(centerTop - wiggleY, centerTop + wiggleY);

    if (zone) {
      left = clamp(left, zone.left, Math.max(zone.left, zone.right - boxWidth));
      top = clamp(top, zone.top, Math.max(zone.top, zone.bottom - boxHeight));
    }

    left = clamp(left, margin, window.innerWidth - boxWidth - margin);
    top = clamp(top, margin, window.innerHeight - boxHeight - margin);

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

  function getOverlapArea(first, second) {
    const width = Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left));
    const height = Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));

    return width * height;
  }

  function getRectArea(rect) {
    return Math.max(1, rect.width * rect.height);
  }

  function moveImageAwayFromLogo() {
    if (!slideLogo.classList.contains("is-visible")) {
      return;
    }

    const padding = Math.max(18, window.innerWidth * 0.015);
    const logoRect = getPaddedRect(slideLogo, padding);
    const activeImageElement = getActiveImageElement();
    let imageRect = getPaddedRect(activeImageElement, padding);

    if (!rectsOverlap(imageRect, logoRect)) {
      return;
    }

    if (activeImageElement === slideGroup) {
      placeGroupAwayFromLogo(logoRect, padding);
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

    fitCaptionTextToBox();
    const padding = Math.max(18, window.innerWidth * 0.014);
    const logoVisible = slideLogo.classList.contains("is-visible");
    const logoRect = logoVisible ? getPaddedRect(slideLogo, padding) : null;
    const placed = placeCaptionWithoutOverlap(logoRect, padding);
    slideOverlay.classList.toggle("is-visible", placed);
  }

  function fitCaptionTextToBox() {
    const margin = Math.max(36, Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.04));
    const maxWidth = Math.max(260, window.innerWidth - margin * 2);
    const maxHeight = Math.max(180, window.innerHeight - margin * 2);

    slideOverlay.style.maxWidth = `${Math.round(Math.min(760, maxWidth))}px`;
    slideOverlay.style.maxHeight = `${Math.round(maxHeight)}px`;
    slideHeader.removeAttribute("style");
    slideCaption.removeAttribute("style");

    let attempts = 0;
    while (
      attempts < 8 &&
      (slideOverlay.scrollWidth > slideOverlay.clientWidth + 1 ||
        slideOverlay.scrollHeight > slideOverlay.clientHeight + 1)
    ) {
      const headerSize = parseFloat(window.getComputedStyle(slideHeader).fontSize);
      const captionSize = parseFloat(window.getComputedStyle(slideCaption).fontSize);
      slideHeader.style.fontSize = `${Math.max(24, headerSize * 0.88)}px`;
      slideCaption.style.fontSize = `${Math.max(16, captionSize * 0.88)}px`;
      attempts += 1;
    }
  }

  function getActiveImageElement() {
    return slideGroup.hidden ? slideImageBox : slideGroup;
  }

  function getActiveImageRects(padding) {
    if (slideGroup.hidden) {
      return [getPaddedRect(slideImageBox, padding)];
    }

    return [...slideGroup.querySelectorAll(".slide-group-card")]
      .map((card) => getPaddedRect(card, padding));
  }

  function rectIsInsideViewport(rect, margin) {
    return rect.left >= margin &&
      rect.top >= margin &&
      rect.right <= window.innerWidth - margin &&
      rect.bottom <= window.innerHeight - margin;
  }

  function placeCaptionWithoutOverlap(logoRect, padding) {
    const margin = Math.max(28, Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.035));
    const previousClasses = overlayClasses.filter((className) =>
      slideOverlay.classList.contains(className)
    );
    slideOverlay.classList.remove(...overlayClasses);
    slideOverlay.style.maxWidth = `${Math.round(Math.min(760, window.innerWidth - margin * 2))}px`;
    slideOverlay.style.maxHeight = `${Math.round(window.innerHeight - margin * 2)}px`;
    slideOverlay.style.right = "auto";
    slideOverlay.style.bottom = "auto";
    slideOverlay.style.transform = "none";
    const overlayRect = slideOverlay.getBoundingClientRect();
    const imageRects = getActiveImageRects(padding);
    const candidates = [
      { left: margin, top: margin },
      { left: window.innerWidth - overlayRect.width - margin, top: margin },
      { left: margin, top: window.innerHeight - overlayRect.height - margin },
      { left: window.innerWidth - overlayRect.width - margin, top: window.innerHeight - overlayRect.height - margin },
      { left: (window.innerWidth - overlayRect.width) / 2, top: margin },
      { left: (window.innerWidth - overlayRect.width) / 2, top: window.innerHeight - overlayRect.height - margin },
      { left: margin, top: (window.innerHeight - overlayRect.height) / 2 },
      { left: window.innerWidth - overlayRect.width - margin, top: (window.innerHeight - overlayRect.height) / 2 }
    ];

    let fallback = null;
    let fallbackOverlapRatio = Number.POSITIVE_INFINITY;

    for (const candidate of candidates) {
      const left = clamp(candidate.left, margin, window.innerWidth - overlayRect.width - margin);
      const top = clamp(candidate.top, margin, window.innerHeight - overlayRect.height - margin);
      const rect = {
        left,
        top,
        right: left + overlayRect.width,
        bottom: top + overlayRect.height,
        width: overlayRect.width,
        height: overlayRect.height
      };
      const touchesLogo = logoRect && rectsOverlap(rect, logoRect);
      const touchesImage = imageRects.some((imageRect) => rectsOverlap(rect, imageRect));
      const overlapRatio = imageRects.reduce((total, imageRect) =>
        total + (getOverlapArea(rect, imageRect) / getRectArea(imageRect)), 0);

      if (!touchesLogo && !touchesImage && rectIsInsideViewport(rect, margin)) {
        slideOverlay.classList.add(...previousClasses);
        slideOverlay.style.left = `${Math.round(left)}px`;
        slideOverlay.style.top = `${Math.round(top)}px`;
        slideOverlay.style.right = "auto";
        slideOverlay.style.bottom = "auto";
        slideOverlay.style.transform = "none";
        return true;
      }

      if (!touchesLogo && rectIsInsideViewport(rect, margin) && overlapRatio < fallbackOverlapRatio) {
        fallback = { left, top };
        fallbackOverlapRatio = overlapRatio;
      }
    }

    if (fallback && fallbackOverlapRatio <= 0.22) {
      slideOverlay.classList.add(...previousClasses, "caption-over-image");
      slideOverlay.style.left = `${Math.round(fallback.left)}px`;
      slideOverlay.style.top = `${Math.round(fallback.top)}px`;
      slideOverlay.style.right = "auto";
      slideOverlay.style.bottom = "auto";
      slideOverlay.style.transform = "none";
      return true;
    }

    slideOverlay.classList.add(...previousClasses, "caption-over-image");
    const maxLeft = Math.max(margin, window.innerWidth - overlayRect.width - margin);
    const maxTop = Math.max(margin, window.innerHeight - overlayRect.height - margin);
    const left = clamp(margin, margin, maxLeft);
    const top = clamp(window.innerHeight - overlayRect.height - margin, margin, maxTop);
    const emergencyRect = {
      left,
      top,
      right: left + overlayRect.width,
      bottom: top + overlayRect.height,
      width: overlayRect.width,
      height: overlayRect.height
    };

    if (logoRect && rectsOverlap(emergencyRect, logoRect)) {
      const topLeft = {
        left: margin,
        top: margin,
        right: margin + overlayRect.width,
        bottom: margin + overlayRect.height,
        width: overlayRect.width,
        height: overlayRect.height
      };

      if (rectsOverlap(topLeft, logoRect) || !rectIsInsideViewport(topLeft, margin)) {
        return false;
      }

      slideOverlay.style.left = `${Math.round(topLeft.left)}px`;
      slideOverlay.style.top = `${Math.round(topLeft.top)}px`;
      slideOverlay.style.right = "auto";
      slideOverlay.style.bottom = "auto";
      slideOverlay.style.transform = "none";
      return true;
    }

    slideOverlay.style.left = `${Math.round(left)}px`;
    slideOverlay.style.top = `${Math.round(top)}px`;
    slideOverlay.style.right = "auto";
    slideOverlay.style.bottom = "auto";
    slideOverlay.style.transform = "none";
    return rectIsInsideViewport(emergencyRect, margin);
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
    const selection = pickRelatedSlides(slide);
    const slideSet = selection.slides;
    const isTagGroup = slideSet.length > 1 && selection.tagSetting;
    currentSlideSet = slideSet;
    currentTagSetting = selection.tagSetting;
    const imageUrl = getPublicImageUrl(slide.image_path);
    const header = isTagGroup ? (selection.tagSetting.header || "") : (slide.header || "");
    const caption = isTagGroup ? (selection.tagSetting.caption || "") : (slide.caption || "");
    const overlayStyle = isTagGroup ? selection.tagSetting.overlay_style : slide.overlay_style;
    const logo = logos.length ? logos[0] : null;

    slideOverlay.classList.remove("is-visible");
    slideImage.classList.remove("is-visible");
    slideLogo.classList.remove("is-visible");
    slideGroup.hidden = true;
    slideGroup.innerHTML = "";
    currentImageZone = null;

    window.setTimeout(() => {
      if (slideSet.length > 1) {
        renderSlideGroup(slideSet);
        slideImageBox.hidden = true;
      } else {
        slideImageBox.hidden = false;
        slideImage.onload = () => {
          applySafeImageBox();
          resolveLayoutCollisions();
        };
        slideImage.src = imageUrl;
        slideImage.alt = header || caption || "Advert slide";
      }

      slideHeader.textContent = header;
      slideCaption.textContent = caption;
      showLogo(logo);
      setRandomBoardStyle();
      const overlayClass = setOverlayStyle(overlayStyle);
      if (slideSet.length > 1) {
        positionSlideGroup(overlayClass);
      } else {
        currentOverlayClass = overlayClass;
        currentImageZone = pickImageZone(currentOverlayClass);
        if (slideImage.complete && slideImage.naturalWidth) {
          applySafeImageBox();
        }
      }

      slideImage.classList.toggle("is-visible", slideSet.length === 1);
      slideOverlay.classList.toggle("is-visible", Boolean(header || caption));
      resolveLayoutCollisions();
      emptyState.hidden = true;
    }, 250);
  }

  function getSlideTags(slide) {
    return Array.isArray(slide.tags) ? slide.tags.filter(Boolean) : [];
  }

  function pickRelatedSlides(slide) {
    const tags = getSlideTags(slide);
    const matchingTags = shuffle(tagSettings.filter((setting) =>
      setting.active && tags.includes(setting.tag)
    ));

    if (!matchingTags.length || Math.random() > 0.65) {
      return { slides: [slide], tagSetting: null };
    }

    const tagSetting = matchingTags[0];
    const related = shuffle(slides.filter((candidate) =>
      candidate.id !== slide.id && getSlideTags(candidate).includes(tagSetting.tag)
    ));
    const availableCount = 1 + related.length;

    if (availableCount < 2) {
      return { slides: [slide], tagSetting: null };
    }

    const minImages = clamp(Number(tagSetting.min_images || 2), 2, 6);
    const maxImages = clamp(Number(tagSetting.max_images || 6), minImages, 6);
    const count = Math.min(availableCount, Math.round(randomBetween(minImages, maxImages)));

    return {
      slides: [slide, ...related.slice(0, count - 1)],
      tagSetting
    };
  }

  function renderSlideGroup(slideSet) {
    slideGroup.innerHTML = "";
    slideGroup.classList.remove(
      "group-count-2",
      "group-count-3",
      "group-count-4",
      "group-count-5",
      "group-count-6"
    );
    slideGroup.classList.add(`group-count-${slideSet.length}`);

    slideSet.forEach((slide) => {
      const card = document.createElement("div");
      card.className = "slide-group-card";

      const image = document.createElement("img");
      image.src = getPublicImageUrl(slide.image_path);
      image.alt = slide.header || slide.caption || "Advert slide";
      image.decoding = "async";
      image.onload = resolveLayoutCollisions;

      card.appendChild(image);
      slideGroup.appendChild(card);
    });

    slideGroup.hidden = false;
  }

  function positionSlideGroup(overlayClass) {
    const margin = Math.max(28, Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.035));
    const count = currentSlideSet.length || 2;
    const logoReserve = slideLogo.classList.contains("is-visible")
      ? slideLogo.getBoundingClientRect().width + margin * 2
      : Math.max(230, window.innerWidth * 0.15);
    const maxWidth = Math.min(window.innerWidth - margin * 2, Math.max(window.innerWidth * 0.62, window.innerWidth - margin * 2 - logoReserve * 0.35));
    const maxHeight = Math.min(window.innerHeight - margin * 2, window.innerHeight * 0.82);
    const targetArea = window.innerWidth * window.innerHeight * 0.8;
    const groupRatio = count <= 2 ? 16 / 7 : count <= 4 ? 16 / 10 : 16 / 9;
    let width = Math.min(maxWidth, Math.sqrt(targetArea * groupRatio));
    let height = Math.min(maxHeight, width / groupRatio);

    width = Math.min(maxWidth, height * groupRatio);
    height = Math.min(maxHeight, width / groupRatio);

    width = Math.min(width, window.innerWidth - margin * 2);
    height = Math.min(height, window.innerHeight - margin * 2);

    slideGroup.style.width = `${Math.round(width)}px`;
    slideGroup.style.height = `${Math.round(height)}px`;
    slideGroup.style.left = "50%";
    slideGroup.style.top = "50%";

    if (overlayClass === "overlay-bottom") {
      slideGroup.style.top = "44%";
    }

    clampSlideGroupInsideViewport();
  }

  function clampSlideGroupInsideViewport() {
    const margin = Math.max(28, Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.035));
    const rect = slideGroup.getBoundingClientRect();
    if (rect.width > window.innerWidth - margin * 2 || rect.height > window.innerHeight - margin * 2) {
      const scale = Math.min(
        (window.innerWidth - margin * 2) / rect.width,
        (window.innerHeight - margin * 2) / rect.height
      );
      slideGroup.style.width = `${Math.floor(rect.width * scale)}px`;
      slideGroup.style.height = `${Math.floor(rect.height * scale)}px`;
    }

    const nextRect = slideGroup.getBoundingClientRect();
    const centerX = clamp(
      nextRect.left + nextRect.width / 2,
      margin + nextRect.width / 2,
      window.innerWidth - margin - nextRect.width / 2
    );
    const centerY = clamp(
      nextRect.top + nextRect.height / 2,
      margin + nextRect.height / 2,
      window.innerHeight - margin - nextRect.height / 2
    );

    slideGroup.style.left = `${Math.round(centerX)}px`;
    slideGroup.style.top = `${Math.round(centerY)}px`;
  }

  function placeGroupAwayFromLogo(logoRect, padding) {
    const margin = Math.max(28, Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.035));
    const maxWidth = Math.max(360, logoRect.left - margin - padding);
    const currentRect = slideGroup.getBoundingClientRect();
    const width = Math.min(currentRect.width, maxWidth);
    const height = Math.min(currentRect.height, window.innerHeight - margin * 2);

    slideGroup.style.width = `${Math.round(width)}px`;
    slideGroup.style.height = `${Math.round(height)}px`;
    slideGroup.style.left = `${Math.round(margin + width / 2)}px`;
    slideGroup.style.top = "50%";
    clampSlideGroupInsideViewport();
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
      slideGroup.hidden = true;
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

  async function loadTagSettings() {
    const { data, error } = await supabaseClient
      .from("ad_board_tags")
      .select("*")
      .eq("active", true)
      .order("tag", { ascending: true });

    if (error) {
      tagSettings = [];
      showStatus("Slides loaded, but tag settings could not load.");
      return;
    }

    tagSettings = data || [];
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
      if (slideGroup.hidden) {
        applySafeImageBox();
      } else {
        positionSlideGroup(currentOverlayClass);
      }
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
    await loadTagSettings();
    await loadLogos();
    await loadSlides();
    window.setInterval(async () => {
      await loadBoardSettings();
      await loadTagSettings();
      await loadLogos();
      await loadSlides();
    }, 5 * 60 * 1000);
  }

  init();
})();
