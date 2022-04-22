from django.http import HttpResponse
from django.template import loader
from TibiaPal.apps.testapp.models import Test_Character


def index(request):
    template = loader.get_template('testapp.html')
    #new_character = Test_Character.objects.get_or_create(
    #    name="Kusnierr", vocation="ELITE KNIGHT", level="528", achievement_points="512", world="Olima")
    return HttpResponse(template.render())
