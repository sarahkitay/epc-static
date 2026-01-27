// EPC Client Management System - Main App Logic

// Session key - standardized across all session storage
const SESSION_KEY = 'epc_secure_session_v1';
const PARENT_SESSION_KEY = 'epc_secure_session_v1_parent';

// Password will be validated server-side via API
// For backward compatibility, we'll check if it's set in env or use a fallback
// NOTE: This should be moved to server-side authentication
const PASSWORD = '15125'; // TODO: Remove after server-side auth is implemented

// Helper function to get correct path for navigation
function getPath(filename) {
  const pathname = window.location.pathname;
  const origin = window.location.origin;
  
  console.log('getPath called with filename:', filename, 'pathname:', pathname, 'origin:', origin);
  
  // Always use /clients/ as the base path for consistency
  // Handle different path scenarios:
  let basePath = '/clients/';
  
  if (pathname.includes('/clients/')) {
    // We're already in /clients/ directory
    const clientsIndex = pathname.indexOf('/clients/');
    basePath = pathname.substring(0, clientsIndex + '/clients/'.length);
  } else if (pathname === '/clients' || pathname.endsWith('/clients')) {
    // We're at /clients (without trailing slash)
    basePath = '/clients/';
  } else if (pathname.includes('index.html') && pathname.includes('/clients')) {
    // We're on index.html in clients directory
    const lastSlash = pathname.lastIndexOf('/');
    basePath = pathname.substring(0, lastSlash + 1);
  }
  
  const fullPath = basePath + filename;
  console.log('Returning path:', fullPath);
  return fullPath;
}

// Check if user is logged in
function checkAuth() {
  const pathname = window.location.pathname;
  
  // Don't check auth on login page
  // Handle both /clients and /clients/ and /clients/index.html
  if (pathname.includes('index.html') || 
      pathname === '/clients' || 
      pathname === '/clients/' || 
      pathname.endsWith('/clients/') || 
      pathname.endsWith('/clients')) {
    return;
  }

  const session = sessionStorage.getItem(SESSION_KEY);
  const parentSession = sessionStorage.getItem('epc_parent_session');
  
  console.log('Auth check - Path:', pathname, 'Session:', session, 'Parent:', parentSession);
  
  // Allow access if either staff or parent is logged in
  if (!session && !parentSession) {
    console.log('No session found, redirecting to login...');
    const loginPath = getPath('index.html');
    const fullLoginUrl = window.location.origin + loginPath;
    console.log('Redirecting to:', fullLoginUrl);
    window.location.replace(fullLoginUrl);
    return;
  }
  
  // If parent is logged in and on dashboard, redirect to their child's page
  if (parentSession && (pathname.includes('dashboard.html') || pathname.endsWith('/dashboard'))) {
    try {
      const parentData = JSON.parse(parentSession);
      const clientPath = getPath(`client.html?id=${parentData.clientId}`);
      const fullClientUrl = window.location.origin + clientPath;
      console.log('Parent session detected, redirecting to child page:', fullClientUrl);
      window.location.replace(fullClientUrl);
    } catch (e) {
      console.error('Error parsing parent session:', e);
    }
  }
}

// Login functionality
function initLogin() {
  const loginForm = document.getElementById('loginForm');
  const errorMessage = document.getElementById('errorMessage');

  if (!loginForm) {
    console.error('Login form not found');
    return;
  }

  console.log('Initializing login form');

  // Handle form submission - this is the primary handler
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Form submitted');
    await handleLogin();
    return false;
  });

  // Also handle button click for mobile compatibility
  const loginBtn = loginForm.querySelector('button[type="submit"]');
  if (loginBtn) {
    loginBtn.addEventListener('click', async (e) => {
      // Prevent default to let form submit handle it, but ensure it fires
      // This is a backup for mobile browsers that might not fire submit properly
      const form = e.target.closest('form');
      if (form && !form.checkValidity()) {
        form.reportValidity();
        return;
      }
    });
  }
}

