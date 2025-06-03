/**
 * Script principal para o site de Ficha de EPI
 * Gerencia a integração com o backend, validação de formulário e geração de PDF
 */
document.addEventListener('DOMContentLoaded', function() {
    // URL base da API - usando a rota local do Flask
    const API_BASE_URL = '/api';
    
    // Inicializar o componente de assinatura
    const signatureCapture = new SignatureCapture('signatureCanvas', 'clearSignature', 'penButton');
    
    // Ajustar o canvas quando a janela for redimensionada
    window.addEventListener('resize', function() {
        signatureCapture.resizeCanvas();
    });
    
    // Elementos do formulário
    const cpfInput = document.getElementById('cpf');
    const nomeCompletoInput = document.getElementById('nomeCompleto');
    const dataAdmissaoInput = document.getElementById('dataAdmissao');
    const nomeEPIInput = document.getElementById('nomeEPI');
    const caInput = document.getElementById('ca');
    const observacoesInput = document.getElementById('observacoes');
    const dataEntregaInput = document.getElementById('dataEntrega');
    
    // Botões de ação
    const saveButton = document.getElementById('saveButton');
    const pdfButton = document.getElementById('pdfButton');
    
    // Elementos de alerta
    const successAlert = document.getElementById('successAlert');
    const errorAlert = document.getElementById('errorAlert');
    
    // Elementos de busca
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const resultsTable = document.getElementById('resultsTable');
    const resultsBody = document.getElementById('resultsBody');
    const resultTitle = document.getElementById('resultTitle');
    const noResults = document.getElementById('noResults');
    
    // Configurar data de entrega com a data atual
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    dataEntregaInput.value = formattedDate;
    
    // Função para formatar CPF
    cpfInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) {
            value = value.slice(0, 11);
        }
        
        if (value.length > 9) {
            value = value.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
        } else if (value.length > 6) {
            value = value.replace(/^(\d{3})(\d{3})(\d{3})$/, '$1.$2.$3');
        } else if (value.length > 3) {
            value = value.replace(/^(\d{3})(\d{3})$/, '$1.$2');
        }
        
        e.target.value = value;
    });
    
    // Salvar registro
    saveButton.addEventListener('click', function() {
        if (!validarFormulario()) {
            mostrarErro('Por favor, preencha todos os campos obrigatórios e assine o documento.');
            return;
        }
        
        // Preparar dados para envio
        const formData = {
            colaborador: {
                nome_completo: nomeCompletoInput.value,
                cpf: cpfInput.value.replace(/\D/g, ''),
                data_admissao: dataAdmissaoInput.value
            },
            epi: {
                nome: nomeEPIInput.value,
                ca: caInput.value,
                observacoes: observacoesInput.value || ''
            },
            registro: {
                data_entrega: dataEntregaInput.value,
                assinatura_data: signatureCapture.getSignatureData()
            }
        };
        
        // Enviar dados para o backend
        fetch(`${API_BASE_URL}/registros`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao salvar o registro');
            }
            return response.json();
        })
        .then(data => {
            mostrarSucesso('Registro salvo com sucesso!');
            // Limpar apenas os campos de EPI e assinatura, mantendo dados do colaborador
            nomeEPIInput.value = '';
            caInput.value = '';
            observacoesInput.value = '';
            signatureCapture.clearCanvas();
        })
        .catch(error => {
            console.error('Erro:', error);
            mostrarErro('Erro ao salvar o registro. Por favor, tente novamente.');
        });
    });
    
    // Gerar PDF
    pdfButton.addEventListener('click', function() {
        if (!validarFormulario()) {
            mostrarErro('Por favor, preencha todos os campos obrigatórios e assine o documento antes de gerar o PDF.');
            return;
        }
        
        const area = document.getElementById('areaImpressao');
        
        // Usar html2canvas para capturar a área do formulário
        html2canvas(area).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            // Adicionar a imagem ao PDF
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            
            // Salvar o PDF
            pdf.save('Ficha_de_Entrega_EPI.pdf');
        });
    });
    
    // Buscar registros
    searchButton.addEventListener('click', function() {
        const searchTerm = searchInput.value.trim();
        if (!searchTerm) {
            mostrarErro('Por favor, informe um nome ou CPF para buscar.');
            return;
        }
        
        // Limpar resultados anteriores
        resultsBody.innerHTML = '';
        resultTitle.classList.add('d-none');
        noResults.classList.add('d-none');
        
        // Buscar por CPF ou nome
        const isCPF = /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/.test(searchTerm.replace(/\D/g, ''));
        let searchUrl = '';
        
        if (isCPF) {
            const cpf = searchTerm.replace(/\D/g, '');
            searchUrl = `${API_BASE_URL}/colaboradores/${cpf}`;
        } else {
            searchUrl = `${API_BASE_URL}/colaboradores?nome=${encodeURIComponent(searchTerm)}`;
        }
        
        fetch(searchUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Colaborador não encontrado');
                }
                return response.json();
            })
            .then(data => {
                // Verificar se é um array ou objeto único
                const colaboradores = Array.isArray(data) ? data : [data];
                
                if (colaboradores.length === 0) {
                    noResults.classList.remove('d-none');
                    return;
                }
                
                resultTitle.classList.remove('d-none');
                
                // Para cada colaborador, buscar seus registros
                colaboradores.forEach(colaborador => {
                    fetch(`${API_BASE_URL}/registros/colaborador/${colaborador.id}`)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Erro ao buscar registros');
                            }
                            return response.json();
                        })
                        .then(registros => {
                            if (registros.length === 0) {
                                if (colaboradores.length === 1) {
                                    noResults.classList.remove('d-none');
                                }
                                return;
                            }
                            
                            // Preencher tabela com os registros
                            registros.forEach(registro => {
                                const row = document.createElement('tr');
                                
                                // Formatar data
                                const dataEntrega = new Date(registro.data_entrega);
                                const dataFormatada = dataEntrega.toLocaleDateString('pt-BR');
                                
                                row.innerHTML = `
                                    <td>${dataFormatada}</td>
                                    <td>${colaborador.nome_completo}</td>
                                    <td>${registro.epi.nome}</td>
                                    <td>${registro.epi.ca}</td>
                                    <td>
                                        <button class="btn btn-sm btn-primary view-btn" data-registro-id="${registro.id}">
                                            <i class="bi bi-eye"></i> Ver
                                        </button>
                                    </td>
                                `;
                                
                                // Adicionar evento para visualizar registro
                                row.querySelector('.view-btn').addEventListener('click', function() {
                                    visualizarRegistro(registro, colaborador);
                                });
                                
                                resultsBody.appendChild(row);
                            });
                        })
                        .catch(error => {
                            console.error('Erro:', error);
                        });
                });
            })
            .catch(error => {
                console.error('Erro:', error);
                noResults.classList.remove('d-none');
                noResults.textContent = `Erro: ${error.message}`;
            });
    });
    
    // Função para visualizar registro
    function visualizarRegistro(registro, colaborador) {
        const viewModalBody = document.getElementById('viewModalBody');
        const viewModal = new bootstrap.Modal(document.getElementById('viewModal'));
        
        // Formatar data
        const dataEntrega = new Date(registro.data_entrega);
        const dataFormatada = dataEntrega.toLocaleDateString('pt-BR');
        
        // Formatar data de admissão
        const dataAdmissao = new Date(colaborador.data_admissao);
        const dataAdmissaoFormatada = dataAdmissao.toLocaleDateString('pt-BR');
        
        // Criar conteúdo do modal
        viewModalBody.innerHTML = `
            <div class="registro-detalhes">
                <h4 class="section-title">Dados do Colaborador</h4>
                <div class="row mb-3">
                    <div class="col-md-12">
                        <p><strong>Nome:</strong> ${colaborador.nome_completo}</p>
                    </div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <p><strong>CPF:</strong> ${formatarCPF(colaborador.cpf)}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Data de Admissão:</strong> ${dataAdmissaoFormatada}</p>
                    </div>
                </div>
                
                <h4 class="section-title">Dados do EPI</h4>
                <div class="row mb-3">
                    <div class="col-md-12">
                        <p><strong>Nome do EPI:</strong> ${registro.epi.nome}</p>
                    </div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <p><strong>CA:</strong> ${registro.epi.ca}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Data de Entrega:</strong> ${dataFormatada}</p>
                    </div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-12">
                        <p><strong>Observações:</strong> ${registro.epi.observacoes || 'Nenhuma observação'}</p>
                    </div>
                </div>
                
                <h4 class="section-title">Assinatura Digital</h4>
                <div class="text-center mb-3">
                    <img src="${registro.assinatura_data}" alt="Assinatura" class="img-fluid border">
                </div>
            </div>
        `;
        
        // Configurar botão de PDF no modal
        const viewPdfButton = document.getElementById('viewPdfButton');
        viewPdfButton.onclick = function() {
            html2canvas(viewModalBody).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
                const imgProps = pdf.getImageProperties(imgData);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`Ficha_EPI_${colaborador.nome_completo.replace(/\s+/g, '_')}.pdf`);
            });
        };
        
        // Mostrar o modal
        viewModal.show();
    }
    
    // Função para formatar CPF
    function formatarCPF(cpf) {
        cpf = cpf.replace(/\D/g, '');
        if (cpf.length === 11) {
            return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
        }
        return cpf;
    }
    
    // Validar formulário
    function validarFormulario() {
        if (!nomeCompletoInput.value || 
            !cpfInput.value || 
            !dataAdmissaoInput.value || 
            !nomeEPIInput.value || 
            !caInput.value || 
            !dataEntregaInput.value || 
            signatureCapture.isEmpty()) {
            return false;
        }
        return true;
    }
    
    // Mostrar mensagem de sucesso
    function mostrarSucesso(mensagem) {
        successAlert.textContent = mensagem;
        successAlert.classList.remove('d-none');
        errorAlert.classList.add('d-none');
        
        // Esconder após 5 segundos
        setTimeout(() => {
            successAlert.classList.add('d-none');
        }, 5000);
    }
    
    // Mostrar mensagem de erro
    function mostrarErro(mensagem) {
        errorAlert.textContent = mensagem;
        errorAlert.classList.remove('d-none');
        successAlert.classList.add('d-none');
        
        // Esconder após 5 segundos
        setTimeout(() => {
            errorAlert.classList.add('d-none');
        }, 5000);
    }
});
