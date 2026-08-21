const screenRoot = document.querySelector("#screen-root");
const themeToggle = document.querySelector("[data-theme-toggle]");
const themeToggleLabel = document.querySelector("[data-theme-toggle-label]");
const themeStorageKey = "mentor-profile-theme";

const infoIcon = '<span class="info-icon" aria-hidden="true" title="More information">i</span>';
const sectionOrder = ["basic-details", "documents-required", "bank-details"];
const legacyRouteMap = {
  basic: "basic-details",
  documents: "documents-required",
  banking: "bank-details"
};

const htmlEscapes = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

let isSubmitted = false;
let modalState = null;
let validationErrors = {};
let showSupportingDocuments = false;
let showOptionalBankDetails = false;

function systemTheme() {
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function savedTheme() {
  try {
    return localStorage.getItem(themeStorageKey);
  } catch (error) {
    return null;
  }
}

function activeTheme() {
  return document.documentElement.dataset.theme || savedTheme() || systemTheme();
}

function syncThemeToggle() {
  const theme = activeTheme();
  const isLight = theme === "light";

  if (themeToggle) {
    themeToggle.setAttribute("aria-pressed", String(isLight));
    themeToggle.setAttribute("aria-label", `Switch to ${isLight ? "dark" : "light"} mode`);
  }

  if (themeToggleLabel) {
    themeToggleLabel.textContent = isLight ? "Light" : "Dark";
  }
}

function setTheme(theme, persist = true) {
  document.documentElement.dataset.theme = theme;

  if (persist) {
    try {
      localStorage.setItem(themeStorageKey, theme);
    } catch (error) {
      console.log("Theme preference could not be saved.");
    }
  }

  syncThemeToggle();
}

function initializeTheme() {
  setTheme(savedTheme() || activeTheme() || systemTheme(), false);

  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", (event) => {
    if (!savedTheme()) {
      setTheme(event.matches ? "light" : "dark", false);
    }
  });
}

const formState = {
  basic: {
    registeredName: "Test Mentor",
    entityType: "Individual",
    taxResident: "Other than India (USD)",
    addressLine1: "test",
    city: "test",
    pincode: "114411",
    country: "Angola"
  },
  documents: {
    signedLetter: "Agreement",
    taxResidencyCertificate: "Test File.pdf",
    permanentEstablishmentCertificate: "Test File.pdf",
    form41: "Test File.pdf"
  },
  banking: {
    accountHolderName: "Gaurav Test",
    bankName: "State Bank of India",
    accountNumber: "20202020202032",
    cancelledCheque: "Cancelled Cheque",
    bankAddress: "Delhi",
    iban: "",
    swiftCode: ""
  }
};

showOptionalBankDetails = Boolean(formState.banking.iban);

const uploadState = {
  "documents.signedLetter": {
    name: "Agreement",
    type: "Saved document",
    size: "",
    dataUrl: "",
    objectUrl: ""
  },
  "documents.taxResidencyCertificate": {
    name: "Test File.pdf",
    type: "PDF document",
    size: "",
    dataUrl: "",
    objectUrl: ""
  },
  "documents.permanentEstablishmentCertificate": {
    name: "Test File.pdf",
    type: "PDF document",
    size: "",
    dataUrl: "",
    objectUrl: ""
  },
  "documents.form41": {
    name: "Test File.pdf",
    type: "PDF document",
    size: "",
    dataUrl: "",
    objectUrl: ""
  },
  "banking.cancelledCheque": {
    name: "Cancelled Cheque",
    type: "Saved document",
    size: "",
    dataUrl: "",
    objectUrl: ""
  }
};

const uploadConfig = {
  "documents.signedLetter": {
    label: "Signed Letter of Engagement",
    shortLabel: "Engagement letter",
    help: "Upload the signed engagement letter between you and Masters' Union.",
    required: true,
    sampleKind: "engagement"
  },
  "documents.taxResidencyCertificate": {
    label: "Tax Residency Certificate",
    shortLabel: "Tax certificate",
    help: "Use the certificate issued by the relevant tax authority.",
    required: false,
    sampleKind: "tax"
  },
  "documents.permanentEstablishmentCertificate": {
    label: "No Permanent Establishment Certificate",
    shortLabel: "PE declaration",
    help: "Upload a declaration confirming no permanent establishment, if applicable.",
    required: false,
    sampleKind: "pe"
  },
  "documents.form41": {
    label: "Form 41",
    shortLabel: "Form 41",
    help: "Upload a completed Form 41 or equivalent tax form.",
    required: false,
    sampleKind: "form41"
  },
  "banking.cancelledCheque": {
    label: "Cancelled Cheque / Passbook / Bank Portal Screenshot",
    shortLabel: "Bank proof",
    help: "Upload proof that clearly shows account holder name, bank name, and account number.",
    required: true,
    sampleKind: "bank"
  }
};

