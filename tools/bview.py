#!/usr/bin/env python3
"""Condensed view of a Blade file: drops comments/styles, shortens svgs, optionally shows scripts.
usage: bview.py file [--scripts] [--styles]"""
import re, sys, hashlib
src = open(sys.argv[1], encoding='utf-8').read()
show_scripts = '--scripts' in sys.argv
show_styles = '--styles' in sys.argv
src = re.sub(r'\{\{--.*?--\}\}', '', src, flags=re.S)
src = re.sub(r'<!--.*?-->', '', src, flags=re.S)
if not show_styles:
    src = re.sub(r'<style\b.*?</style>', '<style/>', src, flags=re.S)
if not show_scripts:
    src = re.sub(r'<script\b[^>]*>.*?</script>', '<script/>', src, flags=re.S)
def svg(m):
    s = re.sub(r'\s+', ' ', m.group(0))
    h = hashlib.md5(re.sub(r'\s+', '', s).encode()).hexdigest()[:6]
    w = re.search(r'width="([^"]+)"', s); hh = re.search(r'height="([^"]+)"', s)
    return f'<SVG#{h} {w.group(1) if w else ""}x{hh.group(1) if hh else ""}/>'
src = re.sub(r'<svg\b.*?</svg>', svg, src, flags=re.S)
src = re.sub(r'\n\s*\n+', '\n', src)
src = re.sub(r'[ \t]+', ' ', src)
print(src)
