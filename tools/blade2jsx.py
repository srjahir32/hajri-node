#!/usr/bin/env python3
"""
Blade -> JSX skeleton converter.

usage: blade2jsx.py <file.blade.php> <outdir> [--name Component] [--section content]

Writes into <outdir>:
  <name>.tsx          JSX skeleton of @section('content') (or whole file if no sections)
  <name>.css          concatenated <style> blocks
  <name>.script.js    concatenated <script> blocks + @section('scripts')
  <name>.meta.json    css hrefs linked by the page, <title>
Dynamic Blade bits become  {__B("php expr")}  or  {/* @directive(...) */}  for hand editing.
Static <svg> blocks are deduplicated into web/src/components/icons/registry.json.
"""
import re, sys, json, os, hashlib

ROOT = os.path.dirname(os.path.abspath(__file__))
ICON_REGISTRY = os.path.join(ROOT, '..', 'web', 'src', 'components', 'icons', 'registry.json')
ROUTES = json.load(open(os.path.join(ROOT, 'routes.json')))

VOID = {'img', 'input', 'br', 'hr', 'meta', 'link', 'source', 'col', 'area', 'base', 'embed', 'param', 'track', 'wbr'}
ATTR_MAP = {
    'class': 'className', 'for': 'htmlFor', 'tabindex': 'tabIndex', 'colspan': 'colSpan', 'rowspan': 'rowSpan',
    'maxlength': 'maxLength', 'minlength': 'minLength', 'readonly': 'readOnly', 'autocomplete': 'autoComplete',
    'autofocus': 'autoFocus', 'enctype': 'encType', 'cellpadding': 'cellPadding', 'cellspacing': 'cellSpacing',
    'contenteditable': 'contentEditable', 'crossorigin': 'crossOrigin', 'frameborder': 'frameBorder',
    'allowfullscreen': 'allowFullScreen', 'novalidate': 'noValidate', 'srcset': 'srcSet', 'datetime': 'dateTime',
    'usemap': 'useMap', 'spellcheck': 'spellCheck', 'accept-charset': 'acceptCharset', 'http-equiv': 'httpEquiv',
    'inputmode': 'inputMode', 'playsinline': 'playsInline', 'autoplay': 'autoPlay', 'nowrap': 'noWrap',
    'bgcolor': 'bgColor', 'valign': 'vAlign', 'frameborder': 'frameBorder',
}
SVG_ATTR = {
    'fill-rule': 'fillRule', 'clip-rule': 'clipRule', 'stroke-width': 'strokeWidth', 'stroke-linecap': 'strokeLinecap',
    'stroke-linejoin': 'strokeLinejoin', 'clip-path': 'clipPath', 'stop-color': 'stopColor', 'stop-opacity': 'stopOpacity',
    'fill-opacity': 'fillOpacity', 'stroke-opacity': 'strokeOpacity', 'stroke-miterlimit': 'strokeMiterlimit',
    'stroke-dasharray': 'strokeDasharray', 'stroke-dashoffset': 'strokeDashoffset', 'font-size': 'fontSize',
    'font-family': 'fontFamily', 'font-weight': 'fontWeight', 'text-anchor': 'textAnchor', 'xmlns:xlink': 'xmlnsXlink',
    'xlink:href': 'xlinkHref', 'xml:space': 'xmlSpace', 'enable-background': 'enableBackground', 'color-interpolation-filters': 'colorInterpolationFilters',
    'flood-opacity': 'floodOpacity', 'flood-color': 'floodColor', 'shape-rendering': 'shapeRendering', 'mask-type': 'maskType',
    'stdDeviation': 'stdDeviation', 'dominant-baseline': 'dominantBaseline', 'letter-spacing': 'letterSpacing',
}
BOOL = {'disabled', 'checked', 'required', 'multiple', 'hidden', 'readonly', 'selected', 'autofocus', 'novalidate', 'autoplay', 'controls', 'loop', 'muted', 'open', 'defer', 'async', 'download'}

edir = []  # stored blade expressions / directives
def stash(kind, text):
    edir.append((kind, text))
    return '\x01%s%d\x02' % (kind, len(edir) - 1)

