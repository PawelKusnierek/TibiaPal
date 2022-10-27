Instructions for development setup for TibiaPal:
1. Install Python 3.8+ and git
2. Run following commands in directory where you wish to develop:
    git init
    git remote add origin https://github.com/pkusnierek/TibiaPal.git
    git pull https://github.com/PawelKusnierek/TibiaPal.git
    pip install -r requirements.txt
3. Follow instructions to set-up an .env file:
https://stackoverflow.com/questions/64208678/hiding-secret-key-in-django-project-on-github-after-uploading-project
For local development 'SECRET_KEY' is not needed, but example of local contents of the .env file below:
SECRET_KEY = 'XXXX.....'
DEBUG = 'TRUE'
DATABASE_NAME = 'tibiapal_db'
DATABASE_USER = 'root'
DATABASE_PASSWORD = 'admin'
DATABASE_HOST = '127.0.0.1'
DATABASE_PORT = '3306'
4. If you plan to setup a local database instance, follow instructions here (does not need to be MySQL, I use MySQL because that's the default for 'PythonAnywhere' where the site is hosted):
https://www.javatpoint.com/how-to-connect-mysql-to-django
4a. install https://dev.mysql.com/downloads/installer/, create schema tibiapal_db
5. To start the development server run below command in 'manage.py' directory:
python manage.py runserver

Instructions for PythonAnywhere hosting (for anyone who wishes to host the site in the future), Hacker+ account:
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
9. To connect DB follow:
https://help.pythonanywhere.com/pages/AccessingMySQLFromOutsidePythonAnywhere/

Miscellaneous tips that helped me at some point, that may also help you:
https://stackoverflow.com/questions/46177499/django-cant-import-module-check-that-module-appconfig-name-is-correct
If MySQL workbench cannot connect to the server you should try to start it manually via services.msc:
try Start -> cmd.exe -> services.msc
