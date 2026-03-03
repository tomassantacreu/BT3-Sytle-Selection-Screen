// --- VARIABLES GLOBALES ---
const STATE_CHARACTERS = 'characters';
const STATE_TRANSFORMATIONS = 'transformations';

let currentState = STATE_CHARACTERS;
let characterGrid = [];
let rowIndex = 0;
let charIndex = 0;
let transIndex = 0;

let isEnteringTransformations = false;
let isTransitioning = false; 
let musicStarted = false; 

// --- SISTEMA DE AUDIO (ARCHIVOS .WAV / .MP3) ---
const sfxMove = new Audio('audio/move.wav');     
const sfxRowUp = new Audio('audio/row_up.wav');     
const sfxRowDown = new Audio('audio/row_down.wav'); 
const sfxSelect = new Audio('audio/select.wav'); 
const sfxCancel = new Audio('audio/cancel.wav'); 
const sfxTransform = new Audio('audio/transform.wav'); 
const bgMusic = new Audio('audio/bgm.mp3'); 

/// Ajuste de volumen
sfxMove.volume = 1;    
sfxRowUp.volume = 1;     
sfxRowDown.volume = 0.03;     
sfxSelect.volume = 1;  
sfxCancel.volume = 0.03;  
sfxTransform.volume = 0.03; 

// Configuración de la música de fondo
bgMusic.volume = 0.04;       
bgMusic.loop = true; 

// Respaldo a prueba de fallos para el bucle (Loop forzado)
bgMusic.addEventListener('ended', function() {
    this.currentTime = 0;
    this.play().catch(e => console.log("Error al repetir la música:", e));
});

function playSound(type) {
    let sound;
    switch (type) {
        case 'move': sound = sfxMove; break;
        case 'row_up': sound = sfxRowUp; break;
        case 'row_down': sound = sfxRowDown; break;
        case 'select': sound = sfxSelect; break;
        case 'cancel': sound = sfxCancel; break;
        case 'transform': sound = sfxTransform; break;
        default: return;
    }
    
    sound.currentTime = 0;
    sound.play().catch(e => console.warn("Audio bloqueado:", e));
}

// --- REFERENCIAS AL DOM ---
const strip = document.getElementById('p1-strip');
const renderImg = document.getElementById('main-render');
const nameMain = document.getElementById('char-name-main');
const nameSub = document.getElementById('char-name-sub');
const helperText = document.getElementById('helper-text');
const statAtk = document.getElementById('stat-atk');
const statDef = document.getElementById('stat-def');
const statSpd = document.getElementById('stat-spd');
const statKi = document.getElementById('stat-ki');
const bioText = document.getElementById('char-bio');
const formsList = document.getElementById('forms-list');

// --- SISTEMA DE PARTÍCULAS ---
function createParticles() {
    const container = document.getElementById('particles-container');
    if (!container) return;
    
    const particleCount = 80; 

    for (let i = 0; i < particleCount; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        
        const size = Math.random() * 5 + 2 + 'px'; 
        const left = Math.random() * 100 + '%'; 
        const duration = Math.random() * 10 + 5 + 's'; 
        const delay = Math.random() * 10 + 's'; 
        const opacity = Math.random() * 0.5 + 0.3; 

        p.style.width = size;
        p.style.height = size;
        p.style.left = left;
        p.style.animationDuration = duration;
        p.style.animationDelay = '-' + delay; 
        p.style.opacity = opacity;

        container.appendChild(p);
    }
}

// --- NUEVO: SISTEMA DE PRECARGA DE IMÁGENES ---
const preloadedImages = []; 

function preloadAllImages() {
    console.log("Iniciando precarga de imágenes...");
    
    characterGrid.forEach(row => {
        row.forEach(char => {
            // Precargar personaje base
            if (char.portrait) { 
                let pImg = new Image(); pImg.src = char.portrait; preloadedImages.push(pImg); 
            }
            if (char.render) { 
                let rImg = new Image(); rImg.src = char.render; preloadedImages.push(rImg); 
            }

            // Precargar todas sus transformaciones
            if (char.transformations) {
                char.transformations.forEach(trans => {
                    if (trans.portrait) { 
                        let tpImg = new Image(); tpImg.src = trans.portrait; preloadedImages.push(tpImg); 
                    }
                    if (trans.render) { 
                        let trImg = new Image(); trImg.src = trans.render; preloadedImages.push(trImg); 
                    }
                });
            }
        });
    });
    console.log("¡Precarga de imágenes finalizada!");
}

