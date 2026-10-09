#!/usr/bin/env bash
# ==================================================================
#  Салон «АнтикварЪ» — керування сайтом ПРЯМО НА СЕРВЕРІ
#  Для телефону: Termius (або Web SSH у панелі CityHost)
# ==================================================================
#
#  0. NETCATTY — заливка архівом
#     На компʼютері: ЗІБРАТИ-ДЛЯ-NETCATTY.bat → папка ДЛЯ-NETCATTY
#     Перетягніть antikvar-site.tgz і antikvar.sh у домашню папку, потім:
#     bash ~/antikvar.sh unpack          розпакувати і оновити сайт
#
#  1. ОСНОВНЕ — автозбірка (один раз, далі сайт оновлюється сам)
#     bash ~/antikvar.sh auto            увімкнути
#     bash ~/antikvar.sh auto status     перевірити, чи все працює
#     bash ~/antikvar.sh auto now        зібрати зараз, не чекаючи
#     bash ~/antikvar.sh auto off        вимкнути
#
#  2. ЯКЩО ЩОСЬ НЕ ТАК
#     bash ~/antikvar.sh rollback        повернути попередню версію сайту
#     bash ~/antikvar.sh auto log        журнал збірок (що саме зламалось)
#     bash ~/antikvar.sh doctor          перевірка Node.js і пакетів
#     bash ~/antikvar.sh install-node    встановити Node.js
#
#  3. АДМІНКА (власник і помічники)
#     bash ~/antikvar.sh admin-code              код першого входу
#     bash ~/antikvar.sh reset-password [логін]  новий пароль, якщо забули
#     bash ~/antikvar.sh admin-users             хто має доступ
#     bash ~/antikvar.sh db-setup                підключити базу MySQL
#     bash ~/antikvar.sh db-test                 перевірити базу
#
#  4. ІНШЕ (рідко)
#     bash ~/antikvar.sh watch           миттєва збірка, поки відкритий Termius
#     bash ~/antikvar.sh local           одноразова збірка проекту з ~ (без автозбірки)
#     bash ~/antikvar.sh status          налаштування і резервні копії
#     bash ~/antikvar.sh setup           оновлення з GitHub: налаштування
#     bash ~/antikvar.sh                 оновлення з GitHub: запуск
#     bash ~/antikvar.sh self-update     оновити цей скрипт з GitHub
# ==================================================================
set -uo pipefail

CONF="$HOME/.antikvar.conf"
WORK="$HOME/.antikvar"
BACKUPS="$HOME/site-backups"
SELF="$HOME/antikvar.sh"
KEEP=5

if [ -t 1 ]; then
  B=$'\e[1m'; G=$'\e[32m'; Y=$'\e[33m'; R=$'\e[31m'; D=$'\e[2m'; A=$'\e[38;5;178m'; N=$'\e[0m'
else
  B=''; G=''; Y=''; R=''; D=''; A=''; N=''
fi
ok()   { echo "  ${G}✓${N} $*"; }
info() { echo "  ${D}$*${N}"; }
warn() { echo "  ${Y}!${N} $*"; }
die()  { echo; echo "  ${R}✗ $*${N}"; echo; exit 1; }
step() { echo; echo "${A}▸${N} ${B}$*${N}"; }
line() { echo "${A}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}"; }

REPO=""; BRANCH="main"; TOKEN=""; TARGET=""; SITE_URL=""; MODE="auto"
PROJECT=""; NODE_BIN=""; AUTO="off"; AUTO_GIT="0"
# shellcheck disable=SC1090
[ -f "$CONF" ] && . "$CONF"
mkdir -p "$WORK"

save_conf() {
  umask 077
  cat > "$CONF" <<EOF
REPO='$REPO'
BRANCH='$BRANCH'
TOKEN='$TOKEN'
TARGET='$TARGET'
SITE_URL='$SITE_URL'
MODE='$MODE'
PROJECT='$PROJECT'
NODE_BIN='$NODE_BIN'
AUTO='$AUTO'
AUTO_GIT='$AUTO_GIT'
EOF
  chmod 600 "$CONF"
}

# ---------- GitHub ----------
# gh_fetch <шлях API> <файл> [Accept]  → друкує HTTP-код, 0 якщо 200
gh_fetch() {
  local url="https://api.github.com/repos/$REPO/$1" out="$2" accept="${3:-application/vnd.github+json}" code
  if command -v curl >/dev/null 2>&1; then
    local auth=()
    [ -n "$TOKEN" ] && auth=(-H "Authorization: Bearer $TOKEN")
    code=$(curl -sSL --retry 2 --connect-timeout 20 --max-time 300 \
      -H "Accept: $accept" -H "User-Agent: antikvar-deploy" ${auth[@]+"${auth[@]}"} \
      -o "$out" -w '%{http_code}' "$url" 2>/dev/null) || code="000"
  elif command -v wget >/dev/null 2>&1; then
    local auth=()
    [ -n "$TOKEN" ] && auth=(--header="Authorization: Bearer $TOKEN")
    if wget -q --header="Accept: $accept" --header="User-Agent: antikvar-deploy" ${auth[@]+"${auth[@]}"} -O "$out" "$url"; then
      code=200
    else
      code="???"
    fi
  else
    die "На сервері немає curl чи wget"
  fi
  echo "$code"
  [ "$code" = "200" ]
}

explain_http() {
  case "$1" in
    401) echo "токен GitHub недійсний або прострочений (bash ~/antikvar.sh setup)" ;;
    403) echo "GitHub обмежив запити — спробуйте за кілька хвилин або додайте токен" ;;
    404) echo "не знайдено (перевірте репозиторій/гілку; для приватного репозиторію потрібен токен)" ;;
    000) echo "немає звʼязку з GitHub" ;;
    *)   echo "GitHub відповів HTTP $1" ;;
  esac
}

# fetch_tree <ref> <папка>  — завантажує й розпаковує код гілки
fetch_tree() {
  local ref="$1" dest="$2" tgz="$WORK/download.tgz" code
  code=$(gh_fetch "tarball/$ref" "$tgz")
  if [ "$code" != "200" ]; then
    rm -f "$tgz"
    warn "Гілка «$ref»: $(explain_http "$code")"
    return 1
  fi
  mkdir -p "$dest"
  tar xzf "$tgz" -C "$dest" --strip-components=1 || { rm -f "$tgz"; warn "Пошкоджений архів"; return 1; }
  rm -f "$tgz"
}

# ---------- Node.js ----------
load_node() {
  export NVM_DIR="$HOME/.nvm"
  # shellcheck disable=SC1091
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" >/dev/null 2>&1
  command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1
}
# Vite 7 потребує Node.js ^20.19.0 або >=22.12.0
node_ok() {
  load_node || return 1
  node -e '
    const [a, b] = process.versions.node.split(".").map(Number);
    process.exit((a === 20 && b >= 19) || (a === 22 && b >= 12) || a > 22 ? 0 : 1);
  ' 2>/dev/null
}

