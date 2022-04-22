#### Instructions for SECRET_KEY using '.env':

https://stackoverflow.com/questions/64208678/hiding-secret-key-in-django-project-on-github-after-uploading-project

#### To start local server (in same directory as manage.py) 
python manage.py runserver

#### Creating new app
python manage.py startapp XXX

#### PythonAnywhere initial setup (Hacker+ account)
1. Update static files path
2. Force HTTPS
3. Go to source code repository
4. Remove media/static directories
5. open bash console here (same directory as manage.py)
6. Run commands:
git init
git remote add origin https://github.com/pkusnierek/TibiaPal.git
git clean -f -d
git pull https://github.com/PawelKusnierek/TibiaPal.git
pip install -r requirements.txt
7. Upload or create an '.env' file in the same directory as manage.py containing the SECRET KEY, DEBUG flag and DATABASE entries. My local .env files looks like this:
SECRET_KEY = 'XXXX.....'
DEBUG = 'TRUE'
DATABASE_NAME = 'tibiapal_db'
DATABASE_USER = 'root'
DATABASE_PASSWORD = 'admin'
DATABASE_HOST = '127.0.0.1'
DATABASE_PORT = '3306'
8. Reload the webapp from home 'Web' screen

#### Code sync (At some point add webhook)
1. Open bash console here (same directory as manage.py)
2. Run commands:
git pull https://github.com/PawelKusnierek/TibiaPal.git
3. Reload the webapp from home 'Web' screen

#### MySQL Local setup
Based on instruction here: https://www.javatpoint.com/how-to-connect-mysql-to-django
create database tibiapal_db
python manage.py migrate

#### DB migrating models
python manage.py makemigrations
python manage.py sqlmigrate app_name XXXX
python manage.py migrate

#### MySQL connecting PythonAnywhere to local db via SSH
https://help.pythonanywhere.com/pages/AccessingMySQLFromOutsidePythonAnywhere/

#### AppConfig tip
https://stackoverflow.com/questions/46177499/django-cant-import-module-check-that-module-appconfig-name-is-correct