/**
 * Módulo para captura de assinatura digital
 * Implementa funcionalidade de desenho em canvas com suporte a toque e modo caneta
 */
class SignatureCapture {
    constructor(canvasId, clearButtonId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.clearButton = document.getElementById(clearButtonId);
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.penMode = false; // Novo: controle do modo caneta
        
        // Configuração inicial do canvas
        this.setupCanvas();
        
        // Configuração dos eventos de mouse e toque
        this.setupEvents();
        
        // Configuração do botão de limpar
        this.setupClearButton();
        
        // Configuração do botão de caneta
        this.setupPenButton();
    }
    
    setupCanvas() {
        // Ajustar o tamanho do canvas para corresponder ao tamanho exibido
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
        
        // Configurar estilo de linha
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#000'; // Cor padrão inicial
        
        // Limpar o canvas
        this.clearCanvas();
    }
    
    setupEvents() {
        // Eventos de mouse
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));
        
        // Eventos de toque
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.stopDrawing.bind(this), { passive: false });
    }
    
    setupClearButton() {
        if (this.clearButton) {
            this.clearButton.addEventListener('click', this.clearCanvas.bind(this));
        }
    }
    
    setupPenButton() {
        // Criar botão de caneta
        const penButton = document.createElement('button');
        penButton.type = 'button';
        penButton.id = 'penButton';
        penButton.className = 'btn btn-outline-primary ms-2';
        penButton.innerHTML = '<i class="bi bi-pen"></i>'; // Ícone de caneta do Bootstrap Icons
        penButton.title = 'Modo Caneta';
        
        // Adicionar o botão após o botão de limpar
        if (this.clearButton) {
            this.clearButton.insertAdjacentElement('afterend', penButton);
        }
        
        // Adicionar evento de clique
        penButton.addEventListener('click', this.togglePenMode.bind(this));
        
        // Salvar referência ao botão
        this.penButton = penButton;
    }
    
    togglePenMode() {
        this.penMode = !this.penMode;
        
        if (this.penMode) {
            // Ativar modo caneta (azul escuro tipo BIC)
            this.ctx.strokeStyle = '#0047AB'; // Azul escuro semelhante à caneta BIC
            this.penButton.classList.remove('btn-outline-primary');
            this.penButton.classList.add('btn-primary');
        } else {
            // Voltar para o modo normal (preto)
            this.ctx.strokeStyle = '#000';
            this.penButton.classList.remove('btn-primary');
            this.penButton.classList.add('btn-outline-primary');
        }
    }
    
    startDrawing(e) {
        this.isDrawing = true;
        [this.lastX, this.lastY] = [e.offsetX, e.offsetY];
    }
    
    draw(e) {
        if (!this.isDrawing) return;
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.ctx.lineTo(e.offsetX, e.offsetY);
        this.ctx.stroke();
        
        [this.lastX, this.lastY] = [e.offsetX, e.offsetY];
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const offsetX = touch.clientX - rect.left;
            const offsetY = touch.clientY - rect.top;
            
            this.isDrawing = true;
            [this.lastX, this.lastY] = [offsetX, offsetY];
        }
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        if (!this.isDrawing || e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const offsetX = touch.clientX - rect.left;
        const offsetY = touch.clientY - rect.top;
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.ctx.lineTo(offsetX, offsetY);
        this.ctx.stroke();
        
        [this.lastX, this.lastY] = [offsetX, offsetY];
    }
    
    stopDrawing() {
        this.isDrawing = false;
    }
    
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    getSignatureData() {
        return this.canvas.toDataURL('image/png');
    }
    
    isEmpty() {
        const pixelBuffer = new Uint32Array(
            this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data.buffer
        );
        
        // Verificar se há pixels não brancos (assinatura)
        return !pixelBuffer.some(color => color !== 0xffffffff);
    }
    
    // Redimensionar o canvas quando a janela for redimensionada
    resizeCanvas() {
        const currentData = this.canvas.toDataURL();
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
        
        // Restaurar configurações de desenho
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
        this.ctx.lineWidth = 3;
        
        // Manter a cor atual baseada no modo
        if (this.penMode) {
            this.ctx.strokeStyle = '#0047AB'; // Azul escuro
        } else {
            this.ctx.strokeStyle = '#000'; // Preto
        }
        
        // Restaurar a assinatura
        const img = new Image();
        img.onload = () => {
            this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
        };
        img.src = currentData;
    }
}
