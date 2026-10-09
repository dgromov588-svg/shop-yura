#!/usr/bin/env node
/**
 * ==================================================================
 *  САЛОН «АнтикварЪ» — ЗБІРКА І ЗАЛИВКА НА CITYHOST ОДНІЄЮ КОМАНДОЮ
 * ==================================================================
 *
 *    node deploy.mjs              зібрати і залити сайт
 *                                 (перший запуск ще й налаштовує сервер)
 *    node deploy.mjs --watch      автозбірка: зберегли файл → сайт оновився сам
 *    node deploy.mjs --rollback   повернути попередню версію
 *    node deploy.mjs --pack       зібрати архів для заливки через Netcatty (без FTP)
 *
 *  Або подвійний клік (Windows), по порядку:
 *    1-ВСТАНОВИТИ.bat · 2-ЗАЛИТИ-САЙТ.bat · 3-АВТОЗАЛИВКА.bat · 4-ПОВЕРНУТИ-ПОПЕРЕДНЮ.bat
 *
 *  Що робить:
 *    • ставить залежності (лише коли змінився package.json) і збирає сайт;
 *    • заливає по FTP ЛИШЕ змінені файли, прибирає застарілі;
 *    • перед заміною зберігає старі файли в backups/ (5 останніх);
 *    • перший раз: прибирає вихідні файли з папки сайту, підключає MySQL,
 *      кладе antikvar.sh для Termius і показує код першого входу в адмінку;
 *    • перевіряє, що сайт і адмінка відповідають.
 *
 *  Параметри:
 *    --full          залити всі файли, а не лише змінені
 *    --setup         повторити налаштування сервера (MySQL, очищення)
 *    --skip-build    не збирати, залити наявний dist/
 *    --path=www/...  папка сайту на FTP  (за замовч. www/antikvardp.net)
 *    --url=https://  адреса сайту        (за замовч. https://antikvardp.net)
 *    --forget        забути збережені на цьому компʼютері паролі
 *    --yes           без запитань (для автоматизації)
 *
 *  Налаштування: .env.deploy (не потрапляє в git), шаблон — .env.deploy.example
 * ==================================================================
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import readline from 'node:readline'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { Readable, Writable } from 'node:stream'
import zlib from 'node:zlib'

const SELF = fileURLToPath(import.meta.url)
const ROOT = path.dirname(SELF)
process.chdir(ROOT)
const DIST = path.join(ROOT, 'dist')
const ENV_FILE = path.join(ROOT, '.env.deploy')
const BACKUPS = path.join(ROOT, 'backups')
const TOOLS = path.join(ROOT, 'scripts', 'server', 'antikvar.sh')
const KEEP_BACKUPS = 5

// ------------------------------------------------------------------
//  Вивід
// ------------------------------------------------------------------
const tty = !!process.stdout.isTTY
const paint = (code) => (s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : String(s))
const c = { b: paint('1'), g: paint('32'), y: paint('33'), r: paint('31'), d: paint('2'), gold: paint('38;5;178') }
// Кроки завжди йдуть по порядку: «Крок 1 з 5 · …»
let stepNo = 0
let stepTotal = 5
const step = (t) => console.log(`\n${c.gold(`Крок ${++stepNo} з ${stepTotal}`)} ${c.gold('·')} ${c.b(t)}`)
const sub = (t) => console.log(`  ${c.gold('›')} ${c.b(t)}`)
const ok = (t) => console.log(`  ${c.g('✓')} ${t}`)
const info = (t) => console.log(`  ${c.d(t)}`)
const warn = (t) => console.log(`  ${c.y('!')} ${t}`)
const line = () => console.log(c.gold('━'.repeat(50)))

class DeployError extends Error {
  constructor(message, hints = []) {
    super(message)
    this.hints = hints
  }
}
const die = (message, hints) => {
  throw new DeployError(message, hints)
}
function report(e) {
  console.log(`\n  ${c.r('✗')} ${c.b(e?.message || e)}`)
  for (const h of e?.hints || []) console.log(`    ${h}`)
  if (!(e instanceof DeployError) && process.env.DEBUG) console.log(e?.stack)
  console.log('')
}

// ------------------------------------------------------------------
//  Параметри
// ------------------------------------------------------------------
const args = process.argv.slice(2)
const flag = (n) => args.includes(`--${n}`)
const opt = (n) => {
  const a = args.find((x) => x.startsWith(`--${n}=`))
  return a ? a.slice(n.length + 3) : undefined
}
const KNOWN = ['watch', 'rollback', 'pack', 'full', 'setup', 'skip-build', 'forget', 'yes', 'help', 'h', 'ftp', 'ssh', 'path', 'url']
for (const a of args) {
  const n = a.replace(/^--?/, '').split('=')[0]
  if (!KNOWN.includes(n)) {
    console.log(`Невідомий параметр «${a}». Допомога: node deploy.mjs --help`)
    process.exit(1)
  }
}
if (flag('help') || flag('h')) {
  const src = fs.readFileSync(SELF, 'utf8').split('\n')
  console.log(src.slice(2, 32).map((l) => l.replace(/^ \*\s?/, '')).join('\n'))
  process.exit(0)
}

// ------------------------------------------------------------------
//  .env.deploy
// ------------------------------------------------------------------
function readEnv() {
  if (!fs.existsSync(ENV_FILE)) return {}
  const out = {}
  for (const raw of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const m = raw.match(/^\s*([A-Z0-9_]+)\s*=(.*)$/)
    if (!m) continue
    let v = m[2].trim()
    if (v.startsWith('"')) {
      try {
        v = JSON.parse(v)
      } catch {
        v = v.slice(1, -1)
      }
    } else if (v.length > 1 && v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1)
    out[m[1]] = v
  }
  return out
}

const env = {
  ...readEnv(),
  ...Object.fromEntries(Object.entries(process.env).filter(([k, v]) => k.startsWith('DEPLOY_') && v)),
}

function saveEnv(key, value) {
  let text = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : ''
  const val = /^[\w./:@-]*$/.test(value) ? value : JSON.stringify(value)
  const re = new RegExp(`^${key}=.*$`, 'm')
  text = re.test(text) ? text.replace(re, () => `${key}=${val}`) : `${text.trimEnd()}${text.trim() ? '\n' : ''}${key}=${val}\n`
  fs.writeFileSync(ENV_FILE, text, { mode: 0o600 })
  env[key] = value
}

function removeEnv(key) {
  if (!fs.existsSync(ENV_FILE)) return
  const text = fs.readFileSync(ENV_FILE, 'utf8').replace(new RegExp(`^${key}=.*(\\r?\\n)?`, 'm'), '')
  fs.writeFileSync(ENV_FILE, text)
  delete env[key]
}

const cleanPath = (p) => String(p || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')

const CFG = {
  host: env.DEPLOY_HOST || 'amarok.cityhost.com.ua',
  user: env.DEPLOY_USER || 'ch9ca38181',
  port: Number(env.DEPLOY_FTP_PORT || 21),
  target: cleanPath(opt('path') || env.DEPLOY_FTP_PATH || 'www/antikvardp.net'),
  url: (opt('url') || env.DEPLOY_URL || 'https://antikvardp.net').replace(/\/+$/, ''),
  db: {
    host: env.DEPLOY_DB_HOST || '127.0.0.1',
    name: env.DEPLOY_DB_NAME || env.DEPLOY_USER || 'ch9ca38181',
    user: env.DEPLOY_DB_USER || env.DEPLOY_USER || 'ch9ca38181',
  },
  yes: flag('yes') || !process.stdin.isTTY,
}
if (!CFG.target || CFG.target.split('/').includes('..')) {
  console.log('Невірна папка сайту (--path)')
  process.exit(1)
}
if (opt('path')) saveEnv('DEPLOY_FTP_PATH', CFG.target)
if (opt('url')) saveEnv('DEPLOY_URL', CFG.url)

// ------------------------------------------------------------------
//  Ввід з клавіатури
// ------------------------------------------------------------------
function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((res) => rl.question(q, (a) => (rl.close(), res(a.trim()))))
}

function askHidden(q) {
  return new Promise((res) => {
    const stdin = process.stdin
    process.stdout.write(q)
    if (!stdin.isTTY) {
      const rl = readline.createInterface({ input: stdin })
      rl.once('line', (l) => (rl.close(), res(l)))
      return
    }
    let s = ''
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          stdin.setRawMode(false)
          stdin.pause()
          stdin.off('data', onData)
          process.stdout.write('\n')
          return res(s)
        }
        if (ch === '\u0003') {
          process.stdout.write('\n')
          process.exit(130)
        }
        if (ch === '\u007f' || ch === '\b') {
          if (s) {
            s = s.slice(0, -1)
            process.stdout.write('\b \b')
          }
          continue
        }
        s += ch
        process.stdout.write('•')
      }
    }
    stdin.on('data', onData)
  })
}

async function askYesNo(q, def = true) {
  if (CFG.yes) return def
  const a = (await ask(`${q} ${def ? '[Т/н]' : '[т/Н]'} `)).toLowerCase()
  if (!a) return def
  return /^(т|так|y|yes|д|да)/.test(a)
}

// ------------------------------------------------------------------
//  Node.js і залежності
// ------------------------------------------------------------------
function nodeOk() {
  const [a, b] = process.versions.node.split('.').map(Number)
  return (a === 20 && b >= 19) || (a === 22 && b >= 12) || a > 22
}

const sha1 = (buf) => crypto.createHash('sha1').update(buf).digest('hex')
const PINNED = ['vite', 'vite-plugin-singlefile', '@vitejs/plugin-react', '@tailwindcss/vite', 'tailwindcss', 'basic-ftp']

function depsStamp() {
  return sha1(['package.json', 'package-lock.json'].map((f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '')).join('\0'))
}

function depsProblems() {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  const want = { ...pkg.dependencies, ...pkg.devDependencies }
  const out = []
  for (const name of PINNED) {
    if (!want[name]) continue
    let have = null
    try {
      have = JSON.parse(fs.readFileSync(path.join('node_modules', name, 'package.json'), 'utf8')).version
    } catch {
      /* немає */
    }
    if (!have) out.push(`${name}: не встановлено`)
    else if (/^\d/.test(want[name]) && have !== want[name]) out.push(`${name}: потрібно ${want[name]}, встановлено ${have}`)
  }
  return out
}

