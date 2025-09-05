const API_BASE = 'http://localhost:3001/api';  // Change this URL as per your backend

const translations = {
  hi: {
    "Civic Reporter": "सिविक रिपोर्टर",
    Home: "होम",
    "Report Issue": "समस्या रिपोर्ट करें",
    "My Reports": "मेरी रिपोर्ट्स",
    "Admin Dashboard": "प्रशासनिक डैशबोर्ड",
    "Civic Issue Reporting System": "सिविक समस्या रिपोर्टिंग सिस्टम",
    "Report an Issue": "समस्या दर्ज करें",
    "View Reports": "रिपोर्ट्स देखें",
    "Total Issues": "कुल समस्याएँ",
    Resolved: "सुलझाई गई",
    Pending: "लंबित",
    "In Progress": "प्रगति में",
    "Issue Title *": "समस्या का शीर्षक *",
    "Category *": "श्रेणी *",
    "Priority *": "प्राथमिकता *",
    "Location *": "स्थान *",
    "Description *": "विवरण *",
    "Upload Photo": "फोटो अपलोड करें",
    "Submit Issue Report": "समस्या रिपोर्ट सबमिट करें",
    "Track the status of your submitted issues.": "अपनी सबमिट की गई समस्याओं की स्थिति ट्रैक करें।",
    "All Status": "सभी स्थितियाँ",
    "All Categories": "सभी श्रेणियाँ",
    "No reports found": "कोई रिपोर्ट नहीं मिली",
    "You haven't reported any issues yet or no issues match your search criteria.":
      "आपने अभी तक कोई समस्या रिपोर्ट नहीं की है या कोई मेल नहीं खा रही।",
    "Admin Dashboard": "प्रशासनिक डैशबोर्ड",
    "Manage and update reported issues.": "रिपोर्ट की गई समस्याओं का प्रबंधन और अद्यतन करें।",
    "Total Reports": "कुल रिपोर्ट्स",
    Submitted: "सबमिट की गई",
    "Issue Details": "समस्या का विवरण",
    "Close modal": "मोडल बंद करें",
    "Close message": "संदेश बंद करें",
  },
};

function setLanguage(lang = "en") {
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    node.textContent = lang === "hi" ? translations.hi[key] || key : key;
  });
}

class CivicReporter {
  constructor() {
    this.currentUser = "user1";
    this.issues = [];
    this.currentSection = "home";
    this.toastTimeout = null;
  }

  async init() {
    await this.loadIssues();
    this.bindEvents();
    this.updateStats();
    this.showSection("home");
  }

  async loadIssues() {
    try {
      const res = await fetch(`${API_BASE}/reports`);
      if (!res.ok) throw new Error("Failed to fetch issues from backend");
      this.issues = await res.json();
      this.updateStats();
    } catch (e) {
      this.showToast(e.message, "error");
      this.issues = [];
    }
  }