cmd_doctor() {
  echo; line; echo "  ${B}Діагностика збірки${N}"; line
  if load_node; then
    if node_ok; then ok "Node $(node -v), npm $(npm -v)"; else warn "Node $(node -v) застарий для Vite 7 (потрібно 20.19+ або 22.12+) → bash ~/antikvar.sh install-node"; fi
  else
    warn "Node.js не знайдено → bash ~/antikvar.sh install-node"
  fi
  [ -n "${NODE_ENV:-}" ] && info "NODE_ENV=$NODE_ENV (скрипт сам ставить потрібне значення під час встановлення)"
  local d
  for d in "$HOME/node_modules" "$WORK/node_modules"; do
    [ "$d" = "$HOME/node_modules" ] && [ -f "$HOME/package.json" ] && continue
    [ -d "$d" ] && warn "Сторонній $d — змішує версії пакетів (буде перейменовано при наступному оновленні)"
  done
  if [ -f "$HOME/package.json" ]; then
    (cd "$HOME" && if [ -d node_modules ] && deps_match; then ok "Проект у ~: версії пакетів збігаються"; else warn "Проект у ~: пакети не встановлено або версії не збігаються — bash ~/antikvar.sh local перевстановить"; fi)
  fi
  if [ -n "$TARGET" ] && [ -f "$TARGET/package.json" ]; then
    warn "У папці сайту $TARGET лежать вихідні файли проекту — bash ~/antikvar.sh local їх прибере"
  fi
  if [ -d "$WORK/src/node_modules" ]; then
    (cd "$WORK/src" && if deps_match; then ok "Версії пакетів збірки збігаються з package.json"; else warn "Версії не збігаються — при наступному оновленні буде чисте перевстановлення"; fi)
  else
    info "Залежності ще не встановлено (зробить bash ~/antikvar.sh)"
  fi
  [ -f "$WORK/build.log" ] && { echo "  Останні рядки журналу збірки:"; tail -n 6 "$WORK/build.log" | sed 's/^/    /'; }
  echo
}

cmd_install_node() {
  step "Встановлення Node.js на хостинг (через nvm)"
  export NVM_DIR="$HOME/.nvm"
  if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    info "Завантаження nvm..."
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash >"$WORK/nvm.log" 2>&1 \
      || die "Не вдалося встановити nvm (лог: $WORK/nvm.log)"
  fi
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  info "Встановлення Node.js 22 (1–3 хв)..."
  nvm install 22 >"$WORK/nvm.log" 2>&1 || die "Не вдалося встановити Node.js (лог: $WORK/nvm.log)"
  nvm alias default 22 >/dev/null 2>&1
  ok "Node $(node -v), npm $(npm -v)"
}

# ---------- Отримання збірки ----------
STAGE=""

# Пакети збірки, версії яких мають точно збігатися з package.json
BUILD_PKGS="vite vite-plugin-singlefile @vitejs/plugin-react @tailwindcss/vite tailwindcss"

# Старий ~/node_modules підхоплюється збіркою «знизу вгору» і змішує версії пакетів
# (типова помилка: [vite:build-html] Cannot read properties of undefined (reading 'call'))
guard_stray_modules() {
  local d stray=""
  for d in "$HOME/node_modules" "$WORK/node_modules"; do
    # ~/node_modules — це залежності проекту, якщо проект лежить прямо в домашній папці
    [ "$d" = "$HOME/node_modules" ] && [ -f "$HOME/package.json" ] && continue
    [ -d "$d" ] && stray="$stray $d"
  done
  [ -z "$stray" ] && return 0
  warn "Знайдено сторонні node_modules:${stray}"
  info "Вони змішують версії пакетів і ламають збірку. Їх буде перейменовано на *.old (не видалено)."
  for d in $stray; do
    rm -rf "$d.old" && mv "$d" "$d.old" && ok "$d → $d.old"
  done
}

# Чи встановлені саме ті версії, що в package.json
deps_match() {
  node -e '
    const fs = require("fs"), path = require("path");
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    const want = { ...pkg.dependencies, ...pkg.devDependencies };
    let bad = 0;
    for (const name of process.argv.slice(1)) {
      if (!want[name]) continue;
      let have = "немає";
      try { have = JSON.parse(fs.readFileSync(path.join("node_modules", name, "package.json"), "utf8")).version; } catch {}
      if (/^\d/.test(want[name]) && have !== want[name]) { console.log("    " + name + ": потрібно " + want[name] + ", встановлено " + have); bad++; }
    }
    process.exit(bad ? 1 : 0);
  ' $BUILD_PKGS
}

install_deps() {
  echo "  ${D}Встановлення залежностей (2–5 хв)...${N}"
  rm -rf node_modules
  # --include=dev: vite і плагіни — у devDependencies; NODE_ENV=production на хостингу їх пропускає
  { NODE_ENV=development npm ci --include=dev --no-audit --no-fund \
      || NODE_ENV=development npm install --include=dev --no-audit --no-fund; } >"$WORK/npm.log" 2>&1 \
    || { echo "  ${Y}!${N} npm install не вдався — лог: $WORK/npm.log"; tail -n 8 "$WORK/npm.log"; return 1; }
  deps_match || { echo "  ${Y}!${N} Після встановлення версії все одно не збігаються — лог: $WORK/npm.log"; return 1; }
}

run_build() {
  NODE_ENV=production npm run build >"$WORK/build.log" 2>&1
}

build_on_server() {
  step "Збірка на сервері (Node $(node -v))"
  local src="$WORK/src"
  guard_stray_modules
  mkdir -p "$src"
  find "$src" -mindepth 1 -maxdepth 1 ! -name node_modules -exec rm -rf {} +
  fetch_tree "$BRANCH" "$src" || return 1
  ok "Код завантажено: $REPO ($BRANCH)"

  (
    cd "$src" || exit 1
    local hash
    hash=$(cat package.json package-lock.json 2>/dev/null | cksum | cut -d' ' -f1)
    if [ ! -d node_modules ] || [ "$(cat node_modules/.akv-hash 2>/dev/null)" != "$hash" ] || ! deps_match >/dev/null 2>&1; then
      install_deps || exit 1
      echo "$hash" > node_modules/.akv-hash
    fi
    echo "  ${D}Збірка...${N}"
    if ! run_build; then
      # Друга спроба з повністю чистими залежностями
      echo "  ${Y}!${N} Збірка не вдалася — перевстановлюю залежності начисто і пробую ще раз"
      tail -n 4 "$WORK/build.log" | sed 's/^/    /'
      install_deps || exit 1
      echo "$hash" > node_modules/.akv-hash
      run_build || { echo "  ${Y}!${N} Збірка не вдалася — лог: $WORK/build.log"; tail -n 12 "$WORK/build.log"; exit 1; }
    fi
    local args=(--no-zip)
    [ -n "$SITE_URL" ] && args+=("--url=$SITE_URL")
    node scripts/prepare-deploy.mjs "${args[@]}" >>"$WORK/build.log" 2>&1 \
      || { echo "  ${Y}!${N} Підготовка не вдалася — лог: $WORK/build.log"; exit 1; }
  ) || return 1

  # Самооновлення цього скрипта з репозиторію
  if [ -f "$src/scripts/server/antikvar.sh" ] && ! cmp -s "$src/scripts/server/antikvar.sh" "$SELF"; then
    cp "$src/scripts/server/antikvar.sh" "$SELF.new" && chmod 700 "$SELF.new" && mv "$SELF.new" "$SELF"
    info "Скрипт оновлення теж оновлено"
  fi

  STAGE="$src/dist"
  ok "Зібрано"
}

