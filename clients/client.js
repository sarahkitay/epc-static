// EPC Client Management System - Client Profile Page

let currentClientId = null;
let currentClient = null;
let exerciseLibrary = [];

// Default exercise library (NC State youth training template based)
const DEFAULT_EXERCISES = [
  'Goblet Squat', 'Romanian Deadlift', 'Lunge', 'Step-up', 'Single Leg RDL',
  'Push-up', 'Bench Press', 'Overhead Press', 'Pull-up', 'Row',
  'Plank', 'Dead Bug', 'Bird Dog', 'Side Plank', 'Hollow Hold',
  'Band Pull-apart', 'Face Pull', 'Y-T-W', 'Scapular Wall Slide',
  'Leg Curl', 'Leg Extension', 'Calf Raise', 'Hip Thrust', 'Glute Bridge',
  'Medicine Ball Throw', 'Box Jump', 'Broad Jump', 'Lateral Bound',
  'Farmer\'s Walk', 'Suitcase Carry', 'Turkish Get-up', 'Bear Crawl',
  'A-Skip', 'B-Skip', 'High Knees', 'Butt Kicks', 'Lateral Shuffle'
];

// Check if current session is parent session
function isParentSession() {
  const PARENT_SESSION_KEY = 'epc_secure_session_v1_parent';
  const parentSession = sessionStorage.getItem(PARENT_SESSION_KEY);
  if (!parentSession) return false;
  
  try {
    const parentData = JSON.parse(parentSession);
    // Check if session is still valid (24 hours)
    if (Date.now() - parentData.timestamp > 24 * 60 * 60 * 1000) {
      sessionStorage.removeItem(PARENT_SESSION_KEY);
      return false;
    }
    return parentData;
  } catch (e) {
    return false;
  }
}

// Initialize client page
async function initClientPage() {
  checkAuth();
  initLogout();

  // Get client ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  currentClientId = parseInt(urlParams.get('id'));

  if (!currentClientId) {
    // Check if parent session exists
    const parentData = isParentSession();
    if (parentData) {
      currentClientId = parentData.clientId;
      // Update URL without reload
      window.history.replaceState({}, '', `?id=${currentClientId}`);
    } else {
      alert('No client ID provided. Redirecting to dashboard.');
      const pathname = window.location.pathname;
      if (pathname.includes('/clients/')) {
        const clientsIndex = pathname.indexOf('/clients/');
        const basePath = pathname.substring(0, clientsIndex + '/clients/'.length);
        window.location.href = basePath + 'dashboard.html';
      } else {
        window.location.href = './dashboard.html';
      }
      return;
    }
  }
  
  // Check if parent is accessing - verify they can only see their child
  const parentData = isParentSession();
  if (parentData && parentData.clientId !== currentClientId) {
    alert('You can only access your child\'s information.');
    window.location.href = getPath(`client.html?id=${parentData.clientId}`);
    return;
  }

  // Initialize database
  await initDB();

  // Load client data
  await loadClientData();

  // Initialize tabs
  initTabs();

  // Check if parent session - make page read-only (reuse parentData from above)
  if (parentData) {
    makePageReadOnly();
  }
  
  // Initialize all sections
  console.log('Initializing client page sections...');
  try {
    initAssessment();
    console.log('Assessment initialized');
  } catch (e) {
    console.error('Error initializing assessment:', e);
  }
  
  try {
    initProgramBuilder();
    console.log('Program builder initialized');
  } catch (e) {
    console.error('Error initializing program builder:', e);
  }
  
  try {
    initPhotos();
    console.log('Photos initialized');
  } catch (e) {
    console.error('Error initializing photos:', e);
  }
  
  try {
    initNotes();
    console.log('Notes initialized');
  } catch (e) {
    console.error('Error initializing notes:', e);
  }
  
  try {
    initPTNotes();
    console.log('PT notes initialized');
  } catch (e) {
    console.error('Error initializing PT notes:', e);
  }
  
  try {
    initClientActions();
    console.log('Client actions initialized');
  } catch (e) {
    console.error('Error initializing client actions:', e);
  }
  
  try {
    initClientDataExport();
    console.log('Client data export initialized');
  } catch (e) {
    console.error('Error initializing client data export:', e);
  }
  
  // Initialize package/sessions tracking
  try {
    initPackageTracking();
    console.log('Package tracking initialized');
  } catch (e) {
    console.error('Error initializing package tracking:', e);
  }

  // Load exercise library
  exerciseLibrary = [...DEFAULT_EXERCISES];
  // renderExerciseLibrary is defined later in the file, call it after a short delay
  setTimeout(() => {
    if (typeof renderExerciseLibrary === 'function') {
      renderExerciseLibrary();
    }
  }, 0);
}

// Load client data
async function loadClientData() {
  try {
    currentClient = await getClient(currentClientId);
    if (!currentClient) {
      alert('Client not found. Redirecting to dashboard.');
      // Ensure we stay in /clients/ directory
      const pathname = window.location.pathname;
      if (pathname.includes('/clients/')) {
        const clientsIndex = pathname.indexOf('/clients/');
        const basePath = pathname.substring(0, clientsIndex + '/clients/'.length);
        window.location.href = basePath + 'dashboard.html';
      } else {
        window.location.href = './dashboard.html';
      }
      return;
    }

    // Update UI with client info
    document.getElementById('clientNameHeader').textContent = currentClient.name;
    document.getElementById('clientNameTitle').textContent = currentClient.name;
    
    const categoryBadge = document.getElementById('clientCategoryBadge');
    categoryBadge.textContent = currentClient.category === 'shared' ? 'Shared Client' : 'Personal Client';
    
    if (currentClient.age) {
      document.getElementById('clientAgeMeta').textContent = `Age: ${currentClient.age}`;
    }
    
    if (currentClient.primaryTrainer) {
      document.getElementById('clientTrainerMeta').textContent = `Trainer: ${currentClient.primaryTrainer}`;
    }
    
    // Load package info after client data is loaded
    setTimeout(() => {
      loadPackageInfo();
    }, 100);
  } catch (error) {
    console.error('Error loading client:', error);
    alert('Error loading client data.');
  }
}

// Initialize tabs
function initTabs() {
  console.log('Initializing tabs...');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  console.log('Found tab buttons:', tabButtons.length);
  console.log('Found tab panels:', tabPanels.length);

  tabButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const targetTab = button.dataset.tab;
      console.log('Tab clicked:', targetTab);

      if (!targetTab) {
        console.error('No data-tab attribute found on button');
        return;
      }

      // Update active states
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanels.forEach(panel => panel.classList.remove('active'));

      button.classList.add('active');
      
      const targetPanel = document.getElementById(`${targetTab}-tab`);
      if (targetPanel) {
        targetPanel.classList.add('active');
        console.log('Switched to tab:', targetTab);
      } else {
        console.error('Tab panel not found:', `${targetTab}-tab`);
      }
    });
  });
  
  console.log('Tabs initialized');
}

// ===== ASSESSMENT =====
function initAssessment() {
  const saveAssessmentBtn = document.getElementById('saveAssessmentBtn');
  const saveAssessmentBtnBottom = document.getElementById('saveAssessmentBtnBottom');
  const assessmentForm = document.getElementById('assessmentForm');

  // Set default date to today
  const dateInput = document.getElementById('assessmentDate');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  // Handle save button clicks (both top and bottom)
  const handleSaveClick = async () => {
    await handleSaveAssessment();
  };

  if (saveAssessmentBtn) {
    saveAssessmentBtn.addEventListener('click', handleSaveClick);
  }

  if (saveAssessmentBtnBottom) {
    saveAssessmentBtnBottom.addEventListener('click', handleSaveClick);
  }

  // Also handle form submit
  if (assessmentForm) {
    assessmentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleSaveAssessment();
    });
  }

  // Load assessment history
  loadAssessmentHistory();

  // View all assessments modal
  const viewAllAssessmentsBtn = document.getElementById('viewAllAssessmentsBtn');
  const viewAllAssessmentsModal = document.getElementById('viewAllAssessmentsModal');
  const closeViewAssessmentsModal = document.getElementById('closeViewAssessmentsModal');
  const closeViewAssessmentsBtn = document.getElementById('closeViewAssessmentsBtn');

  if (viewAllAssessmentsBtn) {
    viewAllAssessmentsBtn.addEventListener('click', async () => {
      await loadAllAssessmentsModal();
      if (viewAllAssessmentsModal) viewAllAssessmentsModal.style.display = 'flex';
    });
  }

  if (closeViewAssessmentsModal) {
    closeViewAssessmentsModal.addEventListener('click', () => {
      if (viewAllAssessmentsModal) viewAllAssessmentsModal.style.display = 'none';
    });
  }

  if (closeViewAssessmentsBtn) {
    closeViewAssessmentsBtn.addEventListener('click', () => {
      if (viewAllAssessmentsModal) viewAllAssessmentsModal.style.display = 'none';
    });
  }
}