function npmInstall(clean) {
  if (clean) fs.rmSync('node_modules', { recursive: true, force: true })
  const r = spawnSync('npm install --include=dev --no-audit --no-fund', {
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' },
  })
  if (r.status !== 0) die('Не вдалося встановити залежності (npm install)', ['Перевірте інтернет і запустіть ще раз'])
}

function ensureDeps() {
  const stampFile = path.join('node_modules', '.akv-hash')
  const stamp = depsStamp()
  const current = fs.existsSync(stampFile) ? fs.readFileSync(stampFile, 'utf8').trim() : ''
  if (current === stamp && depsProblems().length === 0) {
    ok('Залежності на місці')
    return
  }
  info(current ? 'package.json змінився — оновлюю залежності…' : 'Встановлення залежностей (перший раз 1–3 хв)…')
  npmInstall(false)
  let problems = depsProblems()
  if (problems.length) {
    warn(`Версії пакетів не збігаються (${problems.join('; ')}) — перевстановлюю начисто`)
    npmInstall(true)
    problems = depsProblems()
  }
  if (problems.length) die('Не вдалося встановити потрібні версії пакетів', problems)
  fs.writeFileSync(stampFile, stamp)
  ok('Залежності встановлено')
}

// ------------------------------------------------------------------
//  Збірка
// ------------------------------------------------------------------
const tailOf = (r) =>
  `${r.stdout || ''}\n${r.stderr || ''}`
    .trim()
    .split('\n')
    .slice(-25)
    .map((l) => c.d(l))

