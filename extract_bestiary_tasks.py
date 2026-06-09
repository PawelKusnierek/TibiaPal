#!/usr/bin/env python3
from html.parser import HTMLParser
from pathlib import Path
import json

POINTS_MAP = {
    15: "easy",
    25: "medium",
    50: "hard",
    100: "challenging",
}

class BestiaryParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_bestiary_table = False
        self.in_row = False
        self.in_cell = False
        self.is_header_cell = False
        self.current_row = []
        self.current_cell = ""
        self.rows = []

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == "table" and "bestiary_table" in attrs_dict.get("class", ""):
            self.in_bestiary_table = True
        elif self.in_bestiary_table and tag == "tr":
            self.in_row = True
            self.current_row = []
            self.is_header_cell = False
        elif self.in_row and tag == "td":
            self.in_cell = True
            self.current_cell = ""
        elif self.in_row and tag == "th":
            self.is_header_cell = True

    def handle_endtag(self, tag):
        if tag == "table" and self.in_bestiary_table:
            self.in_bestiary_table = False
        elif self.in_bestiary_table and tag == "tr":
            if self.in_row and not self.is_header_cell and len(self.current_row) == 4:
                self.rows.append(self.current_row)
            self.in_row = False
        elif self.in_row and tag == "td":
            self.current_row.append(self.current_cell.strip())
            self.in_cell = False

    def handle_data(self, data):
        if self.in_cell:
            self.current_cell += data


def main():
    html = Path("bestiary.html").read_text(encoding="utf-8")

    parser = BestiaryParser()
    parser.feed(html)

    buckets = {name: {} for name in ["easy", "medium", "hard", "challenging", "unique"]}
    seen = set()

    for row in parser.rows:
        monster, points_str, _, where = row
        if monster in seen:
            continue
        seen.add(monster)

        try:
            points = int(points_str)
        except ValueError:
            points = -1

        bucket = POINTS_MAP.get(points, "unique")
        buckets[bucket][monster] = {
            "level": "",
            "rating": "",
            "where": where,
            "extra": "",
        }

    out_dir = Path("_data/tasks")
    out_dir.mkdir(parents=True, exist_ok=True)

    for name, data in buckets.items():
        path = out_dir / f"{name}.json"
        path.write_text(json.dumps(data, indent=4, ensure_ascii=False), encoding="utf-8")
        print(f"{path}: {len(data)} monsters")

    print(f"\nTotal: {sum(len(d) for d in buckets.values())} monsters")


if __name__ == "__main__":
    main()