async function handleLogin() {
  const loginType = document.getElementById('loginType');
  const errorMessage = document.getElementById('errorMessage');
  
  if (!loginType) {
    console.error('Login type selector not found');
    if (errorMessage) {
      errorMessage.textContent = 'Login form error. Please refresh the page.';
      errorMessage.style.display = 'block';
    }
    return false;
  }
  
  const loginAs = loginType.value;
  console.log('Login attempt as:', loginAs);
  
  if (loginAs === 'staff') {
    // Staff login
    const passwordInput = document.getElementById('password');
    if (!passwordInput) {
      console.error('Password input not found');
      if (errorMessage) {
        errorMessage.textContent = 'Password field not found. Please refresh the page.';
        errorMessage.style.display = 'block';
      }
      return false;
    }
    
    const password = passwordInput.value.trim();
    
    console.log('Password entered:', password ? '***' : '(empty)', 'Expected:', PASSWORD, 'Match:', password === PASSWORD);
    
    if (!password) {
      if (errorMessage) {
        errorMessage.textContent = 'Please enter a password.';
        errorMessage.style.display = 'block';
      }
      passwordInput.focus();
      return false;
    }
    
    if (password === PASSWORD) {
      try {
        // Set session storage first
        sessionStorage.setItem(SESSION_KEY, 'authenticated');
        sessionStorage.removeItem(PARENT_SESSION_KEY); // Clear any parent session
        
        // Verify session was set
        const sessionCheck = sessionStorage.getItem(SESSION_KEY);
        console.log('Session stored:', sessionCheck);
        
        if (!sessionCheck) {
          throw new Error('Failed to store session');
        }
        
        // Always use absolute path /clients/dashboard.html for consistency
        const dashboardPath = '/clients/dashboard.html';
        const fullUrl = window.location.origin + dashboardPath;
        
        console.log('Login successful! Redirecting to:', fullUrl);
        console.log('Current location:', window.location.href);
        console.log('Current pathname:', window.location.pathname);
        
        // Use replace to prevent back button issues
        window.location.replace(fullUrl);
        
        return true;
      } catch (e) {
        console.error('Error setting session:', e);
        if (errorMessage) {
          errorMessage.textContent = 'Error saving session. Please try again.';
          errorMessage.style.display = 'block';
        }
        return false;
      }
    } else {
      console.log('Password mismatch');
      if (errorMessage) {
        errorMessage.textContent = 'Incorrect password. Please try again.';
        errorMessage.style.display = 'block';
      }
      passwordInput.value = '';
      setTimeout(() => passwordInput.focus(), 100);
      return false;
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
        sessionStorage.setItem(PARENT_SESSION_KEY, JSON.stringify({
          clientId: client.id,
          clientName: client.name,
          timestamp: Date.now()
        }));
        sessionStorage.removeItem(SESSION_KEY); // Clear staff session
        
        // Redirect directly to child's client page - use full URL for mobile
        const clientPath = getPath(`client.html?id=${client.id}`);
        const fullClientUrl = window.location.origin + clientPath;
        window.location.replace(fullClientUrl);
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
      sessionStorage.removeItem(PARENT_SESSION_KEY); // Clear parent session too
      const loginPath = getPath('index.html');
      const fullLoginUrl = window.location.origin + loginPath;
      window.location.replace(fullLoginUrl);
    });
  }
}

