from django.http import HttpResponse
from django.template import loader
from TibiaPal.apps.core.models import Test_Character, World


def index(request):
    template = loader.get_template('index.html')
    return HttpResponse(template.render())


def about(request):
    template = loader.get_template('about.html')
    return HttpResponse(template.render())


def auctions(request):
    template = loader.get_template('auctions.html')
    worlds = World.objects.all()
    context = {
        'worlds': worlds
    }
    return HttpResponse(template.render(context))


def auctions_update(request):
    worlds = World.scrape_worlds()
    World.update_worlds_db(worlds)
    return HttpResponse("Worlds updated")


def bestiary(request):
    template = loader.get_template('bestiary.html')
    return HttpResponse(template.render())


def bosstimers(request):
    template = loader.get_template('bosstimers.html')
    return HttpResponse(template.render())


def charactertracker(request):
    template = loader.get_template('charactertracker.html')
    return HttpResponse(template.render())


def charactertracker_update(request):
    return HttpResponse("Characters successfully tracked")


def donators(request):
    template = loader.get_template('donators.html')
    return HttpResponse(template.render())


def exercise(request):
    template = loader.get_template('exercise.html')
    return HttpResponse(template.render())


def expcalculator(request):
    template = loader.get_template('expcalculator.html')
    return HttpResponse(template.render())


def expshare(request):
    template = loader.get_template('expshare.html')
    return HttpResponse(template.render())


def hunting(request):
    template = loader.get_template('hunting.html')
    return HttpResponse(template.render())


def fullth(request):
    template = loader.get_template('fullth.html')
    return HttpResponse(template.render())


def knightdruidduo(request):
    template = loader.get_template('knightdruidduo.html')
    return HttpResponse(template.render())


def paladindruidduo(request):
    template = loader.get_template('paladindruidduo.html')
    return HttpResponse(template.render())


def paladinpaladinduo(request):
    template = loader.get_template('paladinpaladinduo.html')
    return HttpResponse(template.render())


def soloknight(request):
    template = loader.get_template('soloknight.html')
    return HttpResponse(template.render())


def solomage(request):
    template = loader.get_template('solomage.html')
    return HttpResponse(template.render())


def solopaladinaoe(request):
    template = loader.get_template('solopaladinaoe.html')
    return HttpResponse(template.render())


def solopaladinsingle(request):
    template = loader.get_template('solopaladinsingle.html')
    return HttpResponse(template.render())


def imbue(request):
    template = loader.get_template('imbue.html')
    return HttpResponse(template.render())


def leech(request):
    template = loader.get_template('leech.html')
    return HttpResponse(template.render())


def offlinetraining(request):
    template = loader.get_template('offlinetraining.html')
    return HttpResponse(template.render())


def stamina(request):
    template = loader.get_template('stamina.html')
    return HttpResponse(template.render())


def tibialootsplit(request):
    template = loader.get_template('tibialootsplit.html')
    return HttpResponse(template.render())


def videos(request):
    template = loader.get_template('videos.html')
    return HttpResponse(template.render())


def weapons(request):
    template = loader.get_template('weapons.html')
    return HttpResponse(template.render())


def testapp(request):
    template = loader.get_template('testapp.html')
    new_character = Test_Character.objects.get_or_create(
        name="Kusnierr", vocation="ELITE KNIGHT", level="528", achievement_points="512", world="Olima")
    print(new_character)
    return HttpResponse(template.render())
