const fs = require('fs');
const path = require('path');

const root = 'assets/vendor/codemirror';
const files = {
  css: 'codemirror.min.css',
  theme: 'theme/material-darker.min.css',
  core: 'codemirror.min.js',
  python: 'mode/python/python.min.js',
  javascript: 'mode/javascript/javascript.min.js',
  matchbrackets: 'addon/edit/matchbrackets.min.js',
  closebrackets: 'addon/edit/closebrackets.min.js',
  searchcursor: 'addon/search/searchcursor.min.js',
};

const lines = [
  '/** Auto-generated base64 CodeMirror embeds (offline). */',
  'function decodeB64(b64: string): string {',
  "  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';",
  '  let str = \"\";',
  '  let buf = 0;',
  '  let bits = 0;',
  '  for (let i = 0; i < b64.length; i++) {',
  '    const c = b64.charAt(i);',
  "    if (c === '=') break;",
  '    const v = chars.indexOf(c);',
  '    if (v < 0) continue;',
  '    buf = (buf << 6) | v;',
  '    bits += 6;',
  '    if (bits >= 8) {',
  '      bits -= 8;',
  '      str += String.fromCharCode((buf >> bits) & 0xff);',
  '    }',
  '  }',
  '  try {',
  '    return decodeURIComponent(escape(str));',
  '  } catch {',
  '    return str;',
  '  }',
  '}',
  '',
];

for (const [k, rel] of Object.entries(files)) {
  const raw = fs.readFileSync(path.join(root, rel));
  const b64 = raw.toString('base64');
  const key = k.toUpperCase();
  lines.push(`const _${key}_B64 = ${JSON.stringify(b64)};`);
  lines.push(`export const CM_${key} = decodeB64(_${key}_B64);`);
  lines.push('');
}

fs.mkdirSync('src/vendor', { recursive: true });
fs.writeFileSync('src/vendor/codemirrorEmbedded.ts', lines.join('\n'));
console.log('wrote', path.resolve('src/vendor/codemirrorEmbedded.ts'));
