from flask import Blueprint, request, jsonify
from datetime import datetime
from src.models.epi import db, EPI

epi_bp = Blueprint('epi', __name__)

@epi_bp.route('/epis', methods=['GET'])
def get_epis():
    """Busca todos os EPIs"""
    epis = EPI.query.all()
    return jsonify([e.to_dict() for e in epis])

@epi_bp.route('/epis/<int:id>', methods=['GET'])
def get_epi(id):
    """Busca um EPI pelo ID"""
    epi = EPI.query.get(id)
    
    if not epi:
        return jsonify({'error': 'EPI não encontrado'}), 404
    
    return jsonify(epi.to_dict())

@epi_bp.route('/epis/ca/<string:ca>', methods=['GET'])
def get_epi_by_ca(ca):
    """Busca um EPI pelo CA (Certificado de Aprovação)"""
    epi = EPI.query.filter_by(ca=ca).first()
    
    if not epi:
        return jsonify({'error': 'EPI não encontrado'}), 404
    
    return jsonify(epi.to_dict())

@epi_bp.route('/epis', methods=['POST'])
def create_epi():
    """Cria um novo EPI"""
    data = request.json.get('epi', {})
    
    # Validar dados obrigatórios
    if not data.get('nome') or not data.get('ca'):
        return jsonify({'error': 'Dados incompletos. Nome e CA são obrigatórios.'}), 400
    
    # Verificar se o CA já existe
    existing = EPI.query.filter_by(ca=data['ca']).first()
    if existing:
        return jsonify(existing.to_dict()), 200
    
    # Criar novo EPI
    epi = EPI(
        nome=data['nome'],
        ca=data['ca'],
        observacoes=data.get('observacoes', '')
    )
    
    db.session.add(epi)
    db.session.commit()
    
    return jsonify(epi.to_dict()), 201