use_prebuilt() {
  step "Завантаження готової збірки з GitHub (гілка build)"
  local st="$WORK/stage"
  rm -rf "$st"
  if ! fetch_tree "build" "$st"; then
    info "Гілку build створює GitHub Actions «📱 Заливка на CityHost» після кожної зміни коду."
    info "Або встановіть Node.js на хостинг і збирайте тут:  bash ~/antikvar.sh install-node"
    return 1
  fi
  STAGE="$st"
  ok "Готову збірку завантажено"
}

# ---------- Встановлення ----------
# Вихідні файли проекту в папці сайту: сайт не працює (index.html посилається на /src/main.tsx),
# а службові файли (DEPLOY.md, deploy.mjs, .env.deploy…) відкриті всім. Копія — у резервній копії.
LEAKED="package.json package-lock.json tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts
src node_modules node_modules.old scripts public .github deploy.mjs deploy.sh deploy.bat deploy.command
deploy-cityhost.sh deploy-cityhost.bat install.sh 1-ВСТАНОВИТИ.bat 2-ЗАЛИТИ-САЙТ.bat 3-АВТОЗАЛИВКА.bat
4-ПОВЕРНУТИ-ПОПЕРЕДНЮ.bat ЗАЛИТИ-САЙТ.bat ЗАЛИТИ-ЧЕРЕЗ-FTP.bat АВТОЗАЛИВКА.bat ВСТАНОВИТИ.bat
ІНСТРУКЦІЯ.md DEPLOY.md README.md backups ДЛЯ-NETCATTY ЗІБРАТИ-ДЛЯ-NETCATTY.bat antikvar-site.tgz
netlify.toml vercel.json nginx.conf.example .env.deploy .env.deploy.example .gitignore deploy.zip
antikvar-deploy.tgz remote-install.sh"

clean_leaked_source() {
  local f removed=""
  [ -f "$TARGET/package.json" ] || [ -d "$TARGET/src" ] || return 0
  for f in $LEAKED; do
    if [ -e "$TARGET/$f" ]; then
      rm -rf "${TARGET:?}/$f"
      removed="$removed $f"
    fi
  done
  [ -n "$removed" ] && warn "З папки сайту прибрано вихідні файли проекту:$removed"
}

install_site() {
  [ -f "$STAGE/index.html" ] && grep -q "АнтикварЪ" "$STAGE/index.html" \
    && ! grep -q 'src="/src/main.tsx"' "$STAGE/index.html" \
    || die "Збірка некоректна (немає index.html) — сайт НЕ змінено"

  step "${INSTALL_TITLE:-Резервна копія і заміна сайту}"
  mkdir -p "$BACKUPS" "$TARGET"
  local stamp; stamp=$(date +%Y%m%d-%H%M%S)
  if [ -n "$(ls -A "$TARGET" 2>/dev/null)" ]; then
    tar czf "$BACKUPS/site-$stamp.tgz" -C "$TARGET" . 2>/dev/null && info "Копія: ~/site-backups/site-$stamp.tgz"
    ls -1t "$BACKUPS"/site-*.tgz 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r f; do rm -f "$f"; done
  fi

  clean_leaked_source

  cp -R "$STAGE"/. "$TARGET"/ || die "Не вдалося скопіювати файли в $TARGET"
  find "$TARGET" -type d -exec chmod 755 {} + 2>/dev/null
  find "$TARGET" -type f -exec chmod 644 {} + 2>/dev/null
  # Сайт змінено не з компʼютера → наступна заливка з компʼютера (deploy.mjs) зальє всі файли
  rm -f "$HOME"/antikvar-data/deploy-*.json 2>/dev/null
  date '+%Y-%m-%d %H:%M:%S' > "$WORK/last-deploy"
  ok "Сайт оновлено: $TARGET ($(find "$STAGE" -type f | wc -l | tr -d ' ') файлів)"
}

check_site() {
  [ -n "$SITE_URL" ] && command -v curl >/dev/null 2>&1 || return 0
  step "${CHECK_TITLE:-Перевірка}"
  if curl -fsSL --max-time 15 "$SITE_URL/?v=$(date +%s)" 2>/dev/null | grep -q "АнтикварЪ"; then
    ok "$SITE_URL відкривається"
  else
    warn "$SITE_URL поки не відповідає як очікувалось — перевірте, що домен привʼязаний до $TARGET"
  fi
}

# ---------- Команди ----------
cmd_update() {
  local force="${1:-}"
  if [ -z "$REPO" ] || [ -z "$TARGET" ]; then
    warn "Скрипт ще не налаштовано — запускаю налаштування"
    cmd_setup
  fi
  echo; line
  echo "  ${B}Салон «АнтикварЪ»${N} — оновлення сайту"
  echo "  ${D}$REPO ($BRANCH) → $TARGET${N}"
  line

  local mode="$MODE"
  [ "$force" = "--build" ] && mode="build"
  [ "$force" = "--prebuilt" ] && mode="prebuilt"

  case "$mode" in
    build)
      node_ok || die "Потрібен Node.js 20.19+ або 22.12+. Встановіть: bash ~/antikvar.sh install-node"
      build_on_server || die "Збірка не вдалася — сайт НЕ змінено"
      ;;
    prebuilt)
      use_prebuilt || die "Не вдалося отримати готову збірку — сайт НЕ змінено"
      ;;
    *)
      if node_ok; then
        build_on_server || { warn "Збірка на сервері не вдалася — пробую готову збірку з GitHub"; use_prebuilt || die "Сайт НЕ змінено"; }
      else
        info "Node.js на хостингу немає — використовую готову збірку з GitHub"
        use_prebuilt || die "Сайт НЕ змінено"
      fi
      ;;
  esac

  install_site
  check_site
  echo; line
  echo "  ${G}✓${N} ${B}Готово!${N} ${SITE_URL:+Відкрийте $SITE_URL }${D}(оновіть сторінку)${N}"
  line; echo
}

