import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'smartkirana-secret-key-12345-dev-only')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', f'sqlite:///{os.path.join(BASE_DIR, "smartkirana.db")}')
    
    # Uploads folder
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    
    # ML model checkpoints
    MODEL_DIR = os.path.join(BASE_DIR, 'ml', 'checkpoints')
    
    @classmethod
    def init_app(cls):
        # Create directories if they don't exist
        os.makedirs(cls.UPLOAD_FOLDER, exist_ok=True)
        os.makedirs(cls.MODEL_DIR, exist_ok=True)
