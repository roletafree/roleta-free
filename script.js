/* ---------- DADOS E STORAGE ---------- */
const STORAGE_KEYS = { 
    PRIZES: 'roulettePrizes', 
    SETTINGS: 'rouletteSettings', 
    HISTORY: 'rouletteHistory',
    FILE_SPIN_SOUND: 'roulette_file_spin_sound',
    FILE_WINNER_SOUND: 'roulette_file_winner_sound',
    FILE_BACKGROUND_MUSIC: 'roulette_file_background_music',
    FILE_BACKGROUND_IMAGE: 'roulette_file_background_image'
};

let prizes = [];
let settings = {};
let spinHistory = [];
let isSpinning = false;

// Cache de dataURLs
let fileUrls = {
    spin_sound: null,
    winner_sound: null,
    background_music: null,
    background_image: null
};

const defaultSettings = {
    title: "ROLETA DA SORTE",
    spin_sound_volume: 70,
    winner_sound_volume: 80,
    background_music_volume: 50,
    enable_spin_sound: true,
    enable_winner_sound: true,
    background_music_enabled: false,
    background_image_name: null,
    title_border_color: '#000000',
    title_border_enabled: false,
    title_border_width: 2,
    title_text_color: '#000000',
    spin_sound_name: null,
    winner_sound_name: null,
    background_music_name: null,
    // NOVAS CONFIGURAÇÕES
    min_revolutions: 10,
    max_revolutions: 20,
    base_duration: 2000,
    duration_per_revolution: 1000,
    pointer_color: '#d9534f',
    wheel_border_color: '#ffcc00',
    spin_button_color: '#5cb85c',
    spin_button_text: 'GIRAR A ROLETA',
    spin_button_shadow: '#4cae4c',
    safe_margin_percent: 5
};

// Áudios serão criados dinamicamente
let spinSound = null;
let winnerSound = null;
let backgroundMusic = null;

/* ---------- HELPERS: TOASTS E CONFIRM CUSTOM ---------- */
function showToast(message, type = 'info', timeout = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(()=> {
        el.classList.add('visible');
    }, 10);
    setTimeout(()=> {
        el.classList.remove('visible');
        setTimeout(()=> container.removeChild(el), 350);
    }, timeout);
}

function showConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const msg = document.getElementById('confirmMessage');
        const yes = document.getElementById('confirmYesBtn');
        const no = document.getElementById('confirmNoBtn');

        function cleanup(result) {
            modal.classList.add('hidden');
            yes.removeEventListener('click', onYes);
            no.removeEventListener('click', onNo);
            resolve(result);
        }
        function onYes() { cleanup(true); }
        function onNo() { cleanup(false); }

        msg.textContent = message;
        modal.classList.remove('hidden');
        yes.addEventListener('click', onYes);
        no.addEventListener('click', onNo);
    });
}

/* ---------- DADOS INICIAIS ---------- */
function loadData() {
    prizes = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRIZES)) || [];
    settings = { ...defaultSettings, ...JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)) };
    spinHistory = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY)) || [];
    
    // Restaurar arquivos salvos em localStorage (data URLs)
    fileUrls.spin_sound = localStorage.getItem(STORAGE_KEYS.FILE_SPIN_SOUND) || null;
    fileUrls.winner_sound = localStorage.getItem(STORAGE_KEYS.FILE_WINNER_SOUND) || null;
    fileUrls.background_music = localStorage.getItem(STORAGE_KEYS.FILE_BACKGROUND_MUSIC) || null;
    fileUrls.background_image = localStorage.getItem(STORAGE_KEYS.FILE_BACKGROUND_IMAGE) || null;

    if (prizes.length === 0) {
        prizes = [
            { id: 1, name: "Ganhou R$10", color: "#FFD700", icon: "💰", order: 0, removable: true },
            { id: 2, name: "Tente Novamente", color: "#32CD32", icon: "❌", order: 1, removable: false },
            { id: 3, name: "Prêmio Surpresa", color: "#FF6347", icon: "🎉", order: 2, removable: true },
            { id: 4, name: "Vale Pizza", color: "#4682B4", icon: "🍕", order: 3, removable: true }
        ];
        saveData();
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEYS.PRIZES, JSON.stringify(prizes));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(spinHistory));
}

/* ---------- CANVAS E DESENHO ---------- */
const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const canvasContainer = document.getElementById('canvasContainer');
let centerX, centerY, radius, anglePerSegment;
let currentRotationInDegrees = 0;
let animationFrameId = null;

function resizeCanvas() {
    const size = canvasContainer.clientWidth;
    canvas.width = size;
    canvas.height = size;
    if (prizes.length > 0) drawWheel();
}