const requiredFields = [
  { key: "basic.registeredName", label: "Registered Name", section: "basic-details" },
  { key: "basic.entityType", label: "Type Of Entity", section: "basic-details" },
  { key: "basic.taxResident", label: "Tax Resident", section: "basic-details" },
  { key: "basic.addressLine1", label: "Address Line 1", section: "basic-details" },
  { key: "basic.city", label: "City", section: "basic-details" },
  { key: "basic.pincode", label: "Pincode", section: "basic-details" },
  { key: "basic.country", label: "Country", section: "basic-details" },
  { key: "documents.signedLetter", label: "Signed Letter of Engagement", section: "documents-required" },
  { key: "banking.accountHolderName", label: "Account Holder's Name", section: "bank-details" },
  { key: "banking.bankName", label: "Bank Name", section: "bank-details" },
  { key: "banking.accountNumber", label: "Account Number", section: "bank-details" },
  { key: "banking.cancelledCheque", label: "Cancelled Cheque", section: "bank-details" },
  { key: "banking.bankAddress", label: "Bank Address", section: "bank-details" },
  { key: "banking.swiftCode", label: "Swift Code", section: "bank-details" }
];

const sectionMeta = [
  {
    id: "basic-details",
    label: "Basic Details",
    eyebrow: "Entity and address",
    summary: "Confirm your legal name, tax residency, and contact address."
  },
  {
    id: "documents-required",
    label: "Documents",
    eyebrow: "Upload and sample previews",
    summary: "Check the required tax and agreement documents before submitting."
  },
  {
    id: "bank-details",
    label: "Bank Details",
    eyebrow: "Account and payout",
    summary: "Make sure payout details match the uploaded bank proof."
  }
];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => htmlEscapes[character]);
}

function fieldId(key) {
  return key.replace(".", "-");
}

function getValue(key) {
  const [group, name] = key.split(".");
  return formState[group][name];
}

function setValue(key, value) {
  const [group, name] = key.split(".");
  formState[group][name] = value;
}

function requiredMark() {
  return '<span class="required" aria-hidden="true">*</span>';
}

function fieldLabel(text, options = {}) {
  const required = options.required ? requiredMark() : "";
  const info = options.info ? infoIcon : "";
  const forAttribute = options.forId ? ` for="${escapeHtml(options.forId)}"` : "";
  return `<label${forAttribute}>${escapeHtml(text)}${required}${info}</label>`;
}

function helperCopy(copy) {
  return copy ? `<p class="field-helper">${escapeHtml(copy)}</p>` : "";
}

function errorCopy(key) {
  return validationErrors[key] ? `<p class="error-copy" role="alert">${escapeHtml(validationErrors[key])}</p>` : "";
}

function textField({
  key,
  label,
  placeholder = "",
  required = false,
  info = false,
  helper = "",
  inputMode = "",
  autocomplete = "off",
  className = ""
}) {
  const id = fieldId(key);
  const value = getValue(key);
  const errorClass = validationErrors[key] ? " field-input-error" : "";
  const placeholderAttribute = placeholder ? ` placeholder="${escapeHtml(placeholder)}"` : "";
  const inputModeAttribute = inputMode ? ` inputmode="${escapeHtml(inputMode)}"` : "";
  const wrapperClass = className ? ` ${className}` : "";

  return `
    <div class="field${wrapperClass}">
      ${fieldLabel(label, { required, info, forId: id })}
      <input
        class="field-input${errorClass}"
        id="${id}"
        data-field="${key}"
        type="text"
        value="${escapeHtml(value)}"
        ${placeholderAttribute}
        ${inputModeAttribute}
        autocomplete="${escapeHtml(autocomplete)}"
        aria-invalid="${validationErrors[key] ? "true" : "false"}"
        aria-required="${required ? "true" : "false"}"
      />
      ${validationErrors[key] ? errorCopy(key) : helperCopy(helper)}
    </div>
  `;
}

function selectField({ key, label, options, required = false, helper = "" }) {
  const id = fieldId(key);
  const value = getValue(key);
  const errorClass = validationErrors[key] ? " field-input-error" : "";

  return `
    <div class="field">
      ${fieldLabel(label, { required, forId: id })}
      <div class="select-wrap">
        <select
          class="field-select${errorClass}"
          id="${id}"
          data-field="${key}"
          aria-invalid="${validationErrors[key] ? "true" : "false"}"
          aria-required="${required ? "true" : "false"}"
        >
          ${options
            .map((option) => `<option${option === value ? " selected" : ""}>${escapeHtml(option)}</option>`)
            .join("")}
        </select>
      </div>
      ${validationErrors[key] ? errorCopy(key) : helperCopy(helper)}
    </div>
  `;
}

function documentIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3.8h6l4 4V20a1.2 1.2 0 0 1-1.2 1.2H7A1.2 1.2 0 0 1 5.8 20V5A1.2 1.2 0 0 1 7 3.8Z"></path>
      <path d="M13 3.8v4h4"></path>
      <path d="M8.8 12h6.4M8.8 15.2h6.4M8.8 18.4h3.8"></path>
    </svg>
  `;
}

function formatFileSize(size) {
  if (!size) {
    return "Saved file";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function fileMetaLine(file) {
  const type = file.type || "Document";
  const size = formatFileSize(file.size);
  return `${type} - ${size}`;
}

function uploadField({ key }) {
  const config = uploadConfig[key];
  const file = uploadState[key];
  const id = fieldId(key);
  const hasError = Boolean(validationErrors[key]);
  const statusText = file.name ? "Attached" : "Required";

  return `
    <div class="upload-card${hasError ? " upload-card-error" : ""}" data-upload-key="${key}">
      <div class="upload-card-head">
        <div>
          ${fieldLabel(config.label, { required: config.required })}
          <p class="upload-help">${escapeHtml(config.help)}</p>
        </div>
        <span class="upload-status">${escapeHtml(statusText)}</span>
      </div>

      <div class="upload-file-row">
        <span class="upload-file-icon">${documentIcon()}</span>
        <div class="upload-file-copy">
          <strong data-file-name-for="${id}">${escapeHtml(file.name || "No file uploaded")}</strong>
          <span data-file-meta-for="${id}">${escapeHtml(fileMetaLine(file))}</span>
        </div>
      </div>

      <div class="upload-actions">
        <button class="btn btn-ghost btn-compact" type="button" data-preview="${key}">Preview</button>
        <button class="btn btn-ghost btn-compact" type="button" data-sample="${key}">View sample</button>
        <button class="btn btn-muted btn-compact" type="button" data-file-trigger="${id}">Replace file</button>
      </div>

      <p class="upload-note">PDF, PNG, or JPG. Keep file size under 10 MB.</p>
      <input class="file-input" id="${id}" data-file-field="${key}" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" />
      ${errorCopy(key)}
    </div>
  `;
}

function currentHash() {
  return window.location.hash.replace("#", "");
}

function activeSectionId() {
  const hash = currentHash();
  if (sectionOrder.includes(hash)) {
    return hash;
  }

  return "basic-details";
}

function sectionErrorCount(sectionId) {
  return requiredFields.filter((field) => field.section === sectionId && validationErrors[field.key]).length;
}

function sectionHasError(sectionId) {
  return sectionErrorCount(sectionId) > 0;
}

function sectionStatus(sectionId) {
  const errors = sectionErrorCount(sectionId);
  if (errors) {
    return errors === 1 ? "1 to fix" : `${errors} to fix`;
  }

  return activeSectionId() === sectionId ? "Current" : "Ready";
}

function renderSectionNav() {
  const activeId = activeSectionId();

  return `
    <nav class="section-nav" aria-label="Banking details sections">
      ${sectionMeta
        .map((section) => {
          const activeClass = section.id === activeId ? " active" : "";
          const errorClass = sectionHasError(section.id) ? " has-error" : "";

          return `
            <button class="section-nav-item${activeClass}${errorClass}" type="button" data-scroll-to="${section.id}">
              <span>${escapeHtml(section.label)}</span>
              <small>${escapeHtml(sectionStatus(section.id))}</small>
            </button>
          `;
        })
        .join("")}
    </nav>
  `;
}

function renderSectionHeader(sectionId) {
  const section = sectionMeta.find((item) => item.id === sectionId);

  return `
    <div class="section-heading-row">
      <div>
        <span class="section-eyebrow">${escapeHtml(section.eyebrow)}</span>
        <h3>${escapeHtml(section.label)}</h3>
      </div>
      <p>${escapeHtml(section.summary)}</p>
    </div>
  `;
}

function completionText(sectionId) {
  const fields = requiredFields.filter((field) => field.section === sectionId);
  const completed = fields.filter((field) => String(getValue(field.key) ?? "").trim()).length;
  return `${completed} of ${fields.length} required complete`;
}

function summaryRows(rows) {
  return rows
    .map(
      (row) => `
        <div class="summary-row">
          <span>${escapeHtml(row.label)}</span>
          <strong>${escapeHtml(row.value || "Not provided")}</strong>
        </div>
      `
    )
    .join("");
}

function renderSectionSummary(sectionId) {
  const needsSupportingTaxDocs = formState.basic.taxResident !== "India (INR)";
  const supportingFiles = [
    uploadState["documents.taxResidencyCertificate"].name,
    uploadState["documents.permanentEstablishmentCertificate"].name,
    uploadState["documents.form41"].name
  ].filter(Boolean).length;

  const summaries = {
    "basic-details": [
      { label: "Registered name", value: formState.basic.registeredName },
      { label: "Tax resident", value: formState.basic.taxResident },
      { label: "Country", value: formState.basic.country }
    ],
    "documents-required": [
      { label: "Required document", value: uploadState["documents.signedLetter"].name },
      {
        label: "Supporting documents",
        value: needsSupportingTaxDocs ? `${supportingFiles} attached` : "Not needed for India"
      }
    ],
    "bank-details": [
      { label: "Account holder", value: formState.banking.accountHolderName },
      { label: "Bank", value: formState.banking.bankName },
      { label: "Swift code", value: formState.banking.swiftCode || "Still needed" }
    ]
  };

  return `
    <div class="section-summary">
      <div class="section-summary-copy">
        ${summaryRows(summaries[sectionId])}
      </div>
      <div class="section-summary-actions">
        <span>${escapeHtml(completionText(sectionId))}</span>
        <button class="btn btn-ghost btn-compact" type="button" data-activate-section="${sectionId}">Edit</button>
      </div>
    </div>
  `;
}

function renderReviewSection(sectionId, content) {
  const isActive = activeSectionId() === sectionId;

  return `
    <section class="review-section${isActive ? " is-active" : " is-collapsed"}" id="${sectionId}">
      ${renderSectionHeader(sectionId)}
      ${isActive ? content : renderSectionSummary(sectionId)}
    </section>
  `;
}

function renderBasicDetailsSection() {
  const content = `
    <div class="form-grid">
      ${textField({
        key: "basic.registeredName",
        label: "Registered Name",
        required: true,
        autocomplete: "organization"
      })}
      ${selectField({
        key: "basic.entityType",
        label: "Type Of Entity",
        options: ["Individual", "Company", "Partnership", "Trust"],
        required: true
      })}
      ${selectField({
        key: "basic.taxResident",
        label: "Tax Resident",
        options: ["Other than India (USD)", "India (INR)"],
        required: true
      })}
    </div>

    <h4 class="address-title">ADDRESS DETAILS (Entity / Personal)</h4>

    <div class="form-grid">
      ${textField({
        key: "basic.addressLine1",
        label: "Address Line 1",
        required: true,
        autocomplete: "address-line1"
      })}
      ${textField({ key: "basic.city", label: "City", required: true, autocomplete: "address-level2" })}
      ${textField({ key: "basic.pincode", label: "Pincode", required: true, inputMode: "numeric", autocomplete: "postal-code" })}
      ${selectField({
        key: "basic.country",
        label: "Country",
        options: ["Angola", "India", "Singapore", "United Kingdom", "United States"],
        required: true
      })}
    </div>
  `;

  return `
    ${renderReviewSection("basic-details", content)}
  `;
}

function renderDocumentsSection() {
  const needsSupportingTaxDocs = formState.basic.taxResident !== "India (INR)";
  const supportingDocumentContent = showSupportingDocuments
    ? `
      <div class="upload-grid supporting-upload-grid">
        ${uploadField({ key: "documents.taxResidencyCertificate" })}
        ${uploadField({ key: "documents.permanentEstablishmentCertificate" })}
        ${uploadField({ key: "documents.form41" })}
      </div>
    `
    : "";

  const content = `
    <div class="upload-grid required-upload-grid">
      ${uploadField({ key: "documents.signedLetter" })}
    </div>

    ${
      needsSupportingTaxDocs
        ? `
          <div class="conditional-section">
            <button class="conditional-trigger" type="button" data-toggle-disclosure="supporting-documents" aria-expanded="${showSupportingDocuments ? "true" : "false"}">
              <span>
                <strong>Supporting tax documents</strong>
                <small>Tax Residency Certificate, No Permanent Establishment Certificate, and Form 41.</small>
              </span>
              <b>${showSupportingDocuments ? "Hide" : "Show"}</b>
            </button>
            ${supportingDocumentContent}
          </div>
        `
        : `
          <div class="conditional-note">
            Supporting tax documents are hidden because Tax Resident is set to India (INR).
          </div>
        `
    }
  `;

  return `
    ${renderReviewSection("documents-required", content)}
  `;
}

function renderBankDetailsSection() {
  const optionalBankContent = showOptionalBankDetails
    ? `
      <div class="form-grid optional-bank-grid">
        ${textField({
          key: "banking.iban",
          label: "IBAN Number",
          placeholder: "Example: GB29NWBK60161331926819",
          helper: "Optional for some countries. Add it if your bank provides one.",
          info: true
        })}
      </div>
    `
    : "";

  const content = `
    <div class="form-grid bank-grid">
      ${textField({ key: "banking.accountHolderName", label: "Account Holder's Name", required: true, autocomplete: "name" })}
      ${textField({ key: "banking.bankName", label: "Bank Name", required: true })}
      ${textField({ key: "banking.accountNumber", label: "Account Number", required: true, inputMode: "numeric" })}
      ${textField({
        key: "banking.swiftCode",
        label: "Swift Code",
        placeholder: "Example: HDFCINBBXXX",
        required: true,
        helper: "Use the 8 or 11 character SWIFT/BIC code for your bank.",
        info: true
      })}
      ${textField({
        key: "banking.bankAddress",
        label: "Bank Address",
        required: true,
        helper: "Use the official bank branch or registered bank address.",
        autocomplete: "street-address",
        className: "field-wide"
      })}
      <div class="field-wide">
        ${uploadField({ key: "banking.cancelledCheque" })}
      </div>
    </div>

    <div class="conditional-section">
      <button class="conditional-trigger" type="button" data-toggle-disclosure="optional-bank-details" aria-expanded="${showOptionalBankDetails ? "true" : "false"}">
        <span>
          <strong>Optional bank detail</strong>
          <small>Add IBAN only if your bank provides one.</small>
        </span>
        <b>${showOptionalBankDetails ? "Hide" : "Add IBAN"}</b>
      </button>
      ${optionalBankContent}
    </div>
  `;

  return `
    ${renderReviewSection("bank-details", content)}
  `;
}

function sampleRows(rows) {
  return rows
    .map(
      (row) => `
        <div class="sample-row">
          <span>${escapeHtml(row.label)}</span>
          <strong>${escapeHtml(row.value)}</strong>
        </div>
      `
    )
    .join("");
}

function renderSampleDocument(key) {
  const kind = uploadConfig[key].sampleKind;

  if (kind === "engagement") {
    return `
      <article class="sample-document letter-sample">
        <header>
          <span>Sample format</span>
          <h4>Letter of Engagement</h4>
        </header>
        <p>This sample shows the structure only. Use your actual signed agreement.</p>
        ${sampleRows([
          { label: "Parties", value: "Consultant and organization names" },
          { label: "Scope", value: "Services or engagement summary" },
          { label: "Effective date", value: "Month DD, YYYY" },
          { label: "Signature", value: "Both parties sign the final page" }
        ])}
      </article>
    `;
  }

  if (kind === "tax") {
    return `
      <article class="sample-document certificate-sample">
        <header>
          <span>Sample format</span>
          <h4>Tax Residency Certificate</h4>
        </header>
        <p>Use a certificate issued by your tax authority. This is not an official template.</p>
        ${sampleRows([
          { label: "Taxpayer name", value: "Name as per tax records" },
          { label: "Residence country", value: "Country of tax residence" },
          { label: "Tax year", value: "Relevant financial year" },
          { label: "Issuer", value: "Tax authority or competent office" }
        ])}
      </article>
    `;
  }

  if (kind === "pe") {
    return `
      <article class="sample-document declaration-sample">
        <header>
          <span>Sample format</span>
          <h4>No Permanent Establishment Declaration</h4>
        </header>
        <p>A short declaration should clearly confirm that no permanent establishment exists in India.</p>
        ${sampleRows([
          { label: "Declarant", value: "Legal name of individual or entity" },
          { label: "Statement", value: "No fixed place of business in India" },
          { label: "Period", value: "Applicable service period" },
          { label: "Signature", value: "Authorized signatory" }
        ])}
      </article>
    `;
  }

  if (kind === "form41") {
    return `
      <article class="sample-document form-sample">
        <header>
          <span>Sample format</span>
          <h4>Form 41</h4>
        </header>
        <p>Check that the uploaded form is complete, readable, and signed where applicable.</p>
        ${sampleRows([
          { label: "Name", value: "As per official records" },
          { label: "Tax identification", value: "Masked or official tax ID field" },
          { label: "Country", value: "Relevant jurisdiction" },
          { label: "Declaration", value: "Completed and signed" }
        ])}
      </article>
    `;
  }

  return `
    <article class="sample-document bank-sample">
      <header>
        <span>Sample guidance</span>
        <h4>Bank Proof</h4>
      </header>
      <p>Upload a cancelled cheque, passbook page, or portal screenshot with these details visible.</p>
      ${sampleRows([
        { label: "Account holder", value: "Name matching your profile" },
        { label: "Bank name", value: "Bank or branch name" },
        { label: "Account number", value: "Visible but safe to share in your workflow" },
        { label: "Routing details", value: "IFSC, SWIFT, or country-specific code" }
      ])}
    </article>
  `;
}

function renderUploadedPreview(key) {
  const file = uploadState[key];
  const name = file.name || "No file uploaded";
  const isImage = file.type?.startsWith("image/") && file.dataUrl;
  const isPdf = file.type === "application/pdf" && file.objectUrl;

  if (isImage) {
    return `
      <div class="uploaded-preview">
        <img src="${file.dataUrl}" alt="Preview of ${escapeHtml(name)}" />
      </div>
    `;
  }

  if (isPdf) {
    return `
      <div class="uploaded-preview pdf-preview">
        <iframe src="${file.objectUrl}" title="Preview of ${escapeHtml(name)}"></iframe>
      </div>
    `;
  }

  return `
    <div class="file-preview-card">
      <span class="upload-file-icon large">${documentIcon()}</span>
      <strong>${escapeHtml(name)}</strong>
      <p>${escapeHtml(fileMetaLine(file))}</p>
      <small>Live preview is available after selecting an image or PDF from this device.</small>
    </div>
  `;
}

function renderPreviewModal() {
  if (!modalState) {
    return "";
  }

  const config = uploadConfig[modalState.key];
  const file = uploadState[modalState.key];
  const isSample = modalState.mode === "sample";
  const title = isSample ? `Sample: ${config.shortLabel}` : `Preview: ${file.name || config.shortLabel}`;
  const subtitle = isSample ? "Generic example for guidance" : fileMetaLine(file);

  return `
    <div class="modal-backdrop" role="presentation" data-preview-backdrop>
      <section class="preview-modal" role="dialog" aria-modal="true" aria-labelledby="preview-title">
        <div class="preview-modal-header">
          <div>
            <h3 id="preview-title">${escapeHtml(title)}</h3>
            <p>${escapeHtml(subtitle)}</p>
          </div>
          <button class="modal-close" type="button" aria-label="Close preview" data-close-preview>Close</button>
        </div>
        <div class="preview-body">
          ${isSample ? renderSampleDocument(modalState.key) : renderUploadedPreview(modalState.key)}
        </div>
      </section>
    </div>
  `;
}

function nextSectionId(sectionId) {
  const index = sectionOrder.indexOf(sectionId);
  return sectionOrder[index + 1] || "";
}

function previousSectionId(sectionId) {
  const index = sectionOrder.indexOf(sectionId);
  return sectionOrder[index - 1] || "";
}

function renderActionBar() {
  const active = activeSectionId();
  const next = nextSectionId(active);
  const previous = previousSectionId(active);
  const activeIndex = sectionOrder.indexOf(active) + 1;
  const primaryLabel = next
    ? `Continue to ${sectionMeta.find((section) => section.id === next).label}`
    : "Submit Details";

  return `
    <div class="actions review-actions">
      <span class="action-hint">Step ${activeIndex} of ${sectionOrder.length}. Required fields are marked with ${requiredMark()}</span>
      <div class="action-buttons">
        ${previous ? `<button class="btn btn-ghost" type="button" data-previous-section="${previous}">Back</button>` : ""}
        <button class="btn btn-primary btn-submit" type="button" ${next ? `data-next-section="${next}"` : "data-submit-details"}>
          ${escapeHtml(primaryLabel)}
        </button>
      </div>
    </div>
  `;
}

function renderReviewScreen() {
  return `
    <form class="review-form" novalidate>
      <div class="review-panel-head">
        <div>
          <span class="panel-eyebrow">Revision workspace</span>
          <h2>Banking Details Review</h2>
          <p class="revision-copy">Complete the highlighted details, preview documents if needed, then submit once.</p>
        </div>
        <span class="revision-pill">Revision required</span>
      </div>

      ${renderSectionNav()}

      <div class="review-sections">
        ${renderBasicDetailsSection()}
        ${renderDocumentsSection()}
        ${renderBankDetailsSection()}
      </div>

      ${renderActionBar()}
    </form>
    ${renderPreviewModal()}
  `;
}

function renderSuccessScreen() {
  return `
    <section class="success-state">
      <div class="success-mark" aria-hidden="true">&#10003;</div>
      <h2>Banking details submitted</h2>
      <p>Your banking details have been submitted for review. You can return to the profile overview while the review is in progress.</p>
      <button class="btn btn-primary btn-submit" type="button" data-scroll-page-top>Back to Profile Overview</button>
    </section>
  `;
}

function normalizeHash() {
  const hash = currentHash();

  if (!hash) {
    window.history.replaceState(null, "", "#review");
    return;
  }

  if (legacyRouteMap[hash]) {
    window.history.replaceState(null, "", `#${legacyRouteMap[hash]}`);
    return;
  }

  if (hash === "submitted" && isSubmitted) {
    return;
  }

  if (hash !== "review" && !sectionOrder.includes(hash)) {
    window.history.replaceState(null, "", "#review");
  }
}

