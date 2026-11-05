# Cuts the card's serif, public/fonts/card/Newsreader-*.ttf, from Google Fonts'
# variable Newsreader (ofl/newsreader in github.com/google/fonts): static
# instances at optical size 16, weights 400/500/600, upright and italic, each
# weight named a family of its own as IBM's static Plex files are ("Newsreader
# Medm"), which is how src/lib/card.typ asks Typst for a weight.
#
#   uvx --from fonttools python scripts/card-serif.py <dir with Newsreader[opsz,wght].ttf and Newsreader-Italic[opsz,wght].ttf> public/fonts/card
import sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
src, out = sys.argv[1], sys.argv[2]
for ital, f in [(False, 'Newsreader[opsz,wght].ttf'), (True, 'Newsreader-Italic[opsz,wght].ttf')]:
    for w, suffix, wname in [(400, '', 'Regular'), (500, ' Medm', 'Medium'), (600, ' SmBld', 'SemiBold')]:
        t = instantiateVariableFont(TTFont(f'{src}/{f}'), {'wght': w, 'opsz': 16})
        style = 'Italic' if ital else 'Regular'
        full = wname + ('Italic' if ital else '') if wname != 'Regular' else style
        n = t['name']
        for rec in list(n.names):
            if rec.nameID in (1, 2, 3, 4, 6, 16, 17, 21, 22, 25) or rec.nameID >= 256: n.removeNames(nameID=rec.nameID)
        n.setName('Newsreader' + suffix, 1, 3, 1, 0x409)
        n.setName(style, 2, 3, 1, 0x409)
        n.setName('Newsreader', 16, 3, 1, 0x409)
        n.setName(f"{wname}{' Italic' if ital else ''}", 17, 3, 1, 0x409)
        n.setName(f'Newsreader {wname}{" Italic" if ital else ""}'.replace('Regular Italic', 'Italic'), 4, 3, 1, 0x409)
        ps = f'Newsreader-{full}'
        n.setName(ps, 6, 3, 1, 0x409)
        n.setName(f'1.003;opsz16;{ps}', 3, 3, 1, 0x409)
        t['OS/2'].usWeightClass = w
        if 'STAT' in t: del t['STAT']
        t.recalcTimestamp = False  # the source's dates, so a re-run gives the same bytes
        t.save(f'{out}/{ps}.ttf')
        print(ps, w, style)
