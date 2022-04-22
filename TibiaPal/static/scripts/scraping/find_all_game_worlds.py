
import requests
from bs4 import BeautifulSoup

url = "https://www.tibia.com/community/?subtopic=worlds"

response = requests.get(url)

soup = BeautifulSoup(response.content, "html.parser")

table = soup.find_all('table',  {'class': 'TableContent'})

rows = table[2].find_all('tr')
rows = rows[1:]
worlds = []
for row in rows:
    worlds.append(row.next.text)