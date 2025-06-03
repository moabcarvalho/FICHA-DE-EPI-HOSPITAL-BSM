/**
 * Classe para captura de assinatura digital
 * Gerencia o canvas de assinatura, eventos de mouse/touch e ferramentas
 */
class SignatureCapture {
    /**
     * Inicializa o componente de assinatura
     * @param {string} canvasId - ID do elemento canvas
     * @param {string} clearButtonId - ID do botão para limpar assinatura
     * @param {string} penButtonId - ID do botão de caneta azul
     */
    constructor(canvasId, clearButtonId, penButtonId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.clearButton = document.getElementById(clearButtonId);
        this.penButton = document.getElementById(penButtonId);
        
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        
        // Configuração inicial do traço
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = '#000'; // Cor padrão: preto
        
        // Inicializar o canvas e eventos
        this.resizeCanvas();
        this.setupEvents();
        this.setupPenButton();
        this.clearCanvas();
    }
    
    /**
     * Redimensiona o canvas para o tamanho do container
     */
    resizeCanvas() {
        // Obter o tamanho do container pai
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        // Definir o tamanho do canvas
        this.canvas.width = rect.width - 20; // Margem para evitar overflow
        this.canvas.height = 200; // Altura fixa
        
        // Reconfigurar o contexto após redimensionamento
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }
    
    /**
     * Configura os eventos de mouse e touch
     */
    setupEvents() {
        // Eventos de mouse
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));
        
        // Eventos de touch para dispositivos móveis
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.stopDrawing.bind(this), { passive: false });
        
        // Evento para limpar o canvas
        if (this.clearButton) {
            this.clearButton.addEventListener('click', this.clearCanvas.bind(this));
        }
    }
    
    /**
     * Configura o botão de caneta azul
     */
    setupPenButton() {
        if (this.penButton) {
            this.penButton.addEventListener('click', () => {
                // Alternar entre preto e azul escuro (estilo caneta BIC)
                if (this.ctx.strokeStyle === '#000000' || this.ctx.strokeStyle === '#000') {
                    this.ctx.strokeStyle = '#0047AB'; // Azul escuro estilo caneta BIC
                    this.penButton.classList.add('active');
                } else {
                    this.ctx.strokeStyle = '#000'; // Voltar para preto
                    this.penButton.classList.remove('active');
                }
            });
        }
    }
    
    /**
     * Inicia o desenho quando o mouse é pressionado
     * @param {Event} e - Evento de mouse
     */
    startDrawing(e) {
        this.isDrawing = true;
        const { x, y } = this.getCoordinates(e);
        this.lastX = x;
        this.lastY = y;
    }
    
    /**
     * Desenha no canvas quando o mouse é movido
     * @param {Event} e - Evento de mouse
     */
    draw(e) {
        if (!this.isDrawing) return;
        
        const { x, y } = this.getCoordinates(e);
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        
        this.lastX = x;
        this.lastY = y;
    }
    
    /**
     * Para o desenho quando o mouse é solto
     */
    stopDrawing() {
        this.isDrawing = false;
    }
    
    /**
     * Manipula o evento de toque inicial
     * @param {TouchEvent} e - Evento de toque
     */
    handleTouchStart(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        }
    }
    
    /**
     * Manipula o evento de movimento de toque
     * @param {TouchEvent} e - Evento de toque
     */
    handleTouchMove(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        }
    }
    
    /**
     * Obtém as coordenadas do mouse ou toque relativas ao canvas
     * @param {Event} e - Evento de mouse ou toque
     * @returns {Object} Coordenadas x e y
     */
    getCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }
    
    /**
     * Limpa o canvas
     */
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * Verifica se o canvas está vazio
     * @returns {boolean} Verdadeiro se o canvas estiver vazio
     */
    isEmpty() {
        const pixelData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
        for (let i = 3; i < pixelData.length; i += 4) {
            if (pixelData[i] > 0) return false;
        }
        return true;
    }
    
    /**
     * Obtém os dados da assinatura como URL de dados
     * @returns {string} URL de dados da imagem
     */
    getSignatureData() {
        return this.canvas.toDataURL('image/png');
    }
}