def balanced(s, i):
    """s[i] == '(' -> index after matching ')' (aware of quotes)"""
    depth = 0
    q = None
    j = i
    while j < len(s):
        c = s[j]
        if q:
            if c == '\\': j += 1
            elif c == q: q = None
        else:
            if c in '\'"': q = c
            elif c == '(': depth += 1
            elif c == ')':
                depth -= 1
                if depth == 0: return j + 1
        j += 1
    return len(s)

def esc_comment(t):
    return t.replace('*/', '* /').replace('\n', ' ')

def php_to_js(expr):
    """Best-effort PHP expression -> JS. Unknown helpers remain as identifiers so tsc flags them."""
    e = expr.strip()
    parts = re.split(r"""('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")""", e)
    out = []
    for i, part in enumerate(parts):
        if i % 2 == 1:
            out.append(part)
            continue
        t = part
        t = re.sub(r'\$loop->iteration', '(_i + 1)', t)
        t = re.sub(r'\$loop->index', '_i', t)
        t = re.sub(r'\$loop->first', '(_i === 0)', t)
        t = re.sub(r'\$loop->last', '_last', t)
        t = re.sub(r'\$(\w+)', r'\1', t)
        t = t.replace('?->', '?.').replace('->', '.')
        t = re.sub(r'(?<![\w.])\s\.\s', ' + ', t) if ' . ' in t else t
        t = t.replace(' . ', ' + ')
        t = re.sub(r'\bTRUE\b', 'true', t)
        t = re.sub(r'\bFALSE\b', 'false', t)
        t = re.sub(r'\bNULL\b', 'null', t)
        t = re.sub(r'\band\b', '&&', t)
        t = re.sub(r'\bor\b', '||', t)
        out.append(t)
    return ''.join(out)

def resolve_simple(expr):
    """Translate trivially-resolvable echos (asset/route/url/env/string). returns JS expr or None"""
    e = expr.strip()
    m = re.fullmatch(r"asset\(\s*(['\"])(.+?)\1\s*(?:\.\s*(.+))?\)", e)
    if m:
        p = m.group(2).split('?')[0]
        if '$' in p or m.group(3): return None
        return json.dumps('/' + p.lstrip('/'))
    m = re.fullmatch(r"asset\(\s*(['\"])(.+?)\1\s*\)", e)
    m = re.fullmatch(r"route\(\s*(['\"])([^'\"]+)\1\s*(?:,\s*(.+))?\)", e)
    if m:
        name, arg = m.group(2), m.group(3)
        if name not in ROUTES: return None
        uri = '/' + ROUTES[name][0].lstrip('/')
        params = re.findall(r'\{(\w+)\??\}', uri)
        if not params: return json.dumps(uri)
        if not arg: return None
        arg = arg.strip()
        if arg.startswith('[') : return None
        arg = php_to_js(arg)
        uri = re.sub(r'\{\w+\??\}', '${' + arg + '}', uri, count=1)
        return '`%s`' % uri
    m = re.fullmatch(r"url\(\s*(['\"])(.+?)\1\s*\)", e)
    if m: return json.dumps('/' + m.group(2).lstrip('/'))
    m = re.fullmatch(r"env\(\s*'APP_NAME'\s*\)", e)
    if m: return '"Hajri"'
    m = re.fullmatch(r"config\(\s*'app\.name'\s*\)", e)
    if m: return '"Hajri"'
    return None

# ---------------------------------------------------------------- preprocess
def preprocess(src):
    src = re.sub(r'\{\{--.*?--\}\}', '', src, flags=re.S)
    src = re.sub(r'<!--.*?-->', '', src, flags=re.S)
    return src

def split_sections(src):
    """returns dict name -> text ; plus 'rest'"""
    secs = {}
    def take(m):
        secs[m.group(1)] = secs.get(m.group(1), '') + m.group(2)
        return ''
    # @section('x', 'inline') form not handled (rare)
    src2 = re.sub(r"@section\(\s*'([^']+)'\s*\)(.*?)@(?:endsection|stop|show)", take, src, flags=re.S)
    return secs, src2

def extract_blocks(text, tag):
    blocks = []
    def take(m):
        blocks.append(m.group(1))
        return ''
    text = re.sub(r'<%s\b[^>]*>(.*?)</%s>' % (tag, tag), take, text, flags=re.S)
    return text, blocks