function build() {
  const t = Date.now()
  const r = spawnSync('npm run build', {
    shell: true,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
    env: { ...process.env, NODE_ENV: 'production' },
  })
  if (r.status !== 0) die('Збірка не вдалася — сайт НЕ змінено', tailOf(r))

  const p = spawnSync(process.execPath, ['scripts/prepare-deploy.mjs', '--no-zip', `--url=${CFG.url}`], {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
    env: { ...process.env, DEPLOY_HOOK_SECRET: env.DEPLOY_HOOK_SECRET || '' },
  })
  if (p.status !== 0) die('Підготовка збірки не вдалася — сайт НЕ змінено', tailOf(p))

  const index = path.join(DIST, 'index.html')
  const html = fs.existsSync(index) ? fs.readFileSync(index, 'utf8') : ''
  if (!html.includes('АнтикварЪ') || html.includes('src="/src/main.tsx"')) {
    die('Зібраний index.html некоректний — заливку скасовано')
  }
  return ((Date.now() - t) / 1000).toFixed(1)
}

function collectDist() {
  const out = []
  ;(function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, e.name)
      if (e.isDirectory()) walk(abs)
      else if (e.isFile() && e.name !== '.DS_Store' && e.name !== 'Thumbs.db') {
        const buf = fs.readFileSync(abs)
        out.push({ rel: path.relative(DIST, abs).split(path.sep).join('/'), abs, hash: sha1(buf), size: buf.length })
      }
    }
  })(DIST)
  return out.sort((a, b) => a.rel.localeCompare(b.rel))
}

// ------------------------------------------------------------------
//  FTP
// ------------------------------------------------------------------
let Client = null
let ftp = null
let remoteRoot = '/'
let ftpPassword = env.DEPLOY_FTP_PASSWORD || ''
let warnedPlain = false
const R = (...p) => path.posix.join(remoteRoot, ...p)

const errText = (e) => String(e?.message || e)
const isAuthErr = (e) => e?.code === 530 || /\b530\b|login incorrect|authentication failed/i.test(errText(e))
const isNetErr = (e) => /ETIMEDOUT|ECONNREFUSED|ECONNRESET|EHOSTUNREACH|ENETUNREACH|ENOTFOUND|EAI_AGAIN|EPIPE|Timeout|closed|socket/i.test(errText(e))
const isUnreachable = (e) => /ETIMEDOUT|ECONNREFUSED|EHOSTUNREACH|ENETUNREACH|ENOTFOUND|EAI_AGAIN|Timeout \(control socket\)/i.test(errText(e))

const FTP_HINTS = [
  'CityHost пускає FTP лише з дозволених IP-адрес. Відкрийте:',
  `  ${c.b('Панель CityHost → Хостинг 2.0 → Керування → FTP → Додати IP до списку дозволених')}`,
  '  (вимкніть VPN і натисніть «додати поточний IP», потім запустіть знову)',
]

async function connect(quiet = false) {
  if (!Client) ({ Client } = await import('basic-ftp'))
  const hadSaved = !!env.DEPLOY_FTP_PASSWORD

  for (let attempt = 1; attempt <= 3; attempt++) {
    let prompted = false
    if (!ftpPassword) {
      if (CFG.yes) die('Немає пароля FTP', ['Запустіть у звичайному вікні — скрипт запитає пароль', 'або додайте DEPLOY_FTP_PASSWORD у .env.deploy'])
      ftpPassword = await askHidden(`  Пароль FTP для ${c.b(CFG.user)}: `)
      prompted = true
    }

    const modes = [
      { secure: true, tls: { servername: CFG.host }, label: 'шифроване зʼєднання FTPS' },
      { secure: true, tls: { servername: CFG.host, rejectUnauthorized: false }, label: 'шифроване зʼєднання FTPS' },
      { secure: false, label: 'звичайний FTP, без шифрування' },
    ]
    let authFailed = false
    for (const m of modes) {
      const cl = new Client(30000)
      try {
        await cl.access({ host: CFG.host, port: CFG.port, user: CFG.user, password: ftpPassword, secure: m.secure, secureOptions: m.tls })
        remoteRoot = await cl.pwd()
        if (!m.secure && !warnedPlain) {
          warn('FTPS недоступний — використовую звичайний FTP')
          warnedPlain = true
        }
        if (!quiet) ok(`Підключено до ${CFG.host} (${m.label})`)
        if (prompted && !CFG.yes) {
          if (hadSaved) {
            saveEnv('DEPLOY_FTP_PASSWORD', ftpPassword)
            info('Новий пароль збережено в .env.deploy')
          } else if (await askYesNo('  Запамʼятати пароль FTP на цьому компʼютері? (файл .env.deploy, не потрапляє в git)', true)) {
            saveEnv('DEPLOY_FTP_PASSWORD', ftpPassword)
            ok('Збережено — далі заливка без жодних запитань')
          }
        }
        return cl
      } catch (e) {
        cl.close()
        if (isAuthErr(e)) {
          authFailed = true
          break
        }
        if (isUnreachable(e)) die(`Сервер ${CFG.host} не пускає по FTP`, FTP_HINTS)
        if (!m.secure) die(`Помилка FTP: ${errText(e)}`, FTP_HINTS)
      }
    }
    if (authFailed) {
      warn(hadSaved && !prompted ? 'Збережений пароль FTP не підходить — введіть актуальний' : `Невірний логін або пароль FTP (спроба ${attempt} з 3)`)
      ftpPassword = ''
      if (CFG.yes) break
    }
  }
  die('Не вдалося увійти по FTP', ['Пароль FTP: панель CityHost → Хостинг 2.0 → Керування → FTP'])
}

async function ftpReady(quiet = false) {
  if (ftp && !ftp.closed) return ftp
  ftp = await connect(quiet)
  return ftp
}

async function rExists(p) {
  try {
    await ftp.size(p)
    return true
  } catch {
    return false
  }
}

async function rDirExists(p) {
  try {
    await ftp.cd(p)
    await ftp.cd(remoteRoot)
    return true
  } catch {
    return false
  }
}

