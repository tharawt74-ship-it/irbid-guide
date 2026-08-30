import re
import urllib.parse

urls = [
    "https://www.google.com/maps/place/%D9%85%D8%B7%D8%B9%D8%B1+%D9%87%D8%A7%D8%B4%D9%85/@32.55,35.85,15z",
    "https://maps.app.goo.gl/xyz123",
    "https://www.google.com/maps/search/?api=1&query=My+Store",
    "https://www.google.com/maps?q=32.123,35.123"
]

for url in urls:
    print(f"URL: {url}")
    place_match = re.search(r'/place/([^/]+)', url)
    if place_match:
        name = urllib.parse.unquote(place_match.group(1).replace('+', ' '))
        print(f"  Place: {name}")
    
    query_match = re.search(r'[?&]query=([^&]+)', url) or re.search(r'[?&]q=([^&]+)', url)
    if query_match:
        q = urllib.parse.unquote(query_match.group(1).replace('+', ' '))
        print(f"  Query: {q}")
        
    coords_match = re.search(r'@(-?\d+\.\d+),(-?\d+\.\d+)', url)
    if coords_match:
        print(f"  Coords: {coords_match.group(1)},{coords_match.group(2)}")