def php_blocks(src):
    def php(m):
        return stash('P', m.group(1))
    src = re.sub(r'@php\b(.*?)@endphp', php, src, flags=re.S)
    src = re.sub(r'<\?php(.*?)\?>', php, src, flags=re.S)
    src = re.sub(r'<\?=(.*?)\?>', lambda m: stash('E', m.group(1)), src, flags=re.S)
    return src

DIRECTIVES = ['if', 'elseif', 'else', 'endif', 'foreach', 'endforeach', 'forelse', 'empty', 'endforelse', 'for', 'endfor',
              'while', 'endwhile', 'can', 'endcan', 'canany', 'endcanany', 'cannot', 'endcannot', 'auth', 'endauth', 'guest', 'endguest',
              'isset', 'endisset', 'unless', 'endunless', 'switch', 'case', 'break', 'default', 'endswitch', 'csrf', 'method', 'error', 'enderror',
              'json', 'class', 'checked', 'selected', 'disabled', 'include', 'includeIf', 'continue', 'once', 'endonce', 'production', 'endproduction', 'env', 'endenv']

def stash_blade(src):
    out = []
    i = 0
    n = len(src)
    while i < n:
        if src.startswith('{{', i):
            j = src.find('}}', i)
            out.append(stash('E', src[i + 2:j]))
            i = j + 2
            continue
        if src.startswith('{!!', i):
            j = src.find('!!}', i)
            out.append(stash('R', src[i + 3:j]))
            i = j + 3
            continue
        if src[i] == '@' and (i == 0 or not (src[i - 1].isalnum() or src[i - 1] in '._-@')):
            m = re.match(r'@(\w+)', src[i:])
            if m and m.group(1) in DIRECTIVES:
                name = m.group(1)
                j = i + m.end()
                k = j
                while k < n and src[k] in ' \t': k += 1
                if k < n and src[k] == '(':
                    e = balanced(src, k)
                    out.append(stash('D', '@%s%s' % (name, src[k:e])))
                    i = e
                else:
                    if name == 'csrf':
                        i = j
                        continue
                    out.append(stash('D', '@' + name))
                    i = j
                continue
        out.append(src[i])
        i += 1
    return ''.join(out)

TOKEN = re.compile(r'\x01([EDRP])(\d+)\x02')

def tokens_in(s):
    return TOKEN.findall(s)

def expr_js(kind, idx):
    k, t = edir[int(idx)]
    r = resolve_simple(t)
    if r is not None: return r, True
    return '(%s)' % php_to_js(t), False

# ---------------------------------------------------------------- JSX tag conversion
def style_to_obj(val):
    """css string (may contain stash tokens) -> JSX object text"""
    props = []
    # split on ; not inside tokens
    parts = [p for p in re.split(r';(?![^\x01]*\x02)', val) if p.strip()]
    for p in parts:
        if ':' not in p: continue
        k, v = p.split(':', 1)
        k = k.strip(); v = v.strip()
        if not k: continue
        if k.startswith('--'):
            key = json.dumps(k)
        else:
            key = re.sub(r'-(\w)', lambda m: m.group(1).upper(), k)
            if key.startswith('Ms'): key = 'ms' + key[2:]
        important = False
        if v.endswith('!important'):
            v = v[:-10].strip()
        props.append('%s: %s' % (key, str_value(v)))
    if any(pp.startswith('"--') for pp in props):
        return '{{ %s } as import(\'react\').CSSProperties}' % ', '.join(props)
    return '{{ %s }}' % ', '.join(props)

def str_value(v):
    """string with tokens -> JS expr"""
    if not tokens_in(v):
        return json.dumps(v)
    pieces = []
    last = 0
    for m in TOKEN.finditer(v):
        if m.start() > last: pieces.append(json.dumps(v[last:m.start()]))
        js, _ = expr_js(m.group(1), m.group(2))
        pieces.append('(%s)' % js)
        last = m.end()
    if last < len(v): pieces.append(json.dumps(v[last:]))
    if len(pieces) == 1 and v.startswith('\x01'):
        return pieces[0][1:-1] if pieces[0].startswith('(') else pieces[0]
    return ' + '.join(pieces)