async function loadAllAssessmentsModal() {
  try {
    const assessments = await getClientAssessments(currentClientId);
    const allAssessmentsList = document.getElementById('allAssessmentsList');
    
    if (assessments.length === 0) {
      if (typeof setSafeHTML !== 'undefined') {
        setSafeHTML(allAssessmentsList, '<p style="color: var(--epc-ink-dim); text-align: center; padding: 40px;">No assessments found.</p>');
      } else {
        allAssessmentsList.textContent = 'No assessments found.';
      }
      return;
    }

    const html = assessments.map((assessment, index) => `
      <div class="assessment-history-item" style="margin-bottom: 24px;">
        <div class="assessment-history-date" style="font-size: 14px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid var(--epc-line);">
          Assessment #${assessments.length - index} - ${formatDate(assessment.date)}
        </div>
        <div class="assessment-content" style="display: grid; gap: 12px;">
          ${assessment.proteusScore ? `
            <div><strong>Proteus Score:</strong> ${escapeHtml(assessment.proteusScore)}</div>
          ` : ''}
          ${assessment.powerOutput ? `
            <div><strong>Power Output:</strong> ${escapeHtml(assessment.powerOutput)}</div>
            ${assessment.powerOutputNotes ? `<div style="margin-left: 16px; color: var(--epc-ink-dim); font-size: 13px;">${escapeHtml(assessment.powerOutputNotes)}</div>` : ''}
          ` : ''}
          ${assessment.speed ? `
            <div><strong>Speed:</strong> ${escapeHtml(assessment.speed)}</div>
            ${assessment.speedNotes ? `<div style="margin-left: 16px; color: var(--epc-ink-dim); font-size: 13px;">${escapeHtml(assessment.speedNotes)}</div>` : ''}
          ` : ''}
          ${assessment.pedicsReview ? `
            <div><strong>PEDICS Review:</strong><div style="margin-top: 4px; color: var(--epc-ink-dim);">${escapeHtml(assessment.pedicsReview)}</div></div>
          ` : ''}
          ${assessment.kneeValgus || assessment.kneeVarus || assessment.hipShift !== 'none' ? `
            <div><strong>Overhead Squat Assessment:</strong>
              <div style="margin-left: 16px; margin-top: 4px;">
                ${assessment.kneeValgus ? '<div>• Knee Valgus</div>' : ''}
                ${assessment.kneeVarus ? '<div>• Knee Varus</div>' : ''}
                ${assessment.hipShift !== 'none' ? `<div>• Hip Shift: ${assessment.hipShift}</div>` : ''}
                ${assessment.squatOverallScore ? `<div>• Overall Score: ${assessment.squatOverallScore}</div>` : ''}
                ${assessment.squatNotes ? `<div style="margin-top: 4px; color: var(--epc-ink-dim); font-size: 13px;">${escapeHtml(assessment.squatNotes)}</div>` : ''}
              </div>
            </div>
          ` : ''}
          ${assessment.shoulderRightScore || assessment.shoulderLeftScore ? `
            <div><strong>Shoulder Mobility:</strong>
              <div style="margin-left: 16px; margin-top: 4px;">
                ${assessment.shoulderRightScore ? `<div>Right: ${assessment.shoulderRightScore}/3</div>` : ''}
                ${assessment.shoulderLeftScore ? `<div>Left: ${assessment.shoulderLeftScore}/3</div>` : ''}
                ${assessment.shoulderNotes ? `<div style="margin-top: 4px; color: var(--epc-ink-dim); font-size: 13px;">${escapeHtml(assessment.shoulderNotes)}</div>` : ''}
              </div>
            </div>
          ` : ''}
          ${assessment.hamstringScore ? `
            <div><strong>Hamstring Mobility:</strong> ${assessment.hamstringScore}
              ${assessment.hamstringNotes ? `<div style="margin-top: 4px; color: var(--epc-ink-dim); font-size: 13px;">${escapeHtml(assessment.hamstringNotes)}</div>` : ''}
            </div>
          ` : ''}
          ${assessment.pushupScore ? `
            <div><strong>Push-up Assessment:</strong> ${assessment.pushupScore}
              ${assessment.pushupNotes ? `<div style="margin-top: 4px; color: var(--epc-ink-dim); font-size: 13px;">${escapeHtml(assessment.pushupNotes)}</div>` : ''}
            </div>
          ` : ''}
        </div>
      </div>
    `).join('');
    
    // Use DOMPurify to sanitize HTML before rendering
    if (typeof setSafeHTML !== 'undefined') {
      setSafeHTML(allAssessmentsList, htmlContent);
    } else if (typeof sanitizeHTML !== 'undefined') {
      allAssessmentsList.innerHTML = sanitizeHTML(htmlContent);
    } else {
      // Fallback: use textContent for safety
      allAssessmentsList.textContent = 'Assessment data loaded';
    }
  } catch (error) {
    console.error('Error loading all assessments:', error);
    const errorEl = document.getElementById('allAssessmentsList');
    if (errorEl) {
      if (typeof setSafeHTML !== 'undefined') {
        setSafeHTML(errorEl, '<p style="color: #dc3545;">Error loading assessments.</p>');
      } else {
        errorEl.textContent = 'Error loading assessments.';
      }
    }
  }
}

async function handleSaveAssessment() {
  const proteusScoreValue = document.getElementById('proteusScore').value.trim();
  const assessmentData = {
    proteusScore: proteusScoreValue || null,
    powerOutput: document.getElementById('powerOutput').value.trim() || null,
    powerOutputNotes: document.getElementById('powerOutputNotes').value.trim() || null,
    speed: document.getElementById('speed').value.trim() || null,
    speedNotes: document.getElementById('speedNotes').value.trim() || null,
    pedicsReview: document.getElementById('pedicsReview').value.trim() || null,
    kneeValgus: document.getElementById('kneeValgus').checked,
    kneeVarus: document.getElementById('kneeVarus').checked,
    hipShift: document.getElementById('hipShift').value,
    squatOverallScore: document.getElementById('squatOverallScore').value ? parseFloat(document.getElementById('squatOverallScore').value) : null,
    squatNotes: document.getElementById('squatNotes').value.trim() || null,
    shoulderRightScore: document.getElementById('shoulderRightScore').value ? parseInt(document.getElementById('shoulderRightScore').value) : null,
    shoulderLeftScore: document.getElementById('shoulderLeftScore').value ? parseInt(document.getElementById('shoulderLeftScore').value) : null,
    shoulderNotes: document.getElementById('shoulderNotes').value.trim() || null,
    hamstringScore: document.getElementById('hamstringScore').value ? parseFloat(document.getElementById('hamstringScore').value) : null,
    hamstringNotes: document.getElementById('hamstringNotes').value.trim() || null,
    pushupScore: document.getElementById('pushupScore').value ? parseInt(document.getElementById('pushupScore').value) : null,
    pushupNotes: document.getElementById('pushupNotes').value.trim() || null,
    date: document.getElementById('assessmentDate').value || new Date().toISOString()
  };

  try {
    await saveAssessment(currentClientId, assessmentData);
    alert('Assessment saved successfully!');
    
    // Clear form
    document.getElementById('assessmentForm').reset();
    document.getElementById('assessmentDate').value = new Date().toISOString().split('T')[0];
    
    // Reload history
    loadAssessmentHistory();
  } catch (error) {
    console.error('Error saving assessment:', error);
    alert('Error saving assessment. Please try again.');
  }
}