// Dashboard functionality
async function initDashboard() {
  console.log('=== DASHBOARD INITIALIZATION START ===');
  
  // Check authentication (but don't redirect if we're already here)
  const session = sessionStorage.getItem(SESSION_KEY);
  const parentSession = sessionStorage.getItem('epc_parent_session');
  console.log('Session check - Staff:', session, 'Parent:', parentSession);
  
  if (!session && !parentSession) {
    console.log('No session found, redirecting to login...');
    const loginPath = getPath('index.html');
    console.log('Redirecting to:', loginPath);
    window.location.href = loginPath;
    return;
  }
  
  initLogout();

  const addClientBtn = document.getElementById('addClientBtn');
  const repairDbBtn = document.getElementById('repairDbBtn');
  const addClientModal = document.getElementById('addClientModal');
  const closeAddModal = document.getElementById('closeAddModal');
  const cancelAddClient = document.getElementById('cancelAddClient');
  const addClientForm = document.getElementById('addClientForm');
  const clientSearch = document.getElementById('clientSearch');
  const categoryFilter = document.getElementById('categoryFilter');
  const sortFilter = document.getElementById('sortFilter');
  const clientsGrid = document.getElementById('clientsGrid');
  const emptyState = document.getElementById('emptyState');

  // Repair database button - optimized for non-blocking UI
  if (repairDbBtn) {
    repairDbBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!confirm('Repair database? This will check and fix any database issues. Your data should be safe.')) {
        return;
      }
      
      // Update UI immediately
      repairDbBtn.disabled = true;
      repairDbBtn.textContent = 'Repairing...';
      
      // Yield to browser to update UI before heavy work
      await new Promise(resolve => setTimeout(resolve, 0));
      
      try {
        if (typeof window.repairDatabase === 'function') {
          // Run repair in chunks to avoid blocking
          await window.repairDatabase();
          
          // Yield again before reloading
          await new Promise(resolve => setTimeout(resolve, 0));
          
          // Reload clients after repair
          await loadClients();
          
          // Show success message non-blocking
          repairDbBtn.textContent = '✅ Repaired!';
          setTimeout(() => {
            repairDbBtn.textContent = '🔧 Repair DB';
            repairDbBtn.disabled = false;
          }, 2000);
        } else {
          throw new Error('Repair function not available');
        }
      } catch (error) {
        console.error('Repair error:', error);
        repairDbBtn.textContent = '❌ Failed';
        setTimeout(() => {
          repairDbBtn.textContent = '🔧 Repair DB';
          repairDbBtn.disabled = false;
        }, 2000);
        alert(`Repair failed: ${error.message}\n\nPlease refresh the page or check the console.`);
      }
    }, { passive: true });
  }

  // Log Firebase connection status on dashboard load
  setTimeout(async () => {
    if (typeof window.firebaseInitialized !== 'undefined' && window.firebaseInitialized) {
      console.log('✅ Firebase is initialized');
      if (typeof window.testFirebaseConnection === 'function') {
        const result = await window.testFirebaseConnection();
        if (result.connected) {
          console.log('✅ Firebase connection verified:', result.message);
        } else {
          console.warn('⚠️ Firebase connection issue:', result.error);
        }
      }
    } else {
      console.log('ℹ️ Firebase not initialized - using local storage only');
    }
  }, 2000);

  let allClients = [];

  // Initialize database with error recovery
  try {
    await initDB();
  } catch (error) {
    console.error('Database initialization error:', error);
    const shouldRepair = confirm('Database error detected. Would you like to attempt automatic repair?\n\nThis will check and fix database issues. Your data should be safe.');
    if (shouldRepair) {
      try {
        if (typeof window.repairDatabase === 'function') {
          await window.repairDatabase();
          console.log('Database repaired, reloading...');
          // Reload clients after repair
          await loadClients();
        } else {
          throw new Error('Repair function not available');
        }
      } catch (repairError) {
        console.error('Repair failed:', repairError);
        alert('Automatic repair failed. Please refresh the page. If the problem persists, open the browser console (F12) and run: window.repairDatabase()');
      }
    }
  }

  // Load clients
  async function loadClients() {
    try {
      console.log('Loading clients from database...');
      allClients = await getAllClients();
      console.log('Clients loaded:', allClients.length);
      renderClients(allClients);
    } catch (error) {
      console.error('Error loading clients:', error);
      const errorMsg = `Error loading clients: ${error.message || error}\n\nWould you like to attempt database repair?`;
      if (confirm(errorMsg)) {
        try {
          if (typeof window.repairDatabase === 'function') {
            // Yield before repair
            await new Promise(resolve => setTimeout(resolve, 0));
            await window.repairDatabase();
            // Yield before retry
            await new Promise(resolve => setTimeout(resolve, 0));
            // Retry loading
            allClients = await getAllClients();
            renderClients(allClients);
            // Non-blocking success indicator
            const successMsg = document.createElement('div');
            successMsg.textContent = '✅ Database repaired successfully!';
            successMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 12px 20px; border-radius: 4px; z-index: 10000; box-shadow: 0 2px 8px rgba(0,0,0,0.2);';
            document.body.appendChild(successMsg);
            setTimeout(() => successMsg.remove(), 3000);
          } else {
            alert('Repair function not available. Please refresh the page.');
          }
        } catch (repairError) {
          console.error('Repair failed:', repairError);
          alert(`Repair failed: ${repairError.message}\n\nPlease refresh the page or run: window.repairDatabase()`);
        }
      } else {
        alert('Please refresh the page to retry.');
      }
    }
  }
  
  // Make it globally accessible for onclick handlers
  window.loadClients = loadClients;

  // Render clients
  function renderClients(clients) {
    if (clients.length === 0) {
      clientsGrid.textContent = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';
    const clientsHtml = clients.map(client => {
      // Calculate package status
      const totalSessions = client.packageTotalSessions || null;
      const usedSessions = client.packageUsedSessions || 0;
      const remainingSessions = client.packageRemainingSessions !== null ? client.packageRemainingSessions : (totalSessions ? totalSessions - usedSessions : null);
      
      let packageIndicator = '';
      if (remainingSessions !== null) {
        if (remainingSessions === 0) {
          packageIndicator = '<span class="package-indicator status-out" title="Out of sessions">❌</span>';
        } else if (remainingSessions <= 3) {
          packageIndicator = '<span class="package-indicator status-low" title="Low sessions">⚠️</span>';
        }
      }
      
      return `
      <div class="client-card" data-client-id="${client.id}">
        <div class="client-card-header">
          <div>
            <h3 class="client-card-name">${escapeHtml(client.name)} ${packageIndicator}</h3>
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
          ${remainingSessions !== null ? `
            <div class="client-card-info-item">
              <span>Sessions: ${remainingSessions} remaining</span>
            </div>
          ` : ''}
        </div>
        <div class="client-card-actions">
          <button class="client-card-btn" onclick="viewClient(${client.id})">View Profile</button>
          <button class="client-card-btn" onclick="addQuickNote(${client.id})">Quick Note</button>
          ${totalSessions !== null ? `
            <button class="client-card-btn btn-session-used" onclick="handleClientSessionUsed(${client.id}, '${escapeHtml(client.name)}')" title="Mark session as used today">
              ✓ Session Used
            </button>
          ` : ''}
        </div>
      </div>
    `;
    }).join('');

    // Add click handlers to cards (use event delegation for better performance)
    clientsGrid.addEventListener('click', (e) => {
      // Check if click is on a button - if so, don't navigate
      if (e.target.classList.contains('client-card-btn')) {
        return; // Let the button's onclick handle it
      }
      
      // Find the closest client card
      const card = e.target.closest('.client-card');
      if (card) {
        const clientId = card.dataset.clientId;
        if (clientId) {
          viewClient(clientId);
        }
      }
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
    console.log('Add client button found, attaching click handler');
    addClientBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Add client button clicked');
      if (addClientModal) {
        addClientModal.style.display = 'flex';
        const nameInput = document.getElementById('clientName');
        if (nameInput) {
          setTimeout(() => nameInput.focus(), 100);
        }
      } else {
        console.error('Add client modal not found!');
        alert('Add client modal not found. Please refresh the page.');
      }
    });
  } else {
    console.error('Add client button not found!');
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
    console.log('Add client form found, attaching submit handler');
    addClientForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Form submitted');

      // Validate required fields
      const clientName = document.getElementById('clientName');
      if (!clientName || !clientName.value.trim()) {
        alert('Please enter a client name.');
        if (clientName) clientName.focus();
        return;
      }

      // Generate unique parent code if not provided
      const parentPasscodeInput = document.getElementById('parentPasscode');
      let parentPasscode = parentPasscodeInput ? parentPasscodeInput.value.trim() : '';
      if (!parentPasscode) {
        // Generate a 6-digit code
        parentPasscode = Math.floor(100000 + Math.random() * 900000).toString();
        console.log('Generated parent passcode:', parentPasscode);
      }
      
      const clientData = {
        name: clientName.value.trim(),
        age: document.getElementById('clientAge')?.value ? parseInt(document.getElementById('clientAge').value) : null,
        category: document.getElementById('clientCategory')?.value || 'shared',
        primaryTrainer: document.getElementById('primaryTrainer')?.value.trim() || null,
        parentContact: document.getElementById('parentContact')?.value.trim() || null,
        parentPasscode: parentPasscode, // Auto-generated if not provided
        emergencyContact: document.getElementById('emergencyContact')?.value.trim() || null,
        goals: document.getElementById('clientGoals')?.value.trim() || null,
        medicalHistory: document.getElementById('medicalHistory')?.value.trim() || null,
        // Package/Sessions tracking
        packageName: null,
        packageTotalSessions: null,
        packageRemainingSessions: null,
        packageUsedSessions: 0,
        sessionHistory: []
      };
      
      console.log('Client data prepared:', clientData);
      
      // Show the generated code to staff
      if (parentPasscodeInput && !parentPasscodeInput.value.trim()) {
        alert(`Parent access code generated: ${parentPasscode}\n\nShare this code with ${clientData.name}'s parents for portal access.`);
      }

      // Check if addClient function is available
      if (typeof addClient !== 'function') {
        console.error('addClient function not found!');
        console.log('Available functions:', Object.keys(window).filter(k => k.includes('Client')));
        alert('Error: Database functions not loaded. Please refresh the page.\n\nIf the problem persists, try clicking the "Repair DB" button.');
        return;
      }

      // Show loading state
      const submitBtn = addClientForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding...';
      }

      try {
        console.log('Calling addClient with data:', clientData);
        const clientId = await addClient(clientData);
        console.log('✅ Client added successfully with ID:', clientId);
        addClientModal.style.display = 'none';
        addClientForm.reset();
        await window.loadClients();
        alert(`Client "${clientData.name}" added successfully!`);
      } catch (error) {
        console.error('❌ Error adding client:', error);
        console.error('Error stack:', error.stack);
        const errorMsg = `Error adding client: ${error.message || 'Unknown error'}\n\nWould you like to try repairing the database?`;
        if (confirm(errorMsg)) {
          try {
            if (typeof window.repairDatabase === 'function') {
              await window.repairDatabase();
              // Retry adding client
              const clientId = await addClient(clientData);
              addClientModal.style.display = 'none';
              addClientForm.reset();
              await window.loadClients();
              alert(`Client "${clientData.name}" added successfully after repair!`);
            } else {
              alert('Repair function not available. Please refresh the page.');
            }
          } catch (repairError) {
            console.error('Repair and retry failed:', repairError);
            alert(`Failed to add client even after repair: ${repairError.message}\n\nPlease refresh the page or check the console.`);
          }
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }
      }
    });
  } else {
    console.error('Add client form not found!');
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
  console.log('=== DASHBOARD INITIALIZATION COMPLETE ===');
}

