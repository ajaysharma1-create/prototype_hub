(function () {
  "use strict";

  var PLACEHOLDER_PREVIEW = "assets/previews/placeholder.svg";
  var state = {
    prototypes: [],
    updatedAt: ""
  };

  var elements = {
    form: document.getElementById("filters"),
    search: document.getElementById("prototype-search"),
    project: document.getElementById("project-filter"),
    projectField: document.getElementById("project-filter-field"),
    type: document.getElementById("type-filter"),
    typeField: document.getElementById("type-filter-field"),
    reset: document.getElementById("clear-filters"),
    summary: document.getElementById("directory-summary"),
    resultCount: document.getElementById("result-count"),
    grid: document.getElementById("prototype-grid"),
    empty: document.getElementById("empty-state"),
    emptyTitle: document.getElementById("empty-title"),
    emptyDescription: document.getElementById("empty-description")
  };

  function cleanText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function isValidDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    var date = new Date(value + "T00:00:00Z");
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  function isSafeRelativePath(value, requiredPrefix) {
    var path = cleanText(value);
    var decodedPath;

    if (!path || /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|\\)/i.test(path)) {
      return false;
    }

    try {
      decodedPath = decodeURIComponent(path);
    } catch (error) {
      return false;
    }

    if (/[\\?#]/.test(decodedPath) || !decodedPath.startsWith(requiredPrefix)) {
      return false;
    }

    return !decodedPath.split("/").some(function (segment) {
      return !segment || segment === "." || segment === "..";
    });
  }

  function normalisePrototype(value) {
    var item = value && typeof value === "object" ? value : {};
    var sourcePath = cleanText(item.sourcePath);

    if (sourcePath && !isSafeRelativePath(sourcePath, "prototypes/")) {
      throw new Error("Invalid public source path.");
    }

    var prototype = {
      id: cleanText(item.id),
      name: cleanText(item.name),
      project: cleanText(item.project),
      description: cleanText(item.description),
      type: cleanText(item.type),
      status: cleanText(item.status),
      version: cleanText(item.version),
      updatedAt: cleanText(item.updatedAt),
      preview: cleanText(item.preview),
      previewAlt: cleanText(item.previewAlt),
      prototypePath: cleanText(item.prototypePath),
      sourcePath: sourcePath,
      approvedBy: cleanText(item.approvedBy),
      approvalReference: cleanText(item.approvalReference),
      device: cleanText(item.device)
    };

    var requiredText = [
      prototype.id,
      prototype.name,
      prototype.project,
      prototype.description,
      prototype.type,
      prototype.updatedAt,
      prototype.preview,
      prototype.previewAlt,
      prototype.prototypePath,
      prototype.approvedBy,
      prototype.approvalReference
    ];

    if (requiredText.some(function (field) { return !field; })) {
      throw new Error("Prototype metadata is incomplete.");
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(prototype.id)) {
      throw new Error("Prototype ID is invalid.");
    }

    if (prototype.status !== "approved") {
      throw new Error("Only approved prototypes may be published.");
    }

    if (!isValidDate(prototype.updatedAt)) {
      throw new Error("Prototype date is invalid.");
    }

    if (!isSafeRelativePath(prototype.preview, "assets/previews/")) {
      throw new Error("Preview path is invalid.");
    }

    if (!isSafeRelativePath(prototype.prototypePath, "prototypes/") || !/\.html$/i.test(prototype.prototypePath)) {
      throw new Error("Prototype path is invalid.");
    }

    return prototype;
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC"
    }).format(new Date(value + "T00:00:00Z"));
  }

  function pluralise(count, singular) {
    return count + " " + singular + (count === 1 ? "" : "s");
  }

  function uniqueValues(items, key) {
    return Array.from(new Set(items.map(function (item) {
      return item[key];
    }).filter(Boolean))).sort(function (left, right) {
      return left.localeCompare(right);
    });
  }

  function configureFilter(select, field, values) {
    while (select.options.length > 1) {
      select.remove(1);
    }

    values.forEach(function (value) {
      var option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });

    var useful = values.length > 1;
    field.hidden = !useful;
    select.disabled = !useful;
    if (!useful) {
      select.value = "";
    }
  }

  function addMetadata(list, label, value, className) {
    if (!value) {
      return;
    }

    var item = document.createElement("div");
    item.className = "metadata-item";

    var term = document.createElement("dt");
    term.textContent = label;

    var description = document.createElement("dd");
    description.textContent = value;
    if (className) {
      description.className = className;
    }

    item.appendChild(term);
    item.appendChild(description);
    list.appendChild(item);
  }

  function createCard(prototype, index) {
    var card = document.createElement("article");
    card.className = "prototype-card";
    card.dataset.prototypeId = prototype.id;

    var preview = document.createElement("div");
    preview.className = "preview-frame";

    var image = document.createElement("img");
    image.src = prototype.preview;
    image.alt = prototype.previewAlt;
    image.width = 960;
    image.height = 600;
    image.decoding = "async";
    image.loading = index === 0 ? "eager" : "lazy";
    if (index === 0) {
      image.setAttribute("fetchpriority", "high");
    }
    image.addEventListener("error", function () {
      image.src = PLACEHOLDER_PREVIEW;
      image.alt = "Preview unavailable for " + prototype.name + ".";
    }, { once: true });
    preview.appendChild(image);

    var body = document.createElement("div");
    body.className = "card-body";

    var title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = prototype.name;

    var description = document.createElement("p");
    description.className = "card-description";
    description.textContent = prototype.description;

    var metadata = document.createElement("dl");
    metadata.className = "card-metadata";
    addMetadata(metadata, "Project", prototype.project);
    addMetadata(metadata, "Type", prototype.type);
    addMetadata(metadata, "Status", "Approved for review", "status-value");
    addMetadata(metadata, "Device", prototype.device);
    addMetadata(metadata, "Updated", formatDate(prototype.updatedAt));
    addMetadata(metadata, "Version", prototype.version);

    var link = document.createElement("a");
    link.className = "card-link";
    link.href = prototype.prototypePath;
    link.textContent = "Open Prototype";
    link.setAttribute("aria-label", "Open prototype: " + prototype.name);

    var actions = document.createElement("div");
    actions.className = "card-actions";
    actions.appendChild(link);

    if (prototype.sourcePath) {
      var referenceLink = document.createElement("a");
      referenceLink.className = "reference-link";
      referenceLink.href = prototype.sourcePath;
      referenceLink.textContent = "Related reference";
      referenceLink.setAttribute("aria-label", "Open related reference for " + prototype.name);
      actions.appendChild(referenceLink);
    }

    body.appendChild(title);
    body.appendChild(description);
    body.appendChild(metadata);
    body.appendChild(actions);
    card.appendChild(preview);
    card.appendChild(body);

    return card;
  }

  function hasActiveFilters() {
    return Boolean(
      elements.search.value.trim() ||
      elements.project.value ||
      elements.type.value
    );
  }

  function render(prototypes) {
    var fragment = document.createDocumentFragment();
    prototypes.forEach(function (prototype, index) {
      fragment.appendChild(createCard(prototype, index));
    });

    elements.grid.replaceChildren(fragment);
    elements.grid.hidden = prototypes.length === 0;
    elements.empty.hidden = prototypes.length !== 0;

    var active = hasActiveFilters();
    elements.reset.hidden = !active;
    elements.reset.disabled = !active;

    if (prototypes.length === 0) {
      elements.emptyTitle.textContent = active ? "No matching prototypes" : "No approved prototypes";
      elements.emptyDescription.textContent = active
        ? "Change or reset the current search and filters."
        : "Approved prototypes will appear here.";
    }

    elements.resultCount.textContent = active
      ? pluralise(prototypes.length, "result") + " of " + pluralise(state.prototypes.length, "prototype")
      : pluralise(prototypes.length, "approved prototype");
  }

  function applyFilters() {
    var search = elements.search.value.trim().toLowerCase();
    var project = elements.project.value;
    var type = elements.type.value;

    var filtered = state.prototypes.filter(function (prototype) {
      var searchText = (prototype.name + " " + prototype.description).toLowerCase();
      return (!search || searchText.includes(search)) &&
        (!project || prototype.project === project) &&
        (!type || prototype.type === type);
    });

    render(filtered);
  }

  function showLoadError() {
    elements.summary.textContent = "Directory unavailable";
    elements.resultCount.textContent = "Prototype data could not be loaded.";
    elements.grid.hidden = true;
    elements.empty.hidden = false;
    elements.emptyTitle.textContent = "Could not load prototypes";
    elements.emptyDescription.textContent = "Refresh the page or try again later.";
    elements.form.hidden = true;
  }

  function bindEvents() {
    elements.search.addEventListener("input", applyFilters);
    elements.project.addEventListener("change", applyFilters);
    elements.type.addEventListener("change", applyFilters);
    elements.form.addEventListener("reset", function (event) {
      event.preventDefault();
      elements.search.value = "";
      elements.project.value = "";
      elements.type.value = "";
      applyFilters();
      elements.search.focus();
    });
  }

  async function loadDirectory() {
    try {
      var response = await fetch("./prototypes.json");
      if (!response.ok) {
        throw new Error("Prototype data request failed.");
      }

      var data = await response.json();
      if (!data || !Array.isArray(data.prototypes) || !isValidDate(cleanText(data.updatedAt))) {
        throw new Error("Prototype directory metadata is invalid.");
      }

      var prototypes = data.prototypes.map(normalisePrototype);
      var ids = new Set(prototypes.map(function (prototype) { return prototype.id; }));
      if (ids.size !== prototypes.length) {
        throw new Error("Prototype IDs must be unique.");
      }

      state.prototypes = prototypes;
      state.updatedAt = cleanText(data.updatedAt);

      configureFilter(elements.project, elements.projectField, uniqueValues(prototypes, "project"));
      configureFilter(elements.type, elements.typeField, uniqueValues(prototypes, "type"));
      elements.summary.textContent = pluralise(prototypes.length, "approved prototype") +
        " · Updated " + formatDate(state.updatedAt);
      elements.grid.setAttribute("aria-busy", "false");
      applyFilters();
    } catch (error) {
      elements.grid.setAttribute("aria-busy", "false");
      showLoadError();
    }
  }

  bindEvents();
  loadDirectory();
}());