async function rRead(p) {
  const chunks = []
  await ftp.downloadTo(
    new Writable({
      write(ch, _enc, cb) {
        chunks.push(ch)
        cb()
      },
    }),
    p,
  )
  return Buffer.concat(chunks).toString('utf8')
}

async function rWrite(p, text) {
  await ftp.ensureDir(path.posix.dirname(p))
  await ftp.uploadFrom(Readable.from([Buffer.from(text, 'utf8')]), p)
}

const chmod = (mode, p) => ftp.send(`SITE CHMOD ${mode} ${p}`).catch(() => {})

async function resolveTarget() {
  if (await rDirExists(R(CFG.target))) return
  let cands = []
  try {
    cands = (await ftp.list(R('www'))).filter((f) => f.isDirectory && !f.name.startsWith('.')).map((f) => `www/${f.name}`)
  } catch {
    /* немає www */
  }
  if (cands.length === 1) {
    warn(`Папки ${CFG.target} немає — використовую ${cands[0]}`)
    CFG.target = cands[0]
  } else if (cands.length > 1 && !CFG.yes) {
    console.log(`  Папки ${CFG.target} немає. Знайдено сайти:`)
    cands.forEach((d, i) => console.log(`    ${c.gold(String(i + 1))}) ${d}`))
    const pick = Number(await ask(`  Оберіть номер [1-${cands.length}]: `))
    if (!(pick >= 1 && pick <= cands.length)) die('Невірний вибір')
    CFG.target = cands[pick - 1]
  } else {
    const ls = (await ftp.list(remoteRoot).catch(() => [])).map((f) => `  ${f.isDirectory ? '📁' : '  '} ${f.name}`)
    die(`Папку сайту ${CFG.target} не знайдено`, [
      'На FTP є:',
      ...ls,
      '',
      `Додайте сайт у панелі: ${c.b('Хостинг 2.0 → Сайти → Додати сайт')}, або вкажіть папку:`,
      `  ${c.b('node deploy.mjs --path=www/ваш-домен')}`,
    ])
  }
  saveEnv('DEPLOY_FTP_PATH', CFG.target)
}

// ------------------------------------------------------------------
//  Маніфест: що вже залито (зберігається на сервері, поза папкою сайту)
// ------------------------------------------------------------------
const manifestPath = () => R('antikvar-data', `deploy-${CFG.target.replace(/[^\w.-]+/g, '_')}.json`)

async function readManifest() {
  try {
    const j = JSON.parse(await rRead(manifestPath()))
    return j && typeof j.files === 'object' ? j : null
  } catch {
    return null
  }
}

async function writeManifest(m) {
  await rWrite(manifestPath(), JSON.stringify(m, null, 1))
  await chmod(600, manifestPath())
}

// ------------------------------------------------------------------
//  Вихідні файли, що потрапили в папку сайту (публічно доступні!)
// ------------------------------------------------------------------
const LEAKED = [
  'package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'vite.config.ts',
  'src', 'node_modules', 'node_modules.old', 'scripts', 'public', 'dist', 'backups', '.github',
  'deploy.mjs', 'deploy.sh', 'deploy.bat', 'deploy.command', 'deploy-cityhost.sh', 'deploy-cityhost.bat', 'install.sh',
  '1-ВСТАНОВИТИ.bat', '2-ЗАЛИТИ-САЙТ.bat', '3-АВТОЗАЛИВКА.bat', '4-ПОВЕРНУТИ-ПОПЕРЕДНЮ.bat',
  'ЗАЛИТИ-САЙТ.bat', 'ЗАЛИТИ-ЧЕРЕЗ-FTP.bat', 'АВТОЗАЛИВКА.bat', 'ВСТАНОВИТИ.bat',
  'ІНСТРУКЦІЯ.md', 'DEPLOY.md', 'README.md', 'netlify.toml', 'vercel.json', 'nginx.conf.example',
  'ДЛЯ-NETCATTY', 'ЗІБРАТИ-ДЛЯ-NETCATTY.bat', 'antikvar-site.tgz',
  '.env.deploy', '.env.deploy.example', '.gitignore', 'deploy.zip', 'antikvar-deploy.tgz', 'remote-install.sh',
]

async function cleanLeaked(distTop) {
  let list = []
  try {
    list = await ftp.list(R(CFG.target))
  } catch {
    return
  }
  const bad = list.filter((f) => LEAKED.includes(f.name) && !distTop.has(f.name))
  if (!bad.length) return
  sub('Очищення папки сайту')
  warn(`Знайдено вихідні файли проекту: ${bad.map((f) => f.name).join(', ')}`)
  info('Їм не місце на сайті — вони відкриті всім. Прибираю…')
  for (const f of bad) {
    const p = R(CFG.target, f.name)
    if (f.isDirectory) {
      if (f.name.startsWith('node_modules')) info(`${f.name}/ — тисячі файлів, по FTP це кілька хвилин (швидше в Termius: rm -rf ~/${CFG.target}/${f.name})`)
      await ftp.removeDir(p).catch((e) => warn(`${f.name}: ${errText(e)}`))
    } else {
      await ftp.remove(p).catch(() => {})
    }
  }
  ok('Папку сайту очищено')
}

// ------------------------------------------------------------------
//  Резервні копії (на цей компʼютер)
// ------------------------------------------------------------------
const safeRel = (rel) => rel && !rel.startsWith('/') && !rel.split('/').includes('..')

async function backupBefore(relList, old, first) {
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)
  const dir = path.join(BACKUPS, stamp)
  const saved = []
  const added = []
  for (const rel of relList) {
    if (!first && !(rel in old)) {
      added.push(rel)
      continue
    }
    const local = path.join(dir, ...rel.split('/'))
    fs.mkdirSync(path.dirname(local), { recursive: true })
    try {
      await ftp.downloadTo(local, R(CFG.target, rel))
      saved.push(rel)
    } catch {
      fs.rmSync(local, { force: true })
      added.push(rel)
    }
  }
  return { dir, stamp, saved, added }
}

