(function () {
  const config = window.AD_BOARD_SUPABASE;
  const loginPanel = document.getElementById("loginPanel");
  const adminPanel = document.getElementById("adminPanel");
  const loginForm = document.getElementById("loginForm");
  const slideForm = document.getElementById("slideForm");
  const signOutButton = document.getElementById("signOutButton");
  const refreshButton = document.getElementById("refreshButton");
  const slideList = document.getElementById("slideList");
  const messageArea = document.getElementById("messageArea");

  let supabaseClient;

  function showMessage(message, isError) {
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

  async function setSignedInState() {
    const { data } = await supabaseClient.auth.getSession();
    const signedIn = Boolean(data.session);

    loginPanel.hidden = signedIn;
    adminPanel.hidden = !signedIn;
    signOutButton.hidden = !signedIn;

    if (signedIn) {
      await loadSlides();
    }
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
      meta.textContent = `${slide.active ? "Active" : "Hidden"} | ${slide.duration_seconds || 8}s | ${slide.overlay_style || "bottom"}`;

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
      editForm.append(headerLabel, captionLabel, editRow, activeLabel, meta, actions);
      body.append(editForm);
      card.append(image, body);
      slideList.appendChild(card);
    });
  }

  async function saveSlideEdits(event, slide) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const updates = {
      header: String(formData.get("header") || "").trim(),
      caption: String(formData.get("caption") || "").trim(),
      duration_seconds: Number(formData.get("duration_seconds") || 8),
      overlay_style: String(formData.get("overlay_style") || "bottom"),
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

  async function uploadSlide(event) {
    event.preventDefault();
    showMessage("Uploading slide...", false);

    const file = document.getElementById("imageInput").files[0];
    const header = document.getElementById("headerInput").value.trim();
    const caption = document.getElementById("captionInput").value.trim();
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
    document.getElementById("activeInput").checked = true;
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
    loginForm.addEventListener("submit", signIn);
    slideForm.addEventListener("submit", uploadSlide);
    signOutButton.addEventListener("click", signOut);
    refreshButton.addEventListener("click", loadSlides);
    setSignedInState();
  }

  init();
})();
