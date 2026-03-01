// ====== STATE & CONFIG ======


const STORAGE_KEY = 'ai_diary_v1_data';
let diary = {};
let currentDate = getToday();
let selectedEmotion = null;


// Variables de Audio
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

// ====== INIT ======
document.addEventListener("DOMContentLoaded", () => {
  // 1. Cargar datos guardados (Persistencia)
  loadFromLocal();

  // 2. Inicializar UI
  updateDateLabel();  
  renderEntries();

  // --- EVENT LISTENERS ---

  // FAB: Abrir pantalla Texto
  document.getElementById("fab-text").addEventListener("click", () => {
    resetEmotionSelection();
    document.getElementById("new-text-input").value = "";
    showScreen("screen-new-text");
  });

  // FAB: Abrir pantalla Audio
  document.getElementById("fab-audio").addEventListener("click", () => {
    resetEmotionSelection();
    resetAudioUI();
    showScreen("screen-new-audio");
  });

  // FAB Principal (Toggle visual si quisieras animarlo en el futuro)
  document.getElementById("fab-main").addEventListener("click", () => {
    const opts = document.querySelectorAll('.fab-option');
    // Alternar visibilidad si usas la estructura CSS correcta
    opts.forEach(opt => {
        opt.style.display = (opt.style.display === 'flex' || opt.style.display === 'block') ? 'none' : 'flex';
    });
  });

  // Botones "Atrás" (Back)
  document.getElementById("back-from-text").addEventListener("click", () => showScreen("screen-home"));

  document.getElementById("back-from-audio").addEventListener("click", () => {
    stopRecordingIfNeeded(); // Seguridad: parar micro si sales
    showScreen("screen-home");
  });

  document.getElementById("back-from-summary").addEventListener("click", () => showScreen("screen-home"));

  // Navegación Home
  document.getElementById("go-to-summary").addEventListener("click", openSummaryScreen);

  document.getElementById("prev-day").addEventListener("click", () => changeDay(-1));
  document.getElementById("next-day").addEventListener("click", () => changeDay(1));

  // Guardar Entradas
  document.getElementById("save-text-entry").addEventListener("click", saveTextEntry);
  document.getElementById("save-audio-entry").addEventListener("click", saveAudioEntry);

  // Acciones Resumen (AHORA CONECTADO A LA IA)
  document.getElementById("generate-summary").addEventListener("click", generateDailySummaryAI);
  document.getElementById("save-day").addEventListener("click", saveDayData);

  // Selector de Emociones (Lógica para todos los chips)
  document.querySelectorAll(".emotion-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      // 1. Actualizar estado visual
      document.querySelectorAll(".emotion-chip").forEach((c) => c.classList.remove("selected"));
      chip.classList.add("selected");

      // 2. Actualizar estado lógico
      selectedEmotion = chip.dataset.emotion;
    });
  });

  // Grabadora
  document.getElementById("record-button").addEventListener("click", toggleRecording);
  // Calendario
  document.getElementById('current-date-label').addEventListener('click', toggleCalendar);

  document.getElementById('cal-prev-month').addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById('cal-next-month').addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar();
  });

  document.getElementById('app').addEventListener('click', (e) => {
    const popup = document.getElementById('calendar-popup');
    const label = document.getElementById('current-date-label');
    if (!popup.contains(e.target) && e.target !== label) {
      popup.style.display = 'none';
    }
  });

}); // ← cierre del DOMContentLoaded

// ====== LOCAL STORAGE (PERSISTENCIA) ======

function saveToLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(diary));
}

function loadFromLocal() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    diary = JSON.parse(data);
  }
}

// ====== UTILIDADES FECHA ======

function getToday() {
  const d = new Date();
  // Ajuste para zona horaria local simple
  return d.toLocaleDateString('en-CA'); // Devuelve YYYY-MM-DD
}