function render() {
  normalizeHash();
  screenRoot.innerHTML = isSubmitted ? renderSuccessScreen() : renderReviewScreen();

  const hash = currentHash();
  if (modalState) {
    window.requestAnimationFrame(() => document.querySelector("[data-close-preview]")?.focus());
  }

  if (!isSubmitted && sectionOrder.includes(hash)) {
    window.requestAnimationFrame(() => scrollToSection(hash, false));
  }
}

function setActiveSection(sectionId) {
  document.querySelectorAll(".section-nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.scrollTo === sectionId);
  });
}

function scrollToSection(sectionId, updateHash = true) {
  const section = document.getElementById(sectionId);
  if (!section) {
    return;
  }

  if (updateHash) {
    window.history.replaceState(null, "", `#${sectionId}`);
  }

  setActiveSection(sectionId);
  section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showSection(sectionId, updateHash = true) {
  if (!sectionOrder.includes(sectionId)) {
    return;
  }

  if (updateHash) {
    window.history.replaceState(null, "", `#${sectionId}`);
  }

  render();
}

function validateSection(sectionId) {
  const errors = { ...validationErrors };
  const fields = requiredFields.filter((field) => field.section === sectionId);

  fields.forEach((field) => {
    delete errors[field.key];
    const value = getValue(field.key);
    if (!String(value ?? "").trim()) {
      errors[field.key] = `${field.label} is required.`;
    }
  });

  validationErrors = errors;
  return fields.every((field) => !validationErrors[field.key]);
}

function validateForm() {
  const errors = {};

  requiredFields.forEach((field) => {
    const value = getValue(field.key);
    if (!String(value ?? "").trim()) {
      errors[field.key] = `${field.label} is required.`;
    }
  });

  validationErrors = errors;
  return !Object.keys(errors).length;
}

function updateSectionNavErrors() {
  document.querySelectorAll(".section-nav-item").forEach((button) => {
    const hasError = sectionHasError(button.dataset.scrollTo);
    button.classList.toggle("has-error", hasError);
    const status = button.querySelector("small");
    if (status) {
      status.textContent = sectionStatus(button.dataset.scrollTo);
    }
  });
}

function clearFieldError(key, containerSelector) {
  if (!validationErrors[key] || !String(getValue(key) ?? "").trim()) {
    return;
  }

  delete validationErrors[key];
  const fieldContainer = document.querySelector(`[data-field="${key}"]`)?.closest(containerSelector);
  const fileContainer = document.querySelector(`[data-file-field="${key}"]`)?.closest(containerSelector);
  const container = fieldContainer || fileContainer;

  container?.querySelector(".field-input-error")?.classList.remove("field-input-error");
  container?.querySelector(".upload-card-error")?.classList.remove("upload-card-error");
  container?.querySelector(".error-copy")?.remove();
  updateSectionNavErrors();
}

function updateFileState(key, file) {
  if (uploadState[key].objectUrl) {
    URL.revokeObjectURL(uploadState[key].objectUrl);
  }

  uploadState[key] = {
    name: file.name,
    type: file.type || "Document",
    size: file.size,
    dataUrl: "",
    objectUrl: file.type === "application/pdf" ? URL.createObjectURL(file) : ""
  };

  setValue(key, file.name);

  if (file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      uploadState[key].dataUrl = reader.result;
      if (modalState?.key === key) {
        render();
      }
    });
    reader.readAsDataURL(file);
  }
}

