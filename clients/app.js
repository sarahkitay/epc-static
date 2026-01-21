// EPC Client Management System - Main App Logic

const PASSWORD = '15125';
const SESSION_KEY = 'epc_session';

// Helper function to get correct path for navigation
function getPath(filename) {
  const pathname = window.location.pathname;
  // If we're at root or in clients directory
  if (pathname.endsWith('/') || pathname.endsWith('/clients/') || pathname.endsWith('/clients')) {
    return `clients/${filename}`;
  }
  // If we're in clients directory with a file
  if (pathname.includes('/clients/')) {
    return filename; // Same directory
  }
  // Fallback: try to determine from current path
  const basePath = pathname.substring(0, pathname.lastIndexOf('/') + 1);
  return basePath + filename;
}

// Check if user is logged in
function checkAuth() {
  if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/clients/') || window.location.pathname.endsWith('/clients')) {
    return;
  }

  const session = sessionStorage.getItem(SESSION_KEY);
  if (!session || session !== 'authenticated') {
    window.location.href = getPath('index.html');
  }
}

// Login functionality
function initLogin() {
  const loginForm = document.getElementById('loginForm');
  const errorMessage = document.getElementById('errorMessage');

  if (!loginForm) return;

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleLogin();
  });

  // Also handle button click for mobile compatibility
  const loginBtn = loginForm.querySelector('button[type="submit"]');
  if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogin();
    });
  }
}

function handleLogin() {
  const passwordInput = document.getElementById('password');
  const errorMessage = document.getElementById('errorMessage');
  
  if (!passwordInput) {
    console.error('Password input not found');
    alert('Error: Password input not found. Please refresh the page.');
    return;
  }
  
  const password = passwordInput.value.trim();
  console.log('Login attempt, password length:', password.length);

  if (password === PASSWORD) {
    console.log('Password correct, redirecting...');
    try {
      sessionStorage.setItem(SESSION_KEY, 'authenticated');
      const dashboardPath = getPath('dashboard.html');
      console.log('Redirecting to:', dashboardPath);
      window.location.href = dashboardPath;
    } catch (e) {
      console.error('Error setting session:', e);
      // Fallback: try direct redirect
      window.location.href = getPath('dashboard.html');
    }
  } else {
    console.log('Password incorrect');
    if (errorMessage) {
      errorMessage.textContent = 'Incorrect password. Please try again.';
      errorMessage.style.display = 'block';
    } else {
      alert('Incorrect password. Please try again.');
    }
    passwordInput.value = '';
    setTimeout(() => {
      passwordInput.focus();
    }, 100);
    
    // Clear error after 3 seconds
    setTimeout(() => {
      if (errorMessage) {
        errorMessage.style.display = 'none';
      }
    }, 3000);
  }
}

// Logout functionality
function initLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem(SESSION_KEY);
      window.location.href = 'index.html';
    });
  }
}