// --- INICIALIZACIÓN ---
async function initGame() {
    createParticles();
    
    try {
        helperText.innerText = "CARGANDO DATOS...";
        const response = await fetch('./characters.json');
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        characterGrid = await response.json();
        
        
        preloadAllImages();
        
        renderBar();
        updateHelper();
    } catch (error) {
        console.error(error);
        helperText.innerText = "ERROR JSON: Revisa la consola o el nombre del archivo";
        helperText.style.color = "red";
    }
}

// --- RENDER BARRA ---
function renderBar() {
    if (characterGrid.length === 0) return;

    strip.innerHTML = '';
    let itemsToRender = [];
    let activeIndex = 0;

    if (currentState === STATE_CHARACTERS) {
        itemsToRender = characterGrid[rowIndex];
        activeIndex = charIndex;
    } else {
        const baseChar = characterGrid[rowIndex][charIndex];
        const baseAsTrans = { 
            ...baseChar, 
            form: baseChar.form || "Normal", 
            isBase: true 
        };
        itemsToRender = [baseAsTrans, ...(baseChar.transformations || [])];
        activeIndex = transIndex;
    }

    itemsToRender.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'char-icon';
        if (index === activeIndex) div.classList.add('active');

        if (currentState === STATE_TRANSFORMATIONS && isEnteringTransformations) {
            div.classList.add('icon-entering');
            div.style.animationDelay = `${index * 0.05}s`; 
        }

        const img = document.createElement('img');
        img.src = item.portrait;
        div.appendChild(img);

        const selectorDiv = document.createElement('div');
        selectorDiv.className = 'selector-border';
        div.appendChild(selectorDiv);
        
        if (currentState === STATE_CHARACTERS && item.transformations && item.transformations.length > 0) {
            const ind = document.createElement('div');
            ind.className = 'transform-indicator';
            div.appendChild(ind);
        }

        strip.appendChild(div);
    });

    if (currentState === STATE_TRANSFORMATIONS) isEnteringTransformations = false;

    if (!isTransitioning) {
        const activeElement = strip.children[activeIndex];
        if (activeElement) {
            activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }

    updateInfo(itemsToRender[activeIndex]);
    updateHelper();
}

// --- CAMBIO DE FILA ---
function changeRow(direction) {
    if (isTransitioning) return;
    isTransitioning = true;
    
    if (direction === 1) { 
        playSound('row_down'); 
    } else { 
        playSound('row_up'); 
    }

    strip.classList.add('row-moving');
    const outClass = direction === 1 ? 'slide-out-up' : 'slide-out-down';
    strip.classList.add(outClass);

    setTimeout(() => {
        rowIndex = (rowIndex + direction + characterGrid.length) % characterGrid.length;
        charIndex = 0;
        
        strip.classList.remove(outClass);
        const inClass = direction === 1 ? 'slide-in-up' : 'slide-in-down';
        strip.classList.add(inClass);
        
        renderBar();

        setTimeout(() => {
            strip.classList.remove(inClass);
            strip.classList.remove('row-moving');
            isTransitioning = false;
        }, 200);

    }, 200);
}

// --- SALIDA TRANSFORMACIONES ---
function triggerExitAnimation() {
    if (isTransitioning) return;
    isTransitioning = true;
    
    playSound('cancel');

    const icons = document.querySelectorAll('.char-icon');
    const totalIcons = icons.length;
    let maxDelay = 0;

    icons.forEach((icon, index) => {
        icon.classList.remove('icon-entering');
        icon.classList.add('icon-exiting');
        const reverseIndex = totalIcons - 1 - index;
        const delay = reverseIndex * 0.04; 
        icon.style.animationDelay = `${delay}s`;
        if (delay > maxDelay) maxDelay = delay;
    });

    const totalTime = 250 + (maxDelay * 1000);

    setTimeout(() => {
        currentState = STATE_CHARACTERS;
        renderBar();
        isTransitioning = false;
    }, totalTime);
}

// --- INFO UPDATE ---
function updateInfo(data) {
    if (!data) return;
    
    renderImg.style.opacity = 0;
    renderImg.style.transform = "translateX(-2vw)";
    
    setTimeout(() => {
        renderImg.src = data.render;
        renderImg.style.opacity = 1;
        renderImg.style.transform = "translateX(0)";
        
        nameMain.innerText = data.name ? data.name.toUpperCase() : "DESCONOCIDO";
        const formName = data.form ? data.form.toUpperCase() : "NORMAL";
        nameSub.innerText = formName;

        if (formName === "NORMAL") {
            nameSub.style.color = "#aaa";
        } else {
            nameSub.style.color = "#ffff00";
        }
        
    }, 50);

    if (data.stats) {
        statAtk.style.width = data.stats.atk + '%';
        statDef.style.width = data.stats.def + '%';
        statSpd.style.width = data.stats.spd + '%';
        statKi.style.width = data.stats.ki + '%';
    } else {
        [statAtk, statDef, statSpd, statKi].forEach(el => el.style.width = '0%');
    }

    bioText.innerText = data.bio || "Información no disponible.";
    
    updateFormsList(data);
}