// Handle session used for a specific client (called from client card)
async function handleClientSessionUsed(clientId, clientName) {
  try {
    const client = await getClient(clientId);
    
    if (!client) {
      alert('Client not found.');
      return;
    }
    
    if (client.packageTotalSessions === null) {
      alert('This client does not have a package set up. Please edit the client to add package information.');
      return;
    }
    
    const remainingSessions = client.packageRemainingSessions !== null ? client.packageRemainingSessions : (client.packageTotalSessions - (client.packageUsedSessions || 0));
    
    if (remainingSessions <= 0) {
      if (!confirm(`${clientName} has no sessions remaining. Are you sure you want to mark a session as used?`)) {
        return;
      }
    }
    
    const usedSessions = (client.packageUsedSessions || 0) + 1;
    const newRemainingSessions = client.packageTotalSessions - usedSessions;
    
    // Update session history
    const sessionHistory = client.sessionHistory || [];
    sessionHistory.push({
      date: new Date().toISOString(),
      usedBy: 'Staff'
    });
    
    await updateClient(clientId, {
      packageUsedSessions: usedSessions,
      packageRemainingSessions: newRemainingSessions,
      sessionHistory: sessionHistory
    });
    
    // Show notification
    let message = `Session used for ${clientName}. ${newRemainingSessions} sessions remaining.`;
    if (newRemainingSessions === 0) {
      message += '\n\n⚠️ WARNING: Client is now OUT of sessions!';
    } else if (newRemainingSessions <= 3) {
      message += '\n\n⚠️ WARNING: Client is running LOW on sessions!';
    }
    
    alert(message);
    
    // Reload clients to update display
    if (typeof loadClients === 'function') {
      await loadClients();
    } else {
      // Fallback: reload page
      window.location.reload();
    }
  } catch (error) {
    console.error('Error marking session as used:', error);
    alert('Error marking session as used. Please try again.');
  }
}

