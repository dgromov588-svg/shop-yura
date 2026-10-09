#!/usr/bin/env node
/**
 * ============================================================
 *  АВТОНАЛАШТУВАННЯ ДЕПЛОЮ · Скупка антикваріату Дніпро
 * ============================================================
 *  Запуск:  npm run build && node scripts/prepare-deploy.mjs
 *
 *  Що робить:
 *   1. Перевіряє наявність dist/index.html
 *   2. Створює 404.html (копія index.html) для SPA-фолбеку
 *   3. Виправляє абсолютні шляхи -> відносні (робота у підпапках)
 *   4. Додає <base> та мета-теги, якщо їх немає
 *   5. Підставляє справжню адресу сайту в robots/sitemap/manifest
 *   6. Створює архів deploy.zip для ручного завантаження на хостинг
 *   7. Виводить підсумок та інструкцію
 */

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DIST = path.join(ROOT, 'dist')

const args = process.argv.slice(2)
const getArg = (name, fallback = null) => {
  const i = args.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`))
  if (i === -1) return fallback
  const inline = args[i].includes('=')
    ? args[i].split('=').slice(1).join('=')
    : args[i + 1]
  return inline && !inline.startsWith('--') ? inline : fallback
}

const SITE_URL = (getArg('url') || process.env.DEPLOY_URL || '')
  .replace(/\/+$/, '')
const MAKE_ZIP = !args.includes('--no-zip')
const BASE = getArg('base', './')

const log = (m) => console.log(`\x1b[36m▸\x1b[0m ${m}`)
const ok = (m) => console.log(`\x1b[32m✓\x1b[0m ${m}`)
const warn = (m) => console.log(`\x1b[33m!\x1b[0m ${m}`)
const err = (m) => console.log(`\x1b[31m✗\x1b[0m ${m}`)

console.log('\n\x1b[1m━━━ Підготовка до деплою ━━━\x1b[0m\n')

// ---------- 1. Перевірка збірки ----------
if (!fs.existsSync(DIST)) {
  err('Папку dist/ не знайдено. Спочатку виконайте: npm run build')
  process.exit(1)
}
const indexPath = path.join(DIST, 'index.html')
if (!fs.existsSync(indexPath)) {
  err('dist/index.html відсутній — збірка неповна.')
  process.exit(1)
}
ok(`Збірку знайдено: dist/ (${fs.readdirSync(DIST).length} файлів)`)

// ---------- 2. Читаємо index.html ----------
let html = fs.readFileSync(indexPath, 'utf8')
const sizeBefore = Buffer.byteLength(html, 'utf8')
log(`Прочитано index.html (${(sizeBefore / 1024).toFixed(1)} KB)`)

// ---------- 3. Абсолютні шляхи -> відносні ----------
let rewritten = 0
html = html.replace(/(src|href)=["'](\/(?!\/)[^"']*)["']/g, (m, attr, abs) => {
  rewritten++
  return `${attr}="./${abs.slice(1)}"`
})
if (rewritten) ok(`Виправлено ${rewritten} абсолютних шляхів -> відносні`)
else ok('Абсолютних шляхів не знайдено (уже відносні)')

// ---------- 4. <base href> ----------
if (!/<base\s/i.test(html)) {
  html = html.replace(/<head([^>]*)>/i, `<head$1>\n    <base href="${BASE}">`)
  ok(`Додано <base href="${BASE}">`)
}

// ---------- 5. PWA / мета-теги ----------
const metaChecks = [
  { test: /rel=["']manifest["']/i, tag: `  <link rel="manifest" href="./site.webmanifest">` },
  { test: /rel=["']icon["']/i, tag: `  <link rel="icon" type="image/svg+xml" href="./favicon.svg">` },
  {
    test: /name=["']theme-color["']/i,
    tag: `  <meta name="theme-color" content="#d97706">`,
  },
  {
    test: /name=["']viewport["']/i,
    tag: `  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">`,
  },
  {
    test: /property=["']og:title["']/i,
    tag: `  <meta property="og:title" content="Скупка антикваріату в Дніпрі — Юрій">`,
  },
  {
    test: /property=["']og:image["']/i,
    tag: `  <meta property="og:image" content="./hero-bg.jpg">`,
  },
]
let addedMeta = 0
for (const { test, tag } of metaChecks) {
  if (!test.test(html)) {
    html = html.replace(/<\/head>/i, `${tag}\n  </head>`)
    addedMeta++
  }
}
if (addedMeta) ok(`Додано ${addedMeta} відсутніх мета-тегів`)
else ok('Усі мета-теги на місці')

// ---------- 6. Service Worker реєстрація ----------
if (!/serviceWorker\.register/.test(html)) {
  const swSnippet = `
  <script>
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('./sw.js').catch(function () {});
      });
    }
  </script>`
  html = html.replace(/<\/body>/i, `${swSnippet}\n</body>`)
  ok('Додано реєстрацію Service Worker (PWA / офлайн)')
}

fs.writeFileSync(indexPath, html, 'utf8')
ok(
  `index.html оновлено (${(Buffer.byteLength(html, 'utf8') / 1024).toFixed(1)} KB)`,
)

// ---------- 7. 404.html ----------
fs.writeFileSync(path.join(DIST, '404.html'), html, 'utf8')
ok('Створено 404.html (SPA-фолбек для GitHub Pages / Nginx)')

// ---------- 8. Service Worker файл ----------
const sw = `/* Автозгенеровано prepare-deploy.mjs */
const CACHE = 'antique-v1'
const ASSETS = ['./', './index.html', './favicon.svg', './site.webmanifest']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== location.origin) return
  // API адмінки — завжди з сервера, ніколи з кешу
  if (url.pathname.endsWith('.php')) return

  // HTML — мережа в пріоритеті, з офлайн-фолбеком
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('./index.html', copy))
          return res
        })
        .catch(() => caches.match('./index.html'))
    )
    return
  }

  // Інше — кеш в пріоритеті
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        })
    )
  )
})
`
fs.writeFileSync(path.join(DIST, 'sw.js'), sw, 'utf8')
ok('Створено sw.js (офлайн-режим)')

// ---------- 9. Оновлення robots / sitemap / manifest з реальною URL ----------
if (SITE_URL) {
  const files = [
    { p: path.join(DIST, 'robots.txt'), from: 'https://antique-dnipro.example', to: SITE_URL },
    { p: path.join(DIST, 'sitemap.xml'), from: 'https://antique-dnipro.example', to: SITE_URL },
    { p: path.join(DIST, 'site.webmanifest'), from: './', to: SITE_URL + '/' },
  ]
  for (const f of files) {
    if (fs.existsSync(f.p)) {
      const c = fs.readFileSync(f.p, 'utf8').split(f.from).join(f.to)
      fs.writeFileSync(f.p, c, 'utf8')
    }
  }
  // canonical + og:url
  html = fs.readFileSync(indexPath, 'utf8')
  if (!/rel=["']canonical["']/i.test(html)) {
    html = html.replace(
      /<\/head>/i,
      `  <link rel="canonical" href="${SITE_URL}/">\n  <meta property="og:url" content="${SITE_URL}/">\n  </head>`,
    )
    fs.writeFileSync(indexPath, html, 'utf8')
    fs.writeFileSync(path.join(DIST, '404.html'), html, 'utf8')
  }
  ok(`Адресу сайту підставлено: ${SITE_URL}`)
} else {
  warn('URL не вказано — використовується відносна адресація (працює на будь-якому домені)')
}

// ---------- 9б. Приймач оновлень з телефону (deploy-hook.php) ----------
{
  const hookPath = path.join(DIST, 'deploy-hook.php')
  if (fs.existsSync(hookPath)) {
    const secret = process.env.DEPLOY_HOOK_SECRET || ''
    if (secret.length >= 16) {
      const sha = crypto.createHash('sha256').update(secret).digest('hex')
      const php = fs.readFileSync(hookPath, 'utf8').replace('__DEPLOY_SECRET_SHA256__', sha)
      fs.writeFileSync(hookPath, php, 'utf8')
      ok('deploy-hook.php налаштовано (заливка з телефону через GitHub)')
    } else {
      fs.unlinkSync(hookPath)
      warn('DEPLOY_HOOK_SECRET не задано (мін. 16 символів) — deploy-hook.php не додано')
    }
  }
}

// ---------- 10. .well-known / безпека ----------
fs.writeFileSync(
  path.join(DIST, 'security.txt'),
  `Contact: mailto:yuriy.antique.dnipro@gmail.com\nExpires: 2027-01-01T00:00:00Z\n`,
  'utf8',
)
ok('Додано security.txt')

// ---------- 11. ZIP-архів ----------
if (MAKE_ZIP) {
  try {
    const { execSync } = await import('node:child_process')
    const zipName = 'deploy.zip'
    const zipPath = path.join(ROOT, zipName)
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath)

    const isWin = process.platform === 'win32'
    if (isWin) {
      execSync(
        `powershell -NoProfile -Command "Compress-Archive -Path 'dist/*' -DestinationPath 'deploy.zip' -Force"`,
        { cwd: ROOT, stdio: 'ignore' },
      )
    } else {
      execSync(`cd dist && zip -r ../deploy.zip . -x '.*'`, { cwd: ROOT, stdio: 'ignore' })
    }
    const kb = (fs.statSync(zipPath).size / 1024).toFixed(0)
    ok(`Створено deploy.zip (${kb} KB) — завантажте вміст у public_html`)
  } catch {
    warn('Не вдалося створити архів (немає zip/powershell). Завантажуйте папку dist/ вручну.')
  }
}

// ---------- 12. Підсумок ----------
const files = fs.readdirSync(DIST)
const totalSize = files.reduce((acc, f) => {
  const s = fs.statSync(path.join(DIST, f))
  return acc + (s.isFile() ? s.size : 0)
}, 0)

console.log('\n\x1b[1m━━━ Готово до завантаження ━━━\x1b[0m\n')
console.log('  Вміст dist/:')
for (const f of files.sort()) {
  const s = fs.statSync(path.join(DIST, f))
  const kb = s.isFile() ? `  ${(s.size / 1024).toFixed(0).padStart(6)} KB` : '    <dir>  '
  console.log(`    ${kb}  ${f}`)
}
console.log(`\n  Загальний розмір: ${(totalSize / 1024 / 1024).toFixed(2)} MB`)
console.log(`  Файлів: ${files.length}`)

console.log(`
  Це допоміжна програма — окремо її запускати не потрібно.
  Щоб залити сайт, двічі клацніть \x1b[1m2-ЗАЛИТИ-САЙТ.bat\x1b[0m (див. ІНСТРУКЦІЯ.md).
`)