document.addEventListener("input", (event) => {
  const field = event.target.closest("[data-field]");
  if (!field) {
    return;
  }

  setValue(field.dataset.field, field.value);
  clearFieldError(field.dataset.field, ".field");
});

document.addEventListener("change", (event) => {
  const selectField = event.target.closest(".field-select[data-field]");
  if (selectField) {
    setValue(selectField.dataset.field, selectField.value);
    if (selectField.dataset.field === "basic.taxResident" && selectField.value === "India (INR)") {
      showSupportingDocuments = false;
    }
    clearFieldError(selectField.dataset.field, ".field");
    return;
  }

  const fileInput = event.target.closest(".file-input[data-file-field]");
  if (!fileInput) {
    return;
  }

  const selectedFile = fileInput.files?.[0];
  if (!selectedFile) {
    return;
  }

  updateFileState(fileInput.dataset.fileField, selectedFile);
  clearFieldError(fileInput.dataset.fileField, ".upload-card");
  render();
});

document.addEventListener("dragover", (event) => {
  const uploadCard = event.target.closest("[data-upload-key]");
  if (!uploadCard) {
    return;
  }

  event.preventDefault();
  uploadCard.classList.add("is-dragging");
});

document.addEventListener("dragleave", (event) => {
  const uploadCard = event.target.closest("[data-upload-key]");
  if (!uploadCard || uploadCard.contains(event.relatedTarget)) {
    return;
  }

  uploadCard.classList.remove("is-dragging");
});

