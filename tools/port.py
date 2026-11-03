#!/usr/bin/env python3
"""
port.py <blade file> <route dir under web/src/app/(group)> "<Page title>" [--group admin|employee|super|adminauth]
Runs blade2jsx, drops the result into the route as Body.tsx + page.tsx, extracts page CSS into src/styles,
and keeps the original script in tools/out/<route>/ for reading.
The generated page.tsx wraps Body in the portal's shell: AdminPage (admin), StaffPage (employee), SuperPage (super);
`adminauth` pages (login screens) get a bare page with no shell.
"""
import sys, os, json, re, subprocess, shutil
ROOT = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.join(ROOT, '..', 'web', 'src')
args = sys.argv[1:]
blade, route, title = args[0], args[1], args[2]
if title == '-':
    title = None
group = 'admin'
TITLES = json.load(open(os.path.join(ROOT, 'view_titles.json')))


def auto_title(path):
    m = re.search(r'Modules/(\w+)/Resources/views/(.+)\.blade\.php', path)
    if m:
        key = '%s::%s' % (m.group(1).lower(), m.group(2).replace('/', '.'))
    else:
        m = re.search(r'resources/views/(.+)\.blade\.php', path)
        key = m.group(1).replace('/', '.') if m else ''
    return (TITLES.get(key) or {}).get('title')


if '--group' in args:
    group = args[args.index('--group') + 1]
if not title:
    title = auto_title(blade) or 'Hajri'
print('title:', title)
tmp = os.path.join('/tmp', 'port_' + re.sub(r'\W+', '_', route))
shutil.rmtree(tmp, ignore_errors=True)
subprocess.check_call([sys.executable, os.path.join(ROOT, 'blade2jsx.py'), blade, tmp, '--name', 'Body'])
dest = os.path.join(WEB, 'app', '(%s)' % group, route)
os.makedirs(dest, exist_ok=True)
slug = re.sub(r'[^a-z0-9]+', '-', route.lower()).strip('-')
tsx = open(os.path.join(tmp, 'Body.tsx')).read()
meta = json.load(open(os.path.join(tmp, 'Body.meta.json')))
page_css = []
if os.path.exists(os.path.join(tmp, 'Body.css')):
    # served from public/ and loaded by the page shell (components/shell/PageMeta) so it is removed again on client-side navigation
    pg = os.path.join(WEB, '..', 'public', 'assets', 'admin', 'css', 'pg')
    os.makedirs(pg, exist_ok=True)
    shutil.copy(os.path.join(tmp, 'Body.css'), os.path.join(pg, slug + '.css'))
    page_css.append('pg/%s.css' % slug)
open(os.path.join(dest, 'Body.tsx'), 'w').write(tsx)
out = os.path.join(ROOT, 'out', slug)
os.makedirs(out, exist_ok=True)
shutil.copy(os.path.join(tmp, 'Body.script.js'), os.path.join(out, 'script.js'))
css = [c for c in meta['css']]
css_arr = ', '.join(json.dumps(c.replace('assets/admin/css/', '')) for c in css + page_css)
page = os.path.join(dest, 'page.tsx')
SHELL = {'employee': 'StaffPage', 'super': 'SuperPage', 'admin': 'AdminPage'}.get(group)
if not os.path.exists(page):
    if SHELL:
        open(page, 'w').write("""'use client';

import %s from '@/components/shell/%s';
import Body from './Body';

export default function Page() {
  return (
    <%s title=%s css={[%s]}>
      <Body />
    </%s>
  );
}
""" % (SHELL, SHELL, SHELL, json.dumps(title), css_arr, SHELL))
    else:
        open(page, 'w').write("""'use client';

import Body from './Body';

export default function Page() {
  return <Body />;
}
""")
subprocess.check_call([sys.executable, os.path.join(ROOT, 'genicons.py')])
print('->', dest, '| css:', css, '| script bytes:', os.path.getsize(os.path.join(out, 'script.js')))