function drawWheel() {
    if (prizes.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }

    centerX = canvas.width / 2;
    centerY = canvas.height / 2;
    radius = Math.min(centerX, centerY) - 10;
    anglePerSegment = (2 * Math.PI) / prizes.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(currentRotationInDegrees * Math.PI / 180);
    ctx.rotate(-Math.PI / 2);

    // Desenhar separadores
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    for (let i = 0; i < prizes.length; i++) {
        const angle = i * anglePerSegment;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        ctx.stroke();
    }

    // Desenhar segmentos e texto
    prizes.forEach((prize, index) => {
        const startAngle = index * anglePerSegment;
        const endAngle = (index + 1) * anglePerSegment;

        // Segmento
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = prize.color || '#FFD700';
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Ícone (mantém igual)
        ctx.save();
        const textAngle = startAngle + anglePerSegment / 2;
        const textRadius = radius * 0.75;
        ctx.rotate(textAngle);
        ctx.translate(textRadius, 0);
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${Math.floor(radius / 10)}px Arial`;
        ctx.fillText(prize.icon || '?', 0, 0);
        ctx.restore();

// Nome do prêmio (alinhado ao raio, horizontal)
ctx.save();
const nameAngle = startAngle + anglePerSegment / 2;

// Rotaciona até o centro da fatia
ctx.rotate(nameAngle);

// Define estilo do texto
ctx.fillStyle = '#000';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.font = `bold ${Math.floor(radius / 15)}px Arial`;

// Nome do prêmio e limite de largura
let prizeName = prize.name;
const maxWidth = radius * 0.7;
if (ctx.measureText(prizeName).width > maxWidth) {
    while (prizeName.length > 3 && ctx.measureText(prizeName + '...').width > maxWidth) {
        prizeName = prizeName.substring(0, prizeName.length - 1);
    }
    prizeName += '...';
}

// Move para o ponto médio do raio
ctx.translate(radius * 0.4, 0);

// 🔹 NÃO rotaciona o texto, mantém horizontal, acompanhando o raio
ctx.fillText(prizeName, 0, 0);

ctx.restore();

    });

    ctx.restore();
}


/* ---------- UTIL ---------- */
function getRandomHexColor(){
    return '#'+Math.floor(Math.random()*16777215).toString(16).padStart(6,'0').toUpperCase();
}

function clearPrizeForm(){
    document.getElementById('newPrizeName').value = '';
    document.getElementById('newPrizeIcon').value = '🎁';
    document.getElementById('newPrizeColor').value = '#FFD700';
    document.getElementById('newPrizeColorPicker').value = '#FFD700';
    document.getElementById('newPrizeRemovable').checked = true;
}

/* ---------- LÓGICA DO SORTEIO ---------- */
function animateSpin(endRotation, duration, onComplete) {
    isSpinning = true;
    document.getElementById('spinButton').disabled = true;
    
    const startTime = performance.now();
    const startRotation = currentRotationInDegrees;
    
    function step(now){
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const eased = 1 - Math.pow(1-progress, 3); /* ---------- velocidade de frenagem da roleta ---------- */
        currentRotationInDegrees = startRotation + (endRotation - startRotation) * eased;
        drawWheel();
        
        if (progress < 1) {
            animationFrameId = requestAnimationFrame(step);
        } else {
            currentRotationInDegrees = endRotation;
            drawWheel();
            isSpinning = false;
            document.getElementById('spinButton').disabled = false;
            
            try {
                if (spinSound) {
                    spinSound.pause();
                    spinSound.currentTime = 0;
                }
            } catch(e){}
            
            if (typeof onComplete === 'function') onComplete();
        }
    }
    
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(step);
}

function startWheelSpin() {
    if (isSpinning || prizes.length === 0) return;

    const numPrizes = prizes.length;
    const sliceDegrees = 360 / numPrizes;

    // Sorteia o prêmio
    const targetIndex = Math.floor(Math.random() * numPrizes);
    const targetPrize = prizes[targetIndex];

    // Usar margem de segurança configurável
    const safeMarginPercent = settings.safe_margin_percent || 5;
    const safeMargin = sliceDegrees * (safeMarginPercent / 100);
    
    const startAngle = targetIndex * sliceDegrees;
    const endAngle = startAngle + sliceDegrees;

    // Escolhe um ponto aleatório dentro da faixa segura do setor
    const randomAngleInPrize = startAngle + safeMargin + Math.random() * (sliceDegrees - safeMargin * 2);

    // Calcula o ângulo necessário para alinhar esse ponto à seta
    const angleNeededToAlign = 360 - randomAngleInPrize;

    // Usar configurações de voltas
    const minRevs = settings.min_revolutions || 10;
    const maxRevs = settings.max_revolutions || 20;
    const extraRevolutions = Math.floor(Math.random() * (maxRevs - minRevs + 1)) + minRevs;
    
    const residualRotation = currentRotationInDegrees % 360;
    const totalRevolutions = extraRevolutions * 360;
    const finalRotation = currentRotationInDegrees + totalRevolutions + angleNeededToAlign - residualRotation;

    // Usar configurações de duração
    const baseDuration = settings.base_duration || 2000;
    const durationPerRev = settings.duration_per_revolution || 1000;
    const totalDuration = baseDuration + extraRevolutions * durationPerRev;

    // Som de giro
    if (settings.enable_spin_sound && fileUrls.spin_sound && spinSound) {
        try {
            spinSound.volume = (settings.spin_sound_volume || defaultSettings.spin_sound_volume) / 100;
            spinSound.loop = true;
            spinSound.currentTime = 0;
            spinSound.play().catch((e) => console.log("Erro ao tocar som de giro:", e));
        } catch (e) {
            console.log("Erro no som de giro:", e);
        }
    }

    // Inicia a animação da roleta
    animateSpin(finalRotation, totalDuration, () => {
        const prize = targetPrize;
        const spinResult = {
            id: Date.now(),
            prize_name: prize.name,
            prize_color: prize.color,
            timestamp: new Date().toISOString()
        };

        spinHistory.unshift(spinResult);
        spinHistory = spinHistory.slice(0, 1000);
        saveData();

        // Parar o som de giro
        try {
            if (spinSound) {
                spinSound.pause();
                spinSound.currentTime = 0;
            }
        } catch (e) {}

        showWinnerModal(prize);
    });
}


/* ---------- DRAG AND DROP CORRIGIDO ---------- */
/* ---------- DRAG AND DROP CORRIGIDO ---------- */
function setupDragAndDrop() {
    const container = document.getElementById('prizeListContainer');
    let draggedItem = null;
    let draggedIndex = null;
    
    container.addEventListener('dragstart', function(e) {
        if (e.target.classList.contains('prize-item')) {
            draggedItem = e.target;
            draggedIndex = Array.from(container.children).indexOf(draggedItem);
            e.target.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', e.target.getAttribute('data-id'));
        }
    });
    
    container.addEventListener('dragend', function(e) {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
            draggedIndex = null;
            
            // Remover todas as classes de preview
            document.querySelectorAll('.prize-item').forEach(item => {
                item.classList.remove('drop-above', 'drop-below');
            });
        }
    });
    
    container.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const afterElement = getDragAfterElement(container, e.clientY);
        const draggable = document.querySelector('.dragging');
        
        if (!draggable) return;
        
        // Limpar todas as classes de preview
        document.querySelectorAll('.prize-item').forEach(item => {
            item.classList.remove('drop-above', 'drop-below');
        });
        
        // Adicionar classe de preview ao elemento após o qual vamos dropar
        if (afterElement && afterElement !== draggable) {
            const rect = afterElement.getBoundingClientRect();
            const afterElementMiddle = rect.top + rect.height / 2;
            
            if (e.clientY < afterElementMiddle) {
                afterElement.classList.add('drop-above');
            } else {
                afterElement.classList.add('drop-below');
            }
        }
    });
    
    container.addEventListener('dragleave', function(e) {
        // Limpar preview quando sair do container
        if (!e.currentTarget.contains(e.relatedTarget)) {
            document.querySelectorAll('.prize-item').forEach(item => {
                item.classList.remove('drop-above', 'drop-below');
            });
        }
    });
    
    container.addEventListener('drop', function(e) {
        e.preventDefault();
        if (!draggedItem) return;
        
        const afterElement = getDragAfterElement(container, e.clientY);
        const draggable = document.querySelector('.dragging');
        
        if (!draggable) return;
        
        // Limpar preview
        document.querySelectorAll('.prize-item').forEach(item => {
            item.classList.remove('drop-above', 'drop-below');
        });
        
        // Encontrar índices
        const items = Array.from(container.children);
        const currentIndex = items.indexOf(draggable);
        let newIndex;
        
        if (afterElement) {
            newIndex = items.indexOf(afterElement);
            // Ajustar índice baseado na posição do drop
            const rect = afterElement.getBoundingClientRect();
            const afterElementMiddle = rect.top + rect.height / 2;
            
            if (e.clientY < afterElementMiddle) {
                // Drop acima do elemento
                newIndex = newIndex > currentIndex ? newIndex - 1 : newIndex;
            } else {
                // Drop abaixo do elemento
                newIndex = newIndex < currentIndex ? newIndex + 1 : newIndex;
            }
        } else {
            // Drop no final
            newIndex = items.length - 1;
        }
        
        // Garantir que os índices são válidos
        if (currentIndex !== -1 && newIndex !== -1 && currentIndex !== newIndex) {
            // Reordenar o array de prêmios
            const [movedPrize] = prizes.splice(currentIndex, 1);
            prizes.splice(newIndex, 0, movedPrize);
            
            // Atualizar as ordens
            prizes.forEach((prize, index) => {
                prize.order = index;
            });
            
            saveData();
            updateUI();
            showToast('Ordem dos prêmios atualizada!', 'success');
        }
        
        draggedItem.classList.remove('dragging');
        draggedItem = null;
    });
}

// Função auxiliar simplificada para determinar a posição do drop
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.prize-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

/* ---------- BOTÃO DUPLICAR ---------- */
async function duplicatePrize(index) {
    if (index < 0 || index >= prizes.length) return;
    
    const originalPrize = prizes[index];
    const newId = Date.now() + Math.random();
    
    // Criar cópia do prêmio
    const duplicatedPrize = {
        id: newId,
        name: `${originalPrize.name}`,
        color: originalPrize.color,
        icon: originalPrize.icon,
        order: prizes.length, // Será corrigido no reordenamento
        removable: originalPrize.removable
    };
    
    // Inserir após o item original
    prizes.splice(index + 1, 0, duplicatedPrize);
    
    // Reordenar todos os itens
    prizes.forEach((prize, idx) => {
        prize.order = idx;
    });
    
    saveData();
    updateUI();
    showToast(`Prêmio "${originalPrize.name}" duplicado!`, 'success');
}

/* ---------- GERENCIAMENTO DE PRÊMIOS ATUALIZADO ---------- */
function renderPrizeList(){
    const container = document.getElementById('prizeListContainer');
    if (!prizes || prizes.length === 0) { 
        container.innerHTML = '<p>Nenhum prêmio.</p>'; 
        return; 
    }
    
    // Ordenar prêmios pela ordem
    const sortedPrizes = [...prizes].sort((a, b) => (a.order || 0) - (b.order || 0));
    
    container.innerHTML = sortedPrizes.map((prize, index) => `
        <div class="prize-item" data-id="${prize.id}" draggable="true">
            <div class="prize-color-swatch" style="background-color:${prize.color||'#FFD700'}">${index+1}</div>
            <div style="flex-grow:1;">
                <p style="margin:0; font-weight:700;">${prize.name} ${prize.icon || ''}</p>
                <p style="margin:0; font-size:.85em; color:#666;">${prize.removable===false? '🔒 (bloqueado no modal)' : ''}</p>
            </div>
            <div style="display:flex; gap:6px; margin-left:8px;">
                <button class="small duplicate-prize-btn" data-index="${sortedPrizes.indexOf(prize)}" title="Duplicar">📋</button>
                <button class="small edit-prize-btn" data-index="${sortedPrizes.indexOf(prize)}" title="Editar">✏️</button>
                <button class="small delete-prize-btn" data-index="${sortedPrizes.indexOf(prize)}" title="Excluir">🗑️</button>
            </div>
        </div>
    `).join('');
    
    // Adicionar event listeners aos botões
    document.querySelectorAll('.edit-prize-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            loadPrizeIntoForm(index);
        });
    });
    
    document.querySelectorAll('.delete-prize-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const idx = parseInt(this.getAttribute('data-index'));
            await deletePrize(idx);
        });
    });
    
    // Adicionar event listeners para duplicar
    document.querySelectorAll('.duplicate-prize-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const idx = parseInt(this.getAttribute('data-index'));
            duplicatePrize(idx);
        });
    });
    
    setupDragAndDrop();
}

async function addPrize(){
    const name = document.getElementById('newPrizeName').value.trim();
    const colorInput = document.getElementById('newPrizeColor').value.trim().toUpperCase() || '';
    const icon = document.getElementById('newPrizeIcon').value.trim() || '❓';
    const removable = document.getElementById('newPrizeRemovable').checked;
    
    if (!name){
        showToast('Preencha o Nome do prêmio.', 'error');
        return;
    }
    
    const newId = Date.now() + Math.random();
    const color = (colorInput === '' || colorInput === '#FFD700') ? getRandomHexColor() : colorInput;
    prizes.push({ id:newId, name, color, icon, order:prizes.length, removable });
    prizes.sort((a,b)=> (a.order||0)-(b.order||0));
    saveData();
    updateUI();
    clearPrizeForm();
    showToast(`Prêmio "${name}" adicionado.`, 'success');
}

async function deletePrize(index){
    if (index < 0 || index >= prizes.length) return;
    const should = await showConfirm(`Remover prêmio "${prizes[index].name}" da roleta?`);
    if (!should) return;
    prizes.splice(index,1);
    saveData();
    updateUI();
    showToast('Prêmio removido.', 'info');
}

function loadPrizeIntoForm(index){
    const p = prizes[index];
    if (!p) return;
    document.getElementById('newPrizeName').value = p.name;
    document.getElementById('newPrizeColor').value = p.color;
    document.getElementById('newPrizeColorPicker').value = p.color;
    document.getElementById('newPrizeIcon').value = p.icon;
    document.getElementById('newPrizeRemovable').checked = p.removable === true;
    prizes.splice(index,1);
    saveData();
    updateUI();
    showToast(`Prêmio "${p.name}" carregado no formulário. Clique em Adicionar para salvar a atualização.`, 'info');
}

/* ---------- CONFIGURAÇÕES E ÁUDIO ---------- */
function renderSettingsPanel(){
    const container = document.getElementById('settingsContent');
    container.innerHTML = `
        <div class="form-group">
            <label for="settingTitle">Título da Roleta:</label>
            <input type="text" id="settingTitle" value="${settings.title || defaultSettings.title}">
        </div>
        <div class="title-controls">
            <div class="title-control-group">
                <label for="titleTextColor">Cor do Texto:</label>
                <input type="color" id="titleTextColor" value="${settings.title_text_color || '#000000'}">
            </div>
            <div class="title-control-group">
                <label for="titleBorderEnabled">Borda:</label>
                <input type="checkbox" id="titleBorderEnabled" ${settings.title_border_enabled ? 'checked' : ''}>
            </div>
            <div class="title-control-group" id="titleBorderColorGroup" style="${settings.title_border_enabled ? '' : 'display: none;'}">
                <label for="titleBorderColor">Cor:</label>
                <input type="color" id="titleBorderColor" value="${settings.title_border_color || '#000000'}">
            </div>
            <div class="title-control-group" id="titleBorderWidthGroup" style="${settings.title_border_enabled ? '' : 'display: none;'}">
                <label for="titleBorderWidth">Largura:</label>
                <input type="number" id="titleBorderWidth" min="1" max="10" value="${settings.title_border_width || 2}">
            </div>
        </div>
<div class="card">
    <div class="card-header"><h3 class="card-title">Sons</h3></div>
    <div class="card-content">
        <div class="form-group">
            <label>Som de giro:</label>
            <input type="file" id="spinSoundFile" accept="audio/*">
            ${settings.spin_sound_name ? `<p style="font-size:.85em;color:#444;">✅ ${settings.spin_sound_name}</p>` : '<p style="font-size:.85em;color:#999;">Nenhum arquivo selecionado</p>'}
            <div class="volume-control">
                <label for="spinSoundVolume">Volume do som de giro: ${settings.spin_sound_volume || 70}%</label>
                <input type="range" id="spinSoundVolume" min="0" max="100" value="${settings.spin_sound_volume || 70}">
            </div>
        </div>
        <div class="form-group">
            <label>Som de vitória:</label>
            <input type="file" id="winnerSoundFile" accept="audio/*">
            ${settings.winner_sound_name ? `<p style="font-size:.85em;color:#444;">✅ ${settings.winner_sound_name}</p>` : '<p style="font-size:.85em;color:#999;">Nenhum arquivo selecionado</p>'}
            <div class="volume-control">
                <label for="winnerSoundVolume">Volume do som de vitória: ${settings.winner_sound_volume || 80}%</label>
                <input type="range" id="winnerSoundVolume" min="0" max="100" value="${settings.winner_sound_volume || 80}">
            </div>
        </div>
        <div class="form-group">
            <label>Música de fundo:</label>
            <input type="file" id="backgroundMusicFile" accept="audio/*">
            ${settings.background_music_name ? `<p style="font-size:.85em;color:#444;">✅ ${settings.background_music_name}</p>` : '<p style="font-size:.85em;color:#999;">Nenhum arquivo selecionado</p>'}
            <div class="volume-control">
                <label for="backgroundMusicVolume">Volume da música de fundo: ${settings.background_music_volume || 50}%</label>
                <input type="range" id="backgroundMusicVolume" min="0" max="100" value="${settings.background_music_volume || 50}">
            </div>
        </div>
        <div class="form-group">
            <label>
                <input type="checkbox" id="enableBackgroundMusic" ${settings.background_music_enabled ? 'checked' : ''}>
                Ativar música de fundo
            </label>
        </div>
    </div>
</div>
        </div>
        <div class="card">
            <div class="card-header"><h3 class="card-title">Fundo da Roleta</h3></div>
            <div class="card-content">
                <div class="form-group">
                    <label>Imagem de fundo:</label>
                    <input type="file" id="backgroundImageFile" accept="image/*">
                    ${settings.background_image_name ? `<p style="font-size:.85em;color:#444;">✅ ${settings.background_image_name}</p>` : '<p style="font-size:.85em;color:#999;">Nenhuma imagem selecionada</p>'}
                    <img id="backgroundImagePreview" class="background-image-preview" style="display:${settings.background_image_name ? 'block' : 'none'};">
                </div>
                <button class="small" id="removeBackgroundImageBtn">Remover Imagem de Fundo</button>
            </div>
        </div>
        <button class="small" id="saveSettingsBtn">Salvar Configurações</button>
    `;
    
    // Configurar event listeners apenas para as configurações básicas
    setupBasicSettingsEventListeners();
}

// NOVA FUNÇÃO: Renderizar configurações avançadas
function renderAdvancedSettingsPanel(){
    const container = document.getElementById('settingsAdvencedContent');
    container.innerHTML = `
        <div class="card">
            <div class="card-header"><h3 class="card-title">Configurações Avançadas da Roleta</h3></div>
            <div class="card-content">
                <div class="form-group">
                    <label for="settingMinRevolutions">Voltas Mínimas:</label>
                    <input type="number" id="settingMinRevolutions" min="3" max="30" value="${settings.min_revolutions || 10}">
                    <p style="font-size:.85em;color:#666;">Número mínimo de voltas completas antes de parar</p>
                </div>
                <div class="form-group">
                    <label for="settingMaxRevolutions">Voltas Máximas:</label>
                    <input type="number" id="settingMaxRevolutions" min="5" max="50" value="${settings.max_revolutions || 20}">
                    <p style="font-size:.85em;color:#666;">Número máximo de voltas completas antes de parar</p>
                </div>
                <div class="form-group">
                    <label for="settingBaseDuration">Duração Base (ms):</label>
                    <input type="number" id="settingBaseDuration" min="1000" max="10000" value="${settings.base_duration || 2000}">
                    <p style="font-size:.85em;color:#666;">Tempo base da animação (milissegundos)</p>
                </div>
                <div class="form-group">
                    <label for="settingDurationPerRev">Duração por Volta (ms):</label>
                    <input type="number" id="settingDurationPerRev" min="500" max="5000" value="${settings.duration_per_revolution || 1000}">
                    <p style="font-size:.85em;color:#666;">Tempo adicional por volta completa</p>
                </div>
                <div class="form-group">
                    <label for="settingPointerColor">Cor da Seta:</label>
                    <input type="color" id="settingPointerColor" value="${settings.pointer_color || '#d9534f'}">
                </div>
                <div class="form-group">
                    <label for="settingWheelBorderColor">Cor da Borda da Roleta:</label>
                    <input type="color" id="settingWheelBorderColor" value="${settings.wheel_border_color || '#ffcc00'}">
                </div>
                <div class="form-group">
                    <label for="settingSpinButtonColor">Cor do Botão Girar:</label>
                    <input type="color" id="settingSpinButtonColor" value="${settings.spin_button_color || '#5cb85c'}">
                </div>
                <div class="form-group">
                    <label for="settingSpinButtonText">Texto do Botão Girar:</label>
                    <input type="text" id="settingSpinButtonText" value="${settings.spin_button_text || 'GIRAR A ROLETA'}">
                </div>
                <div class="form-group">
                    <label for="settingSpinButtonShadow">Cor da Sombra do Botão:</label>
                    <input type="color" id="settingSpinButtonShadow" value="${settings.spin_button_shadow || '#4cae4c'}">
                </div>
                <div class="form-group">
                    <label for="settingSafeMargin">Margem de Segurança (%):</label>
                    <input type="number" id="settingSafeMargin" min="1" max="20" step="1" value="${settings.safe_margin_percent || 5}">
                    <p style="font-size:.85em;color:#666;">Margem das bordas para evitar parar entre prêmios (1-20%)</p>
                </div>
            </div>
        </div>
        <button class="small" id="saveAdvancedSettingsBtn">Salvar Configurações Avançadas</button>
    `;
    
    // Configurar event listeners para as configurações avançadas
    setupAdvancedSettingsEventListeners();
}

// SEPARAR OS EVENT LISTENERS: Configurações básicas
function setupBasicSettingsEventListeners() {
    // Título
    document.getElementById('settingTitle').addEventListener('input', updateTitlePreview);
    document.getElementById('titleTextColor').addEventListener('change', updateTitlePreview);
    document.getElementById('titleBorderEnabled').addEventListener('change', toggleTitleBorder);
    document.getElementById('titleBorderColor').addEventListener('change', updateTitlePreview);
    document.getElementById('titleBorderWidth').addEventListener('change', updateTitlePreview);
    
    // Arquivos de áudio
    document.getElementById('spinSoundFile').addEventListener('change', (e) => handleFileSelection(e, 'spin_sound'));
    document.getElementById('winnerSoundFile').addEventListener('change', (e) => handleFileSelection(e, 'winner_sound'));
    document.getElementById('backgroundMusicFile').addEventListener('change', (e) => handleFileSelection(e, 'background_music'));
    document.getElementById('backgroundImageFile').addEventListener('change', (e) => handleFileSelection(e, 'background_image'));
    
    // Música de fundo
    document.getElementById('enableBackgroundMusic').addEventListener('change', toggleBackgroundMusic);
    
    // Botões
    document.getElementById('removeBackgroundImageBtn').addEventListener('click', removeBackgroundImage);
    document.getElementById('saveSettingsBtn').addEventListener('click', saveBasicSettings);

    document.getElementById('spinSoundVolume').addEventListener('input', updateSpinSoundVolume);
    document.getElementById('winnerSoundVolume').addEventListener('input', updateWinnerSoundVolume);
    document.getElementById('backgroundMusicVolume').addEventListener('input', updateBackgroundMusicVolume);
}

function updateSpinSoundVolume() {
    const volume = parseInt(document.getElementById('spinSoundVolume').value);
    settings.spin_sound_volume = volume;
    
    // Atualizar label
    document.querySelector('label[for="spinSoundVolume"]').textContent = `Volume do som de giro: ${volume}%`;
    
    // Aplicar volume
    if (spinSound) {
        spinSound.volume = volume / 100;
    }
    
    saveData();
}

function updateWinnerSoundVolume() {
    const volume = parseInt(document.getElementById('winnerSoundVolume').value);
    settings.winner_sound_volume = volume;
    
    // Atualizar label
    document.querySelector('label[for="winnerSoundVolume"]').textContent = `Volume do som de vitória: ${volume}%`;
    
    // Aplicar volume
    if (winnerSound) {
        winnerSound.volume = volume / 100;
    }
    
    saveData();
}

function updateBackgroundMusicVolume() {
    const volume = parseInt(document.getElementById('backgroundMusicVolume').value);
    settings.background_music_volume = volume;
    
    // Atualizar label
    document.querySelector('label[for="backgroundMusicVolume"]').textContent = `Volume da música de fundo: ${volume}%`;
    
    // Aplicar volume
    if (backgroundMusic) {
        backgroundMusic.volume = volume / 100;
    }
    
    saveData();
}

// SEPARAR OS EVENT LISTENERS: Configurações avançadas
function setupAdvancedSettingsEventListeners() {
    // Event listeners para atualização em tempo real
    document.getElementById('settingPointerColor').addEventListener('change', updatePointerColor);
    document.getElementById('settingWheelBorderColor').addEventListener('change', updateWheelBorder);
    document.getElementById('settingSpinButtonColor').addEventListener('change', updateSpinButton);
    document.getElementById('settingSpinButtonText').addEventListener('input', updateSpinButton);
    document.getElementById('settingSpinButtonShadow').addEventListener('change', updateSpinButton);
    
    // Botão salvar configurações avançadas
    document.getElementById('saveAdvancedSettingsBtn').addEventListener('click', saveAdvancedSettings);
}

// SEPARAR AS FUNÇÕES DE SALVAR: Configurações básicas
function saveBasicSettings(){
    settings.title = document.getElementById('settingTitle').value || defaultSettings.title;
    settings.title_text_color = document.getElementById('titleTextColor').value;
    settings.title_border_color = document.getElementById('titleBorderColor').value;
    settings.title_border_width = parseInt(document.getElementById('titleBorderWidth').value);
    
    saveData();
    updateUI();
    showToast('Configurações básicas salvas!', 'success');
}

// SEPARAR AS FUNÇÕES DE SALVAR: Configurações avançadas
function saveAdvancedSettings(){
    // Configurações avançadas
    settings.min_revolutions = parseInt(document.getElementById('settingMinRevolutions').value) || 10;
    settings.max_revolutions = parseInt(document.getElementById('settingMaxRevolutions').value) || 20;
    settings.base_duration = parseInt(document.getElementById('settingBaseDuration').value) || 2000;
    settings.duration_per_revolution = parseInt(document.getElementById('settingDurationPerRev').value) || 1000;
    settings.pointer_color = document.getElementById('settingPointerColor').value;
    settings.wheel_border_color = document.getElementById('settingWheelBorderColor').value;
    settings.spin_button_color = document.getElementById('settingSpinButtonColor').value;
    settings.spin_button_text = document.getElementById('settingSpinButtonText').value;
    settings.spin_button_shadow = document.getElementById('settingSpinButtonShadow').value;
    settings.safe_margin_percent = parseInt(document.getElementById('settingSafeMargin').value) || 5;
    
    saveData();
    updateUI();
    showToast('Configurações avançadas salvas!', 'success');
}

function updatePointerColor() {
    const color = document.getElementById('settingPointerColor').value;
    settings.pointer_color = color;
    
    const pointer = document.querySelector('.pointer-triangle');
    if (pointer) {
        pointer.style.borderTopColor = color;
    }
    
    saveData();
}

function updateWheelBorder() {
    const color = document.getElementById('settingWheelBorderColor').value;
    settings.wheel_border_color = color;
    
    const canvasContainer = document.getElementById('canvasContainer');
    if (canvasContainer) {
        canvasContainer.style.borderColor = color;
    }
    
    saveData();
}

function updateSpinButton() {
    const color = document.getElementById('settingSpinButtonColor').value;
    const text = document.getElementById('settingSpinButtonText').value;
    const shadow = document.getElementById('settingSpinButtonShadow').value;
    
    settings.spin_button_color = color;
    settings.spin_button_text = text;
    settings.spin_button_shadow = shadow;
    
    const spinButton = document.getElementById('spinButton');
    if (spinButton) {
        spinButton.style.backgroundColor = color;
        spinButton.textContent = text;
        spinButton.style.boxShadow = `0 4px ${shadow}`;
    }
    
    saveData();
}

/* ---------- ARQUIVOS: SALVAR/RESTAURAR (IndexedDB para mídias grandes) ---------- */

// --- IndexedDB helpers ---
const DB_NAME = 'roulette_media';
const DB_VERSION = 1;
let dbInstance = null;

function openIndexedDB() {
    return new Promise((resolve, reject) => {
        if (dbInstance) return resolve(dbInstance);
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('files')) {
                db.createObjectStore('files');
            }
        };
        request.onsuccess = e => {
            dbInstance = e.target.result;
            resolve(dbInstance);
        };
        request.onerror = e => reject(e.target.error);
    });
}

async function saveFileToIndexedDB(key, file) {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('files', 'readwrite');
        const store = tx.objectStore('files');
        store.put(file, key);
        tx.oncomplete = () => resolve();
        tx.onerror = e => reject(e.target.error);
    });
}

async function getFileFromIndexedDB(key) {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('files', 'readonly');
        const store = tx.objectStore('files');
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = e => reject(e.target.error);
    });
}

async function deleteFileFromIndexedDB(key) {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('files', 'readwrite');
        const store = tx.objectStore('files');
        store.delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = e => reject(e.target.error);
    });
}

// --- Manipulação de arquivos ---

async function handleFileSelection(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        await saveFileToIndexedDB(type, file);
        const url = URL.createObjectURL(file);

        fileUrls[type] = url;
        if (type === 'spin_sound') {
            settings.spin_sound_name = file.name;
            showToast('Som de giro selecionado: ' + file.name, 'success');
        } else if (type === 'winner_sound') {
            settings.winner_sound_name = file.name;
            showToast('Som de vitória selecionado: ' + file.name, 'success');
        } else if (type === 'background_music') {
            settings.background_music_name = file.name;
            showToast('Música de fundo selecionada: ' + file.name, 'success');
            if (settings.background_music_enabled && backgroundMusic) {
                backgroundMusic.src = fileUrls.background_music;
            }
        } else if (type === 'background_image') {
            settings.background_image_name = file.name;
            applyBackgroundImage();
            showToast('Imagem de fundo selecionada: ' + file.name, 'success');
        }

        saveData();
        updateUI();
    } catch (err) {
        console.error('Erro ao salvar arquivo no IndexedDB:', err);
        showToast('Erro ao processar arquivo.', 'error');
    }
}

async function restoreMediaFiles() {
    const keys = ['spin_sound', 'winner_sound', 'background_music', 'background_image'];
    for (const key of keys) {
        try {
            const blob = await getFileFromIndexedDB(key);
            if (blob) {
                const url = URL.createObjectURL(blob);
                fileUrls[key] = url;
                if (key === 'background_image') applyBackgroundImage();
            }
        } catch (e) {
            console.error('Erro ao restaurar arquivo:', key, e);
        }
    }
}

async function removeBackgroundImage() {
    await deleteFileFromIndexedDB('background_image');
    fileUrls.background_image = null;
    settings.background_image_name = null;
    saveData();
    applyBackgroundImage();
    updateUI();
    showToast('Imagem de fundo removida!', 'info');
}

function applyBackgroundImage() {
    const body = document.body;
    const container = document.querySelector('.container');
    if (fileUrls.background_image) {
        body.style.backgroundImage = `url(${fileUrls.background_image})`;
        body.style.backgroundColor = 'transparent';
        container.style.backgroundImage = `url(${fileUrls.background_image})`;
        container.style.backgroundSize = 'cover';
        container.style.backgroundPosition = 'center';
        container.style.backgroundRepeat = 'no-repeat';
    } else {
        body.style.backgroundImage = 'none';
        body.style.backgroundColor = '#f0f2f5';
        container.style.backgroundImage = 'none';
        container.style.backgroundColor = '';
    }
}

// Restaurar arquivos grandes na inicialização
window.addEventListener('load', async () => {
    await openIndexedDB();
    await restoreMediaFiles();
});


function toggleBackgroundMusic() {
    const enabled = document.getElementById('enableBackgroundMusic').checked;
    settings.background_music_enabled = enabled;
    saveData();
    
    if (backgroundMusic) {
        if (enabled && fileUrls.background_music) {
            backgroundMusic.src = fileUrls.background_music;
            backgroundMusic.play().catch(e => {
                console.log("Música de fundo aguardando interação:", e);
            });
        } else {
            backgroundMusic.pause();
            backgroundMusic.currentTime = 0;
        }
    }
}

function toggleTitleBorder() {
    const enabled = document.getElementById('titleBorderEnabled').checked;
    settings.title_border_enabled = enabled;
    
    const colorGroup = document.getElementById('titleBorderColorGroup');
    const widthGroup = document.getElementById('titleBorderWidthGroup');
    
    if (enabled) {
        colorGroup.style.display = 'flex';
        widthGroup.style.display = 'flex';
    } else {
        colorGroup.style.display = 'none';
        widthGroup.style.display = 'none';
    }
    
    updateTitlePreview();
    saveData();
}

function updateTitlePreview() {
    const title = document.getElementById('rouletteTitle');
    const titleText = document.getElementById('settingTitle').value || defaultSettings.title;
    const textColor = document.getElementById('titleTextColor').value;
    const borderEnabled = document.getElementById('titleBorderEnabled').checked;
    const borderColor = document.getElementById('titleBorderColor').value;
    const borderWidth = document.getElementById('titleBorderWidth').value || 2;
    
    title.textContent = titleText;
    title.style.color = textColor;
    
    if (borderEnabled) {
        title.style.textShadow = `
            -${borderWidth}px -${borderWidth}px 0 ${borderColor},
            ${borderWidth}px -${borderWidth}px 0 ${borderColor},
            -${borderWidth}px ${borderWidth}px 0 ${borderColor},
            ${borderWidth}px ${borderWidth}px 0 ${borderColor}
        `;
    } else {
        title.style.textShadow = 'none';
    }
    
    // Salvar configurações em tempo real
    settings.title = titleText;
    settings.title_text_color = textColor;
    settings.title_border_enabled = borderEnabled;
    settings.title_border_color = borderColor;
    settings.title_border_width = parseInt(borderWidth);
    saveData();
}


/* ---------- HISTÓRICO ---------- */
function renderSpinHistory(){
    const container = document.getElementById('spinHistoryContainer');
    if (!spinHistory || spinHistory.length === 0) { 
        container.innerHTML = `
            <button class="small" id="clearHistoryBtn">Limpar Histórico</button>
            <p style="text-align:center;color:#999">Nenhum sorteio realizado ainda.</p>
        `; 
        return; 
    }
    
    container.innerHTML = `        <button class="small" id="clearHistoryBtn">Limpar Histórico</button>
        ${spinHistory.slice(0,20).map((r,idx)=>`
            <div class="prize-item" style="background:linear-gradient(to right,#f9f9f9,#fff);">
                <div class="prize-color-swatch" style="background:${r.prize_color||'#FFD700'}">${idx+1}</div>
                <div style="flex-grow:1;">
                    <p style="margin:0;font-weight:700;">${r.prize_name}</p>
                    <p style="margin:0;font-size:.85em;color:#666;">${new Date(r.timestamp).toLocaleTimeString('pt-BR')} - ${new Date(r.timestamp).toLocaleDateString('pt-BR')}</p>
                </div>
            </div>
        `).join('')}
    `;
}

async function clearHistory() {
    const ok = await showConfirm('Tem certeza que deseja limpar todo o histórico de sorteios?');
    if (!ok) return;
    spinHistory = [];
    saveData();
    renderSpinHistory();
    showToast('Histórico limpo.', 'info');
}

/* ---------- MODAL VENCEDOR E CONFETTI ---------- */
let winningPrizeData = null;

function showWinnerModal(prize){
    winningPrizeData = prize;
    document.getElementById('modalPrizeName').textContent = prize.name;
    document.getElementById('modalIcon').textContent = prize.icon || '🏆';
    const removeButton = document.getElementById('removePrizeButton');
    
    if (prize.removable === false) {
        removeButton.classList.add('hidden');
    } else {
        removeButton.classList.remove('hidden');
    }
    
    const winnerModal = document.getElementById('winnerModal');
    winnerModal.classList.remove('hidden');
    generateConfetti(prize.color || '#FFD700');
    
    // Som de vitória
    if (settings.enable_winner_sound && fileUrls.winner_sound && winnerSound) {
        try {
            winnerSound.volume = (settings.winner_sound_volume || defaultSettings.winner_sound_volume) / 100;
            winnerSound.currentTime = 0;
            winnerSound.play().catch((e) => console.log("Erro ao tocar som de vitória:", e));
        } catch(e){
            console.log("Erro no som de vitória:", e);
        }
    }
}

function closeModal(){
    const winnerModal = document.getElementById('winnerModal');
    winnerModal.classList.add('hidden');
    const confettiArea = document.getElementById('confettiArea');
    confettiArea.innerHTML = '';
    winningPrizeData = null;
}

function removeWinningPrizeAndCloseModal(){
    if (!winningPrizeData) return;
    const idx = prizes.findIndex(p => p.id == winningPrizeData.id);
    if (idx !== -1) {
        prizes.splice(idx,1);
        saveData();
        updateUI();
        showToast(`${winningPrizeData.name} foi removido da roleta.`, 'info');
    }
    closeModal();
}

function generateConfetti(color){
    const confettiArea = document.getElementById('confettiArea');
    confettiArea.innerHTML = '';
    const count = 360;
    
    for (let i=0;i<count;i++){
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.backgroundColor = color;
        piece.style.left = `${Math.random()*100}%`;
        piece.style.top = `${Math.random()*-50}%`;
        piece.style.transform = `rotate(${Math.random()*360}deg)`;
        
        const fall = 1.2 + Math.random()*1.6;
        const delay = Math.random()*0.6;
        piece.style.transition = `transform ${fall}s ease-out ${delay}s, opacity .6s ease-in ${delay}s`;
        
        requestAnimationFrame(()=> {
            piece.style.opacity = 1;
            piece.style.transform = `rotate(${Math.random()*720}deg) translate(${(Math.random()-0.5)*200}px, ${300 + Math.random()*200}px)`;
        });
        
        confettiArea.appendChild(piece);
    }
}

/* ---------- EMOJI SELECTOR ---------- */
const emojiList = ['🎁','🎉','💰','🍕','⭐','💯','💖','✨','🎟️','✅','❓','🚫','💎','👑','🍊','🍎','🚀','🎮','🎲','🏆','🎫','🎶','🍩','☕','🍺'];

function renderEmojiSelector(){
    const grid = document.getElementById('emojiGrid');
    grid.innerHTML = emojiList.map(e=>`<button class="emoji-button" data-emoji="${e}">${e}</button>`).join('');
    
    // Adicionar event listeners aos emojis
    document.querySelectorAll('.emoji-button').forEach(btn => {
        btn.addEventListener('click', function() {
            selectEmoji(this.getAttribute('data-emoji'));
        });
    });
}

function openEmojiSelector(){ 
    document.getElementById('emojiSelectorModal').classList.remove('hidden'); 
}

function selectEmoji(emoji){
    document.getElementById('newPrizeIcon').value = emoji;
    document.getElementById('emojiSelectorModal').classList.add('hidden');
}

/* ---------- TELA CHEIA ---------- */
function setupFullscreenButton() {
    const fullscreenButton = document.getElementById('fullscreenButton');
    const container = document.querySelector('.container');
    
    fullscreenButton.addEventListener('click', function() {
        if (!document.fullscreenElement) {
            container.classList.add('fullscreen-mode');
            // Aplicar background no container para fullscreen
            if (fileUrls.background_image) {
                container.style.backgroundImage = `url(${fileUrls.background_image})`;
                container.style.backgroundSize = 'cover';
                container.style.backgroundPosition = 'center';
                container.style.backgroundRepeat = 'no-repeat';
            }
            
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (container.webkitRequestFullscreen) {
                container.webkitRequestFullscreen();
            } else if (container.msRequestFullscreen) {
                container.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    });
    
    document.addEventListener('fullscreenchange', function() {
        if (!document.fullscreenElement) {
            container.classList.remove('fullscreen-mode');
            // Restaurar background normal
            applyBackgroundImage();
        } else {
            // garantir que o container tenha background aplicado no fullscreen
            if (fileUrls.background_image) {
                container.style.backgroundImage = `url(${fileUrls.background_image})`;
            }
        }
    });
}

/* ---------- TABS ---------- */
function switchTab(element, tabId){
    document.querySelectorAll('.tab-trigger').forEach(btn => btn.setAttribute('data-state','inactive'));
    element.setAttribute('data-state','active');
    document.querySelectorAll('.tabs-content').forEach(c => c.classList.add('hidden'));
    document.getElementById(tabId + '-content').classList.remove('hidden');
}

function setupTabs() {
    document.querySelectorAll('.tab-trigger').forEach(btn => {
        btn.addEventListener('click', function() {
            switchTab(this, this.getAttribute('data-value'));
        });
    });
}

/* ---------- INICIALIZAÇÃO DE ÁUDIO ---------- */
/* ---------- INICIALIZAÇÃO DE ÁUDIO ---------- */
function initializeAudio() {
    // Criar objetos de áudio
    spinSound = new Audio();
    winnerSound = new Audio();
    backgroundMusic = new Audio();

    // Configurar música de fundo
    backgroundMusic.loop = true;
    backgroundMusic.volume = (settings.background_music_volume || defaultSettings.background_music_volume) / 100;

    // Configurar fontes se existirem
    if (fileUrls.spin_sound) spinSound.src = fileUrls.spin_sound;
    if (fileUrls.winner_sound) winnerSound.src = fileUrls.winner_sound;
    if (fileUrls.background_music) backgroundMusic.src = fileUrls.background_music;

    // Configurar volumes
    spinSound.volume = (settings.spin_sound_volume || defaultSettings.spin_sound_volume) / 100;
    winnerSound.volume = (settings.winner_sound_volume || defaultSettings.winner_sound_volume) / 100;

    // Impedir autoplay indesejado: só toca após interação manual
    if (settings.background_music_enabled && fileUrls.background_music) {
        document.addEventListener('click', function handleFirstPlay() {
            backgroundMusic.play().catch(e => console.log("Aguardando interação do usuário:", e));
            document.removeEventListener('click', handleFirstPlay);
        });
    }
}


/* ---------- INICIALIZAÇÃO E EVENTOS ---------- */
function updateUI() {
    document.getElementById('rouletteTitle').textContent = settings.title || defaultSettings.title;
    renderPrizeList();
    renderSpinHistory();
    renderSettingsPanel(); // Configurações básicas
    renderAdvancedSettingsPanel(); // Configurações avançadas (NOVA)
    applyBackgroundImage();
    updateTitlePreview();

    // APLICAR NOVAS CONFIGURAÇÕES VISUAIS
    updatePointerColor();
    updateWheelBorder();
    updateSpinButton();

    drawWheel();
    renderEmojiSelector();

    // Mostrar preview da imagem de fundo se existir
    if (fileUrls.background_image) {
        const preview = document.getElementById('backgroundImagePreview');
        if (preview) {
            preview.src = fileUrls.background_image;
            preview.style.display = 'block';
        }
    }
}


function setupEventListeners() {

    document.getElementById('newPrizeColorPicker').addEventListener('input', function() {
        document.getElementById('newPrizeColor').value = this.value;
    });
    
    document.getElementById('newPrizeColor').addEventListener('input', function() {
        document.getElementById('newPrizeColorPicker').value = this.value;
    });



    // Botão girar roleta
    document.getElementById('spinButton').addEventListener('click', startWheelSpin);
    
    // Formulário de prêmios
    document.getElementById('addPrizeBtn').addEventListener('click', addPrize);
    document.getElementById('clearPrizeFormBtn').addEventListener('click', clearPrizeForm);
    document.getElementById('randomColorBtn').addEventListener('click', function() {
        document.getElementById('newPrizeColor').value = getRandomHexColor();
    });
    document.getElementById('emojiSelectorBtn').addEventListener('click', openEmojiSelector);
    
    // Modal
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('removePrizeButton').addEventListener('click', removeWinningPrizeAndCloseModal);
    document.getElementById('closeEmojiModalBtn').addEventListener('click', function() {
        document.getElementById('emojiSelectorModal').classList.add('hidden');
    });
    
    // Histórico (botão dinâmico)
    document.addEventListener('click', async function(e) {
        if (e.target && e.target.id === 'clearHistoryBtn') {
            await clearHistory();
        }
    });
    
    // Tabs
    setupTabs();
    
    // Redimensionamento
    window.addEventListener('resize', resizeCanvas);
    
    // Teclas de atalho
    document.addEventListener('keydown', function(e) {
        // Espaço (girar) — só em fullscreen e quando não estiver com modal aberto
        if (e.code === 'Space') {
            const inFullscreen = !!document.fullscreenElement;
            const winnerModalVisible = !document.getElementById('winnerModal').classList.contains('hidden');
            if (inFullscreen && !winnerModalVisible) {
                e.preventDefault();
                startWheelSpin();
            }
        }
        // Fechar modal com F
        if (e.key.toLowerCase() === 'f') {
            const winnerModalVisible = !document.getElementById('winnerModal').classList.contains('hidden');
            if (winnerModalVisible) {
                closeModal();
            }
        }
        // Remover prêmio com R
        if (e.key.toLowerCase() === 'r') {
            const winnerModalVisible = !document.getElementById('winnerModal').classList.contains('hidden');
            if (winnerModalVisible) {
                removeWinningPrizeAndCloseModal();
            }
        }
    });
}

/* ---------- START ---------- */
window.onload = async () => {
    loadData();
    await openIndexedDB();
    await restoreMediaFiles();
    resizeCanvas();
    updateUI();
    initializeAudio(); // agora inicializa aqui uma única vez
    renderEmojiSelector();
    setupFullscreenButton();
    setupEventListeners();
};