async function loadAssessmentHistory() {
  try {
    const assessments = await getClientAssessments(currentClientId);
    const historyList = document.getElementById('assessmentHistoryList');
    
    if (assessments.length === 0) {
      if (typeof setSafeHTML !== 'undefined') {
        setSafeHTML(historyList, '<p style="color: var(--epc-ink-dim);">No previous assessments.</p>');
      } else {
        historyList.textContent = 'No previous assessments.';
      }
      return;
    }

      const historyHtml = assessments.map(assessment => `
      <div class="assessment-history-item">
        <div class="assessment-history-date">${formatDate(assessment.date)}</div>
        <div class="assessment-content">
          ${assessment.proteusScore ? `<p><strong>Proteus Score:</strong> ${escapeHtml(assessment.proteusScore)}</p>` : ''}
          ${assessment.powerOutput ? `<p><strong>Power Output:</strong> ${escapeHtml(assessment.powerOutput)}</p>` : ''}
          ${assessment.speed ? `<p><strong>Speed:</strong> ${escapeHtml(assessment.speed)}</p>` : ''}
          ${assessment.squatOverallScore ? `<p><strong>Overhead Squat Score:</strong> ${assessment.squatOverallScore}</p>` : ''}
          ${assessment.shoulderRightScore || assessment.shoulderLeftScore ? 
            `<p><strong>Shoulder Mobility:</strong> R: ${assessment.shoulderRightScore || 'N/A'}, L: ${assessment.shoulderLeftScore || 'N/A'}</p>` : ''}
          ${assessment.hamstringScore ? `<p><strong>Hamstring Mobility:</strong> ${assessment.hamstringScore}</p>` : ''}
          ${assessment.pushupScore ? `<p><strong>Push-up Score:</strong> ${assessment.pushupScore}</p>` : ''}
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading assessment history:', error);
  }
}

// ===== PROGRAM BUILDER =====
let currentExercises = [];
let renderProgramExercisesFn = null;

function initProgramBuilder() {
  const exerciseSearch = document.getElementById('exerciseSearch');
  const addCustomExerciseBtn = document.getElementById('addCustomExerciseBtn');
  const clearProgramBtn = document.getElementById('clearProgramBtn');
  const printProgramBtn = document.getElementById('printProgramBtn');

  // Reset current exercises
  currentExercises = [];

  // Exercise search
  if (exerciseSearch) {
    exerciseSearch.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const filtered = exerciseLibrary.filter(ex => 
        ex.toLowerCase().includes(searchTerm)
      );
      renderExerciseLibrary(filtered);
    });
  }

  // Add custom exercise
  if (addCustomExerciseBtn) {
    addCustomExerciseBtn.addEventListener('click', () => {
      const exerciseName = prompt('Enter exercise name:');
      if (exerciseName && exerciseName.trim()) {
        exerciseLibrary.push(exerciseName.trim());
        renderExerciseLibrary();
        document.getElementById('exerciseSearch').value = '';
      }
    });
  }

  // Add exercise to program (local function for exercise search)
  function addExerciseToProgramLocal(exerciseName) {
    currentExercises.push({
      name: exerciseName,
      sets: '',
      reps: '',
      weight: '',
      rest: '',
      notes: ''
    });
    if (renderProgramExercisesFn) renderProgramExercisesFn();
  }

  // Render exercise library
  function renderExerciseLibrary(exercises = exerciseLibrary) {
    const library = document.getElementById('exerciseLibrary');
    if (!library) return;

    const libraryHtml = exercises.map(exercise => `
      <div class="exercise-item" onclick="addExerciseToProgram('${escapeHtml(exercise)}')">
        ${escapeHtml(exercise)}
      </div>
    `).join('');
  }
  
  // Store render function reference
  window.renderProgramExercisesGlobal = renderProgramExercisesFn;

  // Render program exercises
  renderProgramExercisesFn = function() {
    const container = document.getElementById('programExercises');
    if (!container) return;

    if (currentExercises.length === 0) {
      if (typeof setSafeHTML !== 'undefined') {
        setSafeHTML(container, '<div class="empty-program"><p>No exercises added yet. Click exercises from the library to add them.</p></div>');
      } else {
        container.textContent = 'No exercises added yet.';
      }
      return;
    }

    const exercisesHtml = currentExercises.map((exercise, index) => `
      <div class="program-exercise" data-index="${index}">
        <div class="exercise-header">
          <div class="exercise-name">${escapeHtml(exercise.name)}</div>
          <button class="exercise-remove" onclick="removeExercise(${index})">&times;</button>
        </div>
        <div class="exercise-fields">
          <div class="form-group">
            <label class="form-label">Sets</label>
            <input type="text" class="form-input" value="${escapeHtml(exercise.sets)}" 
              onchange="updateExercise(${index}, 'sets', this.value)" />
          </div>
          <div class="form-group">
            <label class="form-label">Reps</label>
            <input type="text" class="form-input" value="${escapeHtml(exercise.reps)}" 
              onchange="updateExercise(${index}, 'reps', this.value)" />
          </div>
          <div class="form-group">
            <label class="form-label">Weight</label>
            <input type="text" class="form-input" value="${escapeHtml(exercise.weight)}" 
              onchange="updateExercise(${index}, 'weight', this.value)" />
          </div>
          <div class="form-group">
            <label class="form-label">Rest</label>
            <input type="text" class="form-input" value="${escapeHtml(exercise.rest)}" 
              onchange="updateExercise(${index}, 'rest', this.value)" placeholder="e.g., 60s" />
          </div>
        </div>
        <div class="form-group" style="margin-top: 12px;">
          <label class="form-label">Notes</label>
          <textarea class="form-textarea" rows="2" 
            onchange="updateExercise(${index}, 'notes', this.value)">${escapeHtml(exercise.notes)}</textarea>
        </div>
      </div>
    `).join('');
    
    if (typeof setSafeHTML !== 'undefined') {
      setSafeHTML(container, exercisesHtml);
    } else if (typeof sanitizeHTML !== 'undefined') {
      container.innerHTML = sanitizeHTML(exercisesHtml);
    } else {
      container.textContent = `${currentExercises.length} exercise(s) in program`;
    }
  };

  renderProgramExercisesFn();

  // Update exercise
  window.updateExercise = function(index, field, value) {
    if (currentExercises[index]) {
      currentExercises[index][field] = value;
    }
  };

  // Remove exercise
  window.removeExercise = function(index) {
    currentExercises.splice(index, 1);
    if (renderProgramExercisesFn) renderProgramExercisesFn();
  };

  // Add exercise to program (global for onclick)
  window.addExerciseToProgram = function(exerciseName) {
    currentExercises.push({
      name: exerciseName,
      sets: '',
      reps: '',
      weight: '',
      rest: '',
      notes: ''
    });
    if (renderProgramExercisesFn) renderProgramExercisesFn();
  };

  // Clear program
  if (clearProgramBtn) {
    clearProgramBtn.addEventListener('click', () => {
      if (confirm('Clear all exercises from this program?')) {
        currentExercises = [];
        if (renderProgramExercisesFn) renderProgramExercisesFn();
      }
    });
  }

  // Print program
  if (printProgramBtn) {
    printProgramBtn.addEventListener('click', () => {
      if (currentExercises.length === 0) {
        alert('Please add exercises to the program before printing.');
        return;
      }

      const week = document.getElementById('programWeek').value;
      printProgram(currentExercises, week);
    });
  }

  // Save program
  async function handleSaveProgram() {
    if (currentExercises.length === 0) {
      alert('Please add exercises to the program before saving.');
      return;
    }

    const week = document.getElementById('programWeek').value;
    const programData = {
      week: parseInt(week),
      exercises: currentExercises
    };

    try {
      await saveProgram(currentClientId, programData);
      alert('Program saved successfully!');
      
      // Reload program history
      loadProgramHistory();
    } catch (error) {
      console.error('Error saving program:', error);
      alert('Error saving program. Please try again.');
    }
  }

  // Add save button handler
  const saveProgramBtn = document.getElementById('saveProgramBtn');
  if (saveProgramBtn) {
    saveProgramBtn.addEventListener('click', handleSaveProgram);
  }

  // Load program history
  async function loadProgramHistory() {
    try {
      const programs = await getClientPrograms(currentClientId);
      const historyList = document.getElementById('programHistoryList');
      
      if (programs.length === 0) {
        if (typeof setSafeHTML !== 'undefined') {
          setSafeHTML(historyList, '<p style="color: var(--epc-ink-dim);">No saved programs.</p>');
        } else {
          historyList.textContent = 'No saved programs.';
        }
        return;
      }

      const programsHtml = programs.map(program => `
        <div class="assessment-history-item">
          <div class="assessment-history-date">Week ${program.week} - ${formatDate(program.createdAt)}</div>
          <div class="program-exercises-preview">
            ${program.exercises.map(ex => `<p>• ${escapeHtml(ex.name)}</p>`).join('')}
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Error loading program history:', error);
    }
  }

  loadProgramHistory();
}

