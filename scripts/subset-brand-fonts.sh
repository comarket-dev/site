#!/bin/sh
# Subset the example brands' typefaces (design/brands/fonts, all OFL) to Latin text and write web fonts to
# public/fonts/brands. They are only used inside the example storefronts; the site itself stays in Satoshi.
#   sh scripts/subset-brand-fonts.sh
set -e
cd "$(dirname "$0")/.."
SRC=design/brands/fonts
OUT=public/fonts/brands
mkdir -p "$OUT"
U="U+0020-007E,U+00A0-00FF,U+2013,U+2014,U+2018-201E,U+2022,U+2026,U+2032,U+2190-2193,U+2212,U+00D7,U+2715"
TMP=$(mktemp -d)
# narrowing an axis past its default needs fontTools 4.40 or later and brotli (the mflux venv has both)
PY=python3
[ -x "$HOME/.venvs/mflux/bin/python" ] && PY="$HOME/.venvs/mflux/bin/python"
# sub <source> <output> [axis limits]: pin or narrow the axes a brand doesn't use first, then subset
sub() {
  f="$SRC/$1"
  if [ -n "$3" ]; then "$PY" -m fontTools.varLib.instancer "$f" $3 -q -o "$TMP/i.ttf"; f="$TMP/i.ttf"; fi
  "$PY" -m fontTools.subset "$f" --unicodes="$U" --layout-features='kern,liga,calt,tnum,lnum,onum,case,ss01,ss02' --flavor=woff2 --output-file="$OUT/$2"
}
sub 'InstrumentSerif-Regular.ttf' fernwood-serif.woff2
sub 'InstrumentSerif-Italic.ttf' fernwood-serif-italic.woff2
sub 'InstrumentSans[wdth,wght].ttf' fernwood-sans.woff2 'wdth=100 wght=400:600'
sub 'Archivo[wdth,wght].ttf' tallyhawk.woff2 'wdth=62:100 wght=400:900'
sub 'BricolageGrotesque[opsz,wdth,wght].ttf' pagewell.woff2 'opsz=48 wdth=100 wght=400:800'
sub 'Gabarito[wght].ttf' orbitly.woff2
sub 'Newsreader[opsz,wght].ttf' kindred.woff2 'opsz=36 wght=400:600'
sub 'Newsreader-Italic[opsz,wght].ttf' kindred-italic.woff2 'opsz=36 wght=400'
sub 'CormorantGaramond[wght].ttf' hollow.woff2 'wght=500:700'
sub 'CormorantGaramond-Italic[wght].ttf' hollow-italic.woff2 'wght=500'
sub 'Geist[wght].ttf' pingfield-sans.woff2
sub 'GeistMono[wght].ttf' pingfield-mono.woff2
sub 'Manrope[wght].ttf' quietly.woff2
rm -rf "$TMP"
ls -la "$OUT"