  bindEvents() {
    document.querySelectorAll("[data-nav]").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        this.showSection(e.target.getAttribute("data-nav"));
      })
    );

    const navToggle = document.querySelector(".nav__toggle");
    if (navToggle) {
      navToggle.addEventListener("click", () => {
        document.querySelector(".nav__menu").classList.toggle("active");
      });
    }

    const reportForm = document.getElementById("report-form");
    if (reportForm) {
      reportForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        await this.submitIssue();
      });
    }

    const locationBtn = document.getElementById("get-location");
    if (locationBtn) {
      locationBtn.addEventListener("click", () => this.getCurrentLocation());
    }

    const photoInput = document.getElementById("issue-photo");
    if (photoInput) {
      photoInput.addEventListener("change", (e) => this.previewPhoto(e.target.files[0]));
    }

    this.bindSearchAndFilter();

    const modalClose = document.querySelector(".modal__close");
    const modalBackdrop = document.querySelector(".modal__backdrop");
    if (modalClose) modalClose.addEventListener("click", () => this.hideModal());
    if (modalBackdrop) modalBackdrop.addEventListener("click", () => this.hideModal());

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.hideModal();
    });

    const toastClose = document.querySelector(".toast__close");
    if (toastClose) toastClose.addEventListener("click", () => this.hideToast());
  }

  bindSearchAndFilter() {
    ["reports-search", "reports-status-filter", "reports-category-filter"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener(id.includes("search") ? "input" : "change", () => this.renderUserReports());
    });

    ["admin-search", "admin-status-filter", "admin-category-filter"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener(id.includes("search") ? "input" : "change", () => this.renderAdminReports());
    });
  }

  showSection(section) {
    document.querySelectorAll(".nav__link").forEach((link) => link.classList.remove("active"));
    const activeNav = document.querySelector(`[data-nav="${section}"]`);
    if (activeNav) activeNav.classList.add("active");

    document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
    const selectedSection = document.getElementById(section);
    if (selectedSection) selectedSection.classList.add("active");

    this.currentSection = section;

    if (section === "my-reports") this.renderUserReports();
    else if (section === "admin") {
      this.renderAdminReports();
      this.updateAdminStats();
    } else if (section === "home") this.updateStats();
  }

  async submitIssue() {
    const form = document.getElementById("report-form");
    if (!form) return;

    const title = form.querySelector("#issue-title").value.trim();
    const description = form.querySelector("#issue-description").value.trim();
    const category = form.querySelector("#issue-category").value;
    const priority = form.querySelector("#issue-priority").value;
    const location = form.querySelector("#issue-location").value.trim();

    if (!title || !description || !category || !priority || !location) {
      this.showToast("Please fill in all required fields", "error");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("category", category);
    formData.append("priority", priority);
    formData.append("location", location);

    const photoInput = form.querySelector("#issue-photo");
    if (photoInput?.files?.length > 0) {
      formData.append("photo", photoInput.files[0]);
    }

    try {
      const res = await fetch(`${API_BASE}/report`, { method: "POST", body: formData });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to submit the report");
      }
      await this.loadIssues();

      this.showToast("Issue reported successfully!", "success");
      form.reset();
      this.clearPhotoPreview();

      setTimeout(() => this.showSection("my-reports"), 1500);
    } catch (error) {
      this.showToast(error.message, "error");
    }
  }

  getCurrentLocation() {
    const locationBtn = document.getElementById("get-location");
    const locationInput = document.getElementById("issue-location");

    if (!navigator.geolocation) {
      this.showToast("Geolocation is not supported by this browser", "error");
      return;
    }

    locationBtn.classList.add("loading");
    locationBtn.disabled = true;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        locationInput.value = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
        locationBtn.classList.remove("loading");
        locationBtn.disabled = false;
        this.showToast("Location detected successfully!", "success");
      },
      () => {
        locationBtn.classList.remove("loading");
        locationBtn.disabled = false;
        this.showToast("Unable to get your location. Please enter manually.", "error");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  previewPhoto(file) {
    const preview = document.getElementById("photo-preview");
    if (!file) {
      this.clearPhotoPreview();
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.innerHTML = `<img src="${e.target.result}" alt="Photo preview" />`;
    };
    reader.readAsDataURL(file);
  }

  clearPhotoPreview() {
    const preview = document.getElementById("photo-preview");
    if (preview) preview.innerHTML = "";
  }

  updateStats() {
    const total = this.issues.length;
    const resolved = this.issues.filter((i) => i.status === "Resolved").length;
    const pending = this.issues.filter((i) => i.status === "Submitted").length;
    const inProgress = this.issues.filter((i) => i.status === "In Progress").length;

    document.getElementById("total-issues").textContent = total;
    document.getElementById("resolved-issues").textContent = resolved;
    document.getElementById("pending-issues").textContent = pending;
    document.getElementById("in-progress-issues").textContent = inProgress;
  }

  updateAdminStats() {
    const total = this.issues.length;
    const submitted = this.issues.filter((i) => i.status === "Submitted").length;
    const progress = this.issues.filter((i) => i.status === "In Progress").length;
    const resolved = this.issues.filter((i) => i.status === "Resolved").length;

    document.getElementById("admin-total").textContent = total;
    document.getElementById("admin-submitted").textContent = submitted;
    document.getElementById("admin-progress").textContent = progress;
    document.getElementById("admin-resolved").textContent = resolved;
  }

  renderUserReports() {
    const container = document.getElementById("reports-list");
    if (!container) return;

    const searchTerm = (document.getElementById("reports-search")?.value || "").toLowerCase();
    const statusFilter = document.getElementById("reports-status-filter")?.value || "";
    const categoryFilter = document.getElementById("reports-category-filter")?.value || "";

    let filtered = this.issues.filter((issue) => {
      const textContains =
        issue.title.toLowerCase().includes(searchTerm) ||
        issue.description.toLowerCase().includes(searchTerm) ||
        issue.location.toLowerCase().includes(searchTerm);
      const statusMatches = !statusFilter || issue.status === statusFilter;
      const categoryMatches = !categoryFilter || issue.category === categoryFilter;
      const isUserIssue = issue.userId === this.currentUser || !issue.userId;

      return textContains && statusMatches && categoryMatches && isUserIssue;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No reports found</h3>
          <p>You haven't reported any issues yet or no issues match your search criteria.</p>
        </div>`;
      return;
    }

    container.innerHTML = filtered.map((issue) => this.createIssueCard(issue, false)).join("");
    this.bindIssueCardEvents();
  }

  renderAdminReports() {
    const container = document.getElementById("admin-list");
    if (!container) return;

    const searchTerm = (document.getElementById("admin-search")?.value || "").toLowerCase();
    const statusFilter = document.getElementById("admin-status-filter")?.value || "";
    const categoryFilter = document.getElementById("admin-category-filter")?.value || "";

    let filtered = this.issues.filter((issue) => {
      const textContains =
        issue.title.toLowerCase().includes(searchTerm) ||
        issue.description.toLowerCase().includes(searchTerm) ||
        issue.location.toLowerCase().includes(searchTerm);
      const statusMatches = !statusFilter || issue.status === statusFilter;
      const categoryMatches = !categoryFilter || issue.category === categoryFilter;

      return textContains && statusMatches && categoryMatches;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No reports found</h3>
          <p>No issues match your search criteria.</p>
        </div>`;
      return;
    }

    container.innerHTML = filtered.map((issue) => this.createIssueCard(issue, true)).join("");
    this.bindIssueCardEvents();
    this.bindStatusChangeEvents();
  }

  createIssueCard(issue, isAdmin = false) {
    const statusClass = `status--${issue.status.toLowerCase().replace(/\s/g, "-")}`;
    const priorityClass = `priority--${issue.priority.toLowerCase()}`;

    return `
      <div class="issue-card ${isAdmin ? "admin-card" : ""}" data-issue-id="${issue.id}">
        <div class="issue-card__header">
          <h3 class="issue-card__title">${issue.title}</h3>
          <span class="status ${statusClass}">${issue.status}</span>
        </div>

        <div class="issue-card__meta">
          <div class="issue-card__meta-item">
            <span class="issue-card__meta-label">Category</span>
            <span class="issue-card__meta-value">${issue.category}</span>
          </div>
          <div class="issue-card__meta-item">
            <span class="issue-card__meta-label">Priority</span>
            <span class="priority ${priorityClass}">${issue.priority}</span>
          </div>
          <div class="issue-card__meta-item">
            <span class="issue-card__meta-label">Location</span>
            <span class="issue-card__meta-value">${issue.location}</span>
          </div>
          <div class="issue-card__meta-item">
            <span class="issue-card__meta-label">Date</span>
            <span class="issue-card__meta-value">${new Date(issue.created_at).toLocaleDateString()}</span>
          </div>
          ${
            isAdmin
              ? `<div class="issue-card__meta-item">
                  <span class="issue-card__meta-label">User ID</span>
                  <span class="issue-card__meta-value">${issue.userId || "N/A"}</span>
                </div>`
              : ""
          }
        </div>

        <p class="issue-card__description">${issue.description}</p>

        <div class="issue-card__actions">
          <button class="btn btn--outline btn--sm view-details" data-issue-id="${issue.id}">View Details</button>
          ${
            isAdmin
              ? `
            <select class="form-control status-select" data-issue-id="${issue.id}" onclick="event.stopPropagation();">
              <option value="Submitted" ${issue.status === "Submitted" ? "selected" : ""}>Submitted</option>
              <option value="In Progress" ${issue.status === "In Progress" ? "selected" : ""}>In Progress</option>
              <option value="Resolved" ${issue.status === "Resolved" ? "selected" : ""}>Resolved</option>
              <option value="Rejected" ${issue.status === "Rejected" ? "selected" : ""}>Rejected</option>
            </select>`
              : ""
          }
        </div>
      </div>`;
  }

  bindIssueCardEvents() {
    document.querySelectorAll(".view-details").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = parseInt(btn.getAttribute("data-issue-id"));
        this.showIssueModal(id);
      })
    );

    document.querySelectorAll(".issue-card").forEach((card) =>
      card.addEventListener("click", (e) => {
        if (e.target.classList.contains("status-select")) return;
        const id = parseInt(card.getAttribute("data-issue-id"));
        this.showIssueModal(id);
      })
    );
  }

  bindStatusChangeEvents() {
    document.querySelectorAll(".status-select").forEach((select) =>
      select.addEventListener("change", async (e) => {
        e.stopPropagation();
        const id = parseInt(select.getAttribute("data-issue-id"));
        const newStatus = select.value;
        await this.updateIssueStatus(id, newStatus);
      })
    );
  }

  async updateIssueStatus(id, status) {
    try {
      const res = await fetch(`${API_BASE}/reports/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to update issue status");
      }
      const updatedIssue = await res.json();

      const idx = this.issues.findIndex((issue) => issue.id === id);
      if (idx !== -1) this.issues[idx] = updatedIssue;

      this.updateStats();
      this.updateAdminStats();
      this.renderAdminReports();

      this.showToast(`Issue status updated to ${status}`, "success");
    } catch (error) {
      this.showToast(error.message, "error");
    }
  }

  showIssueModal(id) {
    const issue = this.issues.find((i) => i.id === id);
    if (!issue) return;

    const modal = document.getElementById("issue-modal");
    const modalBody = document.getElementById("modal-body");

    const statusClass = `status--${issue.status.toLowerCase().replace(/\s/g, "-")}`;
    const priorityClass = `priority--${issue.priority.toLowerCase()}`;

    modalBody.innerHTML = `
      <div class="modal-detail">
        <div class="modal-detail__item">
          <span class="modal-detail__label">Title:</span>
          <span class="modal-detail__value">${issue.title}</span>
        </div>
        <div class="modal-detail__item">
          <span class="modal-detail__label">Status:</span>
          <span class="status ${statusClass}">${issue.status}</span>
        </div>
        <div class="modal-detail__item">
          <span class="modal-detail__label">Priority:</span>
          <span class="priority ${priorityClass}">${issue.priority}</span>
        </div>
        <div class="modal-detail__item">
          <span class="modal-detail__label">Category:</span>
          <span class="modal-detail__value">${issue.category}</span>
        </div>
        <div class="modal-detail__item">
          <span class="modal-detail__label">Location:</span>
          <span class="issue-card__meta-value">${issue.location}</span>
        </div>
        <div class="modal-detail__item">
          <span class="modal-detail__label">Submitted:</span>
          <span class="modal-detail__value">${new Date(issue.created_at).toLocaleDateString()}</span>
        </div>
        <div class="modal-detail__item">
          <span class="modal-detail__label">Last Updated:</span>
          <span class="modal-detail__value">${new Date(issue.updated_at).toLocaleDateString()}</span>
        </div>
        <div class="modal-detail__item">
          <span class="modal-detail__label">Description:</span>
          <span class="modal-detail__value">${issue.description}</span>
        </div>
        ${
          issue.photo
            ? `<div class="modal-detail__photo"><img src="data:image/*;base64,${issue.photo}" alt="Issue photo" /></div>`
            : ""
        }
      </div>`;

    modal.classList.remove("hidden");
  }

  hideModal() {
    const modal = document.getElementById("issue-modal");
    if (modal) modal.classList.add("hidden");
  }

  showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toast-message");

    if (!toast || !toastMessage) return;

    toastMessage.textContent = message;
    toast.className = `toast ${type === "error" ? "toast--error" : ""}`;

    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => this.hideToast(), 5000);
  }

  hideToast() {
    const toast = document.getElementById("toast");
    if (toast) toast.classList.add("hidden");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const app = new CivicReporter();
  await app.init();

  const langSelect = document.getElementById("language-select");
  if (langSelect) {
    langSelect.addEventListener("change", () => setLanguage(langSelect.value));
    setLanguage(langSelect.value);
  }
});
