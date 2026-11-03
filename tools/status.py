#!/usr/bin/env python3
"""Port progress: Laravel GET page routes (tools/routes.json) vs pages that exist under web/src/app.
usage: status.py [--todo]   (--todo hides finished pages and legacy non-_new duplicates)"""
import json, os, re, sys
ROOT = os.path.dirname(os.path.abspath(__file__))
routes = json.load(open(os.path.join(ROOT, 'routes.json')))
web = os.path.join(ROOT, '..', 'web', 'src', 'app')
have = set()
for root, _, files in os.walk(web):
    if 'page.tsx' in files:
        parts = [p for p in os.path.relpath(root, web).split('/') if not (p.startswith('(') and p.endswith(')'))]
        have.add(re.sub(r'\[(\w+)\]', r'{\1}', '/'.join(parts)))
SKIP = ('api/', '_ignition', 'sanctum', 'oauth', 'storage')
rows = []
for name, (uri, methods) in routes.items():
    if 'GET' not in methods or uri.startswith(SKIP) or re.search(r'export|excel|logout|read|callback|cancel|pdf', uri):
        continue
    rows.append((uri, uri in have))
done = sum(1 for _, h in rows if h)
for uri, h in sorted(rows):
    if '--todo' in sys.argv and h:
        continue
    print(('OK ' if h else '-- ') + uri)
print(f'\n{done}/{len(rows)} page routes ported')