def convert_attrs(tag, attrstr, in_svg):
    out = []
    pos = 0
    s = attrstr
    # tokenizer for attributes; stash tokens (directives) may sit in attribute position
    pat = re.compile(r'\s*(?:(\x01[DEPR]\d+\x02)|([^\s=/>"\']+)(?:\s*=\s*(?:"([^"]*)"|\'([^\']*)\'|([^\s"\'>]+)))?)', re.S)
    while pos < len(s):
        m = pat.match(s, pos)
        if not m or m.end() == pos:
            pos += 1
            continue
        pos = m.end()
        if m.group(1):
            k, idx = TOKEN.match(m.group(1)).groups()
            kind, text = edir[int(idx)]
            if kind == 'E' or kind == 'R':
                out.append('/* attrs: {{ %s }} */' % esc_comment(text))
            else:
                out.append('/* %s */' % esc_comment(text))
            continue
        name = m.group(2)
        if name is None: continue
        val = m.group(3) if m.group(3) is not None else (m.group(4) if m.group(4) is not None else m.group(5))
        lname = name.lower()
        if lname.startswith('on') and lname != 'one':
            out.append('/* %s=%s */' % (lname, esc_comment(val or '')))
            continue
        if lname == 'style' and val is not None:
            out.append('style=%s' % style_to_obj(val))
            continue
        jname = ATTR_MAP.get(lname, name)
        if in_svg or tag == 'svg':
            jname = SVG_ATTR.get(name, re.sub(r'-(\w)', lambda mm: mm.group(1).upper(), name) if name.startswith(('stroke-', 'fill-', 'clip-', 'font-', 'stop-', 'text-', 'flood-', 'color-')) else name)
            if name == 'class': jname = 'className'
        if tag in ('input', 'textarea', 'select') and lname == 'value': jname = 'defaultValue'
        if lname == 'checked' and tag == 'input': jname = 'defaultChecked'
        if lname == 'selected' and tag == 'option':
            if club_stack and club_stack[-1]:
                out.append('selected')
            else:
                out.append('/* selected */')
            continue
        if val is None:
            if lname in BOOL or True:
                out.append(jname)
            continue
        if lname == 'href' and val.strip().lower().startswith('javascript:'):
            out.append('href="#"')
            continue
        if tokens_in(val):
            out.append('%s={%s}' % (jname, str_value(val)))
        else:
            if jname in ('tabIndex', 'colSpan', 'rowSpan', 'maxLength', 'minLength', 'rows', 'cols', 'span') and re.fullmatch(r'-?\d+', val.strip()):
                out.append('%s={%s}' % (jname, val.strip()))
            elif '"' in val:
                out.append('%s={%s}' % (jname, json.dumps(val)))
            elif '{' in val or '\\' in val:
                out.append('%s={%s}' % (jname, json.dumps(val)))
            else:
                out.append('%s="%s"' % (jname, val))
    return ' '.join(out)

TAG = re.compile(r'<(/?)([A-Za-z][\w:-]*)((?:[^>"\']|"[^"]*"|\'[^\']*\')*?)(/?)>', re.S)

# ---- segments: ('s', text) literal JSX  |  ('d', name, args, depth) blade directive between tags
club_stack = []
uses_club = [False]

def convert_html(src):
    segs = []
    depth = [0]
    pos = 0
    svg_depth = 0
    for m in TAG.finditer(src):
        convert_text(src[pos:m.start()], segs, depth[0])
        pos = m.end()
        closing, tag, attrs, selfc = m.groups()
        ltag = tag.lower()
        if ltag == 'row': tag = ltag = 'div'
        if ltag == 'select' and not closing and re.search(r'select-club-services', attrs):
            tag = 'SelectClub'; ltag = 'select'; club_stack.append(True); uses_club[0] = True
        elif ltag == 'select' and not closing:
            club_stack.append(False)
        elif ltag == 'select' and closing:
            if club_stack and club_stack.pop(): tag = 'SelectClub'
        if closing:
            if ltag in VOID: continue
            segs.append(('s', '</%s>' % tag))
            depth[0] -= 1
            if ltag == 'svg': svg_depth -= 1
            continue
        if ltag == 'svg': svg_depth += 1
        a = convert_attrs(ltag if ltag in ('input', 'textarea', 'select', 'option', 'svg') else ltag, attrs, svg_depth > 0)
        a = (' ' + a) if a else ''
        if ltag in VOID or selfc:
            segs.append(('s', '<%s%s />' % (tag if ltag not in VOID else ltag, a)))
            if ltag == 'svg' and selfc: svg_depth -= 1
        else:
            segs.append(('s', '<%s%s>' % (tag, a)))
            depth[0] += 1
    convert_text(src[pos:], segs, depth[0])
    return segs