pick_target() {
  local dirs=() d i n
  for d in "$HOME"/www/*/ "$HOME"/*/www/ "$HOME"/public_html/; do
    [ -d "$d" ] && dirs+=("${d%/}")
  done
  if [ -n "$TARGET" ]; then
    read -r -p "  Папка сайту [$TARGET] (Enter — залишити): " d
    [ -n "$d" ] && TARGET="$d"
  elif [ ${#dirs[@]} -eq 1 ]; then
    TARGET="${dirs[0]}"
    ok "Папка сайту: $TARGET"
  elif [ ${#dirs[@]} -gt 1 ]; then
    echo "  Знайдено кілька папок сайтів:"
    i=1; for d in "${dirs[@]}"; do echo "    ${A}$i${N}) $d"; i=$((i + 1)); done
    read -r -p "  Оберіть номер: " n
    [[ "$n" =~ ^[0-9]+$ ]] && [ "$n" -ge 1 ] && [ "$n" -le ${#dirs[@]} ] || die "Невірний номер"
    TARGET="${dirs[$((n - 1))]}"
  else
    warn "Папку сайту не знайдено. Додайте сайт: панель CityHost → Хостинг 2.0 → Сайти"
    read -r -p "  Або введіть шлях вручну (напр. $HOME/www/домен.ua): " TARGET
  fi
  TARGET="${TARGET%/}"
  case "$TARGET" in "$HOME"/?*) ;; *) die "Папка має бути всередині $HOME" ;; esac
}

cmd_setup() {
  echo; line; echo "  ${B}Налаштування оновлення сайту${N}"; line

  local v
  read -r -p "  Репозиторій GitHub (логін/назва)${REPO:+ [$REPO]}: " v
  v="${v#https://github.com/}"; v="${v%/}"; v="${v%.git}"
  REPO="${v:-$REPO}"
  [[ "$REPO" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] || die "Формат: логін/назва, напр. yuriy/antikvar"

  read -r -p "  Гілка з кодом [$BRANCH]: " v
  BRANCH="${v:-$BRANCH}"

  echo "  ${D}Токен GitHub потрібен лише для ПРИВАТНОГО репозиторію (права: Contents — Read).${N}"
  echo "  ${D}Ввід прихований. Enter — ${TOKEN:+залишити поточний}${TOKEN:-без токена}.${N}"
  read -r -s -p "  Токен: " v; echo
  [ -n "$v" ] && TOKEN="$v"

  local code
  code=$(gh_fetch "" "$WORK/repo.json")
  [ "$code" = "200" ] || die "Немає доступу до $REPO: $(explain_http "$code")"
  ok "Доступ до репозиторію є"

  pick_target

  if [ -z "$SITE_URL" ]; then
    case "$TARGET" in
      */www/*.*) SITE_URL="https://${TARGET##*/}" ;;
      */*.*/www) v="${TARGET%/www}"; SITE_URL="https://${v##*/}" ;;
    esac
  fi
  read -r -p "  Адреса сайту${SITE_URL:+ [$SITE_URL]}: " v
  SITE_URL="${v:-$SITE_URL}"; SITE_URL="${SITE_URL%/}"

  save_conf
  ok "Збережено в ~/.antikvar.conf (доступ лише вам)"

  # Скрипт — у домашню папку, коротка команда update-site
  local me; me="$(cd "$(dirname "$0")" 2>/dev/null && pwd)/$(basename "$0")"
  if [ -f "$me" ] && [ "$me" != "$SELF" ]; then cp "$me" "$SELF"; fi
  chmod 700 "$SELF" 2>/dev/null
  for rc in "$HOME/.bashrc" "$HOME/.profile"; do
    [ -f "$rc" ] || touch "$rc"
    grep -q "alias update-site=" "$rc" 2>/dev/null || echo "alias update-site='bash ~/antikvar.sh'" >> "$rc"
  done
  ok "Додано коротку команду: update-site (працює після перепідключення)"

  if node_ok; then
    ok "Node $(node -v) є — сайт збиратиметься прямо на сервері"
  else
    echo
    echo "  Node.js на хостингу немає. Варіанти:"
    echo "   ${A}1${N}) встановити Node.js зараз — збірка на сервері, GitHub Actions не потрібен"
    echo "   ${A}2${N}) брати готову збірку з GitHub Actions (гілка build)"
    read -r -p "  Ваш вибір [1/2]: " v
    if [ "$v" = "1" ]; then cmd_install_node; fi
  fi

  echo
  ok "Налаштування завершено. Оновлення сайту:  ${B}bash ~/antikvar.sh${N}  або  ${B}update-site${N}"
  echo
  read -r -p "  Оновити сайт зараз? [Y/n]: " v
  case "$v" in [Nn]*|[Нн]*) exit 0 ;; esac
  cmd_update
  exit 0
}

cmd_rollback() {
  [ -n "$TARGET" ] || die "Скрипт не налаштовано (bash ~/antikvar.sh setup)"
  local last
  last=$(ls -1t "$BACKUPS"/site-*.tgz "$BACKUPS"/site-*.zip 2>/dev/null | head -n1)
  [ -n "$last" ] || die "Резервних копій немає"
  echo "  Повернути сайт до копії ${B}$(basename "$last")${N}?"
  read -r -p "  [y/N]: " a
  case "$a" in [YyТтДд]*) ;; *) echo "  Скасовано"; exit 0 ;; esac
  case "$last" in
    *.tgz) tar xzf "$last" -C "$TARGET" ;;
    *.zip)
      if command -v unzip >/dev/null 2>&1; then unzip -oq "$last" -d "$TARGET"
      else php -r '$z=new ZipArchive; $z->open($argv[1]) === true && $z->extractTo($argv[2]);' "$last" "$TARGET"; fi ;;
  esac || die "Не вдалося відновити"
  ok "Сайт повернуто до $(basename "$last")"
}

cmd_status() {
  echo; line; echo "  ${B}Стан${N}"; line
  echo "  Репозиторій:  ${REPO:-—} (${BRANCH})"
  echo "  Токен:        $([ -n "$TOKEN" ] && echo "так (…${TOKEN: -4})" || echo "ні")"
  echo "  Папка сайту:  ${TARGET:-—}"
  echo "  Адреса:       ${SITE_URL:-—}"
  echo "  Режим:        $MODE"
  if node_ok; then echo "  Node.js:      $(node -v) — збірка на сервері"; else echo "  Node.js:      немає — готова збірка з GitHub"; fi
  echo "  Останнє оновлення: $(cat "$WORK/last-deploy" 2>/dev/null || echo —)"
  echo "  Резервні копії:"
  ls -1t "$BACKUPS"/site-* 2>/dev/null | head -n "$KEEP" | sed "s|$HOME|  ~|" || true
  [ -n "$(ls "$BACKUPS"/site-* 2>/dev/null)" ] || echo "    —"
  echo
}

cmd_self_update() {
  [ -n "$REPO" ] || die "Скрипт не налаштовано (bash ~/antikvar.sh setup)"
  local code
  code=$(gh_fetch "contents/scripts/server/antikvar.sh?ref=$BRANCH" "$SELF.new" "application/vnd.github.raw")
  [ "$code" = "200" ] || { rm -f "$SELF.new"; die "Не вдалося: $(explain_http "$code")"; }
  chmod 700 "$SELF.new" && mv "$SELF.new" "$SELF"
  ok "Скрипт оновлено"
}

