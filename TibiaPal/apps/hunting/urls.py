from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('fullth/', views.fullth, name='fullth'),
    path('knightdruidduo/', views.knightdruidduo, name='knightdruidduo'),
    path('paladindruidduo/', views.paladindruidduo, name='paladindruidduo'),
    path('paladinpaladinduo/', views.paladinpaladinduo, name='paladinpaladinduo'),
    path('soloknight/', views.soloknight, name='soloknight'),
    path('solomage/', views.solomage, name='solomage'),
    path('solopaladinaoe/', views.solopaladinaoe, name='solopaladinaoe'),
    path('solopaladinsingle/', views.solopaladinsingle, name='solopaladinsingle'),
]
