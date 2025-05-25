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
    const printButton = document.getElementById('printButton');
    const pdfButton = document.getElementById('pdfButton');
    const emailButton = document.getElementById('emailButton');
    const sendEmailButton = document.getElementById('sendEmailButton');
    
    // Elementos de busca
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const resultsTable = document.getElementById('resultsTable');
    const resultsBody = document.getElementById('resultsBody');
    const resultTitle = document.getElementById('resultTitle');
    const noResults = document.getElementById('noResults');
    
    // Botões de visualização
    const viewPrintButton = document.getElementById('viewPrintButton');
    const viewPdfButton = document.getElementById('viewPdfButton');
    const viewEmailButton = document.getElementById('viewEmailButton');
    
    // Modais
    const emailModal = new bootstrap.Modal(document.getElementById('emailModal'));
    const viewModal = new bootstrap.Modal(document.getElementById('viewModal'));
    const emailDestinatarioInput = document.getElementById('emailDestinatario');
    const salvarEmailCheckbox = document.getElementById('salvarEmail');
    
    // Configurar data de entrega com a data atual
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    dataEntregaInput.value = formattedDate;
    
    // Carregar email salvo (se existir)
    const savedEmail = localStorage.getItem('savedEmail');
    if (savedEmail) {
        emailDestinatarioInput.value = savedEmail;
    }
    
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
    
    // Imprimir documento
    printButton.addEventListener('click', function() {
        if (!validarFormulario()) {
            alert('Por favor, preencha todos os campos obrigatórios e assine o documento antes de imprimir.');
            return;
        }
        window.print();
    });
    
    // Gerar PDF
    pdfButton.addEventListener('click', function() {
        if (!validarFormulario()) {
            alert('Por favor, preencha todos os campos obrigatórios e assine o documento antes de gerar o PDF.');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        
        html2canvas(document.querySelector('.card-body')).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`ficha_epi_${cpfInput.value.replace(/\D/g, '')}_${dataEntregaInput.value}.pdf`);
        });
    });
    
    // Abrir modal de email
    emailButton.addEventListener('click', function() {
        if (!validarFormulario()) {
            alert('Por favor, preencha todos os campos obrigatórios e assine o documento antes de enviar por email.');
            return;
        }
        emailModal.show();
    });
    
    // Enviar email
    sendEmailButton.addEventListener('click', function() {
        const email = emailDestinatarioInput.value;
        if (!email) {
            alert('Por favor, informe um email válido.');
            return;
        }
        
        // Salvar email se a opção estiver marcada
        if (salvarEmailCheckbox.checked) {
            localStorage.setItem('savedEmail', email);
        }
        
        // Gerar PDF e enviar por email
        const { jsPDF } = window.jspdf;
        
        html2canvas(document.querySelector('.card-body')).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            
            const pdfBlob = pdf.output('blob');
            const formData = new FormData();
            formData.append('email', email);
            formData.append('nome', nomeCompletoInput.value);
            formData.append('data', dataEntregaInput.value);
            formData.append('pdf', pdfBlob, `ficha_epi_${cpfInput.value.replace(/\D/g, '')}_${dataEntregaInput.value}.pdf`);
            
            // Enviar email com o PDF anexado
            fetch(`${API_BASE_URL}/enviar-email`, {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro ao enviar email');
                }
                return response.json();
            })
            .then(() => {
                alert('Email enviado com sucesso!');
                emailModal.hide();
            })
            .catch(error => {
                console.error('Erro:', error);
                alert('Erro ao enviar o email. Por favor, tente novamente.');
            });
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
                
                resultTitle.textContent = `Registros de ${data.colaborador.nome_completo}`;
                resultTitle.classList.remove('d-none');
                
                // Buscar detalhes dos EPIs para cada registro
                const epiPromises = data.registros.map(registro => {
                    return fetch(`${API_BASE_URL}/epis/${registro.epi_id}`)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Erro ao buscar EPI');
                            }
                            return response.json();
                        })
                        .then(epi => {
                            return { ...registro, epi };
                        });
                });
                
                return Promise.all(epiPromises).then(registrosCompletos => {
                    return { colaborador: data.colaborador, registros: registrosCompletos };
                });
            })
            .then(data => {
                // Preencher tabela com os registros
                data.registros.forEach(registro => {
                    const row = document.createElement('tr');
                    
                    // Formatar data
                    const dataEntrega = new Date(registro.data_entrega);
                    const dataFormatada = dataEntrega.toLocaleDateString('pt-BR');
                    
                    row.innerHTML = `
                        <td>${dataFormatada}</td>
                        <td>${data.colaborador.nome_completo}</td>
                        <td>${registro.epi.nome}</td>
                        <td>${registro.epi.ca}</td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button type="button" class="btn btn-primary view-btn" data-id="${registro.id}">
                                    <i class="bi bi-eye"></i>
                                </button>
                                <button type="button" class="btn btn-success print-btn" data-id="${registro.id}">
                                    <i class="bi bi-printer"></i>
                                </button>
                                <button type="button" class="btn btn-info pdf-btn" data-id="${registro.id}">
                                    <i class="bi bi-file-pdf"></i>
                                </button>
                                <button type="button" class="btn btn-warning email-btn" data-id="${registro.id}">
                                    <i class="bi bi-envelope"></i>
                                </button>
                            </div>
                        </td>
                    `;
                    
                    resultsBody.appendChild(row);
                });
                
                // Adicionar event listeners para os botões de ação
                document.querySelectorAll('.view-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const registroId = this.getAttribute('data-id');
                        visualizarRegistro(registroId);
                    });
                });
                
                document.querySelectorAll('.print-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const registroId = this.getAttribute('data-id');
                        imprimirRegistro(registroId);
                    });
                });
                
                document.querySelectorAll('.pdf-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const registroId = this.getAttribute('data-id');
                        gerarPDFRegistro(registroId);
                    });
                });
                
                document.querySelectorAll('.email-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const registroId = this.getAttribute('data-id');
                        enviarEmailRegistro(registroId);
                    });
                });
            })
            .catch(error => {
                console.error('Erro:', error);
                noResults.classList.remove('d-none');
            });
    });
    
    // Função para visualizar registro
    function visualizarRegistro(registroId) {
        fetch(`${API_BASE_URL}/registros/${registroId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro ao buscar registro');
                }
                return response.json();
            })
            .then(registro => {
                // Buscar colaborador
                return fetch(`${API_BASE_URL}/colaboradores/${registro.colaborador_id}`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Erro ao buscar colaborador');
                        }
                        return response.json();
                    })
                    .then(colaborador => {
                        // Buscar EPI
                        return fetch(`${API_BASE_URL}/epis/${registro.epi_id}`)
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error('Erro ao buscar EPI');
                                }
                                return response.json();
                            })
                            .then(epi => {
                                return { registro, colaborador, epi };
                            });
                    });
            })
            .then(data => {
                // Formatar data
                const dataEntrega = new Date(data.registro.data_entrega);
                const dataFormatada = dataEntrega.toLocaleDateString('pt-BR');
                
                // Preencher modal com os dados do registro
                const viewModalBody = document.getElementById('viewModalBody');
                viewModalBody.innerHTML = `
                    <div class="registro-detalhes">
                        <h4 class="text-center mb-4">FICHA DE EPI HOSPITAL BOM SAMARITANO MARINGÁ</h4>
                        
                        <h5>Dados do Colaborador</h5>
                        <div class="row mb-3">
                            <div class="col-md-4"><strong>Nome:</strong></div>
                            <div class="col-md-8">${data.colaborador.nome_completo}</div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-md-4"><strong>CPF:</strong></div>
                            <div class="col-md-8">${data.colaborador.cpf}</div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-md-4"><strong>Data de Admissão:</strong></div>
                            <div class="col-md-8">${data.colaborador.data_admissao}</div>
                        </div>
                        
                        <h5 class="mt-4">Dados do EPI</h5>
                        <div class="row mb-3">
                            <div class="col-md-4"><strong>Nome do EPI:</strong></div>
                            <div class="col-md-8">${data.epi.nome}</div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-md-4"><strong>CA:</strong></div>
                            <div class="col-md-8">${data.epi.ca}</div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-md-4"><strong>Data de Entrega:</strong></div>
                            <div class="col-md-8">${dataFormatada}</div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-md-4"><strong>Observações:</strong></div>
                            <div class="col-md-8">${data.registro.observacoes || '-'}</div>
                        </div>
                        
                        <h5 class="mt-4">Assinatura Digital</h5>
                        <div class="text-center">
                            <img src="${data.registro.assinatura_data}" alt="Assinatura" class="img-fluid signature-image">
                        </div>
                    </div>
                `;
                
                // Armazenar dados para uso nas ações
                viewModalBody.dataset.registroId = data.registro.id;
                viewModalBody.dataset.colaboradorNome = data.colaborador.nome_completo;
                viewModalBody.dataset.colaboradorCpf = data.colaborador.cpf;
                viewModalBody.dataset.dataEntrega = dataFormatada;
                
                // Mostrar modal
                viewModal.show();
            })
            .catch(error => {
                console.error('Erro:', error);
                alert('Erro ao visualizar o registro. Por favor, tente novamente.');
            });
    }
    
    // Função para imprimir registro
    function imprimirRegistro(registroId) {
        visualizarRegistro(registroId);
        
        // Adicionar listener para quando o modal estiver completamente visível
        document.getElementById('viewModal').addEventListener('shown.bs.modal', function() {
            setTimeout(() => {
                window.print();
            }, 500);
        }, { once: true });
    }
    
    // Função para gerar PDF do registro
    function gerarPDFRegistro(registroId) {
        visualizarRegistro(registroId);
        
        // Adicionar listener para quando o modal estiver completamente visível
        document.getElementById('viewModal').addEventListener('shown.bs.modal', function() {
            setTimeout(() => {
                const viewModalBody = document.getElementById('viewModalBody');
                const { jsPDF } = window.jspdf;
                
                html2canvas(viewModalBody).then(canvas => {
                    const imgData = canvas.toDataURL('image/png');
                    const pdf = new jsPDF('p', 'mm', 'a4');
                    const imgProps = pdf.getImageProperties(imgData);
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                    
                    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                    pdf.save(`ficha_epi_${viewModalBody.dataset.colaboradorCpf}_${viewModalBody.dataset.dataEntrega}.pdf`);
                });
            }, 500);
        }, { once: true });
    }
    
    // Função para enviar email do registro
    function enviarEmailRegistro(registroId) {
        visualizarRegistro(registroId);
        
        // Adicionar listener para quando o modal estiver completamente visível
        document.getElementById('viewModal').addEventListener('shown.bs.modal', function() {
            setTimeout(() => {
                // Fechar modal de visualização
                viewModal.hide();
                
                // Mostrar modal de email
                emailModal.show();
                
                // Configurar envio de email
                sendEmailButton.onclick = function() {
                    const email = emailDestinatarioInput.value;
                    if (!email) {
                        alert('Por favor, informe um email válido.');
                        return;
                    }
                    
                    // Salvar email se a opção estiver marcada
                    if (salvarEmailCheckbox.checked) {
                        localStorage.setItem('savedEmail', email);
                    }
                    
                    const viewModalBody = document.getElementById('viewModalBody');
                    const { jsPDF } = window.jspdf;
                    
                    html2canvas(viewModalBody).then(canvas => {
                        const imgData = canvas.toDataURL('image/png');
                        const pdf = new jsPDF('p', 'mm', 'a4');
                        const imgProps = pdf.getImageProperties(imgData);
                        const pdfWidth = pdf.internal.pageSize.getWidth();
                        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                        
                        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                        
                        const pdfBlob = pdf.output('blob');
                        const formData = new FormData();
                        formData.append('email', email);
                        formData.append('nome', viewModalBody.dataset.colaboradorNome);
                        formData.append('data', viewModalBody.dataset.dataEntrega);
                        formData.append('pdf', pdfBlob, `ficha_epi_${viewModalBody.dataset.colaboradorCpf}_${viewModalBody.dataset.dataEntrega}.pdf`);
                        
                        // Enviar email com o PDF anexado
                        fetch(`${API_BASE_URL}/enviar-email`, {
                            method: 'POST',
                            body: formData
                        })
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Erro ao enviar email');
                            }
                            return response.json();
                        })
                        .then(() => {
                            alert('Email enviado com sucesso!');
                            emailModal.hide();
                        })
                        .catch(error => {
                            console.error('Erro:', error);
                            alert('Erro ao enviar o email. Por favor, tente novamente.');
                        });
                    });
                };
            }, 500);
        }, { once: true });
    }
    
    // Configurar botões de ação no modal de visualização
    viewPrintButton.addEventListener('click', function() {
        window.print();
    });
    
    viewPdfButton.addEventListener('click', function() {
        const viewModalBody = document.getElementById('viewModalBody');
        const { jsPDF } = window.jspdf;
        
        html2canvas(viewModalBody).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`ficha_epi_${viewModalBody.dataset.colaboradorCpf}_${viewModalBody.dataset.dataEntrega}.pdf`);
        });
    });
    
    viewEmailButton.addEventListener('click', function() {
        // Fechar modal de visualização
        viewModal.hide();
        
        // Mostrar modal de email
        emailModal.show();
    });
});
