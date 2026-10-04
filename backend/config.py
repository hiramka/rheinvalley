import os
from datetime import timedelta
from dotenv import load_dotenv

# Load local environment variables from backend/.env if present
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'))

class BaseConfig:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'kenya-hospital-pos-default-dev-key-2026')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-kenya-hospital-pos-jwt-dev-key-2026')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    RATELIMIT_STORAGE_URI = os.environ.get('REDIS_URL', 'memory://')
    RATELIMIT_DEFAULT = "200 per day; 50 per hour"

    @staticmethod
    def format_database_url(url):
        if url and url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql://", 1)
        return url


class DevelopmentConfig(BaseConfig):
    DEBUG = True
    TESTING = False
    
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hospital_pos.db')
    SQLALCHEMY_DATABASE_URI = BaseConfig.format_database_url(
        os.environ.get('DATABASE_URL', f"sqlite:///{db_path}")
    )


class StagingConfig(BaseConfig):
    DEBUG = False
    TESTING = False

    MYSQL_USER = os.environ.get('MYSQL_USER', 'hospital_staging')
    MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD', 'staging_secret')
    MYSQL_HOST = os.environ.get('MYSQL_HOST', 'localhost')
    MYSQL_DB = os.environ.get('MYSQL_DB', 'hospital_pos_staging')
    
    SQLALCHEMY_DATABASE_URI = BaseConfig.format_database_url(
        os.environ.get('DATABASE_URL', f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}/{MYSQL_DB}")
    )


class ProductionConfig(BaseConfig):
    DEBUG = False
    TESTING = False

    def __init__(self):
        secret = os.environ.get('SECRET_KEY')
        jwt_secret = os.environ.get('JWT_SECRET_KEY')
        db_url = os.environ.get('DATABASE_URL')

        if not secret or secret == 'kenya-hospital-pos-default-dev-key-2026':
            raise ValueError("SECURITY RISK: A strong custom SECRET_KEY environment variable MUST be set in production!")

        if not jwt_secret or jwt_secret == 'jwt-kenya-hospital-pos-jwt-dev-key-2026':
            raise ValueError("SECURITY RISK: A strong custom JWT_SECRET_KEY environment variable MUST be set in production!")

        if not db_url or 'sqlite' in db_url.lower():
            raise ValueError("PRODUCTION CHECKLIST ERROR: SQLite MUST NOT be used in production! Configure Supabase / PostgreSQL DATABASE_URL.")

    SQLALCHEMY_DATABASE_URI = BaseConfig.format_database_url(os.environ.get('DATABASE_URL'))


config_by_name = {
    'development': DevelopmentConfig,
    'staging': StagingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

Config = config_by_name[os.environ.get('FLASK_ENV', 'development')]
