from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import base64
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Simulação de banco de dados usando arquivos JSON
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
os.makedirs(DATA_DIR, exist_ok=True)

COLABORADORES_FILE = os.path.join(DATA_DIR, 'colaboradores.json')
EPIS_FILE = os.path.join(DATA_DIR, 'epis.json')
REGISTROS_FILE = os.path.join(DATA_DIR, 'registros.json')

# Inicializar arquivos de dados se não existirem
def init_data_files():
    if not os.path.exists(COLABORADORES_FILE):
        with open(COLABORADORES_FILE, 'w') as f:
            json.dump([], f)
    
    if not os.path.exists(EPIS_FILE):
        with open(EPIS_FILE, 'w') as f:
            json.dump([], f)
    
    if not os.path.exists(REGISTROS_FILE):
        with open(REGISTROS_FILE, 'w') as f:
            json.dump([], f)

init_data_files()

# Funções auxiliares para manipulação de dados
def load_data(file_path):
    with open(file_path, 'r') as f:
        return json.load(f)

def save_data(file_path, data):
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=2)

# Rotas para Colaboradores
@app.route('/api/colaboradores', methods=['GET'])
def get_colaboradores():
    colaboradores = load_data(COLABORADORES_FILE)
    return jsonify(colaboradores)

@app.route('/api/colaboradores/<int:id>', methods=['GET'])
def get_colaborador(id):
    colaboradores = load_data(COLABORADORES_FILE)
    colaborador = next((c for c in colaboradores if c['id'] == id), None)
    
    if not colaborador:
        return jsonify({'error': 'Colaborador não encontrado'}), 404
    
    return jsonify(colaborador)

@app.route('/api/colaboradores', methods=['POST'])
def create_colaborador():
    data = request.json
    colaboradores = load_data(COLABORADORES_FILE)
    
    # Verificar se o CPF já existe
    if any(c['cpf'] == data['cpf'] for c in colaboradores):
        return jsonify({'error': 'CPF já cadastrado'}), 400
    
    # Gerar novo ID
    new_id = 1
    if colaboradores:
        new_id = max(c['id'] for c in colaboradores) + 1
    
    # Criar novo colaborador
    colaborador = {
        'id': new_id,
        'nome_completo': data['nome_completo'],
        'cpf': data['cpf'],
        'data_admissao': data['data_admissao'],
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
    }
    
    colaboradores.append(colaborador)
    save_data(COLABORADORES_FILE, colaboradores)
    
    return jsonify(colaborador), 201

@app.route('/api/colaboradores/buscar-por-cpf/<cpf>', methods=['GET'])
def buscar_por_cpf(cpf):
    colaboradores = load_data(COLABORADORES_FILE)
    colaborador = next((c for c in colaboradores if c['cpf'] == cpf), None)
    
    if not colaborador:
        return jsonify({'error': 'Colaborador não encontrado'}), 404
    
    return jsonify(colaborador)

# Rotas para EPIs
@app.route('/api/epis', methods=['GET'])
def get_epis():
    epis = load_data(EPIS_FILE)
    return jsonify(epis)

@app.route('/api/epis/<int:id>', methods=['GET'])
def get_epi(id):
    epis = load_data(EPIS_FILE)
    epi = next((e for e in epis if e['id'] == id), None)
    
    if not epi:
        return jsonify({'error': 'EPI não encontrado'}), 404
    
    return jsonify(epi)

@app.route('/api/epis', methods=['POST'])
def create_epi():
    data = request.json
    epis = load_data(EPIS_FILE)
    
    # Gerar novo ID
    new_id = 1
    if epis:
        new_id = max(e['id'] for e in epis) + 1
    
    # Criar novo EPI
    epi = {
        'id': new_id,
        'nome': data['nome'],
        'ca': data['ca'],
        'descricao': data.get('descricao', ''),
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
    }
    
    epis.append(epi)
    save_data(EPIS_FILE, epis)
    
    return jsonify(epi), 201

@app.route('/api/epis/buscar-por-ca/<ca>', methods=['GET'])
def buscar_por_ca(ca):
    epis = load_data(EPIS_FILE)
    epi = next((e for e in epis if e['ca'] == ca), None)
    
    if not epi:
        return jsonify({'error': 'EPI não encontrado'}), 404
    
    return jsonify(epi)

# Rotas para Registros
@app.route('/api/registros', methods=['GET'])
def get_registros():
    registros = load_data(REGISTROS_FILE)
    return jsonify(registros)

@app.route('/api/registros/<int:id>', methods=['GET'])
def get_registro(id):
    registros = load_data(REGISTROS_FILE)
    registro = next((r for r in registros if r['id'] == id), None)
    
    if not registro:
        return jsonify({'error': 'Registro não encontrado'}), 404
    
    return jsonify(registro)

@app.route('/api/registros', methods=['POST'])
def create_registro():
    data = request.json
    registros = load_data(REGISTROS_FILE)
    
    # Gerar novo ID
    new_id = 1
    if registros:
        new_id = max(r['id'] for r in registros) + 1
    
    # Criar novo registro
    registro = {
        'id': new_id,
        'colaborador_id': data['colaborador_id'],
        'epi_id': data['epi_id'],
        'data_entrega': data['data_entrega'],
        'assinatura_data': data['assinatura_data'],
        'observacoes': data.get('observacoes', ''),
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
    }
    
    registros.append(registro)
    save_data(REGISTROS_FILE, registros)
    
    return jsonify(registro), 201

@app.route('/api/registros/colaborador/<int:colaborador_id>', methods=['GET'])
def get_registros_por_colaborador(colaborador_id):
    registros = load_data(REGISTROS_FILE)
    registros_colaborador = [r for r in registros if r['colaborador_id'] == colaborador_id]
    
    return jsonify(registros_colaborador)

# Rota para envio de email
@app.route('/api/enviar-email', methods=['POST'])
def enviar_email():
    email = request.form.get('email')
    nome = request.form.get('nome')
    data = request.form.get('data')
    
    # Simulação de envio de email (em produção, usar serviço real)
    response = {
        'success': True,
        'message': f'Email enviado com sucesso para {email}',
        'details': {
            'destinatario': email,
            'nome': nome,
            'data': data,
            'enviado_em': datetime.now().isoformat()
        }
    }
    
    return jsonify(response)

# Rota para verificar se a API está funcionando
@app.route('/api/status', methods=['GET'])
def status():
    return jsonify({
        'status': 'online',
        'version': '1.0.0',
        'timestamp': datetime.now().isoformat()
    })

# Rota principal para Vercel
@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'name': 'API Ficha de EPI Hospital Bom Samaritano Maringá',
        'status': 'online',
        'endpoints': [
            '/api/colaboradores',
            '/api/epis',
            '/api/registros',
            '/api/enviar-email',
            '/api/status'
        ]
    })

# Configuração para Vercel
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