// Print program
function printProgram(exercises, week) {
  const printWindow = window.open('', '_blank');
  const clientName = currentClient.name;
  const date = new Date().toLocaleDateString();
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Training Program - ${clientName}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }
        h1 {
          color: #333;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
        }
        .program-info {
          margin-bottom: 30px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        .exercise-row {
          page-break-inside: avoid;
        }
        @media print {
          body {
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <h1>Training Program</h1>
      <div class="program-info">
        <p><strong>Client:</strong> ${escapeHtml(clientName)}</p>
        <p><strong>Week:</strong> ${week}</p>
        <p><strong>Date:</strong> ${date}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Exercise</th>
            <th>Sets</th>
            <th>Reps</th>
            <th>Weight</th>
            <th>Rest</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${exercises.map(ex => `
            <tr class="exercise-row">
              <td><strong>${escapeHtml(ex.name)}</strong></td>
              <td><input type="text" style="border: none; width: 100%;" placeholder="____" /></td>
              <td><input type="text" style="border: none; width: 100%;" placeholder="____" /></td>
              <td><input type="text" style="border: none; width: 100%;" placeholder="____" /></td>
              <td>${escapeHtml(ex.rest || '')}</td>
              <td>${escapeHtml(ex.notes || '')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `);
  
  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

// ===== PHOTOS =====
function initPhotos() {
  const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
  const photoUploadArea = document.getElementById('photoUploadArea');
  const photoInput = document.getElementById('photoInput');
  const cancelUploadBtn = document.getElementById('cancelUploadBtn');
  const processPhotoBtn = document.getElementById('processPhotoBtn');
  const savePhotoBtn = document.getElementById('savePhotoBtn');
  const editExtractedBtn = document.getElementById('editExtractedBtn');

  let currentPhotoData = null;
  let extractedText = '';

  if (uploadPhotoBtn) {
    uploadPhotoBtn.addEventListener('click', () => {
      photoUploadArea.style.display = photoUploadArea.style.display === 'none' ? 'block' : 'none';
    });
  }

  if (photoInput) {
    photoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const preview = document.getElementById('previewImage');
          const uploadPreview = document.getElementById('uploadPreview');
          preview.src = event.target.result;
          uploadPreview.style.display = 'block';
          currentPhotoData = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Manual text entry elements
  const skipOcrBtn = document.getElementById('skipOcrBtn');
  const manualTextEntry = document.getElementById('manualTextEntry');
  const backToOcrBtn = document.getElementById('backToOcrBtn');
  const saveWithManualTextBtn = document.getElementById('saveWithManualTextBtn');

  if (cancelUploadBtn) {
    cancelUploadBtn.addEventListener('click', () => {
      photoUploadArea.style.display = 'none';
      document.getElementById('photoInput').value = '';
      document.getElementById('uploadPreview').style.display = 'none';
      document.getElementById('ocrProgress').style.display = 'none';
      document.getElementById('ocrResults').style.display = 'none';
      if (manualTextEntry) manualTextEntry.style.display = 'none';
      currentPhotoData = null;
      extractedText = '';
    });
  }

  // Skip OCR and enter text manually
  if (skipOcrBtn) {
    skipOcrBtn.addEventListener('click', () => {
      document.getElementById('uploadPreview').style.display = 'none';
      if (manualTextEntry) {
        manualTextEntry.style.display = 'block';
        document.getElementById('manualText').focus();
      }
    });
  }

  // Back to OCR option
  if (backToOcrBtn) {
    backToOcrBtn.addEventListener('click', () => {
      if (manualTextEntry) manualTextEntry.style.display = 'none';
      document.getElementById('uploadPreview').style.display = 'block';
    });
  }

  // Save with manual text
  if (saveWithManualTextBtn) {
    saveWithManualTextBtn.addEventListener('click', async () => {
      if (!currentPhotoData) {
        alert('No photo to save.');
        return;
      }

      const text = document.getElementById('manualText').value.trim();

      try {
        await saveProgramPhoto(currentClientId, {
          photoData: currentPhotoData,
          extractedText: text,
          week: document.getElementById('programWeek')?.value || null
        });

        alert('Photo saved successfully!');
        
        // Reset
        photoUploadArea.style.display = 'none';
        document.getElementById('photoInput').value = '';
        document.getElementById('uploadPreview').style.display = 'none';
        if (manualTextEntry) manualTextEntry.style.display = 'none';
        document.getElementById('manualText').value = '';
        currentPhotoData = null;
        extractedText = '';

        // Reload gallery
        loadPhotos();
      } catch (error) {
        console.error('Error saving photo:', error);
        alert('Error saving photo. Please try again.');
      }
    });
  }

  if (processPhotoBtn) {
    processPhotoBtn.addEventListener('click', async () => {
      if (!currentPhotoData) {
        alert('Please select a photo first.');
        return;
      }

      const progressBar = document.getElementById('ocrProgress');
      const progressFill = document.getElementById('progressFill');
      const progressText = document.getElementById('progressText');
      
      progressBar.style.display = 'block';
      progressFill.style.width = '0%';
      progressText.textContent = 'Processing image...';

      try {
        // Check if Tesseract is loaded
        if (typeof Tesseract === 'undefined') {
          throw new Error('Tesseract.js not loaded. Please refresh the page.');
        }

        // Use Tesseract.js for OCR with compatible settings
        const worker = await Tesseract.createWorker('eng', 1, {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              const progress = Math.round(m.progress * 100);
              progressFill.style.width = `${progress}%`;
              progressText.textContent = `Processing: ${progress}%`;
            } else if (m.status === 'loading tesseract core') {
              progressText.textContent = 'Loading OCR engine...';
            } else if (m.status === 'loading language traineddata') {
              progressText.textContent = 'Loading language data...';
            } else if (m.status === 'initializing tesseract') {
              progressText.textContent = 'Initializing...';
            }
          }
        });

        // Set OCR parameters for better accuracy (using compatible modes)
        try {
          await worker.setParameters({
            tessedit_pageseg_mode: '6', // Uniform block of text (PSM 6)
            preserve_interword_spaces: '1'
          });
        } catch (paramError) {
          console.warn('Could not set all OCR parameters, using defaults:', paramError);
        }
        
        // Recognize text from image
        const { data: { text } } = await worker.recognize(currentPhotoData);

        await worker.terminate();

        extractedText = text;
        document.getElementById('extractedText').value = text;
        document.getElementById('ocrResults').style.display = 'block';
        progressBar.style.display = 'none';
        
        // Show message if text extraction is minimal
        if (!text || text.trim().length < 3) {
          alert('OCR extracted very little text. You may want to use "Skip OCR - Enter Text Manually" option for better results.');
        }
      } catch (error) {
        console.error('OCR Error:', error);
        alert('Error processing image with OCR. You can use "Skip OCR - Enter Text Manually" option instead.');
        progressBar.style.display = 'none';
        
        // Offer to switch to manual entry
        if (confirm('OCR failed. Would you like to enter text manually instead?')) {
          document.getElementById('uploadPreview').style.display = 'none';
          if (manualTextEntry) {
            manualTextEntry.style.display = 'block';
            document.getElementById('manualText').focus();
          }
        }
      }
    });
  }

  if (editExtractedBtn) {
    editExtractedBtn.addEventListener('click', () => {
      document.getElementById('extractedText').disabled = false;
      document.getElementById('extractedText').focus();
    });
  }

  if (savePhotoBtn) {
    savePhotoBtn.addEventListener('click', async () => {
      if (!currentPhotoData) {
        alert('No photo to save.');
        return;
      }

      const text = document.getElementById('extractedText').value.trim();

      try {
        await saveProgramPhoto(currentClientId, {
          photoData: currentPhotoData,
          extractedText: text,
          week: document.getElementById('programWeek')?.value || null
        });

        alert('Photo saved successfully!');
        
        // Reset
        photoUploadArea.style.display = 'none';
        document.getElementById('photoInput').value = '';
        document.getElementById('uploadPreview').style.display = 'none';
        document.getElementById('ocrResults').style.display = 'none';
        document.getElementById('ocrProgress').style.display = 'none';
        currentPhotoData = null;
        extractedText = '';

        // Reload gallery
        loadPhotos();
      } catch (error) {
        console.error('Error saving photo:', error);
        alert('Error saving photo. Please try again.');
      }
    });
  }

  // Load photos
  loadPhotos();
}

async function loadPhotos() {
  try {
    const photos = await getClientPhotos(currentClientId);
    const gallery = document.getElementById('photosGallery');
    
    if (photos.length === 0) {
      if (typeof setSafeHTML !== 'undefined') {
        setSafeHTML(gallery, '<p style="color: var(--epc-ink-dim); text-align: center; padding: 40px;">No photos uploaded yet.</p>');
      } else {
        gallery.textContent = 'No photos uploaded yet.';
      }
      return;
    }

    const photosHtml = photos.map(photo => `
      <div class="photo-item">
        <img src="${photo.photoData}" alt="Program photo" onclick="viewPhoto('${photo.id}')" />
        <div class="photo-item-content">
          <div class="photo-item-date">${formatDate(photo.uploadedAt)}</div>
          <div class="photo-item-actions">
            <button class="client-card-btn" onclick="viewPhotoText('${photo.id}')">View Text</button>
            <button class="client-card-btn" onclick="viewPhotoCompare('${photo.id}')">Compare</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading photos:', error);
  }
}

window.viewPhoto = function(photoId) {
  // Simple modal view (can be enhanced)
  alert('Photo viewer - implement full modal view');
};

window.viewPhotoText = async function(photoId) {
  try {
    const photos = await getClientPhotos(currentClientId);
    const photo = photos.find(p => p.id === photoId);
    if (photo && photo.extractedText) {
      alert(photo.extractedText);
    } else {
      alert('No extracted text available for this photo.');
    }
  } catch (error) {
    console.error('Error viewing photo text:', error);
  }
};

window.viewPhotoCompare = async function(photoId) {
  // Simple comparison view (can be enhanced)
  alert('Photo comparison - implement side-by-side view');
};

// ===== NOTES =====
function initNotes() {
  const addNoteBtn = document.getElementById('addNoteBtn');
  const notesAdd = document.getElementById('notesAdd');
  const cancelNoteBtn = document.getElementById('cancelNoteBtn');
  const noteForm = document.getElementById('noteForm');

  if (addNoteBtn) {
    addNoteBtn.addEventListener('click', () => {
      notesAdd.style.display = notesAdd.style.display === 'none' ? 'block' : 'none';
      document.getElementById('noteContent').focus();
    });
  }

  if (cancelNoteBtn) {
    cancelNoteBtn.addEventListener('click', () => {
      notesAdd.style.display = 'none';
      document.getElementById('noteForm').reset();
    });
  }

  if (noteForm) {
    noteForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const content = document.getElementById('noteContent').value.trim();
      
      if (!content) {
        alert('Please enter a note.');
        return;
      }

      try {
        await saveProgressNote(currentClientId, content);
        alert('Note saved successfully!');
        noteForm.reset();
        notesAdd.style.display = 'none';
        loadNotes();
      } catch (error) {
        console.error('Error saving note:', error);
        alert('Error saving note. Please try again.');
      }
    });
  }

  loadNotes();
}

async function loadNotes() {
  try {
    const notes = await getClientNotes(currentClientId);
    const timeline = document.getElementById('notesTimeline');
    
    if (notes.length === 0) {
      if (typeof setSafeHTML !== 'undefined') {
        setSafeHTML(timeline, '<p style="color: var(--epc-ink-dim); text-align: center; padding: 40px;">No progress notes yet.</p>');
      } else {
        timeline.textContent = 'No progress notes yet.';
      }
      return;
    }

    timeline.innerHTML = notes.map(note => `
      <div class="note-item">
        <div class="note-date">${formatDate(note.date)}</div>
        <div class="note-content">${escapeHtml(note.content)}</div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading notes:', error);
  }
}

// ===== PT NOTES =====
function initPTNotes() {
  const addPtNoteBtn = document.getElementById('addPtNoteBtn');
  const ptAdd = document.getElementById('ptAdd');
  const cancelPtNoteBtn = document.getElementById('cancelPtNoteBtn');
  const ptNoteForm = document.getElementById('ptNoteForm');

  if (addPtNoteBtn) {
    addPtNoteBtn.addEventListener('click', () => {
      ptAdd.style.display = ptAdd.style.display === 'none' ? 'block' : 'none';
      document.getElementById('ptNoteContent').focus();
    });
  }

  if (cancelPtNoteBtn) {
    cancelPtNoteBtn.addEventListener('click', () => {
      ptAdd.style.display = 'none';
      document.getElementById('ptNoteForm').reset();
    });
  }

  if (ptNoteForm) {
    ptNoteForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const content = document.getElementById('ptNoteContent').value.trim();
      
      if (!content) {
        alert('Please enter a PT note.');
        return;
      }

      try {
        await savePTNote(currentClientId, content);
        alert('PT note saved successfully!');
        ptNoteForm.reset();
        ptAdd.style.display = 'none';
        loadPTNotes();
      } catch (error) {
        console.error('Error saving PT note:', error);
        alert('Error saving PT note. Please try again.');
      }
    });
  }

  loadPTNotes();
}

async function loadPTNotes() {
  try {
    const notes = await getClientPTNotes(currentClientId);
    const timeline = document.getElementById('ptTimeline');
    
    if (notes.length === 0) {
      if (typeof setSafeHTML !== 'undefined') {
        setSafeHTML(timeline, '<p style="color: var(--epc-ink-dim); text-align: center; padding: 40px;">No PT coordination notes yet.</p>');
      } else {
        timeline.textContent = 'No PT coordination notes yet.';
      }
      return;
    }

    timeline.innerHTML = notes.map(note => `
      <div class="note-item">
        <div class="note-date">${formatDate(note.date)}</div>
        <div class="note-content">${escapeHtml(note.content)}</div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading PT notes:', error);
  }
}

// ===== CLIENT ACTIONS =====
function initClientActions() {
  console.log('Initializing client actions...');
  const moveClientBtn = document.getElementById('moveClientBtn');
  const editClientBtn = document.getElementById('editClientBtn');
  const dataSharingBtn = document.getElementById('dataSharingBtn');
  const moveClientModal = document.getElementById('moveClientModal');
  const closeMoveModal = document.getElementById('closeMoveModal');
  const cancelMoveBtn = document.getElementById('cancelMoveBtn');
  const confirmMoveBtn = document.getElementById('confirmMoveBtn');
  
  // Hide Data Sharing button for parents (staff only)
  const isParent = !!isParentSession();
  if (dataSharingBtn) {
    if (isParent) {
      dataSharingBtn.style.display = 'none';
    } else {
      dataSharingBtn.style.display = 'inline-block';
    }
  }
  
  // Data Sharing Modal
  const dataSharingModal = document.getElementById('dataSharingModal');
  const closeDataSharingModal = document.getElementById('closeDataSharingModal');
  const cancelDataSharing = document.getElementById('cancelDataSharing');
  const saveDataSharing = document.getElementById('saveDataSharing');
  
  // Only allow data sharing setup for staff
  if (dataSharingBtn && !isParent) {
    dataSharingBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (dataSharingModal) {
        // Load current sharing settings
        const shareSettings = currentClient?.shareWithParent || {
          assessments: true,
          programs: true,
          notes: true,
          ptNotes: false,
          packageInfo: true
        };
        document.getElementById('shareAssessments').checked = shareSettings.assessments !== false;
        document.getElementById('sharePrograms').checked = shareSettings.programs !== false;
        document.getElementById('shareNotes').checked = shareSettings.notes !== false;
        document.getElementById('sharePTNotes').checked = shareSettings.ptNotes === true;
        document.getElementById('sharePackageInfo').checked = shareSettings.packageInfo !== false;
        dataSharingModal.style.display = 'flex';
      }
    });
  }
  
  if (closeDataSharingModal) {
    closeDataSharingModal.addEventListener('click', () => {
      dataSharingModal.style.display = 'none';
    });
  }
  
  if (cancelDataSharing) {
    cancelDataSharing.addEventListener('click', () => {
      dataSharingModal.style.display = 'none';
    });
  }
  
  if (saveDataSharing) {
    saveDataSharing.addEventListener('click', async () => {
      const shareSettings = {
        assessments: document.getElementById('shareAssessments').checked,
        programs: document.getElementById('sharePrograms').checked,
        notes: document.getElementById('shareNotes').checked,
        ptNotes: document.getElementById('sharePTNotes').checked,
        packageInfo: document.getElementById('sharePackageInfo').checked
      };
      try {
        await updateClient(currentClientId, { shareWithParent: shareSettings });
        alert('Data sharing settings saved successfully!');
        dataSharingModal.style.display = 'none';
        await loadClientData();
      } catch (error) {
        console.error('Error saving data sharing settings:', error);
        alert('Error saving settings. Please try again.');
      }
    });
  }

  console.log('Move client button:', moveClientBtn ? 'found' : 'NOT FOUND');
  console.log('Edit client button:', editClientBtn ? 'found' : 'NOT FOUND');
  console.log('Move client modal:', moveClientModal ? 'found' : 'NOT FOUND');

  if (moveClientBtn) {
    moveClientBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Move client button clicked');
      if (moveClientModal) {
        moveClientModal.style.display = 'flex';
        const newCategoryInput = document.getElementById('newCategory');
        if (newCategoryInput && currentClient) {
          newCategoryInput.value = currentClient.category;
        }
      } else {
        console.error('Move client modal not found');
      }
    });
  } else {
    console.error('Move client button not found!');
  }

  if (closeMoveModal) {
    closeMoveModal.addEventListener('click', () => {
      moveClientModal.style.display = 'none';
    });
  }

  if (cancelMoveBtn) {
    cancelMoveBtn.addEventListener('click', () => {
      moveClientModal.style.display = 'none';
    });
  }

  if (confirmMoveBtn) {
    confirmMoveBtn.addEventListener('click', async () => {
      const newCategory = document.getElementById('newCategory').value;
      
      try {
        await updateClient(currentClientId, { category: newCategory });
        alert('Client moved successfully!');
        moveClientModal.style.display = 'none';
        await loadClientData();
      } catch (error) {
        console.error('Error moving client:', error);
        alert('Error moving client. Please try again.');
      }
    });
  }

  // Edit Client Modal
  const editClientModal = document.getElementById('editClientModal');
  const closeEditModal = document.getElementById('closeEditModal');
  const cancelEditClient = document.getElementById('cancelEditClient');
  const editClientForm = document.getElementById('editClientForm');

  if (editClientBtn) {
    editClientBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Edit client button clicked');
      const editClientModal = document.getElementById('editClientModal');
      if (!editClientModal) {
        console.error('Edit client modal not found!');
        alert('Edit modal not found. Please refresh the page.');
        return;
      }
      
      // Populate form with current client data
      if (currentClient) {
        const nameInput = document.getElementById('editClientName');
        const ageInput = document.getElementById('editClientAge');
        const categoryInput = document.getElementById('editClientCategory');
        const trainerInput = document.getElementById('editPrimaryTrainer');
        const parentContactInput = document.getElementById('editParentContact');
        const parentPasscodeInput = document.getElementById('editParentPasscode');
        const emergencyInput = document.getElementById('editEmergencyContact');
        const goalsInput = document.getElementById('editClientGoals');
        const medicalInput = document.getElementById('editMedicalHistory');
        
        if (nameInput) nameInput.value = currentClient.name || '';
        if (ageInput) ageInput.value = currentClient.age || '';
        if (categoryInput) categoryInput.value = currentClient.category || 'shared';
        if (trainerInput) trainerInput.value = currentClient.primaryTrainer || '';
        if (parentContactInput) parentContactInput.value = currentClient.parentContact || '';
        if (parentPasscodeInput) parentPasscodeInput.value = currentClient.parentPasscode || '';
        if (emergencyInput) emergencyInput.value = currentClient.emergencyContact || '';
        if (goalsInput) goalsInput.value = currentClient.goals || '';
        if (medicalInput) medicalInput.value = currentClient.medicalHistory || '';
      }
      
      editClientModal.style.display = 'flex';
      const nameInput = document.getElementById('editClientName');
      if (nameInput) nameInput.focus();
    });
  } else {
    console.error('Edit client button not found!');
  }

  if (closeEditModal) {
    closeEditModal.addEventListener('click', () => {
      if (editClientModal) editClientModal.style.display = 'none';
      if (editClientForm) editClientForm.reset();
    });
  }

  if (cancelEditClient) {
    cancelEditClient.addEventListener('click', () => {
      if (editClientModal) editClientModal.style.display = 'none';
      if (editClientForm) editClientForm.reset();
    });
  }

  if (editClientForm) {
    editClientForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const clientData = {
        name: document.getElementById('editClientName').value.trim(),
        age: document.getElementById('editClientAge').value ? parseInt(document.getElementById('editClientAge').value) : null,
        category: document.getElementById('editClientCategory').value,
        primaryTrainer: document.getElementById('editPrimaryTrainer').value.trim() || null,
        parentContact: document.getElementById('editParentContact').value.trim() || null,
        parentPasscode: document.getElementById('editParentPasscode').value.trim() || null,
        emergencyContact: document.getElementById('editEmergencyContact').value.trim() || null,
        goals: document.getElementById('editClientGoals').value.trim() || null,
        medicalHistory: document.getElementById('editMedicalHistory').value.trim() || null
      };

      try {
        await updateClient(currentClientId, clientData);
        alert('Client information updated successfully!');
        if (editClientModal) editClientModal.style.display = 'none';
        if (editClientForm) editClientForm.reset();
        await loadClientData(); // Reload client data to refresh UI
      } catch (error) {
        console.error('Error updating client:', error);
        alert('Error updating client information. Please try again.');
      }
    });
  }
}

// Initialize client data export functionality
function initClientDataExport() {
  console.log('Initializing client data export...');
  const downloadBtn = document.getElementById('downloadClientDataBtn');
  console.log('Download button:', downloadBtn ? 'found' : 'NOT FOUND');
  if (!downloadBtn) return;

  downloadBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Download button clicked');
    
    if (!currentClientId || !currentClient) {
      alert('No client data available to download.');
      return;
    }

    // Show export options modal
    showExportOptionsModal();
  });
}

// Show export options modal
function showExportOptionsModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'flex';
  
  const modalHtml = `
    <div class="modal-overlay"></div>
    <div class="modal-content" style="max-width: 600px;">
      <div class="modal-header">
        <h3 class="modal-title">Export Client Data</h3>
        <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
      </div>
      <div class="modal-form" style="padding: 24px;">
        <p style="color: var(--epc-ink-dim); margin-bottom: 24px;">Select what to include in the export:</p>
        
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
            <input type="checkbox" id="exportClientInfo" checked style="width: 18px; height: 18px; cursor: pointer;">
            <span>Client Information</span>
          </label>
          <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
            <input type="checkbox" id="exportAssessments" checked style="width: 18px; height: 18px; cursor: pointer;">
            <span>Assessment History</span>
          </label>
          <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
            <input type="checkbox" id="exportPrograms" checked style="width: 18px; height: 18px; cursor: pointer;">
            <span>Training Programs</span>
          </label>
          <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
            <input type="checkbox" id="exportPhotos" checked style="width: 18px; height: 18px; cursor: pointer;">
            <span>Program Photos & OCR Text</span>
          </label>
          <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
            <input type="checkbox" id="exportNotes" checked style="width: 18px; height: 18px; cursor: pointer;">
            <span>Progress Notes</span>
          </label>
          <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
            <input type="checkbox" id="exportPTNotes" checked style="width: 18px; height: 18px; cursor: pointer;">
            <span>PT Coordination Notes</span>
          </label>
        </div>
        
        <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--epc-line);">
          <label style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
            <input type="radio" name="exportFormat" value="pdf" checked style="width: 18px; height: 18px; cursor: pointer;">
            <span>PDF Document (Styled)</span>
          </label>
          <label style="display: flex; align-items: center; gap: 12px;">
            <input type="radio" name="exportFormat" value="json" style="width: 18px; height: 18px; cursor: pointer;">
            <span>JSON Data File</span>
          </label>
        </div>
        
        <div class="modal-actions" style="margin-top: 32px;">
          <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
          <button type="button" class="btn-primary" id="confirmExportBtn">Export</button>
        </div>
      </div>
    </div>
  `;
  
  if (typeof setSafeHTML !== 'undefined') {
    setSafeHTML(modal, modalHtml);
  } else if (typeof sanitizeHTML !== 'undefined') {
    modal.innerHTML = sanitizeHTML(modalHtml);
  } else {
    modal.textContent = 'Export Client Data';
  }
  
  document.body.appendChild(modal);
  
  // Handle export confirmation
  const confirmBtn = modal.querySelector('#confirmExportBtn');
  confirmBtn.addEventListener('click', async () => {
    const format = modal.querySelector('input[name="exportFormat"]:checked').value;
    const options = {
      clientInfo: modal.querySelector('#exportClientInfo').checked,
      assessments: modal.querySelector('#exportAssessments').checked,
      programs: modal.querySelector('#exportPrograms').checked,
      photos: modal.querySelector('#exportPhotos').checked,
      notes: modal.querySelector('#exportNotes').checked,
      ptNotes: modal.querySelector('#exportPTNotes').checked
    };
    
    modal.remove();
    await exportClientData(format, options);
  });
  
  // Close on overlay click
  modal.querySelector('.modal-overlay').addEventListener('click', () => modal.remove());
}

// Export client data
async function exportClientData(format, options) {
  const downloadBtn = document.getElementById('downloadClientDataBtn');
  
  try {
    downloadBtn.disabled = true;
    downloadBtn.textContent = '⏳ Preparing...';

    // Gather all client data
    const [assessments, programs, photos, notes, ptNotes] = await Promise.all([
      options.assessments ? getClientAssessments(currentClientId) : Promise.resolve([]),
      options.programs ? getClientPrograms(currentClientId) : Promise.resolve([]),
      options.photos ? getClientPhotos(currentClientId) : Promise.resolve([]),
      options.notes ? getClientNotes(currentClientId) : Promise.resolve([]),
      options.ptNotes ? getClientPTNotes(currentClientId) : Promise.resolve([])
    ]);

    if (format === 'pdf') {
      await generatePDF(currentClient, { assessments, programs, photos, notes, ptNotes }, options);
    } else {
      // JSON export
      const clientData = {
        client: options.clientInfo ? currentClient : null,
        exportDate: new Date().toISOString(),
        assessments: assessments || [],
        programs: programs || [],
        photos: photos || [],
        progressNotes: notes || [],
        ptNotes: ptNotes || []
      };

      const jsonData = JSON.stringify(clientData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentClient.name.replace(/\s+/g, '_')}_Data_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    alert('Client data exported successfully!');
  } catch (error) {
    console.error('Error exporting client data:', error);
    alert('Error exporting client data. Please try again.');
  } finally {
    downloadBtn.disabled = false;
    downloadBtn.textContent = '📥 Download All Data';
  }
}

// Generate styled PDF
async function generatePDF(client, data, options) {
  if (typeof window.jspdf === 'undefined') {
    alert('PDF library not loaded. Please refresh the page.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;
  const margin = 20;
  const lineHeight = 7;

  // Helper function to add new page if needed
  function checkNewPage(spaceNeeded = 20) {
    if (yPos + spaceNeeded > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  }

  // Title
  doc.setFontSize(24);
  doc.setTextColor(201, 178, 127);
  doc.setFont('helvetica', 'bold');
  doc.text('ELITE PERFORMANCE CLINIC', margin, yPos);
  yPos += 10;

  doc.setFontSize(18);
  doc.text('Client Data Report', margin, yPos);
  yPos += 12;

  // Client Info
  if (options.clientInfo) {
    doc.setFontSize(14);
    doc.setTextColor(201, 178, 127);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENT INFORMATION', margin, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    
    doc.text(`Name: ${client.name}`, margin, yPos);
    yPos += lineHeight;
    if (client.age) {
      doc.text(`Age: ${client.age}`, margin, yPos);
      yPos += lineHeight;
    }
    if (client.primaryTrainer) {
      doc.text(`Primary Trainer: ${client.primaryTrainer}`, margin, yPos);
      yPos += lineHeight;
    }
    if (client.parentContact) {
      doc.text(`Parent Contact: ${client.parentContact}`, margin, yPos);
      yPos += lineHeight;
    }
    if (client.emergencyContact) {
      doc.text(`Emergency Contact: ${client.emergencyContact}`, margin, yPos);
      yPos += lineHeight;
    }
    
    yPos += 5;
    doc.setDrawColor(201, 178, 127);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;
  }

  // Assessments
  if (options.assessments && data.assessments.length > 0) {
    checkNewPage(30);
    doc.setFontSize(14);
    doc.setTextColor(201, 178, 127);
    doc.setFont('helvetica', 'bold');
    doc.text(`ASSESSMENT HISTORY (${data.assessments.length})`, margin, yPos);
    yPos += 8;

    data.assessments.forEach((assessment, idx) => {
      checkNewPage(40);
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      const date = new Date(assessment.date).toLocaleDateString();
      doc.text(`Assessment ${idx + 1} - ${date}`, margin, yPos);
      yPos += lineHeight;

      doc.setFont('helvetica', 'normal');
      if (assessment.proteusScore) {
        doc.text(`  Proteus Score: ${assessment.proteusScore}`, margin + 5, yPos);
        yPos += lineHeight;
      }
      if (assessment.powerOutput) {
        doc.text(`  Power Output: ${assessment.powerOutput}`, margin + 5, yPos);
        yPos += lineHeight;
      }
      if (assessment.speed) {
        doc.text(`  Speed: ${assessment.speed}`, margin + 5, yPos);
        yPos += lineHeight;
      }
      if (assessment.overheadSquat) {
        doc.text(`  Overhead Squat: ${assessment.overheadSquat}`, margin + 5, yPos);
        yPos += lineHeight;
      }
      if (assessment.shoulderMobility) {
        doc.text(`  Shoulder Mobility: ${assessment.shoulderMobility}`, margin + 5, yPos);
        yPos += lineHeight;
      }
      if (assessment.hamstringMobility) {
        doc.text(`  Hamstring Mobility: ${assessment.hamstringMobility}`, margin + 5, yPos);
        yPos += lineHeight;
      }
      if (assessment.pushupAssessment) {
        doc.text(`  Push-up Assessment: ${assessment.pushupAssessment}`, margin + 5, yPos);
        yPos += lineHeight;
      }
      yPos += 3;
    });
    yPos += 5;
    doc.setDrawColor(201, 178, 127);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;
  }

  // Programs
  if (options.programs && data.programs.length > 0) {
    checkNewPage(30);
    doc.setFontSize(14);
    doc.setTextColor(201, 178, 127);
    doc.setFont('helvetica', 'bold');
    doc.text(`TRAINING PROGRAMS (${data.programs.length})`, margin, yPos);
    yPos += 8;

    data.programs.forEach((program, idx) => {
      checkNewPage(30);
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      const date = new Date(program.createdAt).toLocaleDateString();
      doc.text(`Week ${program.week} - ${date}`, margin, yPos);
      yPos += lineHeight;

      if (program.exercises && program.exercises.length > 0) {
        doc.setFont('helvetica', 'normal');
        program.exercises.forEach(ex => {
          checkNewPage(10);
          const exText = `  • ${ex.name}${ex.sets ? ` (${ex.sets} sets x ${ex.reps || 'N/A'} reps)` : ''}`;
          const lines = doc.splitTextToSize(exText, pageWidth - margin * 2 - 10);
          doc.text(lines, margin + 5, yPos);
          yPos += lineHeight * lines.length;
        });
      }
      yPos += 3;
    });
    yPos += 5;
    doc.setDrawColor(201, 178, 127);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;
  }

  // Photos
  if (options.photos && data.photos.length > 0) {
    checkNewPage(30);
    doc.setFontSize(14);
    doc.setTextColor(201, 178, 127);
    doc.setFont('helvetica', 'bold');
    doc.text(`PROGRAM PHOTOS (${data.photos.length})`, margin, yPos);
    yPos += 8;

    data.photos.forEach((photo, idx) => {
      checkNewPage(40);
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      const date = new Date(photo.uploadedAt).toLocaleDateString();
      doc.text(`Photo ${idx + 1} - ${date}`, margin, yPos);
      yPos += lineHeight;

      if (photo.extractedText) {
        doc.setFont('helvetica', 'normal');
        const text = photo.extractedText.substring(0, 500);
        const lines = doc.splitTextToSize(`  ${text}${photo.extractedText.length > 500 ? '...' : ''}`, pageWidth - margin * 2 - 10);
        doc.text(lines, margin + 5, yPos);
        yPos += lineHeight * lines.length;
      }
      yPos += 3;
    });
    yPos += 5;
    doc.setDrawColor(201, 178, 127);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;
  }

  // Notes
  if (options.notes && data.notes.length > 0) {
    checkNewPage(30);
    doc.setFontSize(14);
    doc.setTextColor(201, 178, 127);
    doc.setFont('helvetica', 'bold');
    doc.text(`PROGRESS NOTES (${data.notes.length})`, margin, yPos);
    yPos += 8;

    data.notes.forEach((note, idx) => {
      checkNewPage(30);
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      const date = new Date(note.date).toLocaleDateString();
      doc.text(`${date}`, margin, yPos);
      yPos += lineHeight;

      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(`  ${note.note}`, pageWidth - margin * 2 - 10);
      doc.text(lines, margin + 5, yPos);
      yPos += lineHeight * lines.length + 3;
    });
    yPos += 5;
    doc.setDrawColor(201, 178, 127);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;
  }

  // PT Notes
  if (options.ptNotes && data.ptNotes.length > 0) {
    checkNewPage(30);
    doc.setFontSize(14);
    doc.setTextColor(201, 178, 127);
    doc.setFont('helvetica', 'bold');
    doc.text(`PT COORDINATION NOTES (${data.ptNotes.length})`, margin, yPos);
    yPos += 8;

    data.ptNotes.forEach((note, idx) => {
      checkNewPage(30);
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      const date = new Date(note.date).toLocaleDateString();
      doc.text(`${date}`, margin, yPos);
      yPos += lineHeight;

      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(`  ${note.content}`, pageWidth - margin * 2 - 10);
      doc.text(lines, margin + 5, yPos);
      yPos += lineHeight * lines.length + 3;
    });
  }

  // Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, pageHeight - 10);
  }

  // Save PDF
  const fileName = `${client.name.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

// Generate human-readable text summary
function generateTextSummary(data) {
  const client = data.client;
  let summary = `ELITE PERFORMANCE CLINIC - CLIENT DATA SUMMARY\n`;
  summary += `==========================================\n\n`;
  summary += `Client Name: ${client.name}\n`;
  summary += `Age: ${client.age || 'N/A'}\n`;
  summary += `Category: ${client.category === 'shared' ? 'Shared Client' : 'Personal Client'}\n`;
  summary += `Primary Trainer: ${client.primaryTrainer || 'N/A'}\n`;
  summary += `Parent Contact: ${client.parentContact || 'N/A'}\n`;
  summary += `Emergency Contact: ${client.emergencyContact || 'N/A'}\n`;
  summary += `Export Date: ${new Date(data.exportDate).toLocaleString()}\n\n`;

  summary += `ASSESSMENTS (${data.assessments.length})\n`;
  summary += `----------------------------------------\n`;
  data.assessments.forEach((assessment, idx) => {
    summary += `\nAssessment ${idx + 1} - ${new Date(assessment.date).toLocaleDateString()}\n`;
    if (assessment.proteusScore) summary += `  Proteus Score: ${assessment.proteusScore}\n`;
    if (assessment.powerOutput) summary += `  Power Output: ${assessment.powerOutput}\n`;
    if (assessment.speed) summary += `  Speed: ${assessment.speed}\n`;
    if (assessment.overheadSquat) summary += `  Overhead Squat: ${assessment.overheadSquat}\n`;
    if (assessment.shoulderMobility) summary += `  Shoulder Mobility: ${assessment.shoulderMobility}\n`;
    if (assessment.hamstringMobility) summary += `  Hamstring Mobility: ${assessment.hamstringMobility}\n`;
    if (assessment.pushupAssessment) summary += `  Push-up Assessment: ${assessment.pushupAssessment}\n`;
  });

  summary += `\n\nPROGRAMS (${data.programs.length})\n`;
  summary += `----------------------------------------\n`;
  data.programs.forEach((program, idx) => {
    summary += `\nProgram ${idx + 1} - Week ${program.week} (${new Date(program.createdAt).toLocaleDateString()})\n`;
    if (program.exercises && program.exercises.length > 0) {
      program.exercises.forEach(ex => {
        summary += `  - ${ex.name}${ex.sets ? ` (${ex.sets} sets x ${ex.reps || 'N/A'} reps)` : ''}\n`;
      });
    }
  });

  summary += `\n\nPROGRAM PHOTOS (${data.photos.length})\n`;
  summary += `----------------------------------------\n`;
  data.photos.forEach((photo, idx) => {
    summary += `\nPhoto ${idx + 1} - ${new Date(photo.uploadedAt).toLocaleDateString()}\n`;
    if (photo.extractedText) {
      summary += `  Extracted Text:\n  ${photo.extractedText.substring(0, 200)}${photo.extractedText.length > 200 ? '...' : ''}\n`;
    }
  });

  summary += `\n\nPROGRESS NOTES (${data.progressNotes.length})\n`;
  summary += `----------------------------------------\n`;
  data.progressNotes.forEach((note, idx) => {
    summary += `\nNote ${idx + 1} - ${new Date(note.date).toLocaleDateString()}\n`;
    summary += `  ${note.note}\n`;
  });

  summary += `\n\nPT COORDINATION NOTES (${data.ptNotes.length})\n`;
  summary += `----------------------------------------\n`;
  data.ptNotes.forEach((note, idx) => {
    summary += `\nPT Note ${idx + 1} - ${new Date(note.date).toLocaleDateString()}\n`;
    summary += `  ${note.note}\n`;
  });

  return summary;
}

// Utility functions
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  // Use DOMPurify for safe HTML return
  if (typeof sanitizeHTML !== 'undefined') {
    return sanitizeHTML(div.innerHTML);
  }
  return div.innerHTML;
}

function formatDate(dateString) {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ===== PACKAGE/SESSIONS TRACKING =====
function initPackageTracking() {
  const editPackageBtn = document.getElementById('editPackageBtn');
  const addPackageBtn = document.getElementById('addPackageBtn');
  const sessionUsedBtn = document.getElementById('sessionUsedBtn');
  const packageInfoSection = document.getElementById('packageInfoSection');
  const staffActions = document.getElementById('packageActionsStaff');
  const parentActions = document.getElementById('packageActionsParent');
  const purchasePackageLink = document.getElementById('purchasePackageLink');

  // Parent portal: show package stats + "Purchase Package" only; hide Edit / Add New / Session Used Today
  const isParent = !!isParentSession();
  if (isParent) {
    if (staffActions) staffActions.style.display = 'none';
    if (parentActions) parentActions.style.display = 'block';
    const purchasePackageBtn = document.getElementById('purchasePackageBtn');
    if (purchasePackageBtn && currentClientId) {
      purchasePackageBtn.onclick = () => {
        window.location.href = 'parent-view.html?id=' + currentClientId;
      };
    }
  } else {
    if (staffActions) staffActions.style.display = 'flex';
    if (parentActions) parentActions.style.display = 'none';
  }

  // Load and display package info
  loadPackageInfo();
  
  if (editPackageBtn) {
    editPackageBtn.addEventListener('click', () => {
      showEditPackageModal();
    });
  }
  
  if (addPackageBtn) {
    addPackageBtn.addEventListener('click', () => {
      showAddPackageModal();
    });
  }
  
  if (sessionUsedBtn) {
    sessionUsedBtn.addEventListener('click', async () => {
      await handleSessionUsedForClient();
    });
  }
}

// Handle session used for current client (works for both staff and parents)
async function handleSessionUsedForClient() {
  if (!currentClient || !currentClientId) {
    alert('Client not found.');
    return;
  }
  
  if (currentClient.packageTotalSessions === null) {
    alert('This client does not have a package set up. Please add a package first.');
    return;
  }
  
  const remainingSessions = currentClient.packageRemainingSessions !== null ? currentClient.packageRemainingSessions : (currentClient.packageTotalSessions - (currentClient.packageUsedSessions || 0));
  
  if (remainingSessions <= 0) {
    if (!confirm(`${currentClient.name} has no sessions remaining. Are you sure you want to mark a session as used?`)) {
      return;
    }
  }
  
  const usedSessions = (currentClient.packageUsedSessions || 0) + 1;
  const newRemainingSessions = currentClient.packageTotalSessions - usedSessions;
  
  // Update session history
  const sessionHistory = currentClient.sessionHistory || [];
  const isParent = isParentSession();
  sessionHistory.push({
    date: new Date().toISOString(),
    usedBy: isParent ? 'Parent' : 'Staff'
  });
  
  try {
    await updateClient(currentClientId, {
      packageUsedSessions: usedSessions,
      packageRemainingSessions: newRemainingSessions,
      sessionHistory: sessionHistory
    });
    
    // Show notification
    let message = `Session used for ${currentClient.name}. ${newRemainingSessions} sessions remaining.`;
    if (newRemainingSessions === 0) {
      message += '\n\n⚠️ WARNING: Client is now OUT of sessions!';
    } else if (newRemainingSessions <= 3) {
      message += '\n\n⚠️ WARNING: Client is running LOW on sessions!';
    }
    
    alert(message);
    
    // Reload client data
    await loadClientData();
  } catch (error) {
    console.error('Error marking session as used:', error);
    alert('Error marking session as used. Please try again.');
  }
}

// Show add package modal (for when client pays for a new package)
function showAddPackageModal() {
  // Create or show add package modal
  let modal = document.getElementById('addPackageModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'addPackageModal';
    modal.className = 'modal';
    
    const addPackageHtml = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">Add New Package</h3>
          <button class="modal-close" id="closeAddPackageModal">&times;</button>
        </div>
        <form id="addPackageForm" class="modal-form">
          <div class="form-group">
            <label for="addPackageName" class="form-label">Package Name</label>
            <input type="text" id="addPackageName" class="form-input" placeholder="e.g., 10 Session Package" required />
          </div>
          <div class="form-group">
            <label for="addPackageTotalSessions" class="form-label">Total Sessions</label>
            <input type="number" id="addPackageTotalSessions" class="form-input" min="1" placeholder="Enter total sessions" required />
          </div>
          <div class="form-group">
            <label for="addPackageDate" class="form-label">Purchase Date</label>
            <input type="date" id="addPackageDate" class="form-input" value="${new Date().toISOString().split('T')[0]}" required />
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" id="cancelAddPackage">Cancel</button>
            <button type="submit" class="btn-primary">Add Package</button>
          </div>
        </form>
      </div>
    `;
    
    // Use innerHTML directly for modals since the HTML is trusted (hardcoded, not user input)
    modal.innerHTML = addPackageHtml;
    
    document.body.appendChild(modal);
    
    // Close handlers
    document.getElementById('closeAddPackageModal').addEventListener('click', () => {
      modal.style.display = 'none';
    });
    
    document.getElementById('cancelAddPackage').addEventListener('click', () => {
      modal.style.display = 'none';
    });
    
    // Form submit handler
    document.getElementById('addPackageForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleAddPackage();
    });
  }
  
  // Reset form
  document.getElementById('addPackageName').value = '';
  document.getElementById('addPackageTotalSessions').value = '';
  document.getElementById('addPackageDate').value = new Date().toISOString().split('T')[0];
  
  modal.style.display = 'flex';
}

async function handleAddPackage() {
  const packageName = document.getElementById('addPackageName').value.trim();
  const totalSessions = parseInt(document.getElementById('addPackageTotalSessions').value);
  const purchaseDate = document.getElementById('addPackageDate').value;
  
  if (!packageName || !totalSessions || totalSessions < 1) {
    alert('Please fill in all required fields.');
    return;
  }
  
  try {
    // Get current client data
    const client = await getClient(currentClientId);
    if (!client) {
      alert('Client not found.');
      return;
    }
    
    // If client already has a package, add to existing sessions
    const currentTotal = client.packageTotalSessions || 0;
    const currentUsed = client.packageUsedSessions || 0;
    const currentRemaining = client.packageRemainingSessions !== null ? client.packageRemainingSessions : (currentTotal - currentUsed);
    
    // Add new package sessions to existing
    const newTotalSessions = currentTotal + totalSessions;
    const newRemainingSessions = currentRemaining + totalSessions;
    
    // Update session history
    const sessionHistory = client.sessionHistory || [];
    sessionHistory.push({
      date: purchaseDate,
      action: 'package_purchased',
      packageName: packageName,
      sessionsAdded: totalSessions,
      usedBy: 'Staff'
    });
    
    // Update client with new package info
    await updateClient(currentClientId, {
      packageName: packageName,
      packageTotalSessions: newTotalSessions,
      packageRemainingSessions: newRemainingSessions,
      packageUsedSessions: currentUsed, // Keep existing used sessions
      sessionHistory: sessionHistory
    });
    
    // Close modal
    document.getElementById('addPackageModal').style.display = 'none';
    
    // Reload client data
    await loadClientData();
    
    alert(`Package "${packageName}" added successfully! ${totalSessions} sessions added. Total sessions: ${newTotalSessions}, Remaining: ${newRemainingSessions}`);
  } catch (error) {
    console.error('Error adding package:', error);
    alert('Error adding package. Please try again.');
  }
}

function loadPackageInfo() {
  if (!currentClient) return;
  
  const packageInfoSection = document.getElementById('packageInfoSection');
  const packageNameEl = document.getElementById('packageName');
  const packageTotalSessionsEl = document.getElementById('packageTotalSessions');
  const packageRemainingSessionsEl = document.getElementById('packageRemainingSessions');
  const packageUsedSessionsEl = document.getElementById('packageUsedSessions');
  const packageStatusBadge = document.getElementById('packageStatusBadge');
  
  if (!packageInfoSection) return;
  
  const packageName = currentClient.packageName || null;
  const totalSessions = currentClient.packageTotalSessions || null;
  const usedSessions = currentClient.packageUsedSessions || 0;
  const remainingSessions = currentClient.packageRemainingSessions !== null ? currentClient.packageRemainingSessions : (totalSessions ? totalSessions - usedSessions : null);
  
  // Always show package section
  packageInfoSection.style.display = 'block';
  
  const addPackageBtn = document.getElementById('addPackageBtn');
  const editPackageBtn = document.getElementById('editPackageBtn');
  const sessionUsedBtn = document.getElementById('sessionUsedBtn');
  
  if (packageName || totalSessions !== null) {
    if (packageNameEl) packageNameEl.textContent = packageName || 'Not Set';
    if (packageTotalSessionsEl) packageTotalSessionsEl.textContent = totalSessions !== null ? totalSessions : '--';
    if (packageRemainingSessionsEl) packageRemainingSessionsEl.textContent = remainingSessions !== null ? remainingSessions : '--';
    if (packageUsedSessionsEl) packageUsedSessionsEl.textContent = usedSessions;
    
    // Update status badge
    if (packageStatusBadge && remainingSessions !== null) {
      if (remainingSessions === 0) {
        packageStatusBadge.textContent = '❌ OUT';
        packageStatusBadge.className = 'package-status-badge status-out';
      } else if (remainingSessions <= 3) {
        packageStatusBadge.textContent = '⚠️ LOW';
        packageStatusBadge.className = 'package-status-badge status-low';
      } else {
        packageStatusBadge.textContent = '✓ OK';
        packageStatusBadge.className = 'package-status-badge status-ok';
      }
    }
    
    // Show edit and session used buttons
    if (editPackageBtn) editPackageBtn.style.display = 'inline-block';
    if (sessionUsedBtn) sessionUsedBtn.style.display = 'inline-block';
    if (addPackageBtn) addPackageBtn.style.display = 'inline-block';
  } else {
    // No package yet - show "Add Package" button
    if (packageNameEl) packageNameEl.textContent = 'Not Set';
    if (packageTotalSessionsEl) packageTotalSessionsEl.textContent = '--';
    if (packageRemainingSessionsEl) packageRemainingSessionsEl.textContent = '--';
    if (packageUsedSessionsEl) packageUsedSessionsEl.textContent = '0';
    if (packageStatusBadge) {
      packageStatusBadge.textContent = '';
      packageStatusBadge.className = 'package-status-badge';
    }
    
    // Hide edit and session used, show add package
    if (editPackageBtn) editPackageBtn.style.display = 'none';
    if (sessionUsedBtn) sessionUsedBtn.style.display = 'none';
    if (addPackageBtn) addPackageBtn.style.display = 'inline-block';
  }
}

function showEditPackageModal() {
  // Create or show edit package modal
  let modal = document.getElementById('editPackageModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'editPackageModal';
    modal.className = 'modal';
    
    const editPackageHtml = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">Edit Package & Sessions</h3>
          <button class="modal-close" id="closeEditPackageModal">&times;</button>
        </div>
        <form id="editPackageForm" class="modal-form">
          <div class="form-group">
            <label for="editPackageName" class="form-label">Package Name</label>
            <input type="text" id="editPackageName" class="form-input" placeholder="e.g., 10 Session Package" />
          </div>
          <div class="form-group">
            <label for="editPackageTotalSessions" class="form-label">Total Sessions</label>
            <input type="number" id="editPackageTotalSessions" class="form-input" min="0" placeholder="Enter total sessions" />
          </div>
          <div class="form-group">
            <label for="editPackageUsedSessions" class="form-label">Sessions Used</label>
            <input type="number" id="editPackageUsedSessions" class="form-input" min="0" placeholder="Enter sessions used" />
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" id="cancelEditPackageBtn">Cancel</button>
            <button type="submit" class="btn-primary">Save</button>
          </div>
        </form>
      </div>
    `;
    
    // Use innerHTML directly for modals since the HTML is trusted (hardcoded, not user input)
    modal.innerHTML = editPackageHtml;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    document.getElementById('closeEditPackageModal').addEventListener('click', () => {
      modal.style.display = 'none';
    });
    document.getElementById('cancelEditPackageBtn').addEventListener('click', () => {
      modal.style.display = 'none';
    });
    document.getElementById('editPackageForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await savePackageInfo();
      modal.style.display = 'none';
    });
  }
  
  // Populate form
  if (currentClient) {
    document.getElementById('editPackageName').value = currentClient.packageName || '';
    document.getElementById('editPackageTotalSessions').value = currentClient.packageTotalSessions || '';
    document.getElementById('editPackageUsedSessions').value = currentClient.packageUsedSessions || 0;
  }
  
  modal.style.display = 'flex';
}

async function savePackageInfo() {
  const packageName = document.getElementById('editPackageName').value.trim() || null;
  const totalSessions = document.getElementById('editPackageTotalSessions').value ? parseInt(document.getElementById('editPackageTotalSessions').value) : null;
  const usedSessions = document.getElementById('editPackageUsedSessions').value ? parseInt(document.getElementById('editPackageUsedSessions').value) : 0;
  const remainingSessions = totalSessions !== null ? totalSessions - usedSessions : null;
  
  try {
    await updateClient(currentClientId, {
      packageName,
      packageTotalSessions: totalSessions,
      packageRemainingSessions: remainingSessions,
      packageUsedSessions: usedSessions
    });
    
    await loadClientData();
    loadPackageInfo();
    alert('Package information updated successfully!');
  } catch (error) {
    console.error('Error saving package info:', error);
    alert('Error saving package information. Please try again.');
  }
}

// Make page read-only for parents
function makePageReadOnly() {
  // Hide "Back to Dashboard" link for parents
  const backLink = document.getElementById('backToDashboardLink');
  if (backLink) {
    backLink.style.display = 'none';
  }
  
  // Hide edit buttons
  const editBtn = document.getElementById('editClientBtn');
  const moveBtn = document.getElementById('moveClientBtn');
  const downloadBtn = document.getElementById('downloadClientDataBtn');
  const editPackageBtn = document.getElementById('editPackageBtn');
  
  if (editBtn) editBtn.style.display = 'none';
  if (moveBtn) moveBtn.style.display = 'none';
  if (downloadBtn) downloadBtn.style.display = 'none';
  if (editPackageBtn) editPackageBtn.style.display = 'none';
  
  // Disable all form inputs (but allow session used button)
  const inputs = document.querySelectorAll('input, textarea, select, button[type="submit"]');
  inputs.forEach(input => {
    if (input.id !== 'logoutBtn' && !input.closest('.parent-allowed') && !input.classList.contains('btn-session-used')) {
      input.disabled = true;
      input.style.opacity = '0.6';
      input.style.cursor = 'not-allowed';
    }
  });
  
  // Hide action buttons (but allow session used button)
  const actionButtons = document.querySelectorAll('#addClientBtn, #saveAssessmentBtnBottom, #uploadPhotoBtn, #addNoteBtn, #addPtNoteBtn, #saveProgramBtn, #printProgramBtn, #clearProgramBtn');
  actionButtons.forEach(btn => {
    if (btn) btn.style.display = 'none';
  });
  
  // Add parent notice
  const header = document.querySelector('.client-header');
  if (header) {
    const notice = document.createElement('div');
    notice.style.cssText = 'background: rgba(201, 178, 127, 0.1); border: 1px solid var(--epc-gold); border-radius: 6px; padding: 12px 16px; margin-top: 16px; font-size: 12px; color: var(--epc-gold); width: 100%;';
    if (typeof setSafeHTML !== 'undefined') {
      setSafeHTML(notice, '👁️ <strong>Parent View:</strong> This is a read-only view. Contact your trainer to make changes.');
    } else {
      notice.textContent = '👁️ Parent View: This is a read-only view. Contact your trainer to make changes.';
    }
    header.appendChild(notice);
  }
  
  // Update page title
  document.title = `Parent Portal - ${document.title}`;
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initClientPage);
} else {
  initClientPage();
}
