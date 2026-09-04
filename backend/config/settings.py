"""
Django settings for Cafe Manager backend.

Values are loaded from a .env file via python-dotenv.
Never hardcode secrets here.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# ── Base directory ─────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent

# ── Load environment variables ─────────────────────────────────────────────────
load_dotenv(BASE_DIR / '.env')

# ── Security ───────────────────────────────────────────────────────────────────
SECRET_KEY = os.environ['SECRET_KEY']

DEBUG = os.getenv('DEBUG', 'False').lower() in ('true', '1', 'yes')

ALLOWED_HOSTS = [h.strip() for h in os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1,testserver').split(',') if h.strip()]

# Ensure Render backend host is allowed
_render_host = 'cafe-manager-backend-bl54.onrender.com'
if _render_host not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(_render_host)

# Ensure Vercel frontend and backend hosts are allowed
_vercel_frontend = 'cafe-managment-ruddy.vercel.app'
if _vercel_frontend not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(_vercel_frontend)

_vercel_backend = 'cafe-management-mdbj.vercel.app'
if _vercel_backend not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(_vercel_backend)

if 'testserver' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('testserver')


# ── Application definition ─────────────────────────────────────────────────────
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',

    # Local apps
    'accounts',
    'menu',
    'orders',
    'notifications',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'accounts.middleware.RequestLoggingMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# ── Database — PostgreSQL ──────────────────────────────────────────────────────
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME':     os.environ['DB_NAME'],
        'USER':     os.environ['DB_USER'],
        'PASSWORD': os.environ['DB_PASSWORD'],
        'HOST':     os.getenv('DB_HOST', 'localhost'),
        'PORT':     os.getenv('DB_PORT', '5432'),
        'OPTIONS': {
            'connect_timeout': 5,
        },
    }
}

# ── Auth password validators ───────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ── Internationalisation ───────────────────────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

# ── Static & Media files ───────────────────────────────────────────────────────
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ── Default primary key ────────────────────────────────────────────────────────
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── Django REST Framework ──────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',  # for image uploads
        'rest_framework.parsers.FormParser',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
}

from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': False,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    'JWK_URL': None,
    'LEEWAY': 0,
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'USER_AUTHENTICATION_RULE': 'rest_framework_simplejwt.authentication.default_user_authentication_rule',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    'TOKEN_USER_CLASS': 'rest_framework.models.TokenUser',
    'JTI_CLAIM': 'jti',
}

# ── CORS & CSRF ────────────────────────────────────────────────────────────────
_default_cors_origins = [
    'https://cafe-management-ruddy.vercel.app',
    'https://cafe-managment-ruddy.vercel.app',
    'https://cafe-management-mdbj.vercel.app',
    'https://cafe-management-git-main-abdulrinshads-projects.vercel.app',
    'https://cafe-managment-git-main-abdulrinshads-projects.vercel.app',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
]

_cors_env_raw = os.getenv('CORS_ALLOWED_ORIGINS', '')
_cors_env_origins = [o.strip().strip('\'"').rstrip('/') for o in _cors_env_raw.split(',') if o.strip()]

# Merge default origins and environment origins while preserving order & eliminating duplicates
CORS_ALLOWED_ORIGINS = list(dict.fromkeys(_default_cors_origins + _cors_env_origins))

# Allow cookies / auth headers
CORS_ALLOW_CREDENTIALS = True

# CSRF Trusted Origins for cross-origin requests
_default_csrf_origins = [
    'https://cafe-management-ruddy.vercel.app',
    'https://cafe-managment-ruddy.vercel.app',
    'https://cafe-management-mdbj.vercel.app',
    'https://cafe-management-git-main-abdulrinshads-projects.vercel.app',
    'https://cafe-managment-git-main-abdulrinshads-projects.vercel.app',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
]

_csrf_env_raw = os.getenv('CSRF_TRUSTED_ORIGINS', '')
_csrf_env_origins = [o.strip().strip('\'"').rstrip('/') for o in _csrf_env_raw.split(',') if o.strip()]

CSRF_TRUSTED_ORIGINS = list(dict.fromkeys(_default_csrf_origins + _csrf_env_origins))

# ── Email Settings ─────────────────────────────────────────────────────────────
EMAIL_BACKEND = os.getenv(
    'EMAIL_BACKEND',
    'django.core.mail.backends.smtp.EmailBackend'
)

EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() in ('true', '1', 'yes')
EMAIL_USE_SSL = os.getenv('EMAIL_USE_SSL', 'False').lower() in ('true', '1', 'yes')
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')

_default_from = os.getenv('DEFAULT_FROM_EMAIL', '').strip()
if not _default_from:
    _default_from = EMAIL_HOST_USER

DEFAULT_FROM_EMAIL = _default_from

EMAIL_TIMEOUT = int(os.getenv('EMAIL_TIMEOUT', '10'))

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django.security.DisallowedHost': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
    },
}