// Dashboard functionality
async function initDashboard() {
  checkAuth();
  initLogout();

  const addClientBtn = document.getElementById('addClientBtn');
  const addClientModal = document.getElementById('addClientModal');
  const closeAddModal = document.getElementById('closeAddModal');
  const cancelAddClient = document.getElementById('cancelAddClient');
  const addClientForm = document.getElementById('addClientForm');
  const clientSearch = document.getElementById('clientSearch');
  const categoryFilter = document.getElementById('categoryFilter');
  const sortFilter = document.getElementById('sortFilter');
  const clientsGrid = document.getElementById('clientsGrid');
  const emptyState = document.getElementById('emptyState');

  let allClients = [];

  // Initialize database
  await initDB();

  // Load clients
  async function loadClients() {
    try {
      allClients = await getAllClients();
      renderClients(allClients);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  }

  // Render clients
  function renderClients(clients) {
    if (clients.length === 0) {
      clientsGrid.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';
    clientsGrid.innerHTML = clients.map(client => `
      <div class="client-card" data-client-id="${client.id}">
        <div class="client-card-header">
          <div>
            <h3 class="client-card-name">${escapeHtml(client.name)}</h3>
            <span class="client-card-category">${client.category === 'shared' ? 'Shared' : 'Personal'}</span>
          </div>
        </div>
        <div class="client-card-info">
          <div class="client-card-info-item">
            <span>Age: ${client.age || 'N/A'}</span>
          </div>
          ${client.primaryTrainer ? `
            <div class="client-card-info-item">
              <span>Trainer: ${escapeHtml(client.primaryTrainer)}</span>
            </div>
          ` : ''}
          ${client.lastAssessmentDate ? `
            <div class="client-card-info-item">
              <span>Last Assessment: ${formatDate(client.lastAssessmentDate)}</span>
            </div>
          ` : ''}
          ${client.lastProgramDate ? `
            <div class="client-card-info-item">
              <span>Last Program: ${formatDate(client.lastProgramDate)}</span>
            </div>
          ` : ''}
        </div>
        <div class="client-card-actions">
          <button class="client-card-btn" onclick="viewClient(${client.id})">View Profile</button>
          <button class="client-card-btn" onclick="addQuickNote(${client.id})">Quick Note</button>
        </div>
      </div>
    `).join('');

    // Add click handlers to cards
    document.querySelectorAll('.client-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.target.classList.contains('client-card-btn')) {
          const clientId = card.dataset.clientId;
          viewClient(clientId);
        }
      });
    });
  }

  // Filter and sort clients
  function filterAndSortClients() {
    let filtered = [...allClients];

    // Search filter
    const searchTerm = clientSearch.value.toLowerCase().trim();
    if (searchTerm) {
      filtered = filtered.filter(client => 
        client.name.toLowerCase().includes(searchTerm)
      );
    }

    // Category filter
    const category = categoryFilter.value;
    if (category !== 'all') {
      filtered = filtered.filter(client => client.category === category);
    }

    // Sort
    const sort = sortFilter.value;
    switch (sort) {
      case 'name-asc':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'recent':
        filtered.sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.createdAt);
          const dateB = new Date(b.updatedAt || b.createdAt);
          return dateB - dateA;
        });
        break;
      case 'assessment-due':
        filtered.sort((a, b) => {
          const dateA = a.lastAssessmentDate ? new Date(a.lastAssessmentDate) : new Date(0);
          const dateB = b.lastAssessmentDate ? new Date(b.lastAssessmentDate) : new Date(0);
          return dateA - dateB;
        });
        break;
    }

    renderClients(filtered);
  }

  // Modal handlers
  if (addClientBtn) {
    addClientBtn.addEventListener('click', () => {
      addClientModal.style.display = 'flex';
      document.getElementById('clientName').focus();
    });
  }

  if (closeAddModal) {
    closeAddModal.addEventListener('click', () => {
      addClientModal.style.display = 'none';
      addClientForm.reset();
    });
  }

  if (cancelAddClient) {
    cancelAddClient.addEventListener('click', () => {
      addClientModal.style.display = 'none';
      addClientForm.reset();
    });
  }

  // Add client form
  if (addClientForm) {
    addClientForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const clientData = {
        name: document.getElementById('clientName').value.trim(),
        age: document.getElementById('clientAge').value ? parseInt(document.getElementById('clientAge').value) : null,
        category: document.getElementById('clientCategory').value,
        primaryTrainer: document.getElementById('primaryTrainer').value.trim() || null,
        parentContact: document.getElementById('parentContact').value.trim() || null,
        emergencyContact: document.getElementById('emergencyContact').value.trim() || null,
        goals: document.getElementById('clientGoals').value.trim() || null,
        medicalHistory: document.getElementById('medicalHistory').value.trim() || null
      };

      try {
        await addClient(clientData);
        addClientModal.style.display = 'none';
        addClientForm.reset();
        await loadClients();
      } catch (error) {
        console.error('Error adding client:', error);
        alert('Error adding client. Please try again.');
      }
    });
  }

  // Search and filter handlers
  if (clientSearch) {
    clientSearch.addEventListener('input', filterAndSortClients);
  }

  if (categoryFilter) {
    categoryFilter.addEventListener('change', filterAndSortClients);
  }

  if (sortFilter) {
    sortFilter.addEventListener('change', filterAndSortClients);
  }

  // Initial load
  await loadClients();
}

// View client profile
function viewClient(clientId) {
  window.location.href = `${getPath('client.html')}?id=${clientId}`;
}

// Add quick note (placeholder for future implementation)
function addQuickNote(clientId) {
  const note = prompt('Enter a quick note:');
  if (note) {
    saveProgressNote(clientId, note)
      .then(() => {
        alert('Note added successfully!');
      })
      .catch(error => {
        console.error('Error adding note:', error);
        alert('Error adding note. Please try again.');
      });
  }
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

// Initialize based on current page
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/clients/') || window.location.pathname.endsWith('/clients')) {
      initLogin();
    } else if (window.location.pathname.includes('dashboard.html')) {
      initDashboard();
    }
  });
} else {
  if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/clients/') || window.location.pathname.endsWith('/clients')) {
    initLogin();
  } else if (window.location.pathname.includes('dashboard.html')) {
    initDashboard();
  }
}
