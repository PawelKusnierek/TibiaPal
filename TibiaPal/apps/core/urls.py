from django.urls import path
from django.views.generic.base import TemplateView

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('about/', views.about, name='about'),
    path('bestiary/', views.bestiary, name='bestiary'),
    path('bosstimers/', views.bosstimers, name='bosstimers'),
    path('donators/', views.donators, name='donators'),
    path('exercise/', views.exercise, name='exercise'),
    path('expcalculator/', views.expcalculator, name='expcalculator'),
    path('expshare/', views.expshare, name='expshare'),
    path('hunting/', views.hunting, name='hunting'),
    path('hunting/fullth/', views.fullth, name='fullth'),
    path('hunting/knightdruidduo/', views.knightdruidduo, name='knightdruidduo'),
    path('hunting/paladindruidduo/', views.paladindruidduo, name='paladindruidduo'),
    path('hunting/paladinpaladinduo/',
         views.paladinpaladinduo, name='paladinpaladinduo'),
    path('hunting/soloknight/', views.soloknight, name='soloknight'),
    path('hunting/solomage/', views.solomage, name='solomage'),
    path('hunting/solopaladinaoe/', views.solopaladinaoe, name='solopaladinaoe'),
    path('hunting/solopaladinsingle/',
         views.solopaladinsingle, name='solopaladinsingle'),
    path('imbue/', views.imbue, name='imbue'),
    path('leech/', views.leech, name='leech'),
    path('offlinetraining/', views.offlinetraining, name='offlinetraining'),
    path('stamina/', views.stamina, name='stamina'),
    path('tibialootsplit/', views.tibialootsplit, name='tibialootsplit'),
    path('videos/', views.videos, name='videos'),
    path('weapons/', views.weapons, name='weapons'),
    path('testapp/', views.testapp, name='testapp'),
    path('ads.txt/', TemplateView.as_view(template_name='ads.txt')),
]