// --- LISTA DE TRANSFORMACIONES CON IMÁGENES ---
function updateFormsList(activeData) {
    formsList.innerHTML = ''; 

    const baseChar = characterGrid[rowIndex][charIndex];
    const transformationsOnly = baseChar.transformations || [];

    if (transformationsOnly.length === 0) return;

    transformationsOnly.forEach(item => {
        const iconDiv = document.createElement('div');
        iconDiv.className = 'trans-icon-mini';
        
        const img = document.createElement('img');
        img.src = item.portrait;
        img.alt = item.form || "Transformación";
        
        iconDiv.appendChild(img);

        if (activeData && item.id === activeData.id) {
            iconDiv.classList.add('active-trans');
        }

        formsList.appendChild(iconDiv);
    });
}

function updateHelper() {
    if (characterGrid.length === 0) return;
    if (currentState === STATE_CHARACTERS) {
        helperText.innerText = `FILA ${rowIndex + 1} - ENTER: ELEGIR / TRANSFORMAR`;
    } else {
        helperText.innerText = `SELECCIONANDO FORMA - X: VOLVER`;
    }
}

// --- INPUTS ---
document.addEventListener('keydown', (e) => {
   
    if (!musicStarted) {
        bgMusic.play().catch(err => console.log("Audio inicial bloqueado.", err));
        musicStarted = true;
    }

    if (characterGrid.length === 0 || isTransitioning) return;

    // DERECHA
    if (e.key === 'ArrowRight') {
        playSound('move');
        if (currentState === STATE_CHARACTERS) {
            charIndex = (charIndex + 1) % characterGrid[rowIndex].length;
        } else {
            const baseChar = characterGrid[rowIndex][charIndex];
            const total = (baseChar.transformations?.length || 0) + 1;
            transIndex = (transIndex + 1) % total;
        }
        renderBar();
    } 
    // IZQUIERDA
    else if (e.key === 'ArrowLeft') {
        playSound('move');
        if (currentState === STATE_CHARACTERS) {
            const len = characterGrid[rowIndex].length;
            charIndex = (charIndex - 1 + len) % len;
        } else {
            const baseChar = characterGrid[rowIndex][charIndex];
            const total = (baseChar.transformations?.length || 0) + 1;
            transIndex = (transIndex - 1 + total) % total;
        }
        renderBar();
    }
    // ARRIBA / ABAJO
    else if (currentState === STATE_CHARACTERS && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        const direction = e.key === 'ArrowDown' ? 1 : -1;
        changeRow(direction);
    }
    // ENTER / Z
    else if (e.key === 'Enter' || e.key.toLowerCase() === 'z') {
        if (currentState === STATE_CHARACTERS) {
            const char = characterGrid[rowIndex][charIndex];
            
            if (char.transformations && char.transformations.length > 0) {
                playSound('transform'); 
                currentState = STATE_TRANSFORMATIONS;
                transIndex = 0;
                isEnteringTransformations = true;
                renderBar();
            } else {
                confirmSelection(char.name, char.form || "Normal");
            }
        } else {
            const base = characterGrid[rowIndex][charIndex];
            let selectedItem;
            if (transIndex === 0) {
                selectedItem = base;
            } else {
                selectedItem = base.transformations[transIndex - 1];
            }
            confirmSelection(selectedItem.name, selectedItem.form);
        }
    }
    // BACKSPACE / X
    else if (e.key === 'Backspace' || e.key.toLowerCase() === 'x') {
        if (currentState === STATE_TRANSFORMATIONS) {
            triggerExitAnimation();
        }
    }
});

function confirmSelection(name, form) {
    playSound('select'); 
    
    nameMain.style.color = "#ffff00";
    nameMain.style.textShadow = "0 0 20px #ff0000"; 
    nameSub.style.color = "#fff";
    
    console.log(`SELECCIONADO: ${name} (${form || 'Normal'})`);
    
    setTimeout(() => {
        nameMain.style.color = "#fff";
        nameMain.style.textShadow = "2px 2px 0 #000";
    }, 500);
}

initGame();