// Handle session used today (legacy function - kept for compatibility)
async function handleSessionUsed() {
  try {
    const allClients = await getAllClients();
    
    // Show modal to select client
    const clientList = allClients
      .filter(c => c.packageTotalSessions !== null && (c.packageRemainingSessions === null || c.packageRemainingSessions > 0))
      .map(c => {
        const remaining = c.packageRemainingSessions !== null ? c.packageRemainingSessions : (c.packageTotalSessions - (c.packageUsedSessions || 0));
        return { id: c.id, name: c.name, remaining };
      });
    
    if (clientList.length === 0) {
      alert('No clients with available sessions found.');
      return;
    }
    
    // Simple prompt for now - could be enhanced with a modal
    const clientNames = clientList.map((c, i) => `${i + 1}. ${c.name} (${c.remaining} remaining)`).join('\n');
    const selection = prompt(`Select a client to mark session as used:\n\n${clientNames}\n\nEnter number (1-${clientList.length}):`);
    
    const selectedIndex = parseInt(selection) - 1;
    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= clientList.length) {
      return;
    }
    
    const selectedClient = clientList[selectedIndex];
    const client = allClients.find(c => c.id === selectedClient.id);
    
    if (!client) {
      alert('Client not found.');
      return;
    }
    
    const usedSessions = (client.packageUsedSessions || 0) + 1;
    const remainingSessions = client.packageTotalSessions - usedSessions;
    
    // Update session history
    const sessionHistory = client.sessionHistory || [];
    sessionHistory.push({
      date: new Date().toISOString(),
      usedBy: 'Staff'
    });
    
    await updateClient(client.id, {
      packageUsedSessions: usedSessions,
      packageRemainingSessions: remainingSessions,
      sessionHistory: sessionHistory
    });
    
    // Show notification
    let message = `Session used for ${client.name}. ${remainingSessions} sessions remaining.`;
    if (remainingSessions === 0) {
      message += '\n\n⚠️ WARNING: Client is now OUT of sessions!';
    } else if (remainingSessions <= 3) {
      message += '\n\n⚠️ WARNING: Client is running LOW on sessions!';
    }
    
    alert(message);
    
    // Reload clients to update display
    await loadClients();
  } catch (error) {
    console.error('Error marking session as used:', error);
    alert('Error marking session as used. Please try again.');
  }
}

