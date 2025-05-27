/**
 * Script principal para o site de Ficha de EPI
 * Gerencia a integração com o backend, preenchimento automático e exportação
 */
document.addEventListener('DOMContentLoaded', function() {
    // URL base da API - alterar para a URL da API quando implantada
    const API_BASE_URL = 'https://api-epi-hospital.vercel.app/api';
    
    // Inicializar o componente de assinatura
    const signatureCapture = new SignatureCapture('signatureCanvas', 'clearSignature');
    
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
    
    // Elementos de busca
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const resultsTable = document.getElementById('resultsTable');
    const resultsBody = document.getElementById('resultsBody');
    const resultTitle = document.getElementById('resultTitle');
    const noResults = document.getElementById('noResults');
    
    // Botões de visualização
    const viewPdfButton = document.getElementById('viewPdfButton');
    
    // Modais
    const viewModal = new bootstrap.Modal(document.getElementById('viewModal'));
    
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
    
    // Buscar colaborador por CPF quando o campo perder o foco
    cpfInput.addEventListener('blur', function() {
        const cpf = cpfInput.value.replace(/\D/g, '');
        if (cpf.length === 11) {
            buscarColaboradorPorCPF(cpf);
        }
    });
    
    // Função para buscar colaborador por CPF
    function buscarColaboradorPorCPF(cpf) {
        fetch(`${API_BASE_URL}/colaboradores/buscar-por-cpf/${cpf}`)
            .then(response => {
                if (!response.ok) {
                    if (response.status === 404) {
                        console.log('Colaborador não encontrado, novo cadastro será realizado.');
                        return null;
                    }
                    throw new Error('Erro ao buscar colaborador');
                }
                return response.json();
            })
            .then(data => {
                if (data) {
                    // Preencher os campos com os dados do colaborador
                    nomeCompletoInput.value = data.nome_completo;
                    dataAdmissaoInput.value = data.data_admissao;
                }
            })
            .catch(error => {
                console.error('Erro:', error);
            });
    }
    
    // Salvar registro
    saveButton.addEventListener('click', function() {
        if (!validarFormulario()) {
            alert('Por favor, preencha todos os campos obrigatórios e assine o documento.');
            return;
        }
        
        // Verificar se o colaborador já existe
        const cpf = cpfInput.value.replace(/\D/g, '');
        
        fetch(`${API_BASE_URL}/colaboradores/buscar-por-cpf/${cpf}`)
            .then(response => {
                if (response.status === 404) {
                    // Colaborador não existe, criar novo
                    return criarColaborador();
                } else if (response.ok) {
                    // Colaborador existe, obter ID
                    return response.json().then(data => data.id);
                } else {
                    throw new Error('Erro ao verificar colaborador');
                }
            })
            .then(colaboradorId => {
                // Verificar se o EPI já existe pelo CA
                return verificarOuCriarEPI().then(epiId => {
                    return { colaboradorId, epiId };
                });
            })
            .then(ids => {
                // Criar registro de entrega
                return criarRegistroEPI(ids.colaboradorId, ids.epiId);
            })
            .then(() => {
                alert('Registro salvo com sucesso!');
                // Limpar apenas os campos de EPI e assinatura, mantendo dados do colaborador
                nomeEPIInput.value = '';
                caInput.value = '';
                observacoesInput.value = '';
                signatureCapture.clearCanvas();
            })
            .catch(error => {
                console.error('Erro:', error);
                alert('Erro ao salvar o registro. Por favor, tente novamente.');
            });
    });
    
    // Função para criar colaborador
    function criarColaborador() {
        const colaboradorData = {
            nome_completo: nomeCompletoInput.value,
            cpf: cpfInput.value.replace(/\D/g, ''),
            data_admissao: dataAdmissaoInput.value
        };
        
        return fetch(`${API_BASE_URL}/colaboradores`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(colaboradorData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao criar colaborador');
            }
            return response.json();
        })
        .then(data => data.id);
    }
    
    // Função para verificar se o EPI existe ou criar um novo
    function verificarOuCriarEPI() {
        return fetch(`${API_BASE_URL}/epis/buscar-por-ca/${caInput.value}`)
            .then(response => {
                if (response.status === 404) {
                    // EPI não existe, criar novo
                    const epiData = {
                        nome: nomeEPIInput.value,
                        ca: caInput.value,
                        descricao: observacoesInput.value || ''
                    };
                    
                    return fetch(`${API_BASE_URL}/epis`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(epiData)
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Erro ao criar EPI');
                        }
                        return response.json();
                    })
                    .then(data => data.id);
                } else if (response.ok) {
                    // EPI existe, obter ID
                    return response.json().then(data => data.id);
                } else {
                    throw new Error('Erro ao verificar EPI');
                }
            });
    }
    
    // Função para criar registro de entrega de EPI
    function criarRegistroEPI(colaboradorId, epiId) {
        const registroData = {
            colaborador_id: colaboradorId,
            epi_id: epiId,
            data_entrega: dataEntregaInput.value,
            assinatura_data: signatureCapture.getSignatureData(),
            observacoes: observacoesInput.value || ''
        };
        
        return fetch(`${API_BASE_URL}/registros`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registroData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao criar registro de EPI');
            }
            return response.json();
        });
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
    
    // Gerar PDF
    pdfButton.addEventListener('click', function() {
        if (!validarFormulario()) {
            alert('Por favor, preencha todos os campos obrigatórios e assine o documento antes de gerar o PDF.');
            return;
        }
        
        html2canvas(document.querySelector('.signature-container')).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();
            pdf.addImage(imgData, 'PNG', 10, 10);
            pdf.save('assinatura.pdf');
        });
    });
    
    // Buscar registros
    searchButton.addEventListener('click', function() {
        const searchTerm = searchInput.value.trim();
        if (!searchTerm) {
            alert('Por favor, informe um nome ou CPF para buscar.');
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
            searchUrl = `${API_BASE_URL}/colaboradores/buscar-por-cpf/${cpf}`;
        } else {
            // Implementar busca por nome (simulação)
            searchUrl = `${API_BASE_URL}/colaboradores?nome=${encodeURIComponent(searchTerm)}`;
        }
        
        fetch(searchUrl)
            .then(response => {
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('Colaborador não encontrado');
                    }
                    throw new Error('Erro ao buscar colaborador');
                }
                return response.json();
            })
            .then(colaborador => {
                // Se for uma lista, pegar o primeiro (simulação de busca por nome)
                if (Array.isArray(colaborador)) {
                    if (colaborador.length === 0) {
                        throw new Error('Colaborador não encontrado');
                    }
                    colaborador = colaborador[0];
                }
                
                // Buscar registros do colaborador
                return fetch(`${API_BASE_URL}/registros/colaborador/${colaborador.id}`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Erro ao buscar registros');
                        }
                        return response.json();
                    })
                    .then(registros => {
                        return { colaborador, registros };
                    });
            })
            .then(data => {
                if (data.registros.length === 0) {
                    noResults.classList.remove('d-none');
                    return;
                }
                
                resultTitle.classList.remove('d-none');
                
                // Preencher tabela com os registros
                data.registros.forEach(registro => {
                    // Buscar detalhes do EPI
                    fetch(`${API_BASE_URL}/epis/${registro.epi_id}`)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Erro ao buscar EPI');
                            }
                            return response.json();
                        })
                        .then(epi => {
                            const row = document.createElement('tr');
                            
                            // Formatar data
                            const dataEntrega = new Date(registro.data_entrega);
                            const dataFormatada = dataEntrega.toLocaleDateString('pt-BR');
                            
                            row.innerHTML = `
                                <td>${dataFormatada}</td>
                                <td>${data.colaborador.nome_completo}</td>
                                <td>${epi.nome}</td>
                                <td>${epi.ca}</td>
                                <td>
                                    <button class="btn btn-sm btn-primary view-btn" data-registro-id="${registro.id}">
                                        <i class="bi bi-eye"></i> Ver
                                    </button>
                                </td>
                            `;
                            
                            // Adicionar evento para visualizar registro
                            row.querySelector('.view-btn').addEventListener('click', function() {
                                visualizarRegistro(registro, data.colaborador, epi);
                            });
                            
                            resultsBody.appendChild(row);
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
    function visualizarRegistro(registro, colaborador, epi) {
        const viewModalBody = document.getElementById('viewModalBody');
        
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
                        <p><strong>CPF:</strong> ${colaborador.cpf}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Data de Admissão:</strong> ${dataAdmissaoFormatada}</p>
                    </div>
                </div>
                
                <h4 class="section-title">Dados do EPI</h4>
                <div class="row mb-3">
                    <div class="col-md-12">
                        <p><strong>Nome do EPI:</strong> ${epi.nome}</p>
                    </div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <p><strong>CA:</strong> ${epi.ca}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Data de Entrega:</strong> ${dataFormatada}</p>
                    </div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-12">
                        <p><strong>Observações:</strong> ${registro.observacoes || 'Nenhuma observação'}</p>
                    </div>
                </div>
                
                <h4 class="section-title">Assinatura Digital</h4>
                <div class="row mb-3">
                    <div class="col-md-12">
                        <img src="${registro.assinatura_data}" alt="Assinatura" class="img-fluid border">
                    </div>
                </div>
            </div>
        `;
        
        // Configurar botão de PDF
        document.getElementById('viewPdfButton').onclick = function() {
            html2canvas(viewModalBody).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF();
                pdf.addImage(imgData, 'PNG', 10, 10);
                pdf.save(`ficha_epi_${colaborador.cpf}_${registro.data_entrega}.pdf`);
            });
        };
        
        // Mostrar modal
        viewModal.show();
    }
});
