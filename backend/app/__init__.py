import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_migrate import Migrate
from config import Config
from app.models import db
from app.middleware import apply_security_headers

migrate = Migrate()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)

    # Configure CORS origins from environment or allow default
    cors_origins = os.environ.get('CORS_ALLOWED_ORIGINS', '*').split(',')
    CORS(app, resources={r"/api/*": {"origins": cors_origins}})

    # Apply Production Security Headers
    @app.after_request
    def after_request(response):
        return apply_security_headers(response)

    # Register blueprints
    from app.routes.auth_routes import auth_bp
    from app.routes.patient_routes import patient_bp
    from app.routes.visit_routes import visit_bp
    from app.routes.consultation_routes import consultation_bp
    from app.routes.pharmacy_routes import pharmacy_bp
    from app.routes.billing_routes import billing_bp
    from app.routes.admin_routes import admin_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(patient_bp, url_prefix='/api/patients')
    app.register_blueprint(visit_bp, url_prefix='/api/visits')
    app.register_blueprint(consultation_bp, url_prefix='/api')
    app.register_blueprint(pharmacy_bp, url_prefix='/api/pharmacy')
    app.register_blueprint(billing_bp, url_prefix='/api/billing')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'system': 'Hospital POS & Billing System (Kenya)',
            'database': app.config['SQLALCHEMY_DATABASE_URI'].split('://')[0]
        }), 200

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Requested API route not found'}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({'error': 'Internal server error occurred'}), 500

    return app
