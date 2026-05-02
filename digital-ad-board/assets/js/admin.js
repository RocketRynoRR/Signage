(function () {
  const config = window.AD_BOARD_SUPABASE;
  const loginPanel = document.getElementById("loginPanel");
  const adminPanel = document.getElementById("adminPanel");
  const loginForm = document.getElementById("loginForm");
  const slideForm = document.getElementById("slideForm");
  const logoForm = document.getElementById("logoForm");
  const tagForm = document.getElementById("tagForm");
  const boardSettingsForm = document.getElementById("boardSettingsForm");
  const brandColourList = document.getElementById("brandColourList");
  const addBrandColourButton = document.getElementById("addBrandColourButton");
  const boardPreview = document.getElementById("boardPreview");
  const signOutButton = document.getElementById("signOutButton");
  const slidesViewButton = document.getElementById("slidesViewButton");
  const tagsViewButton = document.getElementById("tagsViewButton");
  const settingsViewButton = document.getElementById("settingsViewButton");
  const slidesView = document.getElementById("slidesView");
  const tagsView = document.getElementById("tagsView");
  const settingsView = document.getElementById("settingsView");
  const refreshButton = document.getElementById("refreshButton");
  const refreshLogosButton = document.getElementById("refreshLogosButton");
  const refreshTagsButton = document.getElementById("refreshTagsButton");
  const slideList = document.getElementById("slideList");
  const logoList = document.getElementById("logoList");
  const tagList = document.getElementById("tagList");
  const headerLogoPreview = document.getElementById("headerLogoPreview");
  const headerLogoImage = document.getElementById("headerLogoImage");
  const messageArea = document.getElementById("messageArea");

  let supabaseClient;
  let brandColours = ["#0f766e", "#073b36", "#f6b453"];

  function safeOn(element, eventName, handler) {
    if (element) {
      element.addEventListener(eventName, handler);
    }
  }

  function showMessage(message, isError) {
    if (!messageArea) {
      return;
    }

    messageArea.innerHTML = "";

    if (!message) {
      return;
    }

    const element = document.createElement("div");
    element.className = `message${isError ? " error" : ""}`;
    element.textContent = message;
    messageArea.appendChild(element);
  }

  function getPublicImageUrl(imagePath) {
    const result = supabaseClient.storage
      .from(config.storageBucket)
      .getPublicUrl(imagePath);

    return result.data.publicUrl;
  }

  function slugify(value) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60);
  }

  function parseTags(value) {
    return String(value || "")
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
      .filter((tag, index, tags) => tags.indexOf(tag) === index)
      .slice(0, 12);
  }

  function formatTags(tags) {
    return Array.isArray(tags) ? tags.join(", ") : "";
  }

  function normalizeTag(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9 -]+/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 80);
  }

  async function setSignedInState() {
    const { data } = await supabaseClient.auth.getSession();
    const signedIn = Boolean(data.session);

    loginPanel.hidden = signedIn;
    adminPanel.hidden = !signedIn;
    signOutButton.hidden = !signedIn;

    if (signedIn) {
      await Promise.all([
        loadSlides(),
        loadLogos(),
        loadBoardSettings(),
        loadTags()
      ]);
    }
  }

  function normalizeColours(colours) {
    const validColours = (Array.isArray(colours) ? colours : [])
      .map((colour) => String(colour || "").trim())
      .filter((colour) => /^#[0-9a-f]{6}$/i.test(colour));

    return validColours.length ? validColours : ["#0f766e", "#073b36", "#f6b453"];
  }

  function getBoardColourSet(colours) {
    const palette = normalizeColours(colours);

    return {
      primary: palette[0],
      secondary: palette[1] || palette[0],
      accent: palette[2] || palette[0]
    };
  }

  function applyBoardColours(settings) {
    const sourceColours = settings.brand_colours || [
      settings.brand_primary,
      settings.brand_secondary,
      settings.brand_accent
    ];
    brandColours = normalizeColours(sourceColours);
    const { primary, secondary, accent } = getBoardColourSet(brandColours);

    document.documentElement.style.setProperty("--brand-matte", primary);
    document.documentElement.style.setProperty("--brand-matte-dark", secondary);
    document.documentElement.style.setProperty("--brand-matte-warm", accent);
    if (boardPreview) {
      boardPreview.style.borderColor = primary;
      boardPreview.style.background = buildPreviewBackground(brandColours);
    }

    renderBrandColourList();
  }

  function buildPreviewBackground(colours) {
    const palette = normalizeColours(colours);
    const stripeSize = Math.max(8, Math.floor(100 / palette.length));
    const stripeStops = palette
      .map((colour, index) => {
        const start = index * stripeSize;
        const end = index === palette.length - 1 ? 100 : (index + 1) * stripeSize;
        return `${colour} ${start}% ${end}%`;
      })
      .join(", ");
    const bubbles = palette
      .map((colour, index) => {
        const x = 12 + ((index * 23) % 76);
        const y = 18 + ((index * 31) % 64);
        const radius = 5 + (index % 4);
        return `radial-gradient(circle at ${x}% ${y}%, ${colour} 0 ${radius}%, transparent ${radius + 0.6}%)`;
      })
      .join(", ");

    return `
      ${bubbles},
      repeating-linear-gradient(135deg, ${stripeStops}),
      ${palette[1] || palette[0]}
    `;
  }

  function renderBrandColourList() {
    if (!brandColourList) {
      return;
    }

    brandColourList.innerHTML = "";

    brandColours.forEach((colour, index) => {
      const row = document.createElement("div");
      row.className = "brand-colour-row";

      const input = document.createElement("input");
      input.type = "color";
      input.value = colour;
      input.setAttribute("aria-label", `Brand colour ${index + 1}`);
      input.addEventListener("input", () => {
        brandColours[index] = input.value;
        applyBoardColours({ brand_colours: brandColours });
      });

      const value = document.createElement("input");
      value.className = "colour-value colour-text-input";
      value.type = "text";
      value.value = colour;
      value.maxLength = 7;
      value.spellcheck = false;
      value.setAttribute("aria-label", `Brand colour ${index + 1} hex value`);
      value.addEventListener("input", () => {
        const nextColour = value.value.trim();

        if (/^#[0-9a-f]{6}$/i.test(nextColour)) {
          brandColours[index] = nextColour;
          applyBoardColours({ brand_colours: brandColours });
        }
      });
      value.addEventListener("blur", () => {
        value.value = brandColours[index];
      });

      const removeButton = document.createElement("button");
      removeButton.className = "button ghost";
      removeButton.type = "button";
      removeButton.textContent = "Remove";
      removeButton.disabled = brandColours.length <= 1;
      removeButton.addEventListener("click", () => {
        brandColours.splice(index, 1);
        applyBoardColours({ brand_colours: brandColours });
      });

      row.append(input, value, removeButton);
      brandColourList.appendChild(row);
    });
  }

  function addBrandColour() {
    brandColours.push("#ffffff");
    applyBoardColours({ brand_colours: brandColours });
  }

  async function loadBoardSettings() {
    const { data, error } = await supabaseClient
      .from("ad_board_settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (error) {
      showMessage(error.message, true);
      return;
    }

    applyBoardColours(data);
  }

  async function saveBoardSettings(event) {
    event.preventDefault();

    const settings = {
      id: 1,
      brand_primary: brandColours[0] || "#0f766e",
      brand_secondary: brandColours[1] || brandColours[0] || "#073b36",
      brand_accent: brandColours[2] || brandColours[0] || "#f6b453",
      brand_colours: normalizeColours(brandColours)
    };

    const { error } = await supabaseClient
      .from("ad_board_settings")
      .upsert(settings, { onConflict: "id" });

    if (error) {
      showMessage(error.message, true);
      return;
    }

    applyBoardColours(settings);
    showMessage("Board colours saved.", false);
  }

  async function loadSlides() {
    const { data, error } = await supabaseClient
      .from("ad_board_slides")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      showMessage(error.message, true);
      return;
    }

    renderSlides(data || []);
  }

  async function loadTags() {
    if (!tagList) {
      return;
    }

    const { data, error } = await supabaseClient
      .from("ad_board_tags")
      .select("*")
      .order("tag", { ascending: true });

    if (error) {
      showMessage(error.message, true);
      return;
    }

    renderTags(data || []);
  }

  function renderTags(tags) {
    tagList.innerHTML = "";

    if (!tags.length) {
      tagList.textContent = "No tag captions added yet.";
      return;
    }

    tags.forEach((tag) => {
      const card = document.createElement("article");
      card.className = "tag-card";

      const form = document.createElement("form");
      form.className = "slide-edit-form";
      form.addEventListener("submit", (event) => saveTag(event, tag.id));

      const tagLabel = document.createElement("label");
      tagLabel.textContent = "Tag";
      const tagInput = document.createElement("input");
      tagInput.name = "tag";
      tagInput.type = "text";
      tagInput.maxLength = 80;
      tagInput.value = tag.tag || "";
      tagLabel.appendChild(tagInput);

      const headerLabel = document.createElement("label");
      headerLabel.textContent = "Header";
      const headerInput = document.createElement("input");
      headerInput.name = "header";
      headerInput.type = "text";
      headerInput.maxLength = 120;
      headerInput.value = tag.header || "";
      headerLabel.appendChild(headerInput);

      const captionLabel = document.createElement("label");
      captionLabel.textContent = "Caption";
      const captionInput = document.createElement("textarea");
      captionInput.name = "caption";
      captionInput.maxLength = 280;
      captionInput.rows = 3;
      captionInput.value = tag.caption || "";
      captionLabel.appendChild(captionInput);

      const row = document.createElement("div");
      row.className = "form-row";

      const minLabel = document.createElement("label");
      minLabel.textContent = "Min Images";
      const minInput = document.createElement("input");
      minInput.name = "min_images";
      minInput.type = "number";
      minInput.min = 1;
      minInput.max = 3;
      minInput.value = tag.min_images || 1;
      minLabel.appendChild(minInput);

      const maxLabel = document.createElement("label");
      maxLabel.textContent = "Max Images";
      const maxInput = document.createElement("input");
      maxInput.name = "max_images";
      maxInput.type = "number";
      maxInput.min = 1;
      maxInput.max = 3;
      maxInput.value = tag.max_images || 3;
      maxLabel.appendChild(maxInput);
      row.append(minLabel, maxLabel);

      const overlayLabel = document.createElement("label");
      overlayLabel.textContent = "Overlay";
      const overlaySelect = document.createElement("select");
      overlaySelect.name = "overlay_style";
      [
        ["random", "Random Each Time"],
        ["bottom", "Bottom Bar"],
        ["top-left", "Top Left"],
        ["center", "Center"],
        ["minimal", "Minimal"]
      ].forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        option.selected = value === tag.overlay_style;
        overlaySelect.appendChild(option);
      });
      overlayLabel.appendChild(overlaySelect);

      const activeLabel = document.createElement("label");
      activeLabel.className = "checkbox-label";
      const activeInput = document.createElement("input");
      activeInput.name = "active";
      activeInput.type = "checkbox";
      activeInput.checked = Boolean(tag.active);
      activeLabel.append(activeInput, document.createTextNode("Active"));

      const actions = document.createElement("div");
      actions.className = "slide-card-actions";

      const saveButton = document.createElement("button");
      saveButton.className = "button primary";
      saveButton.type = "submit";
      saveButton.textContent = "Save";

      const deleteButton = document.createElement("button");
      deleteButton.className = "button danger";
      deleteButton.type = "button";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", () => deleteTag(tag));

      actions.append(saveButton, deleteButton);
      form.append(tagLabel, headerLabel, captionLabel, row, overlayLabel, activeLabel, actions);
      card.appendChild(form);
      tagList.appendChild(card);
    });
  }

  function renderSlides(slides) {
    slideList.innerHTML = "";

    if (!slides.length) {
      slideList.textContent = "No slides uploaded yet.";
      return;
    }

    slides.forEach((slide) => {
      const card = document.createElement("article");
      card.className = "slide-card";

      const image = document.createElement("img");
      image.className = "slide-thumb";
      image.src = getPublicImageUrl(slide.image_path);
      image.alt = slide.header || slide.caption || "Slide image";

      const body = document.createElement("div");
      body.className = "slide-card-body";

      const editForm = document.createElement("form");
      editForm.className = "slide-edit-form";
      editForm.addEventListener("submit", (event) => saveSlideEdits(event, slide));

      const headerLabel = document.createElement("label");
      headerLabel.textContent = "Header";
      const headerInput = document.createElement("input");
      headerInput.name = "header";
      headerInput.type = "text";
      headerInput.maxLength = 120;
      headerInput.value = slide.header || "";
      headerLabel.appendChild(headerInput);

      const captionLabel = document.createElement("label");
      captionLabel.textContent = "Caption";
      const captionInput = document.createElement("textarea");
      captionInput.name = "caption";
      captionInput.maxLength = 280;
      captionInput.rows = 2;
      captionInput.value = slide.caption || "";
      captionLabel.appendChild(captionInput);

      const tagsLabel = document.createElement("label");
      tagsLabel.textContent = "Tags";
      const tagsInput = document.createElement("input");
      tagsInput.name = "tags";
      tagsInput.type = "text";
      tagsInput.maxLength = 160;
      tagsInput.value = formatTags(slide.tags);
      tagsLabel.appendChild(tagsInput);

      const editRow = document.createElement("div");
      editRow.className = "form-row";

      const durationLabel = document.createElement("label");
      durationLabel.textContent = "Duration";
      const durationInput = document.createElement("input");
      durationInput.name = "duration_seconds";
      durationInput.type = "number";
      durationInput.min = 3;
      durationInput.max = 120;
      durationInput.value = slide.duration_seconds || 8;
      durationLabel.appendChild(durationInput);

      const overlayLabel = document.createElement("label");
      overlayLabel.textContent = "Overlay";
      const overlaySelect = document.createElement("select");
      overlaySelect.name = "overlay_style";
      [
        ["bottom", "Bottom Bar"],
        ["top-left", "Top Left"],
        ["center", "Center"],
        ["minimal", "Minimal"],
        ["random", "Random Each Time"]
      ].forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        option.selected = value === slide.overlay_style;
        overlaySelect.appendChild(option);
      });
      overlayLabel.appendChild(overlaySelect);
      editRow.append(durationLabel, overlayLabel);

      const activeLabel = document.createElement("label");
      activeLabel.className = "checkbox-label";
      const activeInput = document.createElement("input");
      activeInput.name = "active";
      activeInput.type = "checkbox";
      activeInput.checked = Boolean(slide.active);
      activeLabel.append(activeInput, document.createTextNode("Active on display"));

      const meta = document.createElement("div");
      meta.className = "slide-card-meta";
      const tagText = Array.isArray(slide.tags) && slide.tags.length ? ` | ${slide.tags.join(", ")}` : "";
      meta.textContent = `${slide.active ? "Active" : "Hidden"} | ${slide.duration_seconds || 8}s | ${slide.overlay_style || "random"}${tagText}`;

      const actions = document.createElement("div");
      actions.className = "slide-card-actions";

      const saveButton = document.createElement("button");
      saveButton.className = "button primary";
      saveButton.type = "submit";
      saveButton.textContent = "Save";

      const toggleButton = document.createElement("button");
      toggleButton.className = "button ghost";
      toggleButton.type = "button";
      toggleButton.textContent = slide.active ? "Hide" : "Activate";
      toggleButton.addEventListener("click", () => toggleSlide(slide));

      const deleteButton = document.createElement("button");
      deleteButton.className = "button danger";
      deleteButton.type = "button";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", () => deleteSlide(slide));

      actions.append(saveButton, toggleButton, deleteButton);
      editForm.append(headerLabel, captionLabel, tagsLabel, editRow, activeLabel, meta, actions);
      body.append(editForm);
      card.append(image, body);
      slideList.appendChild(card);
    });
  }

  async function loadLogos() {
    const { data, error } = await supabaseClient
      .from("ad_board_logos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      showMessage(error.message, true);
      return;
    }

    renderLogos(data || []);
  }

  function renderLogos(logos) {
    logoList.innerHTML = "";
    renderHeaderLogo(logos);

    if (!logos.length) {
      logoList.textContent = "No logos uploaded yet.";
      return;
    }

    logos.forEach((logo) => {
      const card = document.createElement("article");
      card.className = "logo-card";

      const image = document.createElement("img");
      image.className = "logo-thumb";
      image.src = getPublicImageUrl(logo.image_path);
      image.alt = logo.name || "Logo";

      const body = document.createElement("div");
      body.className = "slide-card-body";

      const name = document.createElement("h3");
      name.className = "logo-name";
      name.textContent = logo.name || "Untitled logo";

      const meta = document.createElement("div");
      meta.className = "slide-card-meta";
      meta.textContent = logo.active ? "Active" : "Hidden";

      const actions = document.createElement("div");
      actions.className = "slide-card-actions";

      const toggleButton = document.createElement("button");
      toggleButton.className = "button ghost";
      toggleButton.type = "button";
      toggleButton.textContent = logo.active ? "Hide" : "Activate";
      toggleButton.addEventListener("click", () => toggleLogo(logo));

      const deleteButton = document.createElement("button");
      deleteButton.className = "button danger";
      deleteButton.type = "button";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", () => deleteLogo(logo));

      actions.append(toggleButton, deleteButton);
      body.append(name, meta, actions);
      card.append(image, body);
      logoList.appendChild(card);
    });
  }

  function renderHeaderLogo(logos) {
    const activeLogo = logos.find((logo) => logo.active);

    if (!activeLogo) {
      headerLogoPreview.hidden = true;
      headerLogoImage.removeAttribute("src");
      return;
    }

    headerLogoImage.src = getPublicImageUrl(activeLogo.image_path);
    headerLogoImage.alt = activeLogo.name || "Active logo preview";
    headerLogoPreview.hidden = false;
  }

  function showAdminView(viewName) {
    const showSettings = viewName === "settings";
    const showTags = viewName === "tags";

    slidesView.hidden = showSettings || showTags;
    settingsView.hidden = !showSettings;
    if (tagsView) {
      tagsView.hidden = !showTags;
    }
    slidesViewButton.classList.toggle("is-selected", !showSettings && !showTags);
    if (tagsViewButton) {
      tagsViewButton.classList.toggle("is-selected", showTags);
    }
    settingsViewButton.classList.toggle("is-selected", showSettings);

    if (showSettings) {
      loadLogos();
      loadBoardSettings();
    }

    if (showTags) {
      loadTags();
    }
  }

  function getTagPayload(formData) {
    let minImages = Number(formData.get("min_images") || 1);
    let maxImages = Number(formData.get("max_images") || 3);
    minImages = Math.min(Math.max(minImages, 1), 3);
    maxImages = Math.min(Math.max(maxImages, 1), 3);

    if (minImages > maxImages) {
      maxImages = minImages;
    }

    return {
      tag: normalizeTag(formData.get("tag")),
      header: String(formData.get("header") || "").trim(),
      caption: String(formData.get("caption") || "").trim(),
      overlay_style: String(formData.get("overlay_style") || "random"),
      min_images: minImages,
      max_images: maxImages,
      active: formData.get("active") === "on"
    };
  }

  async function saveTag(event, tagId) {
    event.preventDefault();
    const payload = getTagPayload(new FormData(event.currentTarget));

    if (!payload.tag) {
      showMessage("Tag name is required.", true);
      return;
    }

    const query = tagId
      ? supabaseClient.from("ad_board_tags").update(payload).eq("id", tagId)
      : supabaseClient.from("ad_board_tags").upsert(payload, { onConflict: "tag" });
    const { error } = await query;

    if (error) {
      showMessage(error.message, true);
      return;
    }

    if (!tagId && tagForm) {
      tagForm.reset();
      document.getElementById("tagMinImagesInput").value = 1;
      document.getElementById("tagMaxImagesInput").value = 3;
      document.getElementById("tagOverlayInput").value = "random";
      document.getElementById("tagActiveInput").checked = true;
    }

    showMessage("Tag saved.", false);
    await loadTags();
  }

  async function deleteTag(tag) {
    const confirmed = window.confirm(`Delete tag "${tag.tag}"?`);

    if (!confirmed) {
      return;
    }

    const { error } = await supabaseClient
      .from("ad_board_tags")
      .delete()
      .eq("id", tag.id);

    if (error) {
      showMessage(error.message, true);
      return;
    }

    showMessage("Tag deleted.", false);
    await loadTags();
  }

  async function saveSlideEdits(event, slide) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const updates = {
      header: String(formData.get("header") || "").trim(),
      caption: String(formData.get("caption") || "").trim(),
      tags: parseTags(formData.get("tags")),
      duration_seconds: Number(formData.get("duration_seconds") || 8),
      overlay_style: String(formData.get("overlay_style") || "random"),
      active: formData.get("active") === "on"
    };

    const { error } = await supabaseClient
      .from("ad_board_slides")
      .update(updates)
      .eq("id", slide.id);

    if (error) {
      showMessage(error.message, true);
      return;
    }

    showMessage("Slide saved.", false);
    await loadSlides();
  }

  async function uploadLogo(event) {
    event.preventDefault();
    showMessage("Uploading logo...", false);

    const file = document.getElementById("logoInput").files[0];
    const name = document.getElementById("logoNameInput").value.trim();
    const active = document.getElementById("logoActiveInput").checked;

    if (!file) {
      showMessage("Choose a logo image first.", true);
      return;
    }

    const extension = file.name.split(".").pop();
    const safeName = slugify(file.name.replace(/\.[^.]+$/, "")) || "logo";
    const imagePath = `logos/${Date.now()}-${safeName}.${extension}`;

    const uploadResult = await supabaseClient.storage
      .from(config.storageBucket)
      .upload(imagePath, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (uploadResult.error) {
      showMessage(uploadResult.error.message, true);
      return;
    }

    const insertResult = await supabaseClient
      .from("ad_board_logos")
      .insert({
        image_path: imagePath,
        name,
        active
      });

    if (insertResult.error) {
      showMessage(insertResult.error.message, true);
      return;
    }

    logoForm.reset();
    document.getElementById("logoActiveInput").checked = true;
    showMessage("Logo uploaded.", false);
    await loadLogos();
  }

  async function uploadSlide(event) {
    event.preventDefault();
    showMessage("Uploading slide...", false);

    const file = document.getElementById("imageInput").files[0];
    const header = document.getElementById("headerInput").value.trim();
    const caption = document.getElementById("captionInput").value.trim();
    const tags = parseTags(document.getElementById("tagsInput").value);
    const duration = Number(document.getElementById("durationInput").value || 8);
    const overlay = document.getElementById("overlayInput").value;
    const active = document.getElementById("activeInput").checked;

    if (!file) {
      showMessage("Choose an image first.", true);
      return;
    }

    const extension = file.name.split(".").pop();
    const safeName = slugify(file.name.replace(/\.[^.]+$/, "")) || "slide";
    const imagePath = `${Date.now()}-${safeName}.${extension}`;

    const uploadResult = await supabaseClient.storage
      .from(config.storageBucket)
      .upload(imagePath, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (uploadResult.error) {
      showMessage(uploadResult.error.message, true);
      return;
    }

    const insertResult = await supabaseClient
      .from("ad_board_slides")
      .insert({
        image_path: imagePath,
        header,
        caption,
        tags,
        duration_seconds: duration,
        overlay_style: overlay,
        active
      });

    if (insertResult.error) {
      showMessage(insertResult.error.message, true);
      return;
    }

    slideForm.reset();
    document.getElementById("durationInput").value = 8;
    document.getElementById("overlayInput").value = "random";
    document.getElementById("activeInput").checked = true;
    document.getElementById("tagsInput").value = "";
    showMessage("Slide uploaded.", false);
    await loadSlides();
  }

  async function toggleSlide(slide) {
    const { error } = await supabaseClient
      .from("ad_board_slides")
      .update({ active: !slide.active })
      .eq("id", slide.id);

    if (error) {
      showMessage(error.message, true);
      return;
    }

    await loadSlides();
  }

  async function deleteSlide(slide) {
    const confirmed = window.confirm("Delete this slide?");

    if (!confirmed) {
      return;
    }

    const deleteRecord = await supabaseClient
      .from("ad_board_slides")
      .delete()
      .eq("id", slide.id);

    if (deleteRecord.error) {
      showMessage(deleteRecord.error.message, true);
      return;
    }

    await supabaseClient.storage
      .from(config.storageBucket)
      .remove([slide.image_path]);

    showMessage("Slide deleted.", false);
    await loadSlides();
  }

  async function toggleLogo(logo) {
    const { error } = await supabaseClient
      .from("ad_board_logos")
      .update({ active: !logo.active })
      .eq("id", logo.id);

    if (error) {
      showMessage(error.message, true);
      return;
    }

    await loadLogos();
  }

  async function deleteLogo(logo) {
    const confirmed = window.confirm("Delete this logo?");

    if (!confirmed) {
      return;
    }

    const deleteRecord = await supabaseClient
      .from("ad_board_logos")
      .delete()
      .eq("id", logo.id);

    if (deleteRecord.error) {
      showMessage(deleteRecord.error.message, true);
      return;
    }

    await supabaseClient.storage
      .from(config.storageBucket)
      .remove([logo.image_path]);

    showMessage("Logo deleted.", false);
    await loadLogos();
  }

  async function signIn(event) {
    event.preventDefault();

    const email = document.getElementById("emailInput").value.trim();
    const password = document.getElementById("passwordInput").value;

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      showMessage(error.message, true);
      return;
    }

    showMessage("", false);
    await setSignedInState();
  }

  async function signOut() {
    await supabaseClient.auth.signOut();
    await setSignedInState();
  }

  function init() {
    if (!config || !config.url || !config.anonKey) {
      showMessage("Missing Supabase config file. Copy supabase-config.example.js to supabase-config.js first.", true);
      return;
    }

    supabaseClient = window.supabase.createClient(config.url, config.anonKey);
    safeOn(loginForm, "submit", signIn);
    safeOn(slideForm, "submit", uploadSlide);
    safeOn(logoForm, "submit", uploadLogo);
    safeOn(boardSettingsForm, "submit", saveBoardSettings);
    safeOn(addBrandColourButton, "click", addBrandColour);
    safeOn(signOutButton, "click", signOut);
    safeOn(slidesViewButton, "click", () => showAdminView("slides"));
    safeOn(settingsViewButton, "click", () => showAdminView("settings"));
    safeOn(refreshButton, "click", loadSlides);
    safeOn(refreshLogosButton, "click", loadLogos);
    setSignedInState();
  }

  init();
})();