def convert_text(t, segs, depth):
    """Text between tags. JSX drops whitespace that contains a newline next to an expression, HTML keeps one space -> restore it."""
    if not t: return
    last = 0
    ms = list(TOKEN.finditer(t))
    for k, m in enumerate(ms):
        piece = t[last:m.start()]
        kind = m.group(1)
        if kind in ('E', 'R'):
            if piece.strip() and re.search(r'\n\s*$', piece):
                piece = piece.rstrip() + '\x03'
            elif not piece.strip() and '\n' in piece and k > 0 and ms[k - 1].group(1) in ('E', 'R'):
                piece = '\x03'
            if k > 0 and ms[k - 1].group(1) in ('E', 'R') and piece.strip() and re.match(r'\s*\n', piece):
                piece = '\x03' + piece.lstrip()
        segs.append(('s', plain_text(piece)))
        idx = m.group(2)
        kd, txt = edir[int(idx)]
        if kind in ('E', 'R'):
            js, _ = expr_js(kind, idx)
            segs.append(('s', '{%s}' % js))
        elif kind == 'P':
            segs.append(('s', '{/* @php %s */}' % esc_comment(txt)))
        else:
            m2 = re.match(r'@(\w+)\s*(.*)$', txt.strip(), re.S)
            name = m2.group(1)
            args = m2.group(2).strip()
            if args.startswith('(') and args.endswith(')'): args = args[1:-1]
            segs.append(('d', name, args, depth))
        last = m.end()
    tail = t[last:]
    if ms and ms[-1].group(1) in ('E', 'R') and tail.strip() and re.match(r'\s*\n', tail):
        tail = '\x03' + tail.lstrip()
    segs.append(('s', plain_text(tail)))

def plain_text(t):
    t = t.replace('{', '{"{"}').replace('}', '{"}"}')
    t = t.replace('&nbsp;', '\u00a0')
    return t.replace('\x03', '{" "}')

# ---- directive structure -> JSX
OPEN_FOR = {'empty': 'endempty', 'if': 'endif', 'foreach': 'endforeach', 'forelse': 'endforelse', 'can': 'endcan', 'canany': 'endcanany', 'cannot': 'endcannot',
            'isset': 'endisset', 'unless': 'endunless', 'for': 'endfor', 'auth': 'endauth', 'guest': 'endguest', 'while': 'endwhile'}
OPENERS = set(OPEN_FOR)
loop_counter = [0]

ENDS = set(OPEN_FOR.values()) | {'endempty'}

def is_opener(sg):
    return sg[0] == 'd' and (sg[1] in OPENERS or (sg[1] == 'empty' and sg[2]))

def find_construct(segs, i):
    """returns (end_index, [(index,name,args)...branch markers]) if balanced at same depth else None"""
    name = segs[i][1]
    d = segs[i][3]
    stack = 0
    marks = []
    j = i + 1
    while j < len(segs):
        sg = segs[j]
        if sg[0] == 'd':
            n = sg[1]
            if is_opener(sg):
                stack += 1
            elif n in ENDS:
                if stack == 0:
                    if n != OPEN_FOR[name] or sg[3] != d: return None
                    return j, marks
                stack -= 1
            elif stack == 0 and n in ('else', 'elseif', 'empty'):
                if sg[3] != d: return None
                marks.append((j, n, sg[2]))
        j += 1
    return None

def cond_js(name, args):
    a = php_to_js(args) if args else ''
    if name == 'if' or name == 'elseif': return a
    if name == 'unless': return '!(%s)' % a
    if name == 'isset': return '(%s) != null' % a
    if name == 'can': return 'can(%s)' % a
    if name == 'cannot': return '!can(%s)' % a
    if name == 'canany': return 'can(...%s)' % a
    if name == 'auth': return 'true /* @auth */'
    if name == 'guest': return 'false /* @guest */'
    return a

