"""Download the OFL variable fonts and cut static instances.

Chromium embeds variable fonts in PDFs as Type 3 outlines, which many print shops
reject. Static TrueType instances embed as CID TrueType instead.
Run:  pip install fonttools && python3 scripts/make-static-fonts.py
"""
import os, urllib.request
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'fonts')
SRC = os.path.join(HERE, '..', 'fonts', 'variable')
BASE = 'https://raw.githubusercontent.com/google/fonts/main/ofl/'
FONTS = {  # family-file : (repo path, weights)
    'CormorantGaramond': ('cormorantgaramond/CormorantGaramond%5Bwght%5D.ttf', [400, 500, 600, 700]),
    'CormorantGaramond-Italic': ('cormorantgaramond/CormorantGaramond-Italic%5Bwght%5D.ttf', [400, 600]),
    'NotoSans': ('notosans/NotoSans%5Bwdth,wght%5D.ttf', [400, 600, 700]),
    'NotoSans-Italic': ('notosans/NotoSans-Italic%5Bwdth,wght%5D.ttf', [400, 700]),
    'NotoSerif': ('notoserif/NotoSerif%5Bwdth,wght%5D.ttf', [400]),
    'NotoSerifDevanagari': ('notoserifdevanagari/NotoSerifDevanagari%5Bwdth,wght%5D.ttf', [400, 500, 600, 700]),
    'NotoSansDevanagari': ('notosansdevanagari/NotoSansDevanagari%5Bwdth,wght%5D.ttf', [400, 700]),
    'NotoSansBengali': ('notosansbengali/NotoSansBengali%5Bwdth,wght%5D.ttf', [400, 700]),
    'NotoSansGujarati': ('notosansgujarati/NotoSansGujarati%5Bwdth,wght%5D.ttf', [400, 700]),
    'NotoSansTamil': ('notosanstamil/NotoSansTamil%5Bwdth,wght%5D.ttf', [400, 700]),
    'NotoSansTelugu': ('notosanstelugu/NotoSansTelugu%5Bwdth,wght%5D.ttf', [400, 700]),
    'NotoSansKannada': ('notosanskannada/NotoSansKannada%5Bwdth,wght%5D.ttf', [400, 700]),
    'NotoSansMalayalam': ('notosansmalayalam/NotoSansMalayalam%5Bwdth,wght%5D.ttf', [400, 700]),
}
STATIC = {'NotoSansSymbols2-Regular.ttf': 'notosanssymbols2/NotoSansSymbols2-Regular.ttf'}

os.makedirs(SRC, exist_ok=True)
for name, (path, weights) in FONTS.items():
    src = os.path.join(SRC, name + '.ttf')
    if not os.path.exists(src):
        urllib.request.urlretrieve(BASE + path, src)
    for w in weights:
        f = TTFont(src)
        axes = {a.axisTag for a in f['fvar'].axes}
        loc = {'wght': w}
        if 'wdth' in axes:
            loc['wdth'] = 100
        inst = instantiateVariableFont(f, loc, updateFontNames=True)
        inst.save(os.path.join(OUT, f'{name}-{w}.ttf'))
        print('wrote', f'{name}-{w}.ttf')
for name, path in STATIC.items():
    dst = os.path.join(OUT, name)
    if not os.path.exists(dst):
        urllib.request.urlretrieve(BASE + path, dst)