function formatDateLabel(dateStr) {
  // Manejo seguro de fechas para evitar errores de zona horaria al visualizar
  const [year, month, day] = dateStr.split('-');
  const d = new Date(year, month - 1, day);

  const options = { weekday: 'short', day: "numeric", month: "short" };
  return d.toLocaleDateString("es-ES", options); // Formato: "lun, 11 dic"
}

// ====== PANTALLAS (ROUTER) ======

function showScreen(id) {
  // Ocultar todas
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("active");
  });
  // Mostrar la deseada
  const activeScreen = document.getElementById(id);
  if(activeScreen) activeScreen.classList.add("active");

  // Cerrar opciones del FAB al cambiar de pantalla
  document.querySelectorAll('.fab-option').forEach(el => el.style.display = 'none');
}

// ====== CAMBIO DE DÍA ======

function changeDay(offset) {
  const d = new Date(currentDate);
  d.setDate(d.getDate() + offset);
  currentDate = d.toLocaleDateString('en-CA'); // Mantener formato YYYY-MM-DD

  updateDateLabel();
  renderEntries();
}

function updateDateLabel() {
  const label = document.getElementById("current-date-label");
  if (currentDate === getToday()) {
    label.textContent = "Hoy";
  } else {
    label.textContent = formatDateLabel(currentDate);
  }
}
// ====== CALENDARIO ======
let calendarDate = new Date();


function toggleCalendar() {
  const popup = document.getElementById('calendar-popup');
  if (popup.style.display === 'none') {
    const parts = currentDate.split('-');
    calendarDate = new Date(parts[0], parts[1] - 1, parts[2]);
    renderCalendar();
    popup.style.display = 'block';
  } else {
    popup.style.display = 'none';
  }
}


function renderCalendar() {
  const grid = document.getElementById('cal-grid');
  const label = document.getElementById('cal-month-label');
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  label.textContent = new Date(year, month).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay === 0) ? 6 : firstDay - 1;

  let html = ['Lu','Ma','Mi','Ju','Vi','Sá','Do'].map(d => 
    `<div style="color:#9B9A97; font-weight:600; padding:4px 0;">${d}</div>`
  ).join('');

  for (let i = 0; i < startOffset; i++) html += '<div></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = dateStr === getToday();
    const isSelected = dateStr === currentDate;
    const hasEntries = diary[dateStr] && diary[dateStr].entries && diary[dateStr].entries.length > 0;

    html += `<div onclick="selectCalendarDay('${dateStr}')" style="
      padding: 6px 2px;
      border-radius: 50%;
      cursor: pointer;
      background: ${isSelected ? '#2F2F2F' : 'transparent'};
      color: ${isSelected ? '#fff' : isToday ? '#2F2F2F' : '#37352F'};
      font-weight: ${isToday ? '700' : '400'};
      position: relative;
    ">${d}${hasEntries ? '<span style="position:absolute; bottom:1px; left:50%; transform:translateX(-50%); width:4px; height:4px; background:#9B9A97; border-radius:50%; display:block;"></span>' : ''}</div>`;
  }

  grid.innerHTML = html;
}

function selectCalendarDay(dateStr) {
  currentDate = dateStr;
  updateDateLabel();
  renderEntries();
  document.getElementById('calendar-popup').style.display = 'none';
}

// Cerrar calendario al tocar fuera
function ensureDay(dateStr) {
  if (!diary[dateStr]) {
    diary[dateStr] = {
      entries: [],
      summary: "",
      gratitude: ["", "", ""],
    };
  }
}

// ====== UI HELPERS ======

function resetEmotionSelection() {
  selectedEmotion = null;
  document.querySelectorAll(".emotion-chip").forEach(c => c.classList.remove("selected"));
}

// ====== RENDER ENTRADAS HOME ======