def foreach_js(args):
    m = re.match(r'(.+?)\s+as\s+\$(\w+)(?:\s*=>\s*\$(\w+))?\s*$', args.strip(), re.S)
    if not m: return None
    arr, a, b = m.group(1), m.group(2), m.group(3)
    arr = php_to_js(arr)
    loop_counter[0] += 1
    n = loop_counter[0]
    if b: return arr, '[%s, %s]' % (a, b), n  # key => value
    return arr, a, n

def render(segs, i, j):
    """render segs[i:j) into a JSX string"""
    out = []
    while i < j:
        sg = segs[i]
        if sg[0] == 's':
            out.append(sg[1]); i += 1; continue
        _, name, args, d = sg
        if is_opener(sg):
            fc = find_construct(segs, i)
            if fc:
                end, marks = fc
                out.append(render_construct(segs, i, end, marks))
                i = end + 1
                continue
        out.append('{/* @%s%s */}' % (name, ('(' + esc_comment(args) + ')') if args else ''))
        i += 1
    return ''.join(out)

def frag(body):
    return '(<>%s</>)' % body

def render_construct(segs, i, end, marks):
    _, name, args, d = segs[i]
    if name in ('foreach', 'forelse'):
        fe = foreach_js(args)
        if not fe:
            return '{/* @%s(%s) unsupported */}' % (name, esc_comment(args))
        arr, v, n = fe
        empty_at = next((m for m in marks if m[1] == 'empty'), None)
        body_end = empty_at[0] if empty_at else end
        body = render(segs, i + 1, body_end)
        idx = '_i%d' % n
        if v.startswith('['):
            a, b = v[1:-1].split(', ')
            # PHP `$k => $v`: a = key, b = value; Object.entries yields [key, value]
            mapper = 'Object.entries(%s ?? {}).map(([%s, %s], %s) => (<Fragment key={%s}>%s</Fragment>))' % (arr, a, b, idx, idx, body)
        else:
            mapper = '(%s ?? []).map((%s, %s) => (<Fragment key={%s}>%s</Fragment>))' % (arr, v, idx, idx, body)
        mapper = mapper.replace('_i,', idx + ',').replace('(_i + 1)', '(%s + 1)' % idx).replace('(_i === 0)', '(%s === 0)' % idx)
        if empty_at:
            ebody = render(segs, empty_at[0] + 1, end)
            return '{count(%s) > 0 ? (<>{%s}</>) : %s}' % (arr, mapper, frag(ebody))
        return '{%s}' % mapper
    if name == 'for':
        m = re.match(r'\$(\w+)\s*=\s*(\S+?)\s*;\s*\$\1\s*(<=|<)\s*(.+?)\s*;\s*\$\1\+\+$', args.strip())
        if not m: return '{/* @for(%s) unsupported */}' % esc_comment(args)
        var, start, op, lim = m.groups()
        lim = php_to_js(lim)
        if op == '<=': lim = '(%s) - (%s) + 1' % (lim, start)
        else: lim = '(%s) - (%s)' % (lim, start)
        body = render(segs, i + 1, end)
        return '{Array.from({ length: %s }).map((_, _k) => { const %s = (%s) + _k; return (<Fragment key={_k}>%s</Fragment>); })}' % (lim, var, start, body)
    if name == 'while':
        return '{/* @while(%s) unsupported */}' % esc_comment(args)
    # conditionals
    branches = []
    cur_name, cur_args, cur_start = name, args, i + 1
    for (j, n, a) in marks:
        branches.append((cur_name, cur_args, render(segs, cur_start, j)))
        cur_name, cur_args, cur_start = n, a, j + 1
    branches.append((cur_name, cur_args, render(segs, cur_start, end)))
    expr = ''
    tail = 'null'
    parts = []
    for (n, a, b) in branches:
        if n == 'else':
            tail = frag(b)
        else:
            parts.append((cond_js(n, a), frag(b)))
    if not parts: return '{%s}' % tail
    s = ''
    for c, b in parts:
        s += '(%s) ? %s : ' % (c, b)
    s += tail
    if tail == 'null' and len(parts) == 1:
        return '{(%s) && %s}' % (parts[0][0], parts[0][1])
    return '{%s}' % s