admin_php() {
  local api=""
  if [ -n "$TARGET" ] && [ -f "$TARGET/api.php" ]; then
    api="$TARGET/api.php"
  else
    api=$(ls -1 "$HOME"/www/*/api.php "$HOME"/*/www/api.php "$HOME"/public_html/api.php 2>/dev/null | head -n1)
  fi
  [ -n "$api" ] || die "api.php не знайдено — спочатку оновіть сайт: bash ~/antikvar.sh"
  command -v php >/dev/null 2>&1 || die "Команда php недоступна в терміналі. Код лежить у файлі ~/antikvar-data/SETUP-CODE.txt"
  php "$api" "$@"
}

# Збірка проекту, що вже лежить на сервері (напр. у домашній папці) — без GitHub
cmd_local() {
  local dir="${1:-}"
  if [ -z "$dir" ]; then
    if [ -f "$HOME/package.json" ]; then dir="$HOME"; else dir="$PWD"; fi
  fi
  dir="$(cd "$dir" 2>/dev/null && pwd)" || die "Папку «$1» не знайдено"
  [ -f "$dir/package.json" ] && [ -f "$dir/vite.config.ts" ] && [ -d "$dir/src" ] \
    || die "У $dir немає проекту сайту (package.json, vite.config.ts, src/)"
  case "$dir" in "$TARGET"|"$TARGET"/*) [ -n "$TARGET" ] && die "Проект не можна збирати в папці сайту — перенесіть його, напр. у ~" ;; esac
  node_ok || die "Потрібен Node.js 20.19+ або 22.12+. Встановіть: bash ~/antikvar.sh install-node"

  if [ -z "$TARGET" ]; then
    pick_target
    if [ -z "$SITE_URL" ]; then
      case "$TARGET" in */www/*.*) SITE_URL="https://${TARGET##*/}" ;; esac
    fi
    save_conf
  fi

  echo; line
  echo "  ${B}Салон «АнтикварЪ»${N} — збірка з сервера"
  echo "  ${D}$dir → $TARGET${N}"
  line

  step "Збірка (Node $(node -v))"
  (
    cd "$dir" || exit 1
    local hash
    hash=$(cat package.json package-lock.json 2>/dev/null | cksum | cut -d' ' -f1)
    if [ ! -d node_modules ] || [ "$(cat node_modules/.akv-hash 2>/dev/null)" != "$hash" ] || ! deps_match >/dev/null 2>&1; then
      install_deps || exit 1
      echo "$hash" > node_modules/.akv-hash
    fi
    rm -rf dist
    echo "  ${D}Збірка...${N}"
    if ! run_build; then
      echo "  ${Y}!${N} Збірка не вдалася — перевстановлюю залежності начисто і пробую ще раз"
      tail -n 4 "$WORK/build.log" | sed 's/^/    /'
      install_deps || exit 1
      echo "$hash" > node_modules/.akv-hash
      run_build || { echo "  ${Y}!${N} Збірка не вдалася — лог: $WORK/build.log"; tail -n 12 "$WORK/build.log"; exit 1; }
    fi
    local args=(--no-zip)
    [ -n "$SITE_URL" ] && args+=("--url=$SITE_URL")
    node scripts/prepare-deploy.mjs "${args[@]}" >>"$WORK/build.log" 2>&1 \
      || { echo "  ${Y}!${N} Підготовка не вдалася — лог: $WORK/build.log"; exit 1; }
  ) || die "Збірка не вдалася — сайт НЕ змінено"
  ok "Зібрано"

  if [ -f "$dir/scripts/server/antikvar.sh" ] && ! cmp -s "$dir/scripts/server/antikvar.sh" "$SELF"; then
    cp "$dir/scripts/server/antikvar.sh" "$SELF.new" && chmod 700 "$SELF.new" && mv "$SELF.new" "$SELF"
    info "Скрипт ~/antikvar.sh оновлено з проекту"
  fi

  STAGE="$dir/dist"
  install_site
  check_site
  echo; line
  echo "  ${G}✓${N} ${B}Готово!${N} ${SITE_URL:+Відкрийте $SITE_URL }${D}(оновіть сторінку)${N}"
  line; echo
}

# ==================================================================
#  АВТОЗБІРКА НА СЕРВЕРІ
#  cron щохвилини викликає «tick»: якщо вихідні файли проекту змінились
#  (FTP, файловий менеджер, git) — збирає і оновлює сайт.
# ==================================================================
AUTO_LOG="$WORK/auto.log"
AUTO_STATE="$WORK/auto.state"      # статус|час|відбиток|секунд
AUTO_BEAT="$WORK/auto.heartbeat"   # час останнього запуску cron
CRON_CMD="/bin/bash $HOME/antikvar.sh tick"

auto_log() { printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >>"$AUTO_LOG"; }

rotate_log() {
  [ -f "$AUTO_LOG" ] || return 0
  if [ "$(wc -c <"$AUTO_LOG" 2>/dev/null || echo 0)" -gt 1000000 ]; then
    tail -n 3000 "$AUTO_LOG" >"$AUTO_LOG.tmp" && mv "$AUTO_LOG.tmp" "$AUTO_LOG"
  fi
}

src_items() {
  local f
  for f in src public scripts index.html vite.config.ts package.json package-lock.json tsconfig.json tsconfig.app.json tsconfig.node.json; do
    [ -e "$PROJECT/$f" ] && printf '%s\n' "$PROJECT/$f"
  done
}

