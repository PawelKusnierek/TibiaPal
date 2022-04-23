
import requests
from bs4 import BeautifulSoup
from models import World


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
    print(world)

# Veryfing that the output makes sense, i.e. there are more than 50 worlds but less than 100. This should be true for a few years at least
if len(worlds) < 100 and len(worlds) > 50:
    World.objects.delete()
    World.objects.bulk_create(worlds)
