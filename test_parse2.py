import re
import urllib.parse

def get_query(urlStr, fallbackQuery):
    queryTarget = ""
    place_match = re.search(r'/place/([^/]+)', urlStr)
    if place_match:
        try:
            queryTarget = urllib.parse.unquote(place_match.group(1).replace('+', ' '))
        except:
            queryTarget = place_match.group(1).replace('+', ' ')
    else:
        try:
            urlObj = urllib.parse.urlparse(urlStr)
            params = urllib.parse.parse_qs(urlObj.query)
            if 'query' in params:
                queryTarget = params['query'][0]
            elif 'q' in params:
                queryTarget = params['q'][0]
        except:
            pass

    if not queryTarget:
        coords_match = re.search(r'@(-?\d+\.\d+),(-?\d+\.\d+)', urlStr)
        if coords_match:
            queryTarget = f"{coords_match.group(1)},{coords_match.group(2)}"
            
    if not queryTarget:
        if urlStr.startswith('http'):
            queryTarget = fallbackQuery
        else:
            queryTarget = urlStr
            
    return queryTarget

urls = [
    ("https://www.google.com/maps/place/Al+Qudwah+Coffee/@32.5342,35.8573,15z", "Fallback"),
    ("https://www.google.com/maps/place/%D9%85%D8%B7%D8%B9%D8%B1+%D9%87%D8%A7%D8%B4%D9%85/@32.55,35.85,15z", "Fallback"),
    ("https://maps.app.goo.gl/xyz123", "Al Qudwah Coffee Irbid"),
    ("https://www.google.com/maps/search/?api=1&query=My+Store", "Fallback"),
    ("https://www.google.com/maps?q=32.123,35.123", "Fallback"),
    ("Amman street 10", "Fallback")
]

for u, f in urls:
    print(f"{u} => {get_query(u, f)}")
