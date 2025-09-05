const API_BASE = 'http://localhost:3001/api';  // Adjust backend URL as necessary

const translations = {
  hi: {
    "Civic Reporter": "सिविक रिपोर्टर",
    Home: "होम",
    "Report Issue": "समस्या रिपोर्ट करें",
    "My Reports": "मेरी रिपोर्ट्स",
    "Admin Dashboard": "प्रशासनिक डैशबोर्ड",
    "Civic Issue System": "सिविक समस्या सिस्टम",
    "Report an Issue": "समस्या दर्ज करें",
    "View Reports": "रिपोर्ट देखें",
    "Total Issues": "कुल समस्याएँ",
    Resolved: "सुलझाई गई",
    Pending: "लंबित",
    "In Progress": "प्रगति में",
    "Issue Title *": "समस्या शीर्षक *",
    "Category *": "श्रेणी *",
    "Priority *": "प्राथमिकता *",
    "Location *": "स्थान *",
    "Description *": "विवरण *",
    "Upload Photo": "फोटो अपलोड करें",
    "Submit Issue": "रिपोर्ट सबमिट करें",
    "Track your issue status": "अपनी समस्याओं की स्थिति देखें",
    "All Status": "सभी स्थिति",
    "All Categories": "सभी श्रेणियां",
    "No reports found": "कोई रिपोर्ट नहीं मिली",
    "No issues found matching your criteria": "कोई मेल नहीं मिली",
    "Close modal": "मोडल बंद करें",
    "Close message": "संदेश बंद करें",
  },
};

function setLanguage(lang = 'en') {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    el.textContent = lang === 'hi' ? translations.hi[key] || key : key;
  });
}

class CivicReporter {
  constructor() {
    this.currentUser = 'user1';
    this.issues = [];
    this.currentSection = 'home';
    this.toastTimeout = null;
  }

  async init() {
    await this.loadIssues();
    this.bindEvents();
    this.updateStats();
    this.showSection('home');
  }

  async loadIssues() {
    try {
      const res = await fetch(`${API_BASE}/reports`);
      if (!res.ok) throw new Error('Failed to fetch issues from backend');
      this.issues = await res.json();
      this.updateStats();
    } catch (error) {
      this.showToast(error.message, 'error');
      this.issues = [];
    }
  }

