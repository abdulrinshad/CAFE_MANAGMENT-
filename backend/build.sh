#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate || echo "WARNING: Migration skipped during build. Ensure DATABASE_URL is set in Render environment variables."