// View client profile
function viewClient(clientId) {
  const pathname = window.location.pathname;
  if (pathname.includes('/clients/')) {
    const clientsIndex = pathname.indexOf('/clients/');
    const basePath = pathname.substring(0, clientsIndex + '/clients/'.length);
    window.location.href = basePath + `client.html?id=${clientId}`;
  } else {
    window.location.href = `./client.html?id=${clientId}`;
  }
}

// Add quick note (placeholder for future implementation)
function addQuickNote(clientId) {
  const note = prompt('Enter a quick note:');
  if (note && note.trim()) {
    // Note: saveProgressNote function needs to be imported from db.js
    if (typeof saveProgressNote === 'function') {
      saveProgressNote(clientId, note)
        .then(() => {
          alert('Note added successfully!');
          loadClients();
        })
        .catch(error => {
          console.error('Error adding note:', error);
          alert('Error adding note. Please try again.');
        });
    } else {
      console.error('saveProgressNote function not available');
      alert('Note saving not available. Please use the client profile page.');
    }
  }
}

// Make functions available globally for onclick handlers (define early)
if (typeof window !== 'undefined') {
  // Define these early so they're available when HTML is rendered
  window.viewClient = function(clientId) {
    const pathname = window.location.pathname;
    if (pathname.includes('/clients/')) {
      const clientsIndex = pathname.indexOf('/clients/');
      const basePath = pathname.substring(0, clientsIndex + '/clients/'.length);
      window.location.href = basePath + `client.html?id=${clientId}`;
    } else {
      window.location.href = `./client.html?id=${clientId}`;
    }
  };
  
  window.addQuickNote = function(clientId) {
    const note = prompt('Enter a quick note:');
    if (note && note.trim()) {
      if (typeof saveProgressNote === 'function') {
        saveProgressNote(clientId, note)
          .then(() => {
            alert('Note added successfully!');
            if (typeof window.loadClients === 'function') {
              window.loadClients();
            }
          })
          .catch(error => {
            console.error('Error adding note:', error);
            alert('Error adding note. Please try again.');
          });
      } else {
        console.error('saveProgressNote function not available');
        alert('Note saving not available. Please use the client profile page.');
      }
    }
  };
  
  window.handleClientSessionUsed = async function(clientId, clientName) {
    try {
      const client = await getClient(clientId);
      
      if (!client) {
        alert('Client not found.');
        return;
      }
      
      if (client.packageTotalSessions === null) {
        alert('This client does not have a package set up. Please edit the client to add package information.');
        return;
      }
      
      const remainingSessions = client.packageRemainingSessions !== null ? client.packageRemainingSessions : (client.packageTotalSessions - (client.packageUsedSessions || 0));
      
      if (remainingSessions <= 0) {
        if (!confirm(`${clientName} has no sessions remaining. Are you sure you want to mark a session as used?`)) {
          return;
        }
      }
      
      const usedSessions = (client.packageUsedSessions || 0) + 1;
      const newRemainingSessions = client.packageTotalSessions - usedSessions;
      
      // Update session history
      const sessionHistory = client.sessionHistory || [];
      sessionHistory.push({
        date: new Date().toISOString(),
        usedBy: 'Staff'
      });
      
      await updateClient(clientId, {
        packageUsedSessions: usedSessions,
        packageRemainingSessions: newRemainingSessions,
        sessionHistory: sessionHistory
      });
      
      // Show notification
      let message = `Session used for ${clientName}. ${newRemainingSessions} sessions remaining.`;
      if (newRemainingSessions === 0) {
        message += '\n\n⚠️ WARNING: Client is now OUT of sessions!';
      } else if (newRemainingSessions <= 3) {
        message += '\n\n⚠️ WARNING: Client is running LOW on sessions!';
      }
      
      alert(message);
      
      // Reload clients to update display
      if (typeof window.loadClients === 'function') {
        await window.loadClients();
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error marking session as used:', error);
      alert('Error marking session as used. Please try again.');
    }
  };
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

// Helper: are we on the dashboard page? (handles /clients/dashboard and /clients/dashboard.html)
function isDashboardPage() {
  const p = window.location.pathname;
  return p.includes('dashboard.html') || p.endsWith('/dashboard') || p === '/clients/dashboard';
}

// Initialize based on current page
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/clients/') || window.location.pathname.endsWith('/clients')) {
      initLogin();
    } else if (isDashboardPage()) {
      initDashboard();
    }
  });
} else {
  if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/clients/') || window.location.pathname.endsWith('/clients')) {
    initLogin();
  } else if (isDashboardPage()) {
    initDashboard();
  }
}
