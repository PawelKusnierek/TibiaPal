from django.http import HttpResponse
from django.template import loader


def index(request):
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
