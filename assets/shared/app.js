(function () {
  "use strict";

  var FALLBACK_DATA = {
    updatedAt: "2026-07-13",
    reviewCandidateCount: 10,
    prototypes: []
  };

  var state = {
    approved: [],
    filtered: []
  };

  var elements = {
    form: document.getElementById("filters"),
    search: document.getElementById("prototype-search"),
    project: document.getElementById("project-filter"),
    type: document.getElementById("type-filter"),
    status: document.getElementById("status-filter"),
    grid: document.getElementById("prototype-grid"),
    empty: document.getElementById("empty-state"),
    emptyTitle: document.getElementById("empty-title"),
    emptyDescription: document.getElementById("empty-description"),
    publishedCount: document.getElementById("published-count"),
    reviewCount: document.getElementById("review-count"),
    lastUpdated: document.getElementById("last-updated"),
    resultCount: document.getElementById("result-count")
  };

  function cleanText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function isSafeRelativePath(value) {
    var path = cleanText(value);
    if (!path) {
      return false;
    }

    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|\\)/i.test(path)) {
      return false;
    }

    return !path.split(/[\\/]/).some(function (segment) {
      return segment === "..";
    });
  }

  function normalizePrototype(item) {
    var entry = item && typeof item === "object" ? item : {};
    return {
      id: cleanText(entry.id),
      name: cleanText(entry.name),
      project: cleanText(entry.project),
      description: cleanText(entry.description),
      type: cleanText(entry.type),
      status: cleanText(entry.status).toLowerCase(),
      version: cleanText(entry.version),
      updatedAt: cleanText(entry.updatedAt),
      preview: isSafeRelativePath(entry.preview) ? cleanText(entry.preview) : "assets/previews/placeholder.svg",
      prototypePath: isSafeRelativePath(entry.prototypePath) ? cleanText(entry.prototypePath) : "",
      sourcePath: isSafeRelativePath(entry.sourcePath) ? cleanText(entry.sourcePath) : "",
      approvedBy: cleanText(entry.approvedBy),
      approvalReference: cleanText(entry.approvalReference),
      device: cleanText(entry.device)
    };
  }

  function formatDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
      return value || "Not recorded";
    }

    var date = new Date(value + "T00:00:00");
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date);
  }

  function sortedUnique(items, key) {
    return Array.from(new Set(items.map(function (item) {
      return item[key];
    }).filter(Boolean))).sort(function (a, b) {
      return a.localeCompare(b);
    });
  }

  function populateSelect(select, values) {
    values.forEach(function (value) {
      var option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
  }

  function createPill(text, approved) {
    var pill = document.createElement("span");
    pill.className = approved ? "pill pill-approved" : "pill";
    pill.textContent = text;
    return pill;
  }

  function createCard(prototype) {
    var article = document.createElement("article");
    article.className = "prototype-card";
    article.dataset.prototypeId = prototype.id;

    var preview = document.createElement("div");
    preview.className = "preview-frame";

    var image = document.createElement("img");
    image.src = prototype.preview;
    image.alt = prototype.preview.indexOf("placeholder.svg") >= 0
      ? "Preview unavailable for " + prototype.name
      : "Preview of " + prototype.name;
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", function () {
      image.src = "assets/previews/placeholder.svg";
      image.alt = "Preview unavailable for " + prototype.name;
    }, { once: true });
    preview.appendChild(image);

    if (prototype.device) {
      var device = document.createElement("span");
      device.className = "device-badge";
      device.textContent = prototype.device;
      preview.appendChild(device);
    }

    var body = document.createElement("div");
    body.className = "card-body";

    var meta = document.createElement("div");
    meta.className = "card-meta";
    meta.appendChild(createPill("Approved", true));
    if (prototype.type) {
      meta.appendChild(createPill(prototype.type, false));
    }

    var project = document.createElement("p");
    project.className = "card-project";
    project.textContent = prototype.project || "Product";

    var title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = prototype.name || "Untitled prototype";

    var description = document.createElement("p");
    description.className = "card-description";
    description.textContent = prototype.description || "No description supplied.";

    var details = document.createElement("div");
    details.className = "card-details";
    details.appendChild(document.createTextNode("Updated " + formatDate(prototype.updatedAt)));
    if (prototype.version) {
      details.appendChild(document.createTextNode("Version " + prototype.version));
    }

    var actions = document.createElement("div");
    actions.className = "card-actions";

    if (prototype.prototypePath) {
      var viewLink = document.createElement("a");
      viewLink.className = "card-link";
      viewLink.href = prototype.prototypePath;
      viewLink.textContent = "View Prototype";
      viewLink.setAttribute("aria-label", "View prototype: " + prototype.name);
      actions.appendChild(viewLink);
    }

    if (prototype.sourcePath) {
      var referenceLink = document.createElement("a");
      referenceLink.className = "reference-link";
      referenceLink.href = prototype.sourcePath;
      referenceLink.textContent = "Related reference";
      referenceLink.setAttribute("aria-label", "Open related reference for " + prototype.name);
      actions.appendChild(referenceLink);
    }

    body.appendChild(meta);
    body.appendChild(project);
    body.appendChild(title);
    body.appendChild(description);
    body.appendChild(details);
    body.appendChild(actions);
    article.appendChild(preview);
    article.appendChild(body);
    return article;
  }

  function hasActiveFilters() {
    return Boolean(
      elements.search.value.trim() ||
      elements.project.value ||
      elements.type.value ||
      elements.status.value
    );
  }

  function render() {
    elements.grid.replaceChildren();

    state.filtered.forEach(function (prototype) {
      elements.grid.appendChild(createCard(prototype));
    });

    var count = state.filtered.length;
    elements.resultCount.textContent = count + (count === 1 ? " prototype" : " prototypes");
    elements.empty.hidden = count > 0;

    if (count === 0 && state.approved.length === 0) {
      elements.emptyTitle.textContent = "No approved prototypes yet";
      elements.emptyDescription.textContent = "Approved prototypes will appear here.";
    } else if (count === 0 && hasActiveFilters()) {
      elements.emptyTitle.textContent = "No matches";
      elements.emptyDescription.textContent = "Try another search or clear the filters.";
    }

    elements.grid.setAttribute("aria-busy", "false");
  }

  function applyFilters() {
    var query = elements.search.value.trim().toLowerCase();
    var project = elements.project.value;
    var type = elements.type.value;
    var status = elements.status.value;

    state.filtered = state.approved.filter(function (prototype) {
      var searchable = [prototype.name, prototype.description, prototype.project, prototype.type]
        .join(" ")
        .toLowerCase();

      return (!query || searchable.indexOf(query) >= 0) &&
        (!project || prototype.project === project) &&
        (!type || prototype.type === type) &&
        (!status || prototype.status === status);
    });

    render();
  }

  function initialise(data) {
    var payload = data && typeof data === "object" ? data : FALLBACK_DATA;
    var prototypes = Array.isArray(payload.prototypes) ? payload.prototypes : [];

    state.approved = prototypes
      .map(normalizePrototype)
      .filter(function (prototype) {
        return prototype.status === "approved";
      });
    state.filtered = state.approved.slice();

    elements.publishedCount.textContent = String(state.approved.length);
    elements.reviewCount.textContent = String(Number.isFinite(payload.reviewCandidateCount) ? payload.reviewCandidateCount : 0);
    elements.lastUpdated.textContent = formatDate(cleanText(payload.updatedAt));

    populateSelect(elements.project, sortedUnique(state.approved, "project"));
    populateSelect(elements.type, sortedUnique(state.approved, "type"));

    elements.form.addEventListener("input", applyFilters);
    elements.form.addEventListener("change", applyFilters);
    elements.form.addEventListener("reset", function () {
      window.requestAnimationFrame(applyFilters);
    });

    render();
  }

  function loadData() {
    if (window.location.protocol === "file:") {
      return Promise.resolve(FALLBACK_DATA);
    }

    return window.fetch("prototypes.json", { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Prototype metadata could not be loaded.");
        }
        return response.json();
      })
      .catch(function () {
        return FALLBACK_DATA;
      });
  }

  loadData().then(initialise);
}());