function finishBackup(b) {
  if (!b.saved.length && !b.added.length) {
    fs.rmSync(b.dir, { recursive: true, force: true })
    return
  }
  fs.mkdirSync(b.dir, { recursive: true })
  fs.writeFileSync(
    path.join(b.dir, '.akv-backup.json'),
    JSON.stringify({ target: CFG.target, at: new Date().toISOString(), saved: b.saved, added: b.added }, null, 1),
  )
  const all = fs.readdirSync(BACKUPS).filter((d) => /^\d{4}-/.test(d)).sort()
  for (const old of all.slice(0, -KEEP_BACKUPS)) fs.rmSync(path.join(BACKUPS, old), { recursive: true, force: true })
  if (b.saved.length) ok(`Попередню версію збережено (повернути: 4-ПОВЕРНУТИ-ПОПЕРЕДНЮ.bat)`)
}

// ------------------------------------------------------------------
//  Заливка змінених файлів
// ------------------------------------------------------------------
async function deployFiles({ watch = false, full = false } = {}) {
  const files = collectDist()
  const manifest = await readManifest()
  const old = manifest?.files || {}
  const current = new Map(files.map((f) => [f.rel, f]))
  const changed = files.filter((f) => full || !manifest || old[f.rel] !== f.hash)
  const removed = manifest ? Object.keys(old).filter((rel) => !current.has(rel) && safeRel(rel)) : []

  if (!changed.length && !removed.length) return { changed: [], removed: [], manifest, first: false }

  const backup = watch ? null : await backupBefore([...changed.map((f) => f.rel), ...removed], old, !manifest)

  const dirs = new Set()
  let n = 0
  for (const f of changed) {
    const remote = R(CFG.target, f.rel)
    const dir = path.posix.dirname(remote)
    if (!dirs.has(dir)) {
      await ftp.ensureDir(dir)
      dirs.add(dir)
    }
    if (!watch && tty) process.stdout.write(`\r  ${c.d(`${++n}/${changed.length}`)} ${f.rel.slice(0, 50).padEnd(50)}`)
    await ftp.uploadFrom(f.abs, remote)
  }
  if (!watch && tty && changed.length) process.stdout.write('\r' + ' '.repeat(72) + '\r')
  for (const rel of removed) await ftp.remove(R(CFG.target, rel)).catch(() => {})

  const next = {
    version: 1,
    target: CFG.target,
    at: new Date().toISOString(),
    by: os.hostname(),
    tools: manifest?.tools || null,
    files: Object.fromEntries(files.map((f) => [f.rel, f.hash])),
  }
  await writeManifest(next)
  if (backup) finishBackup(backup)
  return { changed: changed.map((f) => f.rel), removed, manifest: next, first: !manifest }
}

async function syncTools(manifest) {
  if (!manifest || !fs.existsSync(TOOLS)) return
  const h = sha1(fs.readFileSync(TOOLS))
  if (manifest.tools === h) return
  await ftp.uploadFrom(TOOLS, R('antikvar.sh'))
  await chmod(700, R('antikvar.sh'))
  manifest.tools = h
  await writeManifest(manifest)
  ok('Оновлено ~/antikvar.sh (команди для Termius)')
}

// ------------------------------------------------------------------
//  Налаштування сервера (перший запуск / --setup)
// ------------------------------------------------------------------
async function checkPublicHtml() {
  if (CFG.target === 'public_html') return
  if (await rExists(R('public_html', 'package.json'))) {
    warn('У папці public_html лежить ще одна копія вихідних файлів проекту')
    info(`Сайт працює з ${CFG.target}. Якщо public_html — не посилання на неї, а окрема папка, її можна видалити.`)
    info('Перевірити в Termius:  ls -la ~ | grep public_html')
  }
}

async function setupDatabase(force) {
  const dbFile = R('antikvar-data', 'db.php')
  if (await rExists(dbFile)) {
    if (!force || !(await askYesNo('  MySQL уже підключено. Ввести новий пароль бази?', false))) return false
  } else if (!force && env.DEPLOY_DB_SKIP === '1') {
    return false
  }
  if (CFG.yes && !env.DEPLOY_DB_PASSWORD) return false

  sub('База даних MySQL для адмінки')
  info('Заявки, команда і журнал зберігатимуться в базі CityHost (з її щоденними бекапами).')
  const pw = env.DEPLOY_DB_PASSWORD || (await askHidden(`  Пароль MySQL для ${c.b(CFG.db.user)} ${c.d('(Enter — пропустити)')}: `))
  if (!pw) {
    saveEnv('DEPLOY_DB_SKIP', '1')
    info('Пропущено — адмінка зберігатиме дані у файлах. Підключити пізніше: запустіть 1-ВСТАНОВИТИ.bat ще раз')
    return false
  }
  const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
  const php =
    `<?php\n// Створено deploy.mjs — доступ до бази для api.php\nreturn [\n` +
    `  'host' => ${q(CFG.db.host)},\n  'name' => ${q(CFG.db.name)},\n  'user' => ${q(CFG.db.user)},\n  'pass' => ${q(pw)},\n];\n`
  await rWrite(dbFile, php)
  await chmod(600, dbFile)
  await chmod(700, R('antikvar-data'))
  removeEnv('DEPLOY_DB_SKIP')
  ok('Доступ до MySQL збережено на сервері')
  return true
}

// ------------------------------------------------------------------
//  Перевірка сайту і адмінки
// ------------------------------------------------------------------
async function httpGet(u) {
  const r = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'Cache-Control': 'no-cache' } })
  return { status: r.status, ok: r.ok, text: await r.text() }
}

async function apiStatus(base) {
  try {
    const r = await httpGet(`${base}/api.php?action=status`)
    let j = null
    try {
      j = JSON.parse(r.text)
    } catch {
      /* не JSON */
    }
    if (j?.app === 'antikvar') return { ok: true, data: j }
    return { ok: false, error: j?.error || `HTTP ${r.status}` }
  } catch (e) {
    return { ok: false, error: errText(e) }
  }
}

