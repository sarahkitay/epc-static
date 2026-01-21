// EPC Client Management System - Main App Logic

const PASSWORD = '15125';
const SESSION_KEY = 'epc_session';

// Helper function to get correct path for navigation
function getPath(filename) {
  const pathname = window.location.pathname;
  
  // If we're in the /clients/ directory (most common case)
  if (pathname.includes('/clients/')) {
    // Extract the base path up to and including /clients/
    const clientsIndex = pathname.indexOf('/clients/');
    const basePath = pathname.substring(0, clientsIndex + '/clients/'.length);
    return basePath + filename;
  }
  
  // If pathname ends with /clients or /clients/
  if (pathname.endsWith('/clients') || pathname.endsWith('/clients/')) {
    return pathname + (pathname.endsWith('/') ? '' : '/') + filename;
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
  const parentSession = sessionStorage.getItem('epc_parent_session');
  
  // Allow access if either staff or parent is logged in
  if (!session && !parentSession) {
    window.location.href = getPath('index.html');
  }
  
  // If parent is logged in and on dashboard, redirect to their child's page
  if (parentSession && window.location.pathname.includes('dashboard.html')) {
    try {
      const parentData = JSON.parse(parentSession);
      window.location.href = getPath(`client.html?id=${parentData.clientId}`);
    } catch (e) {
      console.error('Error parsing parent session:', e);
    }
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

async function handleLogin() {
  const loginType = document.getElementById('loginType');
  const errorMessage = document.getElementById('errorMessage');
  
  if (!loginType) {
    console.error('Login type selector not found');
    return;
  }
  
  const loginAs = loginType.value;
  
  if (loginAs === 'staff') {
    // Staff login
    const passwordInput = document.getElementById('password');
    if (!passwordInput) {
      console.error('Password input not found');
      return;
    }
    
    const password = passwordInput.value.trim();
    
    if (password === PASSWORD) {
      try {
        sessionStorage.setItem(SESSION_KEY, 'authenticated');
        sessionStorage.removeItem('epc_parent_session'); // Clear any parent session
        const dashboardPath = getPath('dashboard.html');
        window.location.href = dashboardPath;
      } catch (e) {
        console.error('Error setting session:', e);
        window.location.href = getPath('dashboard.html');
      }
    } else {
      if (errorMessage) {
        errorMessage.textContent = 'Incorrect password. Please try again.';
        errorMessage.style.display = 'block';
      }
      passwordInput.value = '';
      setTimeout(() => passwordInput.focus(), 100);
    }
  } else {
    // Parent login
    const childNameInput = document.getElementById('childName');
    const parentCodeInput = document.getElementById('parentCode');
    
    if (!childNameInput || !parentCodeInput) {
      console.error('Parent login inputs not found');
      return;
    }
    
    const childName = childNameInput.value.trim();
    const parentCode = parentCodeInput.value.trim();
    
    if (!childName || !parentCode) {
      if (errorMessage) {
        errorMessage.textContent = 'Please enter both child\'s name and access code.';
        errorMessage.style.display = 'block';
      }
      return;
    }
    
    try {
      // Initialize database to search for client
      await initDB();
      const allClients = await getAllClients();
      
      // Find client by name (case-insensitive) and parent code
      const client = allClients.find(c => 
        c.name.toLowerCase() === childName.toLowerCase() && 
        c.parentPasscode && 
        c.parentPasscode.toLowerCase() === parentCode.toLowerCase()
      );
      
      if (client) {
        // Store parent session
        sessionStorage.setItem('epc_parent_session', JSON.stringify({
          clientId: client.id,
          clientName: client.name,
          timestamp: Date.now()
        }));
        sessionStorage.removeItem(SESSION_KEY); // Clear staff session
        
        // Redirect directly to child's client page
        window.location.href = getPath(`client.html?id=${client.id}`);
      } else {
        if (errorMessage) {
          errorMessage.textContent = 'No client found with that name and code. Please check and try again.';
          errorMessage.style.display = 'block';
        }
        childNameInput.value = '';
        parentCodeInput.value = '';
        setTimeout(() => childNameInput.focus(), 100);
      }
    } catch (error) {
      console.error('Error during parent login:', error);
      if (errorMessage) {
        errorMessage.textContent = 'Error connecting to database. Please try again.';
        errorMessage.style.display = 'block';
      }
    }
    
    // Clear error after 5 seconds
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
