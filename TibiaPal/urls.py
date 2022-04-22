"""TibiaPal URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from django.contrib.staticfiles.urls import staticfiles_urlpatterns

urlpatterns = [
    path('about/', include('TibiaPal.apps.about.urls')),
    path('auctions/', include('TibiaPal.apps.auctions.urls')),
    path('bestiary/', include('TibiaPal.apps.bestiary.urls')),
    path('bosstimers/', include('TibiaPal.apps.bosstimers.urls')),
    path('donators/', include('TibiaPal.apps.donators.urls')),
    path('exercise/', include('TibiaPal.apps.exercise.urls')),
    path('expcalculator/', include('TibiaPal.apps.expcalculator.urls')),
    path('expshare/', include('TibiaPal.apps.expshare.urls')),
    path('hunting/', include('TibiaPal.apps.hunting.urls')),
    path('imbue/', include('TibiaPal.apps.imbue.urls')),
    path('leech/', include('TibiaPal.apps.leech.urls')),
    path('offlinetraining/', include('TibiaPal.apps.offlinetraining.urls')),
    path('othertools/', include('TibiaPal.apps.othertools.urls')),
    path('stamina/', include('TibiaPal.apps.stamina.urls')),
    path('tibialootsplit/', include('TibiaPal.apps.tibialootsplit.urls')),
    path('videos/', include('TibiaPal.apps.videos.urls')),
    path('weapons/', include('TibiaPal.apps.weapons.urls')),
    path('testapp/', include('TibiaPal.apps.testapp.urls')),
    path('admin/', admin.site.urls),
    path('', TemplateView.as_view(template_name='index.html')),
]

urlpatterns += staticfiles_urlpatterns()