# ---------------------------------------------------------------- svg registry
def load_registry():
    try: return json.load(open(ICON_REGISTRY))
    except Exception: return {}

def register_svgs(jsx, reg):
    def repl(m):
        block = m.group(0)
        if '{(' in block or '={`' in block or '/* @' in block or '/* attrs' in block:
            return block
        norm = re.sub(r'\s+', ' ', block).strip()
        h = hashlib.md5(norm.encode()).hexdigest()[:6]
        reg.setdefault(h, norm)
        return '<I.I%s />' % h
    return re.sub(r'<svg\b.*?</svg>', repl, jsx, flags=re.S)

# ---------------------------------------------------------------- main
def main():
    args = sys.argv[1:]
    path, outdir = args[0], args[1]
    name = None
    if '--name' in args: name = args[args.index('--name') + 1]
    sect = 'content'
    if '--section' in args: sect = args[args.index('--section') + 1]
    name = name or os.path.basename(path).replace('.blade.php', '')
    os.makedirs(outdir, exist_ok=True)
    src = preprocess(open(path, encoding='utf-8').read())
    secs, rest = split_sections(src)
    body = secs.get(sect, rest)
    title_sec = secs.get('title', '')
    if sect not in secs and re.search(r'<body\b', rest):
        hm = re.search(r'<head\b[^>]*>(.*?)</head>', rest, re.S)
        title_sec = hm.group(1) if hm else ''
        bm = re.search(r'<body\b[^>]*>(.*?)</body>', rest, re.S)
        body = bm.group(1) if bm else rest
    meta = {'css': [], 'title': None, 'js': []}
    for m in re.finditer(r'<link[^>]*href="([^"]+)"', title_sec):
        h = m.group(1)
        mm = re.search(r"asset\('([^']+?)(?:\?[^']*)?'", h)
        meta['css'].append(mm.group(1) if mm else h)
    t = re.search(r'<title>(.*?)</title>', title_sec, re.S)
    meta['title'] = t.group(1).strip() if t else None
    for m in re.finditer(r'<script[^>]*src="([^"]+)"', src):
        meta['js'].append(m.group(1))
    # styles anywhere in the file (title section included)
    css_blocks = []
    for blk in (title_sec, body):
        _, b = extract_blocks(blk, 'style')
        css_blocks += b
    body, _ = extract_blocks(body, 'style')
    # scripts
    js_blocks = []
    body, b = extract_blocks(body, 'script'); js_blocks += b
    scripts_sec = secs.get('scripts', '')
    _, b = extract_blocks(scripts_sec, 'script'); js_blocks += b
    js_blocks.append('\n/* ---- raw @section(scripts) remainder ---- */\n' + re.sub(r'<script\b.*?</script>', '', scripts_sec, flags=re.S))
    body = php_blocks(body)
    body = stash_blade(body)
    segs = convert_html(body)
    jsx = render(segs, 0, len(segs))
    reg = load_registry()
    jsx = register_svgs(jsx, reg)
    os.makedirs(os.path.dirname(os.path.abspath(ICON_REGISTRY)), exist_ok=True)
    json.dump(reg, open(ICON_REGISTRY, 'w'), indent=0)
    comp = 'Body'
    club_imp = "import { SelectClub } from '@/components/ui/SelectClub';\n" if uses_club[0] else ''
    tsx = "'use client';\n\nimport { Fragment } from 'react';\nimport * as I from '@/components/icons';\nimport { count } from '@/lib/blade';\n" + club_imp + "\nexport default function %s() {\n  return (\n    <>\n%s\n    </>\n  );\n}\n" % (comp, jsx)
    open(os.path.join(outdir, name + '.tsx'), 'w').write(tsx)
    if css_blocks: open(os.path.join(outdir, name + '.css'), 'w').write('\n'.join(css_blocks))
    open(os.path.join(outdir, name + '.script.js'), 'w').write('\n'.join(js_blocks))
    json.dump(meta, open(os.path.join(outdir, name + '.meta.json'), 'w'), indent=1)
    left = len(re.findall(r'/\* @(?!php)', jsx))
    print('%s: %d bytes jsx, %d leftover directives, %d svgs registered total, css=%s' % (name, len(jsx), left, len(reg), bool(css_blocks)))

main()