document.addEventListener("drop", (event) => {
  const uploadCard = event.target.closest("[data-upload-key]");
  if (!uploadCard) {
    return;
  }

  event.preventDefault();
  uploadCard.classList.remove("is-dragging");

  const droppedFile = event.dataTransfer?.files?.[0];
  if (!droppedFile) {
    return;
  }

  updateFileState(uploadCard.dataset.uploadKey, droppedFile);
  clearFieldError(uploadCard.dataset.uploadKey, ".upload-card");
  render();
});

document.addEventListener("click", (event) => {
  const themeButton = event.target.closest("[data-theme-toggle]");
  if (themeButton) {
    setTheme(activeTheme() === "light" ? "dark" : "light");
    return;
  }

  const sectionButton = event.target.closest("[data-scroll-to]");
  if (sectionButton) {
    showSection(sectionButton.dataset.scrollTo);
    return;
  }

  const activateSectionButton = event.target.closest("[data-activate-section]");
  if (activateSectionButton) {
    showSection(activateSectionButton.dataset.activateSection);
    return;
  }

  const previousSectionButton = event.target.closest("[data-previous-section]");
  if (previousSectionButton) {
    showSection(previousSectionButton.dataset.previousSection);
    return;
  }

  const nextSectionButton = event.target.closest("[data-next-section]");
  if (nextSectionButton) {
    const currentSection = activeSectionId();
    if (!validateSection(currentSection)) {
      render();
      return;
    }

    showSection(nextSectionButton.dataset.nextSection);
    return;
  }

  const disclosureButton = event.target.closest("[data-toggle-disclosure]");
  if (disclosureButton) {
    if (disclosureButton.dataset.toggleDisclosure === "supporting-documents") {
      showSupportingDocuments = !showSupportingDocuments;
    }

    if (disclosureButton.dataset.toggleDisclosure === "optional-bank-details") {
      showOptionalBankDetails = !showOptionalBankDetails;
    }

    render();
    return;
  }

  const submitButton = event.target.closest("[data-submit-details]");
  if (submitButton) {
    if (!validateForm()) {
      render();
      const firstError = requiredFields.find((field) => validationErrors[field.key]);
      if (firstError) {
        window.requestAnimationFrame(() => showSection(firstError.section));
      }
      return;
    }

    isSubmitted = true;
    window.history.replaceState(null, "", "#submitted");
    render();
    document.querySelector(".details-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const fileTrigger = event.target.closest("[data-file-trigger]");
  if (fileTrigger) {
    const input = document.getElementById(fileTrigger.dataset.fileTrigger);
    input?.click();
    return;
  }

  const previewButton = event.target.closest("[data-preview]");
  if (previewButton) {
    modalState = { mode: "preview", key: previewButton.dataset.preview };
    render();
    return;
  }

  const sampleButton = event.target.closest("[data-sample]");
  if (sampleButton) {
    modalState = { mode: "sample", key: sampleButton.dataset.sample };
    render();
    return;
  }

  const closePreview = event.target.closest("[data-close-preview]");
  const backdropClick = event.target.matches("[data-preview-backdrop]");
  if (closePreview || backdropClick) {
    modalState = null;
    render();
    return;
  }

  const tabButton = event.target.closest("[data-tab]");
  if (tabButton) {
    if (tabButton.dataset.tab === "banking") {
      window.history.replaceState(null, "", "#review");
      isSubmitted = false;
      render();
      document.querySelector(".details-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    console.log(`Clicked ${tabButton.textContent.trim()}`);
    return;
  }

  const pageTopButton = event.target.closest("[data-scroll-page-top]");
  if (pageTopButton) {
    document.querySelector(".page-shell")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modalState) {
    modalState = null;
    render();
  }
});

window.addEventListener("hashchange", render);

initializeTheme();
render();
