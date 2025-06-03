from flask import Blueprint, request, jsonify
from datetime import datetime
from src.models.colaborador import db, Colaborador

colaborador_bp = Blueprint('colaborador', __name__)

@colaborador_bp.route('/colaboradores', methods=['GET'])
def get_colaboradores():
    """Busca colaboradores, opcionalmente filtrando por nome"""
    nome_busca = request.args.get('nome', '')
    
    if nome_busca:
        # Busca case-insensitive por nome parcial
        colaboradores = Colaborador.query.filter(
            Colaborador.nome_completo.ilike(f'%{nome_busca}%')
        ).all()
    else:
        colaboradores = Colaborador.query.all()
    
    return jsonify([c.to_dict() for c in colaboradores])

@colaborador_bp.route('/colaboradores/<string:cpf>', methods=['GET'])
def get_colaborador_by_cpf(cpf):
    """Busca um colaborador pelo CPF"""
    # Remover caracteres não numéricos do CPF
    cpf = ''.join(filter(str.isdigit, cpf))
    
    colaborador = Colaborador.query.filter_by(cpf=cpf).first()
    
    if not colaborador:
        return jsonify({'error': 'Colaborador não encontrado'}), 404
    
    return jsonify(colaborador.to_dict())

@colaborador_bp.route('/colaboradores/<int:id>', methods=['GET'])
def get_colaborador(id):
    """Busca um colaborador pelo ID"""
    colaborador = Colaborador.query.get(id)
    
    if not colaborador:
        return jsonify({'error': 'Colaborador não encontrado'}), 404
    
    return jsonify(colaborador.to_dict())

@colaborador_bp.route('/colaboradores', methods=['POST'])
def create_colaborador():
    """Cria um novo colaborador"""
    data = request.json.get('colaborador', {})
    
    # Validar dados obrigatórios
    if not data.get('nome_completo') or not data.get('cpf') or not data.get('data_admissao'):
        return jsonify({'error': 'Dados incompletos. Nome, CPF e data de admissão são obrigatórios.'}), 400
    
    # Remover caracteres não numéricos do CPF
    cpf = ''.join(filter(str.isdigit, data['cpf']))
    
    # Verificar se o CPF já existe
    existing = Colaborador.query.filter_by(cpf=cpf).first()
    if existing:
        return jsonify(existing.to_dict()), 200
    
    # Converter data de admissão para objeto Date
    try:
        data_admissao = datetime.strptime(data['data_admissao'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Formato de data inválido. Use YYYY-MM-DD.'}), 400
    
    # Criar novo colaborador
    colaborador = Colaborador(
        nome_completo=data['nome_completo'],
        cpf=cpf,
        data_admissao=data_admissao
    )
    
    db.session.add(colaborador)
    db.session.commit()
    
    return jsonify(colaborador.to_dict()), 201