# Відбиток вихідних файлів: шлях + розмір + час зміни
src_fingerprint() {
  local items=()
  mapfile -t items < <(src_items)
  [ ${#items[@]} -gt 0 ] || { echo none; return; }
  find "${items[@]}" -type f ! -name '*.swp' ! -name '*.tmp' ! -name '.DS_Store' ! -name '*~' \
    -printf '%p|%s|%T@\n' 2>/dev/null | sort | cksum | cut -d' ' -f1
}

# Скільки секунд тому змінювався останній вихідний файл
src_quiet_for() {
  local items=() newest
  mapfile -t items < <(src_items)
  [ ${#items[@]} -gt 0 ] || { echo 9999; return; }
  newest=$(find "${items[@]}" -type f -printf '%T@\n' 2>/dev/null | sort -n | tail -n1)
  newest=${newest%.*}
  [ -n "$newest" ] || { echo 9999; return; }
  echo $(( $(date +%s) - newest ))
}

last_built_fp() { cut -d'|' -f3 "$AUTO_STATE" 2>/dev/null; }

acquire_lock() {
  if command -v flock >/dev/null 2>&1; then
    exec 9>"$WORK/auto.lock"
    flock -n 9
  else
    local d="$WORK/auto.lockdir"
    [ -d "$d" ] && [ -n "$(find "$d" -maxdepth 0 -mmin +30 2>/dev/null)" ] && rmdir "$d" 2>/dev/null
    mkdir "$d" 2>/dev/null || return 1
    trap 'rmdir "$WORK/auto.lockdir" 2>/dev/null' EXIT
  fi
}

# auto_build <причина> <live|quiet>  → 0, якщо сайт оновлено
auto_build() {
  local reason="$1" how="$2" fp rc start dur
  fp=$(src_fingerprint)
  start=$(date +%s)
  auto_log "▸ Збірка ($reason)"
  if [ "$how" = "live" ]; then
    ( cmd_local "$PROJECT" ) 2>&1 | tee -a "$AUTO_LOG"
    rc=${PIPESTATUS[0]}
  else
    ( B=''; G=''; Y=''; R=''; D=''; A=''; N=''; cmd_local "$PROJECT" ) >>"$AUTO_LOG" 2>&1
    rc=$?
  fi
  dur=$(( $(date +%s) - start ))
  if [ "$rc" -eq 0 ]; then
    echo "ok|$(date '+%Y-%m-%d %H:%M:%S')|$fp|$dur" >"$AUTO_STATE"
    auto_log "✓ Сайт оновлено за $dur с"
  else
    echo "fail|$(date '+%Y-%m-%d %H:%M:%S')|$fp|$dur" >"$AUTO_STATE"
    auto_log "✗ Збірка не вдалася — на сайті лишилась попередня версія. Виправте помилку і збережіть файл ще раз"
  fi
  return "$rc"
}

install_cron() {
  local entry="* * * * * $CRON_CMD >/dev/null 2>&1" cur
  if command -v crontab >/dev/null 2>&1; then
    cur=$(crontab -l 2>/dev/null | grep -v 'antikvar.sh tick')
    if printf '%s\n%s\n' "$cur" "$entry" | sed '/^$/d' | crontab - 2>/dev/null \
       && crontab -l 2>/dev/null | grep -q 'antikvar.sh tick'; then
      ok "Завдання додано в cron: перевірка змін щохвилини"
      return 0
    fi
  fi
  warn "Додати завдання автоматично не вийшло — додайте його один раз у панелі CityHost:"
  echo "    1. cp.cityhost.ua → Хостинг 2.0 → Керування → ${B}CRON${N} → «+»"
  echo "    2. «Складне завдання», команда:"
  echo "         ${B}$CRON_CMD${N}"
  echo "    3. Розклад: ${B}* * * * *${N}  (щохвилини; якщо не дозволено — ${B}*/5 * * * *${N})"
  echo "    Перевірити через 2 хвилини:  ${B}bash ~/antikvar.sh auto status${N}"
  return 1
}

# ---------- bash ~/antikvar.sh auto ----------
cmd_auto_on() {
  echo; line; echo "  ${B}Автозбірка на сервері — налаштування${N}"; line

  # 1. Скрипт — у домашню папку (звідти його запускає cron)
  local me; me="$(cd "$(dirname "$0")" 2>/dev/null && pwd)/$(basename "$0")"
  if [ -f "$me" ] && [ "$me" != "$SELF" ]; then
    cp "$me" "$SELF.new" && chmod 700 "$SELF.new" && mv "$SELF.new" "$SELF" && ok "Скрипт встановлено: ~/antikvar.sh"
  fi
  chmod 700 "$SELF" 2>/dev/null

  # 2. Проект
  local dir="${1:-$PROJECT}"
  if [ -z "$dir" ]; then
    if [ -f "$HOME/package.json" ]; then dir="$HOME"; else dir="$PWD"; fi
  fi
  dir="$(cd "$dir" 2>/dev/null && pwd)" || die "Папку «$dir» не знайдено"
  if [ -f "$dir/package.json" ] && [ -f "$dir/vite.config.ts" ] && [ -d "$dir/src" ]; then
    PROJECT="$dir"
    ok "Проект: $PROJECT (збірка з вихідних файлів на сервері)"
  else
    PROJECT=""
    ok "Режим «лише архів»: сайт оновлюється, коли ви перетягуєте antikvar-site.tgz (Netcatty)"
  fi

  # 3. Папка сайту
  if [ -z "$TARGET" ]; then
    if [ -d "$HOME/www/antikvardp.net" ]; then TARGET="$HOME/www/antikvardp.net"; else pick_target; fi
  fi
  if [ -n "$PROJECT" ]; then
    case "$PROJECT" in "$TARGET"|"$TARGET"/*) die "Проект лежить у папці сайту — перенесіть його в домашню папку" ;; esac
  fi
  if [ -z "$SITE_URL" ]; then
    case "$TARGET" in */www/*.*) SITE_URL="https://${TARGET##*/}" ;; esac
  fi
  ok "Сайт: $TARGET${SITE_URL:+ ($SITE_URL)}"

  AUTO_GIT=0
  if [ -n "$PROJECT" ]; then
    # 4. Node.js (запамʼятовуємо шлях — у cron немає налаштувань терміналу)
    if ! node_ok; then
      warn "Потрібен Node.js 20.19+ або 22.12+ — встановлюю"
      cmd_install_node
      node_ok || die "Node.js не встановився"
    fi
    NODE_BIN="$(dirname "$(command -v node)")"
    ok "Node $(node -v) · $NODE_BIN"

    # 5. Git (необовʼязково)
    if [ -d "$PROJECT/.git" ] && command -v git >/dev/null 2>&1 && [ -n "$(git -C "$PROJECT" remote 2>/dev/null)" ]; then
      AUTO_GIT=1
      ok "Git-репозиторій: перед кожною перевіркою — git pull"
    fi
  fi

  AUTO=on
  save_conf

  # 6. Перша заливка
  if [ -f "$ARCHIVE_IN" ]; then
    ( cmd_unpack ) || warn "Архів залити не вдалося. Автозаливка все одно увімкнена: перетягніть архів ще раз"
  elif [ -n "$PROJECT" ]; then
    step "Перша збірка і заливка"
    if acquire_lock; then
      auto_build "перший запуск" live \
        || warn "Перша збірка не вдалася. Автозбірка все одно увімкнена: виправте помилку, і сайт оновиться сам"
    else
      warn "Зараз уже йде збірка — пропускаю"
    fi
  fi

  # 7. Розклад
  step "Розклад (cron)"
  local cron_ok=1
  install_cron || cron_ok=0

  echo; line
  echo "  ${G}✓${N} ${B}Автозбірку увімкнено${N}"
  echo "  ${B}Netcatty:${N} перетягніть ${B}antikvar-site.tgz${N} у домашню папку — сайт оновиться ${B}протягом хвилини${N}."
  if [ -n "$PROJECT" ]; then
    local via="Netcatty, FTP або файловий менеджер CityHost"
    [ "$AUTO_GIT" = "1" ] && via="Netcatty, FTP, файловий менеджер або git push"
    echo "  Або змінюйте вихідні файли в ${B}$PROJECT${N} (src/, public/…) через $via — теж за хвилину."
  fi
  echo "  Помилка не ламає сайт — лишається остання робоча версія."
  [ "$cron_ok" -eq 1 ] || echo "  ${Y}Не забудьте додати завдання CRON у панелі (див. вище)${N}"
  echo
  echo "  ${D}bash ~/antikvar.sh auto status   стан і остання збірка${N}"
  echo "  ${D}bash ~/antikvar.sh auto log      журнал${N}"
  echo "  ${D}bash ~/antikvar.sh watch         миттєво (3–5 с), поки відкритий Termius${N}"
  echo "  ${D}bash ~/antikvar.sh auto off      вимкнути${N}"
  line; echo
}

# ==================================================================
#  ЗАЛИВКА АРХІВОМ (Netcatty, файловий менеджер, будь-який SFTP)
#  На компʼютері: ЗІБРАТИ-ДЛЯ-NETCATTY.bat → папка ДЛЯ-NETCATTY
#  Перетягнути antikvar-site.tgz і antikvar.sh у домашню папку → unpack
# ==================================================================
ARCHIVE_IN="$HOME/antikvar-site.tgz"

cmd_unpack() {
  local arc="${1:-$ARCHIVE_IN}"
  [ -f "$arc" ] || die "Архів не знайдено: $arc
    Перетягніть antikvar-site.tgz з папки ДЛЯ-NETCATTY у домашню папку сервера (Netcatty → SFTP)"

  if [ -z "$TARGET" ]; then
    if [ -d "$HOME/www/antikvardp.net" ]; then TARGET="$HOME/www/antikvardp.net"; else pick_target; fi
    if [ -z "$SITE_URL" ]; then
      case "$TARGET" in */www/*.*) SITE_URL="https://${TARGET##*/}" ;; esac
    fi
    save_conf
  fi

  echo; line
  echo "  ${B}Салон «АнтикварЪ»${N} — заливка архіву"
  echo "  ${D}$(basename "$arc") → $TARGET${N}"
  line

  step "Крок 1 з 3 · Перевірка архіву"
  # Архів ще докачується? Розмір має не змінюватись 3 секунди
  local s1 s2
  s1=$(stat -c %s "$arc" 2>/dev/null || echo 0); sleep 3; s2=$(stat -c %s "$arc" 2>/dev/null || echo 0)
  [ "$s1" = "$s2" ] || die "Архів ще завантажується — зачекайте, поки Netcatty закінчить, і запустіть ще раз"
  local list
  list=$(tar tzf "$arc" 2>/dev/null) || die "Архів пошкоджений або завантажився не повністю — перетягніть його ще раз"
  if printf '%s\n' "$list" | grep -qE '(^/|(^|/)\.\.(/|$))'; then
    die "Архів містить небезпечні шляхи — заливку скасовано"
  fi
  local st="$WORK/unpack"
  rm -rf "$st"; mkdir -p "$st"
  tar xzf "$arc" -C "$st" || die "Не вдалося розпакувати архів"
  ok "Архів цілий: $(printf '%s\n' "$list" | grep -vc '/$') файлів"

  STAGE="$st"
  INSTALL_TITLE="Крок 2 з 3 · Резервна копія і заміна сайту" install_site

  # Прибрати файли, що були в попередньому архіві, але зникли з нового
  local newlist="$WORK/unpack-files.new" oldlist="$WORK/unpack-files.txt" removed=0
  (cd "$st" && find . -type f | sed 's|^\./||' | LC_ALL=C sort) >"$newlist"
  if [ -f "$oldlist" ]; then
    removed=$(LC_ALL=C comm -23 "$oldlist" "$newlist" | while IFS= read -r f; do
      case "$f" in ''|/*|*..*) continue ;; esac
      rm -f "${TARGET:?}/$f" && echo x
    done | wc -l | tr -d ' ')
  fi
  mv "$newlist" "$oldlist"
  [ "$removed" -gt 0 ] && info "Прибрано застарілих файлів: $removed"

  # Архів більше не потрібен (і автозбірка не залле його вдруге)
  mv -f "$arc" "$WORK/last-site.tgz"
  rm -rf "$st"

  CHECK_TITLE="Крок 3 з 3 · Перевірка сайту" check_site
  echo; line
  echo "  ${G}✓${N} ${B}Готово!${N} ${SITE_URL:+Відкрийте $SITE_URL }${D}(оновіть сторінку: Ctrl+F5)${N}"
  echo "  ${D}Повернути попередню версію: bash ~/antikvar.sh rollback${N}"
  line; echo
}

# ---------- cron: щохвилини ----------
cmd_tick() {
  date +%s >"$AUTO_BEAT"
  [ "$AUTO" = "on" ] || exit 0

  # Перетягнули архів через Netcatty → заливаємо, щойно він докачався
  if [ -f "$ARCHIVE_IN" ]; then
    local age=$(( $(date +%s) - $(stat -c %Y "$ARCHIVE_IN" 2>/dev/null || date +%s) ))
    [ "$age" -ge 20 ] || exit 0
    acquire_lock || exit 0
    rotate_log
    auto_log "▸ Знайдено antikvar-site.tgz — заливаю"
    if ( B=''; G=''; Y=''; R=''; D=''; A=''; N=''; cmd_unpack ) >>"$AUTO_LOG" 2>&1; then
      auto_log "✓ Сайт оновлено з архіву"
    else
      mv -f "$ARCHIVE_IN" "$WORK/bad-site.tgz" 2>/dev/null
      auto_log "✗ Архів не вдалося залити (збережено як ~/.antikvar/bad-site.tgz) — зберіть і перетягніть ще раз"
    fi
    exit 0
  fi

  [ -n "$PROJECT" ] && [ -d "$PROJECT/src" ] || exit 0
  [ -n "$NODE_BIN" ] && export PATH="$NODE_BIN:$PATH"
  acquire_lock || exit 0
  rotate_log

  if [ "$AUTO_GIT" = "1" ] && command -v git >/dev/null 2>&1; then
    local out
    out=$(timeout 40 git -C "$PROJECT" pull --ff-only -q 2>&1) || auto_log "! git pull не вдався: ${out:0:200}"
  fi

  [ "$(src_fingerprint)" = "$(last_built_fp)" ] && exit 0

  # Чекаємо, поки завантаження файлів закінчиться (20 с без змін)
  local i
  for i in 1 2 3; do
    [ "$(src_quiet_for)" -ge 20 ] && break
    sleep 15
  done
  [ "$(src_quiet_for)" -ge 20 ] || exit 0

  auto_build "зміни у файлах" quiet
}

# ---------- миттєва автозбірка, поки відкритий термінал ----------
cmd_watch() {
  [ -n "$PROJECT" ] && [ -n "$TARGET" ] || die "Спочатку налаштуйте: bash ~/antikvar.sh auto"
  [ -n "$NODE_BIN" ] && export PATH="$NODE_BIN:$PATH"
  acquire_lock || die "Зараз іде автозбірка — зачекайте хвилину і запустіть ще раз"
  echo; line
  echo "  ${B}Миттєва автозбірка${N} — стежу за $PROJECT"
  echo "  ${D}Збережіть файл → за 3–5 с на сайті. Вихід: Ctrl+C${N}"
  line
  local fp prev=""
  while true; do
    fp=$(src_fingerprint)
    if [ "$fp" != "$(last_built_fp)" ] && [ "$fp" = "$prev" ]; then
      printf '  %s зміни → збірка… ' "$(date +%H:%M:%S)"
      if auto_build "watch" quiet; then
        echo "${G}✓ на сайті${N}"
      else
        echo "${R}✗ помилка${N} — на сайті попередня версія"
        tail -n 12 "$WORK/build.log" 2>/dev/null | sed 's/^/    /'
      fi
    fi
    prev="$fp"
    sleep 3
  done
}

cmd_auto_now() {
  [ -n "$PROJECT" ] || die "Спочатку налаштуйте: bash ~/antikvar.sh auto"
  [ -n "$NODE_BIN" ] && export PATH="$NODE_BIN:$PATH"
  acquire_lock || die "Зараз уже йде збірка — зачекайте хвилину"
  auto_build "вручну" live
}

cmd_auto_off() {
  AUTO=off
  save_conf
  if command -v crontab >/dev/null 2>&1 && crontab -l 2>/dev/null | grep -q 'antikvar.sh tick'; then
    crontab -l 2>/dev/null | grep -v 'antikvar.sh tick' | crontab - && ok "Завдання прибрано з cron"
  else
    info "Якщо завдання додавали в панелі CityHost (CRON), його можна видалити там. Нічого не зламається — скрипт уже не збиратиме."
  fi
  ok "Автозбірку вимкнено. Увімкнути знову: bash ~/antikvar.sh auto"
}

cmd_auto_status() {
  echo; line; echo "  ${B}Автозбірка${N}"; line
  if [ "$AUTO" = "on" ]; then echo "  Стан:     ${G}увімкнено${N}"; else echo "  Стан:     вимкнено (увімкнути: bash ~/antikvar.sh auto)"; fi
  echo "  Проект:   ${PROJECT:-—}"
  echo "  Сайт:     ${TARGET:-—}${SITE_URL:+ ($SITE_URL)}"
  if [ -f "$AUTO_BEAT" ]; then
    local age=$(( $(date +%s) - $(cat "$AUTO_BEAT") ))
    if [ "$age" -lt 400 ]; then
      echo "  Cron:     ${G}працює${N} (остання перевірка $age с тому)"
    else
      echo "  Cron:     ${Y}не запускався $((age / 60)) хв${N} — перевірте завдання в панелі CityHost → CRON"
    fi
  else
    echo "  Cron:     ${Y}ще жодного запуску${N} — додайте завдання: ${B}$CRON_CMD${N} (* * * * *)"
  fi
  if [ -f "$AUTO_STATE" ]; then
    local st t fp dur
    IFS='|' read -r st t fp dur <"$AUTO_STATE"
    if [ "$st" = "ok" ]; then echo "  Збірка:   $t — ${G}успішно${N} за $dur с"; else echo "  Збірка:   $t — ${R}помилка${N} (деталі: bash ~/antikvar.sh auto log)"; fi
  fi
  if [ -n "$PROJECT" ] && [ "$(src_fingerprint)" != "$(last_built_fp)" ]; then
    echo "  ${Y}Є незібрані зміни${N} — зберуться протягом хвилини (або: bash ~/antikvar.sh auto now)"
  fi
  if [ -f "$AUTO_LOG" ]; then
    echo; echo "  Останні події:"
    grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2} ' "$AUTO_LOG" | tail -n 6 | sed 's/^/    /'
  fi
  echo
}

cmd_auto() {
  case "${1:-on}" in
    on|"")        cmd_auto_on "${2:-}" ;;
    off|stop)     cmd_auto_off ;;
    status|info)  cmd_auto_status ;;
    log|logs)     if [ -f "$AUTO_LOG" ]; then tail -n 80 "$AUTO_LOG"; else echo "Журнал порожній"; fi ;;
    now|build)    cmd_auto_now ;;
    /*|.*|~*)     cmd_auto_on "$1" ;;
    *) die "Невідома команда «auto $1». Є: auto, auto status, auto log, auto now, auto off" ;;
  esac
}

cmd_db_setup() {
  echo; line; echo "  ${B}Підключення бази MySQL${N}"; line
  echo "  ${D}Дані з панелі CityHost (Хостинг 2.0 → MySQL). Enter — значення в дужках.${N}"
  local host name user pass v
  read -r -p "  Сервер бази [127.0.0.1]: " host;  host="${host:-127.0.0.1}"
  read -r -p "  Імʼя бази [$USER]: " name;         name="${name:-$USER}"
  read -r -p "  Користувач [$USER]: " user;        user="${user:-$USER}"
  read -r -s -p "  Пароль MySQL (не відображається): " pass; echo
  [ -n "$pass" ] || die "Пароль не введено"

  mkdir -p "$HOME/antikvar-data" && chmod 700 "$HOME/antikvar-data"
  local f="$HOME/antikvar-data/db.php"
  # значення передаємо через змінні середовища — пароль не потрапляє в історію команд
  AKV_H="$host" AKV_N="$name" AKV_U="$user" AKV_P="$pass" php -r '
    $c = ["host" => getenv("AKV_H"), "name" => getenv("AKV_N"), "user" => getenv("AKV_U"), "pass" => getenv("AKV_P")];
    try { new PDO("mysql:host={$c["host"]};dbname={$c["name"]};charset=utf8mb4", $c["user"], $c["pass"]); }
    catch (Exception $e) { fwrite(STDERR, "  ✗ Не вдалося підключитися: " . $e->getMessage() . "\n"); exit(1); }
    file_put_contents($argv[1], "<?php\nreturn " . var_export($c, true) . ";\n");
  ' "$f" || die "Перевірте дані бази в панелі CityHost"
  chmod 600 "$f"
  ok "Збережено: ~/antikvar-data/db.php (доступ лише вам)"
  admin_php db-test
}

cmd_reset_password() {
  local login="${1:-}"
  if [ -z "$login" ]; then
    admin_php users
    echo
    read -r -p "  Логін, для якого скинути пароль: " login
  fi
  [ -n "$login" ] || die "Логін не вказано"
  admin_php reset-password "$login"
}

case "${1:-update}" in
  auto|autobuild)          cmd_auto "${2:-}" "${3:-}" ;;
  tick)                    cmd_tick ;;
  unpack|netcatty)         cmd_unpack "${2:-}" ;;
  watch)                   cmd_watch ;;
  admin-code|setup-code)   admin_php setup-code ;;
  reset-password)          cmd_reset_password "${2:-}" ;;
  admin-users)             admin_php users ;;
  db-setup)                cmd_db_setup ;;
  db-test)                 admin_php db-test ;;
  doctor|check)            cmd_doctor ;;
  local|build-local)       cmd_local "${2:-}" ;;
  update|deploy|"")        cmd_update "${2:-}" ;;
  --build|--prebuilt)      cmd_update "$1" ;;
  setup|init)              cmd_setup ;;
  rollback|undo)           cmd_rollback ;;
  status|info)             cmd_status ;;
  install-node|node)       cmd_install_node ;;
  self-update)             cmd_self_update ;;
  help|-h|--help)          sed -n '2,/^set -uo/p' "$0" | sed '$d' | sed 's/^# \{0,1\}//' ;;
  *) die "Невідома команда «$1». Допомога: bash ~/antikvar.sh help" ;;
esac
