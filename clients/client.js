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

// Initialize client page
async function initClientPage() {
  checkAuth();
  initLogout();

  // Get client ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  currentClientId = parseInt(urlParams.get('id'));

  if (!currentClientId) {
    alert('No client ID provided. Redirecting to dashboard.');
    window.location.href = 'dashboard.html';
    return;
  }

  // Initialize database
  await initDB();

  // Load client data
  await loadClientData();

  // Initialize tabs
  initTabs();

  // Initialize all sections
  initAssessment();
  initProgramBuilder();
  initPhotos();
  initNotes();
  initPTNotes();
  initClientActions();

  // Load exercise library
  exerciseLibrary = [...DEFAULT_EXERCISES];
  renderExerciseLibrary();
}

// Load client data
async function loadClientData() {
  try {
    currentClient = await getClient(currentClientId);
    if (!currentClient) {
      alert('Client not found. Redirecting to dashboard.');
      window.location.href = 'dashboard.html';
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
  } catch (error) {
    console.error('Error loading client:', error);
    alert('Error loading client data.');
  }
}

// Initialize tabs
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.dataset.tab;

      // Update active states
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanels.forEach(panel => panel.classList.remove('active'));

      button.classList.add('active');
      document.getElementById(`${targetTab}-tab`).classList.add('active');
    });
  });
}

// ===== ASSESSMENT =====
function initAssessment() {
  const saveAssessmentBtn = document.getElementById('saveAssessmentBtn');
  const assessmentForm = document.getElementById('assessmentForm');

  // Set default date to today
  const dateInput = document.getElementById('assessmentDate');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  if (saveAssessmentBtn) {
    saveAssessmentBtn.addEventListener('click', async () => {
      await handleSaveAssessment();
    });
  }

  // Load assessment history
  loadAssessmentHistory();
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
      historyList.innerHTML = '<p style="color: var(--epc-ink-dim);">No previous assessments.</p>';
      return;
    }

      historyList.innerHTML = assessments.map(assessment => `
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

    library.innerHTML = exercises.map(exercise => `
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
      container.innerHTML = '<div class="empty-program"><p>No exercises added yet. Click exercises from the library to add them.</p></div>';
      return;
    }

    container.innerHTML = currentExercises.map((exercise, index) => `
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
        historyList.innerHTML = '<p style="color: var(--epc-ink-dim);">No saved programs.</p>';
        return;
      }

      historyList.innerHTML = programs.map(program => `
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
        // Use Tesseract.js for OCR with better settings
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
            }
          }
        });

        // Set OCR parameters for better accuracy
        await worker.setParameters({
          tessedit_pageseg_mode: Tesseract.PSM.AUTO,
          tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,;:!?-()[]/'
        });
        
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
      gallery.innerHTML = '<p style="color: var(--epc-ink-dim); text-align: center; padding: 40px;">No photos uploaded yet.</p>';
      return;
    }

    gallery.innerHTML = photos.map(photo => `
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
      timeline.innerHTML = '<p style="color: var(--epc-ink-dim); text-align: center; padding: 40px;">No progress notes yet.</p>';
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
      timeline.innerHTML = '<p style="color: var(--epc-ink-dim); text-align: center; padding: 40px;">No PT coordination notes yet.</p>';
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
  const moveClientBtn = document.getElementById('moveClientBtn');
  const editClientBtn = document.getElementById('editClientBtn');
  const moveClientModal = document.getElementById('moveClientModal');
  const closeMoveModal = document.getElementById('closeMoveModal');
  const cancelMoveBtn = document.getElementById('cancelMoveBtn');
  const confirmMoveBtn = document.getElementById('confirmMoveBtn');

  if (moveClientBtn) {
    moveClientBtn.addEventListener('click', () => {
      moveClientModal.style.display = 'flex';
      document.getElementById('newCategory').value = currentClient.category;
    });
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
    editClientBtn.addEventListener('click', () => {
      // Populate form with current client data
      if (currentClient) {
        document.getElementById('editClientName').value = currentClient.name || '';
        document.getElementById('editClientAge').value = currentClient.age || '';
        document.getElementById('editClientCategory').value = currentClient.category || 'shared';
        document.getElementById('editPrimaryTrainer').value = currentClient.primaryTrainer || '';
        document.getElementById('editParentContact').value = currentClient.parentContact || '';
        document.getElementById('editEmergencyContact').value = currentClient.emergencyContact || '';
        document.getElementById('editClientGoals').value = currentClient.goals || '';
        document.getElementById('editMedicalHistory').value = currentClient.medicalHistory || '';
      }
      if (editClientModal) editClientModal.style.display = 'flex';
      document.getElementById('editClientName').focus();
    });
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

// Utility functions
function escapeHtml(text) {
  if (!text) return '';
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
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initClientPage);
} else {
  initClientPage();
}
