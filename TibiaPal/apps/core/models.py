from bs4 import BeautifulSoup
from django.db import models
import requests

VOCATION_CHOICES = (
    ('KNIGHT', 'Knight'),
    ('ELITE_KNIGHT', 'Elite Knight'),
    ('PALADIN', 'Paladin'),
    ('ROYAL_PALADIN', 'Royal Paladin'),
    ('SORCERER', 'Sorcerer'),
    ('MASTER_SORCERER', 'Master Sorcerer'),
    ('DRUID', 'Druid'),
    ('ELDER_DRUID', 'Elder Druid'),
    ('NONE', 'None'),
)


class Test_Character(models.Model):
    name = models.CharField(max_length=40, unique=True)
    vocation = models.CharField(
        max_length=15, choices=VOCATION_CHOICES, default='None')
    level = models.PositiveSmallIntegerField()
    achievement_points = models.PositiveSmallIntegerField()
    world = models.CharField(max_length=30)


class World(models.Model):
    name = models.CharField(max_length=20, unique=True)

    def scrape_worlds():
        url = "https://www.tibia.com/community/?subtopic=worlds"

        response = requests.get(url)

        soup = BeautifulSoup(response.content, "html.parser")

        table = soup.find_all('table',  {'class': 'TableContent'})

        rows = table[2].find_all('tr')
        rows = rows[1:]
        worlds = []
        for row in rows:
            world = World(name=row.next.text)
            worlds.append(world)

        return worlds

    def update_worlds_db(worlds):
        # Veryfing that the output makes sense, i.e. there are more than 50 worlds but less than 100. This should be true for a few years at least
        if len(worlds) < 100 and len(worlds) > 50:
            World.objects.delete()
            World.objects.bulk_create(worlds)
