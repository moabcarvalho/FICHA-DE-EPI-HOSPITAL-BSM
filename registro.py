from flask import Blueprint, request, jsonify
from datetime import datetime
from src.models.registro import db, Registro
from src.models.colaborador import Colaborador
from src.models.epi import EPI

registro_bp = Blueprint('registro', __name__)

@registro_bp.route('/registros', methods=['GET'])
def get_registros():
    """Busca todos os registros"""
    registros = Registro.query.all()
    return jsonify([r.to_dict() for r in registros])

@registro_bp.route('/registros/<int:id>', methods=['GET'])
def get_registro(id):
    """Busca um registro pelo ID"""
    registro = Registro.query.get(id)
    
    if not registro:
        return jsonify({'error': 'Registro não encontrado'}), 404
    
    return jsonify(registro.to_dict())

@registro_bp.route('/registros/colaborador/<int:colaborador_id>', methods=['GET'])
def get_registros_por_colaborador(colaborador_id):
    """Busca registros de um colaborador específico"""
    registros = Registro.query.filter_by(colaborador_id=colaborador_id).all()
    return jsonify([r.to_dict() for r in registros])

@registro_bp.route('/registros', methods=['POST'])
def create_registro():
    """Cria um novo registro de entrega de EPI"""
    data = request.json
    
    # Validar dados obrigatórios
    if not data.get('colaborador') or not data.get('epi') or not data.get('registro'):
        return jsonify({'error': 'Dados incompletos. Informações do colaborador, EPI e registro são obrigatórias.'}), 400
    
    colaborador_data = data['colaborador']
    epi_data = data['epi']
    registro_data = data['registro']
    
    # Verificar se o colaborador já existe pelo CPF
    cpf = ''.join(filter(str.isdigit, colaborador_data['cpf']))
    colaborador = Colaborador.query.filter_by(cpf=cpf).first()
    
    if not colaborador:
        # Criar novo colaborador
        try:
            data_admissao = datetime.strptime(colaborador_data['data_admissao'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Formato de data de admissão inválido. Use YYYY-MM-DD.'}), 400
        
        colaborador = Colaborador(
            nome_completo=colaborador_data['nome_completo'],
            cpf=cpf,
            data_admissao=data_admissao
        )
        db.session.add(colaborador)
        db.session.flush()  # Obter ID sem commit
    
    # Verificar se o EPI já existe pelo CA
    epi = EPI.query.filter_by(ca=epi_data['ca']).first()
    
    if not epi:
        # Criar novo EPI
        epi = EPI(
            nome=epi_data['nome'],
            ca=epi_data['ca'],
            observacoes=epi_data.get('observacoes', '')
        )
        db.session.add(epi)
        db.session.flush()  # Obter ID sem commit
    
    # Criar o registro
    try:
        data_entrega = datetime.strptime(registro_data['data_entrega'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Formato de data de entrega inválido. Use YYYY-MM-DD.'}), 400
    
    registro = Registro(
        colaborador_id=colaborador.id,
        epi_id=epi.id,
        data_entrega=data_entrega,
        assinatura_data=registro_data['assinatura_data']
    )
    
    db.session.add(registro)
    db.session.commit()
    
    # Retornar o registro completo
    return jsonify({
        'id': registro.id,
        'colaborador': colaborador.to_dict(),
        'epi': epi.to_dict(),
        'data_entrega': registro.data_entrega.isoformat(),
        'created_at': registro.created_at.isoformat()
    }), 201