async function showSetupCode(base) {
  let code = ''
  for (const p of [R('antikvar-data', 'SETUP-CODE.txt'), R(CFG.target, '.antikvar-data', 'SETUP-CODE.txt')]) {
    try {
      code = (await rRead(p)).trim()
      if (/^[A-Z0-9]{8}$/.test(code)) break
      code = ''
    } catch {
      /* немає */
    }
  }
  console.log('')
  line()
  console.log(`  ${c.b('Перший вхід в адмінку — створіть обліковий запис власника')}`)
  console.log(`  Адреса:  ${c.b(`${base}/#admin`)}`)
  console.log(code ? `  Код:     ${c.gold(c.b(code))}` : `  Код:     Termius → ${c.b('bash ~/antikvar.sh admin-code')}`)
  line()
}

async function verify({ dbJustSet }) {
  step('Перевірка сайту')
  let base = null
  let page = null
  for (const u of [CFG.url, CFG.url.replace(/^https:/, 'http:')]) {
    try {
      page = await httpGet(`${u}/?v=${Date.now()}`)
      base = u
      break
    } catch {
      /* спробуємо http */
    }
  }
  if (!page) {
    warn(`${CFG.url} поки не відкривається — домен ще не привʼязаний або не оновились DNS (до 24 год)`)
    info('Файли залито — сайт запрацює, щойно домен почне вказувати на хостинг')
    if (dbJustSet) info('Підключення MySQL перевіриться при наступній заливці')
    return
  }
  if (base !== CFG.url) warn(`Працює лише ${base} — SSL ще не видано (панель CityHost → SSL → Let's Encrypt)`)
  if (page.ok && page.text.includes('АнтикварЪ') && !page.text.includes('/src/main.tsx')) ok(`${base} відкривається`)
  else warn(`${base} відповідає HTTP ${page.status}, але це не наш сайт — перевірте, що домен привʼязаний до ${CFG.target}`)

  let st = await apiStatus(base)
  if (!st.ok && /MySQL/i.test(st.error)) {
    if (dbJustSet) {
      await ftp.remove(R('antikvar-data', 'db.php')).catch(() => {})
      warn('Пароль MySQL не підійшов — підключення скасовано, адмінка працює з файлами')
      info('Спробувати ще раз: запустіть 1-ВСТАНОВИТИ.bat')
      st = await apiStatus(base)
    } else {
      warn(`Адмінка не може підключитися до MySQL: ${st.error}`)
      info('Оновіть пароль бази: запустіть 1-ВСТАНОВИТИ.bat ще раз')
      return
    }
  }
  if (!st.ok) {
    warn(`Адмінка (api.php) не відповідає: ${st.error} — перевірте, що на хостингу увімкнено PHP`)
    return
  }
  ok(`Адмінка працює · сховище: ${st.data.storage === 'mysql' ? 'MySQL' : 'файли'}`)
  if (dbJustSet && st.data.storage !== 'mysql') {
    warn('db.php залито, але api.php його не бачить — корінь FTP, схоже, не домашня папка')
    info('Підключіть базу в Termius: bash ~/antikvar.sh db-setup')
  }
  if (st.data.needsSetup) await showSetupCode(base)
}

// ------------------------------------------------------------------
//  Відкат до попередньої версії
// ------------------------------------------------------------------
async function rollback() {
  const dirs = fs.existsSync(BACKUPS)
    ? fs.readdirSync(BACKUPS).filter((d) => /^\d{4}-/.test(d) && !d.endsWith('-restored') && fs.existsSync(path.join(BACKUPS, d, '.akv-backup.json'))).sort()
    : []
  if (!dirs.length) die('Резервних копій немає', ['Вони зʼявляються в папці backups/ після кожної заливки з цього компʼютера'])
  const name = dirs[dirs.length - 1]
  const dir = path.join(BACKUPS, name)
  const meta = JSON.parse(fs.readFileSync(path.join(dir, '.akv-backup.json'), 'utf8'))
  console.log(`\n  Остання копія: ${c.b(name)} · файлів: ${meta.saved.length}${meta.added.length ? ` · буде прибрано нових: ${meta.added.length}` : ''}`)
  if (!(await askYesNo('  Повернути сайт до стану перед цією заливкою?', true))) return

  step('Підключення до хостингу')
  await ftpReady()
  CFG.target = meta.target || CFG.target

  step('Повернення попередньої версії')
  const manifest = (await readManifest()) || { version: 1, files: {} }
  for (const rel of meta.saved.filter(safeRel)) {
    const local = path.join(dir, ...rel.split('/'))
    const remote = R(CFG.target, rel)
    await ftp.ensureDir(path.posix.dirname(remote))
    await ftp.uploadFrom(local, remote)
    manifest.files[rel] = sha1(fs.readFileSync(local))
  }
  for (const rel of meta.added.filter(safeRel)) {
    await ftp.remove(R(CFG.target, rel)).catch(() => {})
    delete manifest.files[rel]
  }
  await writeManifest({ ...manifest, target: CFG.target, at: new Date().toISOString(), by: os.hostname() })
  fs.renameSync(dir, `${dir}-restored`)
  ok(`Сайт повернуто до стану перед ${name}`)
  info('Запустіть 4-ПОВЕРНУТИ-ПОПЕРЕДНЮ.bat ще раз — відкат ще на одну заливку назад')
  ftp.close()
}

// ------------------------------------------------------------------
//  Автозбірка
// ------------------------------------------------------------------
async function watchMode() {
  console.log('')
  line()
  console.log(`  ${c.b('Автозбірка увімкнена')} — зберігайте файли, сайт оновлюватиметься сам`)
  console.log(`  ${c.d('Стежу за src/, public/, index.html · Зупинити: Ctrl+C')}`)
  line()

  const targets = ['src', 'public', 'index.html', 'vite.config.ts'].filter((p) => fs.existsSync(p))
  const ignored = (f) => !f || /(^|[\\/])(\.DS_Store|Thumbs\.db|~\$|\.#)|\.(swp|swx|tmp|crdownload)$|~$/.test(f)
  let timer = null
  let busy = false
  let pending = false
  let keepAlive = null

  const run = async () => {
    if (busy) {
      pending = true
      return
    }
    busy = true
    if (keepAlive) await keepAlive
    const time = new Date().toLocaleTimeString('uk-UA')
    try {
      process.stdout.write(`\n  ${c.d(time)} зміни → збірка… `)
      const secs = build()
      process.stdout.write(`${secs} с → заливка… `)
      let res
      try {
        await ftpReady(true)
        res = await deployFiles({ watch: true })
      } catch (e) {
        if (!isNetErr(e) || e instanceof DeployError) throw e
        ftp?.close()
        await ftpReady(true)
        res = await deployFiles({ watch: true })
      }
      const changedNames = [...res.changed, ...res.removed]
      console.log(
        changedNames.length
          ? c.g(`✓ на сайті (${changedNames.slice(0, 3).join(', ')}${changedNames.length > 3 ? ` +${changedNames.length - 3}` : ''})`)
          : c.d('у збірці нічого не змінилось'),
      )
    } catch (e) {
      console.log(c.r('✗'))
      report(e)
      info('Виправте помилку і збережіть файл ще раз')
    } finally {
      busy = false
      if (pending) {
        pending = false
        schedule()
      }
    }
  }
  const schedule = () => {
    clearTimeout(timer)
    timer = setTimeout(run, 700)
  }

  for (const p of targets) {
    try {
      const isDir = fs.statSync(p).isDirectory()
      fs.watch(p, { recursive: isDir }, (_ev, f) => {
        if (!ignored(String(f || ''))) schedule()
      })
    } catch (e) {
      warn(`Не вдалося стежити за ${p}: ${errText(e)}`)
    }
  }

  // Тримаємо FTP-зʼєднання живим
  setInterval(() => {
    if (busy || keepAlive || !ftp || ftp.closed) return
    keepAlive = ftp
      .send('NOOP')
      .catch(() => {})
      .finally(() => {
        keepAlive = null
      })
  }, 60000)

  process.on('SIGINT', () => {
    console.log(`\n  ${c.d('Автозбірку зупинено')}`)
    try {
      ftp?.close()
    } catch {
      /* вже закрито */
    }
    process.exit(0)
  })
  await new Promise(() => {})
}

// ------------------------------------------------------------------
//  Архів для Netcatty (будь-який SFTP-клієнт)
// ------------------------------------------------------------------
const PACK_DIR = path.join(ROOT, 'ДЛЯ-NETCATTY')

/** Мінімальний tar (ustar) без зовнішніх програм */
function tarBuffer(files) {
  const mtime = Math.floor(Date.now() / 1000)
  const octal = (n, len) => n.toString(8).padStart(len - 1, '0') + '\0'
  const blocks = []
  for (const f of files) {
    let name = f.rel
    let prefix = ''
    if (Buffer.byteLength(name) > 100) {
      const cut = name.lastIndexOf('/', name.length - 1)
      prefix = name.slice(0, cut)
      name = name.slice(cut + 1)
      if (cut < 0 || Buffer.byteLength(name) > 100 || Buffer.byteLength(prefix) > 155) die(`Задовга назва файлу для архіву: ${f.rel}`)
    }
    const data = fs.readFileSync(f.abs)
    const h = Buffer.alloc(512, 0)
    h.write(name, 0, 100, 'utf8')
    h.write(octal(0o644, 8), 100, 8, 'ascii')
    h.write(octal(0, 8), 108, 8, 'ascii')
    h.write(octal(0, 8), 116, 8, 'ascii')
    h.write(octal(data.length, 12), 124, 12, 'ascii')
    h.write(octal(mtime, 12), 136, 12, 'ascii')
    h.fill(0x20, 148, 156) // місце для контрольної суми
    h.write('0', 156, 1, 'ascii')
    h.write('ustar\0', 257, 6, 'ascii')
    h.write('00', 263, 2, 'ascii')
    if (prefix) h.write(prefix, 345, 155, 'utf8')
    let sum = 0
    for (const b of h) sum += b
    h.write(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii')
    blocks.push(h, data)
    const pad = (512 - (data.length % 512)) % 512
    if (pad) blocks.push(Buffer.alloc(pad, 0))
  }
  blocks.push(Buffer.alloc(1024, 0))
  return Buffer.concat(blocks)
}

function openFolder(dir) {
  if (!process.stdout.isTTY || CFG.yes) return
  const cmd = process.platform === 'win32' ? 'explorer' : process.platform === 'darwin' ? 'open' : 'xdg-open'
  try {
    spawnSync(cmd, [dir], { stdio: 'ignore', timeout: 5000 })
  } catch {
    /* не критично */
  }
}

async function pack() {
  stepTotal = 3
  console.log(c.d('  План: 1 · програми → 2 · збірка → 3 · пакування для Netcatty'))

  step('Перевірка програм')
  ensureDeps()

  step('Збірка сайту')
  if (flag('skip-build')) {
    if (!fs.existsSync(path.join(DIST, 'index.html'))) die('Папка dist/ порожня — запустіть без --skip-build')
    ok('Пропущено (--skip-build) — беру готову збірку з dist/')
  } else {
    ok(`Зібрано за ${build()} с`)
  }

  step('Пакування для Netcatty')
  const files = collectDist()
  const tgz = zlib.gzipSync(tarBuffer(files), { level: 9 })
  fs.rmSync(PACK_DIR, { recursive: true, force: true })
  fs.mkdirSync(PACK_DIR, { recursive: true })
  fs.writeFileSync(path.join(PACK_DIR, 'antikvar-site.tgz'), tgz)
  // Скрипт для сервера — завжди з переводами рядків Linux, інакше bash не запуститься
  fs.writeFileSync(path.join(PACK_DIR, 'antikvar.sh'), fs.readFileSync(TOOLS, 'utf8').replace(/\r\n/g, '\n'))
  const howto = [
    'ЯК ЗАЛИТИ САЙТ ЧЕРЕЗ NETCATTY',
    '',
    `1. Netcatty → підключіться до хоста ${CFG.host} (порт 22, користувач ${CFG.user}).`,
    '2. Відкрийте SFTP (файли). Справа — сервер, домашня папка /var/www/' + CFG.user + '.',
    '3. Перетягніть у домашню папку ОБИДВА файли з цієї папки:',
    '      antikvar-site.tgz',
    '      antikvar.sh',
    '   Якщо спитає про заміну — «Замінити».',
    '4. У терміналі Netcatty виконайте:',
    '      bash ~/antikvar.sh unpack',
    '',
    'Увімкнули автозаливку (bash ~/antikvar.sh auto)? Тоді крок 4 не потрібен —',
    'сайт оновиться сам протягом хвилини після перетягування.',
    '',
    'Щось зламалось:  bash ~/antikvar.sh rollback',
  ].join('\r\n')
  fs.writeFileSync(path.join(PACK_DIR, 'ЯК-ЗАЛИТИ.txt'), howto + '\r\n')
  ok(`Архів готовий: ${files.length} файлів, ${Math.round(tgz.length / 1024)} KB`)

  console.log('')
  line()
  console.log(`  ${c.g('✓')} ${c.b('Готово!')} Папка ${c.b('ДЛЯ-NETCATTY')} ${process.stdout.isTTY && !CFG.yes ? 'відкрилась' : 'створена'}.`)
  console.log('')
  console.log(`  ${c.b('Далі в Netcatty:')}`)
  console.log(`    ${c.gold('1.')} перетягніть ${c.b('antikvar-site.tgz')} і ${c.b('antikvar.sh')} у домашню папку сервера`)
  console.log(`    ${c.gold('2.')} у терміналі: ${c.b('bash ~/antikvar.sh unpack')}`)
  console.log(`    ${c.d('(з увімкненою автозаливкою крок 2 не потрібен — сайт оновиться сам за хвилину)')}`)
  line()
  openFolder(PACK_DIR)
}

// ------------------------------------------------------------------
//  Головний сценарій
// ------------------------------------------------------------------
async function main() {
  console.log('')
  line()
  console.log(`  ${c.b('Салон «АнтикварЪ»')} → ${c.b('CityHost')}`)
  console.log(`  ${c.d(`${CFG.user}@${CFG.host} · ${CFG.target} · ${CFG.url}`)}`)
  line()

  if (flag('ssh')) info('SSH-заливку замінено на FTP. На самому сервері (Termius): bash ~/antikvar.sh local')

  if (flag('forget')) {
    for (const k of ['DEPLOY_FTP_PASSWORD', 'DEPLOY_DB_PASSWORD', 'DEPLOY_PASSWORD']) removeEnv(k)
    ok('Збережені паролі видалено з .env.deploy')
    return
  }

  if (!nodeOk()) {
    die(`Потрібен Node.js 20.19+ або 22.12+ (у вас ${process.versions.node})`, [
      'Windows: запустіть 1-ВСТАНОВИТИ.bat або виконайте  winget upgrade OpenJS.NodeJS.LTS',
      'Інакше: https://nodejs.org (версія LTS)',
    ])
  }

  if (flag('pack')) return pack()

  if (flag('rollback')) {
    stepTotal = 3
    console.log(c.d('  План: 1 · програми → 2 · підключення → 3 · повернення попередньої версії'))
    step('Перевірка програм')
    ensureDeps()
    return rollback()
  }

  console.log(c.d('  План: 1 · програми → 2 · збірка → 3 · підключення → 4 · заливка → 5 · перевірка'))

  step('Перевірка програм')
  ensureDeps()

  step('Збірка сайту')
  if (flag('skip-build')) {
    if (!fs.existsSync(path.join(DIST, 'index.html'))) die('Папка dist/ порожня — запустіть без --skip-build')
    ok('Пропущено (--skip-build) — беру готову збірку з dist/')
  } else {
    ok(`Зібрано за ${build()} с`)
  }

  step('Підключення до хостингу')
  await ftpReady()
  await resolveTarget()
  ok(`Папка сайту: ${CFG.target}`)

  step('Заливка файлів')
  await cleanLeaked(new Set(fs.readdirSync(DIST)))
  let res
  try {
    res = await deployFiles({ full: flag('full') })
  } catch (e) {
    if (e instanceof DeployError) throw e
    die(`Заливку перервано: ${errText(e)}`, ['Запустіть ще раз — заллються лише незалиті файли', ...(isNetErr(e) ? FTP_HINTS : [])])
  }
  if (!res.changed.length && !res.removed.length) ok('Змін немає — на сайті вже актуальна версія')
  else ok(`Залито: ${res.changed.length} файл.${res.removed.length ? ` · прибрано застарілих: ${res.removed.length}` : ''}`)

  await syncTools(res.manifest)

  let dbJustSet = false
  if (res.first || flag('setup')) {
    if (res.first) info('Перша заливка з цим скриптом — налаштовую сервер')
    await checkPublicHtml()
    dbJustSet = await setupDatabase(flag('setup'))
  }

  await verify({ dbJustSet })

  console.log('')
  line()
  console.log(`  ${c.g('✓')} ${c.b('Готово!')} Сайт: ${c.b(CFG.url)} ${c.d('(оновіть сторінку: Ctrl+F5)')}`)
  if (!flag('watch')) {
    console.log('')
    console.log(`  ${c.b('Що далі:')}`)
    console.log(`    ${c.gold('•')} змінили файли → ${c.b('2-ЗАЛИТИ-САЙТ.bat')} (або ярлик на робочому столі)`)
    console.log(`    ${c.gold('•')} хочете, щоб заливалось саме → ${c.b('3-АВТОЗАЛИВКА.bat')}`)
    console.log(`    ${c.gold('•')} щось зламалось → ${c.b('4-ПОВЕРНУТИ-ПОПЕРЕДНЮ.bat')}`)
  }
  line()

  if (flag('watch')) return watchMode()
  ftp?.close()
}

main().catch((e) => {
  report(e)
  try {
    ftp?.close()
  } catch {
    /* вже закрито */
  }
  process.exit(1)
})