  bindEvents() {
    document.querySelectorAll('[data-nav]').forEach((btn) =>
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.showSection(btn.getAttribute('data-nav'));
      })
    );

    const navToggle = document.querySelector('.nav__toggle');
    if (navToggle) {
      navToggle.addEventListener('click', () => {
        document.querySelector('.nav__menu').classList.toggle('active');
      });
    }

    const reportForm = document.getElementById('report-form');
    if (reportForm) {
      reportForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitIssue();
      });
    }

    const locationBtn = document.getElementById('get-location');
    if (locationBtn) {
      locationBtn.addEventListener('click', () => this.getCurrentLocation());
    }

    const photoInput = document.getElementById('photo');
    if (photoInput) {
      photoInput.addEventListener('change', (e) => this.previewPhoto(e.target.files[0]));
    }

    this.bindFilters();

    const modalCloseBtn = document.querySelector('.modal__close');
    const modalBackdrop = document.querySelector('.modal__backdrop');
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', () => this.hideModal());
    if (modalBackdrop) modalBackdrop.addEventListener('click', () => this.hideModal());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideModal();
      }
    });

    const toastClose = document.querySelector('.toast__close');
    if (toastClose) toastClose.addEventListener('click', () => this.hideToast());
  }

  bindFilters() {
    ['reports-search', 'reports-status-filter', 'reports-category-filter'].forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        if (id.includes('search')) {
          element.addEventListener('input', () => this.renderUserReports());
        } else {
          element.addEventListener('change', () => this.renderUserReports());
        }
      }
    });

    ['admin-search', 'admin-status-filter', 'admin-category-filter'].forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        if (id.includes('search')) {
          element.addEventListener('input', () => this.renderAdminReports());
        } else {
          element.addEventListener('change', () => this.renderAdminReports());
        }
      }
    });
  }

  showSection(section) {
    document.querySelectorAll('.nav__link').forEach((el) => el.classList.remove('active'));
    const navLink = document.querySelector(`[data-nav="${section}"]`);
    if (navLink) navLink.classList.add('active');

    document.querySelectorAll('.section').forEach((el) => el.classList.remove('active'));
    const sectionEl = document.getElementById(section);
    if (sectionEl) sectionEl.classList.add('active');

    this.currentSection = section;

    if (section === 'my-reports') {
      this.renderUserReports();
    } else if (section === 'admin') {
      this.renderAdminReports();
      this.updateAdminStats();
    } else if (section === 'home') {
      this.updateStats();
    }
  }

  async submitIssue() {
    const form = document.getElementById('report-form');
    if (!form) return;

    const title = form.elements['title'].value.trim();
    const description = form.elements['description'].value.trim();
    const category = form.elements['category'].value;
    const priority = form.elements['priority'].value;
    const location = form.elements['location'].value.trim();

    if (!title || !description || !category || !priority || !location) {
      this.showToast('Please fill in all required fields', 'error');
      return;
    }

    const formData = new FormData(form);

    try {
      const res = await fetch(`${API_BASE}/report`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to submit the report');
      }

      this.showToast('Issue reported successfully!', 'success');
      form.reset();
      this.clearPhotoPreview();
      await this.loadIssues();

      setTimeout(() => this.showSection('my-reports'), 1500);
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  }

  getCurrentLocation() {
    const locationBtn = document.getElementById('get-location');
    const locationInput = document.getElementById('location');

    if (!navigator.geolocation) {
      this.showToast('Geolocation not supported by your browser.', 'error');
      return;
    }

    locationBtn.disabled = true;
    locationBtn.classList.add('loading');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        locationInput.value = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
        locationBtn.disabled = false;
        locationBtn.classList.remove('loading');
        this.showToast('Location detected.', 'success');
      },
      () => {
        this.showToast('Unable to fetch location.', 'error');
        locationBtn.disabled = false;
        locationBtn.classList.remove('loading');
      }
    );
  }

  previewPhoto(file) {
    const preview = document.getElementById('photo-preview');
    if (!file) {
      this.clearPhotoPreview();
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      preview.innerHTML = `<img src="${e.target.result}" alt="Photo Preview" />`;
    };
    reader.readAsDataURL(file);
  }

  clearPhotoPreview() {
    const preview = document.getElementById('photo-preview');
    if (preview) preview.innerHTML = '';
  }

  updateStats() {
    const total = this.issues.length;
    const resolved = this.issues.filter((i) => i.status === 'Resolved').length;
    const pending = this.issues.filter((i) => i.status === 'Submitted').length;
    const inProgress = this.issues.filter((i) => i.status === 'In Progress').length;

    document.getElementById('total-issues').textContent = total;
    document.getElementById('resolved-issues').textContent = resolved;
    document.getElementById('pending-issues').textContent = pending;
    document.getElementById('in-progress-issues').textContent = inProgress;
  }

  updateAdminStats() {
    const total = this.issues.length;
    const submitted = this.issues.filter((i) => i.status === 'Submitted').length;
    const progress = this.issues.filter((i) => i.status === 'In Progress').length;
    const resolved = this.issues.filter((i) => i.status === 'Resolved').length;

    document.getElementById('admin-total').textContent = total;
    document.getElementById('admin-submitted').textContent = submitted;
    document.getElementById('admin-progress').textContent = progress;
    document.getElementById('admin-resolved').textContent = resolved;
  }

  renderUserReports() {
    const container = document.getElementById('reports-list');
    if (!container) return;

    const searchTerm = (document.getElementById('reports-search')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('reports-status-filter')?.value || '';
    const categoryFilter = document.getElementById('reports-category-filter')?.value || '';

    let filtered = this.issues.filter((issue) => {
      const matchesSearch =
        issue.title.toLowerCase().includes(searchTerm) ||
        issue.description.toLowerCase().includes(searchTerm) ||
        issue.location.toLowerCase().includes(searchTerm);

      const matchesStatus = !statusFilter || issue.status === statusFilter;
      const matchesCategory = !categoryFilter || issue.category === categoryFilter;
      const isUserIssue = issue.userId === this.currentUser || !issue.userId;

      return matchesSearch && matchesStatus && matchesCategory && isUserIssue;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No reports found</h3>
          <p>You haven't reported any issues or no matches found for your filters.</p>
        </div>`;
      return;
    }

    container.innerHTML = filtered.map((issue) => this.createIssueCard(issue, false)).join('');
    this.bindIssueCardEvents();
  }

  renderAdminReports() {
    const container = document.getElementById('admin-list');
    if (!container) return;

    const searchTerm = (document.getElementById('admin-search')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('admin-status-filter')?.value || '';
    const categoryFilter = document.getElementById('admin-category-filter')?.value || '';

    let filtered = this.issues.filter((issue) => {
      const matchesSearch =
        issue.title.toLowerCase().includes(searchTerm) ||
        issue.description.toLowerCase().includes(searchTerm) ||
        issue.location.toLowerCase().includes(searchTerm);

      const matchesStatus = !statusFilter || issue.status === statusFilter;
      const matchesCategory = !categoryFilter || issue.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No reports found</h3>
          <p>No matches found for your filters.</p>
        </div>`;
      return;
    }

    container.innerHTML = filtered.map((issue) => this.createIssueCard(issue, true)).join('');
    this.bindIssueCardEvents();
    this.bindStatusChangeEvents();
  }

  createIssueCard(issue, isAdmin = false) {
    const statusClass = `status--${issue.status.toLowerCase().replace(/\s/g, '-')}`;
    const priorityClass = `priority--${issue.priority.toLowerCase()}`;

    return `
      <div class="issue-card ${isAdmin ? 'admin-card' : ''}" data-issue-id="${issue.id}">
        <div class="issue-card-header">
          <h3>${issue.title}</h3>
          <span class="status ${statusClass}">${issue.status}</span>
        </div>
        <div class="issue-card-meta">
          <div>Category: <strong>${issue.category}</strong></div>
          <div>Priority: <strong>${issue.priority}</strong></div>
          <div>Location: <strong>${issue.location}</strong></div>
          <div>Date: <strong>${new Date(issue.timestamp).toLocaleDateString()}</strong></div>
          ${isAdmin ? `<div>User ID: <strong>${issue.userId || 'N/A'}</strong></div>` : ''}
        </div>
        <p>${issue.description}</p>
        <div class="issue-actions">
          <button class="view-details" data-issue-id="${issue.id}">View Details</button>
          ${isAdmin ? `<select class="status-select" data-issue-id="${issue.id}">
                      <option value="Submitted" ${issue.status === 'Submitted' ? 'selected' : ''}>Submitted</option>
                      <option value="In Progress" ${issue.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                      <option value="Resolved" ${issue.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                      <option value="Rejected" ${issue.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                      </select>` : ''}
        </div>
      </div>
    `;
  }

  bindIssueCardEvents() {
    document.querySelectorAll('.view-details').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.getAttribute('data-issue-id'));
        this.showIssueModal(id);
      });
    });

    document.querySelectorAll('.issue-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('status-select')) return;
        const id = parseInt(card.getAttribute('data-issue-id'));
        this.showIssueModal(id);
      });
    });
  }

  bindStatusChangeEvents() {
    document.querySelectorAll('.status-select').forEach((select) => {
      select.addEventListener('change', async (e) => {
        e.stopPropagation();
        const id = parseInt(select.getAttribute('data-issue-id'));
        const newStatus = select.value;
        await this.updateIssueStatus(id, newStatus);
      });
    });
  }

  async updateIssueStatus(id, status) {
    try {
      const res = await fetch(`${API_BASE}/reports/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to update issue status');
      }
      const updatedIssue = await res.json();
      const idx = this.issues.findIndex((issue) => issue.id === id);
      if (idx !== -1) this.issues[idx] = updatedIssue;

      this.updateStats();
      this.updateAdminStats();
      this.renderAdminReports();

      this.showToast(`Issue status updated to ${status}`, 'success');
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  }

  showIssueModal(id) {
    const issue = this.issues.find((i) => i.id === id);
    if (!issue) return;

    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');

    const statusClass = `status--${issue.status.toLowerCase().replace(/\s/g, '-')}`;
    const priorityClass = `priority--${issue.priority.toLowerCase()}`;

    modalContent.innerHTML = `
      <h2>${issue.title}</h2>
      <p>Status: <span class="${statusClass}">${issue.status}</span></p>
      <p>Priority: <span class="${priorityClass}">${issue.priority}</span></p>
      <p>Category: ${issue.category}</p>
      <p>Location: ${issue.location}</p>
      <p>Description: ${issue.description}</p>
      <p>Submitted: ${new Date(issue.timestamp).toLocaleString()}</p>
      ${issue.photo ? `<img src="${issue.photo}" alt="Issue Photo" />` : ''}
    `;

    modal.classList.add('show');
  }

  hideModal() {
    const modal = document.getElementById('modal');
    modal.classList.remove('show');
  }

  showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toast-message');
    if (!toast || !msg) return;

    msg.textContent = message;
    toast.className = `toast ${type === 'error' ? 'error' : 'success'}`;
    toast.style.display = 'block';

    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => this.hideToast(), 4000);
  }

  hideToast() {
    const toast = document.getElementById('toast');
    if (toast) toast.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new CivicReporter();
  app.init();

  const langSelect = document.getElementById('language-select');
  if (langSelect) {
    langSelect.addEventListener('change', () => {
      setLanguage(langSelect.value);
    });
    setLanguage(langSelect.value);
  }
});
