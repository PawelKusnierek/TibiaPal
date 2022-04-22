from django.db import models

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