function renderEntries() {
  ensureDay(currentDate);
  const container = document.getElementById("entries-list");
  container.innerHTML = "";

  const day = diary[currentDate];

  // Si no hay entradas
  if (!day.entries || day.entries.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No hay entradas aún.</p>
        <p style="font-size:0.9em; opacity:0.7;">Pulsa + para empezar tu diario.</p>
      </div>`;
    return;
  }

  // Renderizar tarjetas (en orden inverso: más reciente arriba)
  [...day.entries].reverse().forEach((entry) => {
    const card = document.createElement("div");
    card.className = "entry-card";
    // Añadimos clase según emoción para CSS styling (opcional)
    card.classList.add(`emotion-${entry.emotion}`); 

    const icon = entry.type === 'audio' ? '🎙️' : '📝';

    card.innerHTML = `
      <div class="entry-header">
        <span class="entry-time">${icon} ${entry.time}</span>
        <span class="entry-emotion-badge">${entry.emotion}</span>
      </div>
      <div class="entry-text">${entry.text}</div>
    `;

    container.appendChild(card);
  });
}

// ====== GUARDAR TEXTO ======

function saveTextEntry() {
  const textarea = document.getElementById("new-text-input");
  const text = textarea.value.trim();

  if (!text) {
    alert("Por favor escribe algo antes de guardar.");
    return;
  }

  if (!selectedEmotion) {
    alert("⚠️ La emoción es obligatoria. ¿Cómo te sientes?");
    return;
  }

  ensureDay(currentDate);

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  diary[currentDate].entries.push({
    time: timeStr,
    type: "text",
    text,
    emotion: selectedEmotion,
  });

  saveToLocal(); // Guardar en persistencia

  // Limpieza
  textarea.value = "";
  resetEmotionSelection();

  renderEntries();
  showScreen("screen-home");
}

// ====== AUDIO RECORDING ======

async function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    await startRecording();
  }
}

async function startRecording() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("Tu navegador no soporta grabación de audio.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      // 1. Crear el archivo de audio
      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
      
      // 2. ENVIAR A LA IA (Nueva función)
      transcribeAudioWithAI(audioBlob);

      // 3. Apagar el micrófono físico
      stream.getTracks().forEach((track) => track.stop());
    };

    mediaRecorder.start();
    isRecording = true;
    updateRecordingUI(true);

  } catch (err) {
    console.error(err);
    alert("No se pudo iniciar el micrófono. Revisa los permisos.");
  }
}

function stopRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    isRecording = false;
    updateRecordingUI(false);
  }
}

function stopRecordingIfNeeded() {
  if (isRecording) {
    stopRecording();
  }
}

function updateRecordingUI(recording) {
  const btn = document.getElementById("record-button");
  const status = document.getElementById("record-status");

  if (recording) {
    btn.classList.add("recording");
    status.textContent = "Grabando... (Pulsa para parar)";
  } else {
    btn.classList.remove("recording");
    status.textContent = "Pulsa el círculo para grabar";
  }
}

function resetAudioUI() {
  stopRecordingIfNeeded();
  document.getElementById("audio-transcript").value = "";
  updateRecordingUI(false);
}

// ====== GUARDAR AUDIO ======

function saveAudioEntry() {
  const transcriptEl = document.getElementById("audio-transcript");
  const text = transcriptEl.value.trim();

  if (!text) {
    alert("Graba un audio o escribe una nota antes de guardar.");
    return;
  }

  if (!selectedEmotion) {
    alert("⚠️ Selecciona una emoción primero.");
    return;
  }

  ensureDay(currentDate);

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  diary[currentDate].entries.push({
    time: timeStr,
    type: "audio",
    text, // Guardamos la transcripción simulada
    emotion: selectedEmotion,
  });

  saveToLocal(); // Guardar

  // Reset
  transcriptEl.value = "";
  resetEmotionSelection();
  resetAudioUI();

  renderEntries();
  showScreen("screen-home");
}

// ====== SUMMARY SCREEN ======

function openSummaryScreen() {
  ensureDay(currentDate);

  // Renderizar lista de entradas del día en el resumen
  const container = document.getElementById("summary-entries");
  container.innerHTML = "";

  const dayData = diary[currentDate]; // Corregido el nombre de variable para evitar conflictos

  if (!dayData.entries.length) {
    container.innerHTML = `<p class="placeholder">No hay entradas para resumir hoy.</p>`;
  } else {
    dayData.entries.forEach((entry) => {
      const row = document.createElement("div");
      row.style.marginBottom = "8px";
      row.style.fontSize = "12px";
      row.style.color = "#555";
      row.innerHTML = `<strong>${entry.time}</strong> (${entry.emotion}): ${entry.text.substring(0, 50)}...`;
      container.appendChild(row);
    });
  }

  // Cargar resumen IA existente o placeholder
  const summaryEl = document.getElementById("summary-text");

  if (dayData.summary) {
    summaryEl.textContent = dayData.summary;
    summaryEl.classList.remove("placeholder");
  } else {
    summaryEl.textContent = "El resumen generado por IA aparecerá aquí...";
    summaryEl.classList.add("placeholder");
  }

  // Cargar gratitud
  document.getElementById("gratitude-1").value = dayData.gratitude[0] || "";
  document.getElementById("gratitude-2").value = dayData.gratitude[1] || "";
  document.getElementById("gratitude-3").value = dayData.gratitude[2] || "";

  showScreen("screen-summary");
}

function placeholderGenerateSummary() {
  ensureDay(currentDate);
  const dayData = diary[currentDate];

  if (dayData.entries.length === 0) {
    alert("Necesitas al menos una entrada para generar un resumen.");
    return;
  }

  // Simulación simple de IA V1
  const fakeSummary = "RESUMEN IA (SIMULADO):\n\n" + 
    "Hoy ha sido un día activo. Empezaste con la emoción " + dayData.entries[0].emotion + 
    ". Tienes " + dayData.entries.length + " entradas registradas. " +
    "La IA detecta un patrón de comportamiento constante. (En V2 aquí irá el análisis real de OpenAI).";

  dayData.summary = fakeSummary;

  const summaryEl = document.getElementById("summary-text");
  summaryEl.textContent = fakeSummary;
  summaryEl.classList.remove("placeholder");

  saveToLocal(); // Importante guardar el resumen generado
}

function saveDayData() {
  ensureDay(currentDate);
  const dayData = diary[currentDate];

  // Guardar gratitud
  dayData.gratitude[0] = document.getElementById("gratitude-1").value.trim();
  dayData.gratitude[1] = document.getElementById("gratitude-2").value.trim();
  dayData.gratitude[2] = document.getElementById("gratitude-3").value.trim();

  saveToLocal(); // Guardar en localStorage

  alert("Datos del día guardados correctamente ✨");
  showScreen("screen-home");
}

// ==========================================
// ====== CEREBRO IA (GOOGLE GEMINI) ========
// ==========================================

// 1. TRANSCRIPCIÓN DE AUDIO (CLEAN MODE)
async function transcribeAudioWithAI(audioBlob) {
  const statusEl = document.getElementById("record-status");
  const transcriptEl = document.getElementById("audio-transcript");
  
  statusEl.textContent = "Procesando con IA (Clean Mode)...";
  transcriptEl.value = "⏳ La IA está escuchando y limpiando tu audio...";

  try {
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    
    reader.onloadend = async () => {
      const base64Audio = reader.result.split(',')[1]; // Limpiar cabecera

      // Prompt: Filosofía de "Clean Mode" (Sin muletillas, literal)
      const payload = {
        contents: [{
          parts: [
            { text: "Transcribe este audio. REGLAS: 1. Elimina muletillas (eh, um, estee). 2. Corrige repeticiones. 3. NO interpretes ni resumas. 4. Salida: Solo el texto limpio." },
            { inline_data: { mime_type: "audio/webm", data: base64Audio } }
          ]
        }]
      };

      const response = await fetch('https://ai-diary-worker.hermanopiedra.workers.dev', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "audio", payload })
      });

      const data = await response.json();
      
      if (data.result) {
        const cleanText = data.result.trim();
        transcriptEl.value = cleanText;
        statusEl.textContent = "Transcripción completada.";
      } else {
        throw new Error("La IA no devolvió texto.");
      }
    };
  } catch (error) {
    console.error("Error IA:", error);
    statusEl.textContent = "Error de conexión.";
    transcriptEl.value = "Error: No se pudo conectar con Google. Revisa tu API Key en app.js";
  }
}

// 2. RESUMEN DIARIO (ESPEJO OBJETIVO)
async function generateDailySummaryAI() {
  // --- PASO 1: SEGURIDAD (Esto faltaba o fallaba antes) ---
  // Nos aseguramos de que el día existe en la base de datos
  ensureDay(currentDate); 
  
  // Obtenemos los datos del día actual
  const dayData = diary[currentDate];

  // Verificamos si realmente hay entradas. Si no hay, paramos aquí.
  if (!dayData || !dayData.entries || dayData.entries.length === 0) {
    alert("No hay entradas hoy para resumir. Escribe o graba algo primero.");
    return;
  }
  // --------------------------------------------------------

  const summaryEl = document.getElementById("summary-text");
  const btn = document.getElementById("generate-summary");
  
  // UI de carga
  summaryEl.textContent = "Analizando patrones del día...";
  summaryEl.style.opacity = "0.5";
  btn.disabled = true;

  // --- PASO 2: PREPARAR DATOS (Tu parte del error) ---
  // Ahora es seguro ejecutar esto porque ya validamos arriba
  let textToAnalyze = `Fecha: ${currentDate}\n`;
  
  try {
    dayData.entries.forEach(e => {
      textToAnalyze += `[${e.time}] [Emoción Usuario: ${e.emotion}] Texto: ${e.text}\n`;
    });
  } catch (err) {
    console.error("Error leyendo entradas:", err);
    alert("Hubo un error leyendo tus entradas.");
    btn.disabled = false;
    return;
  }

  // --- PASO 3: PROMPT ---
 const prompt = `
  Eres un sistema de registro personal. Tu única función es organizar y resumir 
  lo que el usuario escribió durante el día.

  REGLAS ABSOLUTAS:
  1. Resume SOLO lo que el usuario dijo explícitamente. Nada más.
  2. Agrupa entradas relacionadas para evitar redundancia.
  3. Al final del resumen, incluye siempre una sección "Emociones del día:" 
     listando ÚNICAMENTE las emociones que el usuario nombró explícitamente.
  4. Tono: Neutral, claro, directo. Sin calidez, sin juicio, sin consejo.
  5. Prohibido: frases de ánimo, interpretaciones, evaluaciones, sugerencias.
  6. El resumen no califica el día como bueno o malo.
  7. Sin markdown. Párrafos cortos. Máximo 5-6 oraciones + la sección de emociones.
  8. Empieza directamente con el contenido del resumen. 
   Nunca uses encabezados como "Resumen del día:" o frases introductorias.

  RECORDATORIO: Esta app organiza lo que el usuario dice. 
  No le explica al usuario quién es.

  ENTRADAS DEL DÍA:
  ${textToAnalyze}
`;

  // --- PASO 4: LLAMADA A LA API ---
  try {
    const response = await fetch('https://ai-diary-worker.hermanopiedra.workers.dev', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "text", prompt })
    });

    const data = await response.json();
    
    if (data.result) {
      const summary = data.result;
      
      // Guardar y mostrar
      dayData.summary = summary;
      summaryEl.textContent = summary;
      summaryEl.classList.remove("placeholder");
      saveToLocal();
    } else {
      throw new Error("La IA no devolvió respuesta.");
    }

  } catch (error) {
    console.error(error);
    summaryEl.textContent = "Error al generar resumen. Verifica la consola (F12) para ver detalles.";
  } finally {
    summaryEl.style.opacity = "1";
    btn.disabled = false;
  }
}