<?php
/**
 * ==================================================================
 *  API салону «АнтикварЪ» — заявки, власник і помічники
 * ==================================================================
 *  Дані: ~/antikvar-data/*.json (ПОЗА папкою сайту — не зникають при
 *  оновленні сайту і недоступні з браузера).
 *
 *  Ролі:
 *    owner      — власник: усе + керування командою
 *    assistant  — помічник: права вмикає/вимикає власник
 *
 *  Права перевіряються ТУТ, на сервері (а не лише в інтерфейсі).
 *
 *  Команди для Termius (у папці сайту):
 *    php api.php setup-code              код першого налаштування
 *    php api.php reset-password <логін>  згенерувати новий пароль
 *    php api.php users                   список користувачів
 * ==================================================================
 */

const APP_ID = 'antikvar';
const API_VERSION = 1;
const SESSION_TTL = 43200; // 12 годин без активності
const GRANTABLE = ['requests.create', 'requests.delete', 'offers.make', 'finance.view', 'data.export', 'settings.edit', 'audit.view'];
const CONTACTS = ['phone', 'telegram', 'viber', 'whatsapp', 'email'];
const STATUSES = ['new', 'reviewing', 'meeting', 'completed', 'rejected'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

// ------------------------------------------------------------------
//  Утиліти
// ------------------------------------------------------------------
function json_out(array $data, $code = 200)
{
    if (PHP_SAPI === 'cli') {
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), "\n";
        exit($code < 400 ? 0 : 1);
    }
    http_response_code($code);
    echo json_encode(array_merge(['ok' => $code < 400], $data), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail($code, $msg)
{
    if (PHP_SAPI === 'cli') {
        fwrite(STDERR, "✗ $msg\n");
        exit(1);
    }
    json_out(['error' => $msg], $code);
}

function cut($s, $max)
{
    return function_exists('mb_substr') ? mb_substr($s, 0, $max, 'UTF-8') : substr($s, 0, $max);
}

function str_in($v, $max)
{
    return is_scalar($v) ? cut(trim((string) $v), $max) : '';
}

function now_ms()
{
    return (int) round(microtime(true) * 1000);
}

function new_id($prefix)
{
    return $prefix . '_' . bin2hex(random_bytes(6));
}

function valid_id($id)
{
    return is_string($id) && preg_match('/^[A-Za-z0-9_-]{1,64}$/', $id);
}

function valid_login($s)
{
    return is_string($s) && preg_match('/^[a-z0-9._-]{3,32}$/', $s);
}

function check_new_password($p)
{
    if (!is_string($p) || strlen($p) < 8) fail(422, 'Пароль — мінімум 8 символів');
    if (strlen($p) > 200) fail(422, 'Пароль задовгий');
}

function random_str($len, $abc)
{
    $s = '';
    for ($i = 0; $i < $len; $i++) $s .= $abc[random_int(0, strlen($abc) - 1)];
    return $s;
}

function client_ip()
{
    return isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : 'cli';
}

// ------------------------------------------------------------------
//  Сховище (JSON-файли з блокуванням)
// ------------------------------------------------------------------
function home_dir()
{
    if (function_exists('posix_getpwuid') && function_exists('posix_geteuid')) {
        $pw = @posix_getpwuid(posix_geteuid());
        if (!empty($pw['dir']) && is_dir($pw['dir'])) return rtrim($pw['dir'], '/');
    }
    $h = getenv('HOME');
    if ($h && is_dir($h)) return rtrim($h, '/');
    if (preg_match('~^(/home\d*/[^/]+)~', __DIR__, $m)) return $m[1];
    return dirname(__DIR__);
}

function data_dir()
{
    static $dir = null;
    if ($dir !== null) return $dir;
    foreach ([home_dir() . '/antikvar-data', __DIR__ . '/.antikvar-data'] as $c) {
        if (!is_dir($c)) @mkdir($c, 0700, true);
        if (is_dir($c) && is_writable($c)) {
            $dir = $c;
            break;
        }
    }
    if ($dir === null) fail(500, 'Немає папки для збереження даних');
    if (strpos($dir, __DIR__) === 0 && !is_file($dir . '/.htaccess')) {
        @file_put_contents($dir . '/.htaccess', "<IfModule mod_authz_core.c>\n  Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n  Deny from all\n</IfModule>\n");
    }
    return $dir;
}

function pretty_path($p)
{
    $h = home_dir();
    return strpos($p, $h . '/') === 0 ? '~' . substr($p, strlen($h)) : $p;
}

// ------------------------------------------------------------------
//  MySQL (якщо є ~/antikvar-data/db.php) — інакше JSON-файли
//  db.php створює:  bash ~/antikvar.sh db-setup   або   node deploy.mjs --ftp
// ------------------------------------------------------------------
function db_config()
{
    static $cfg = false;
    if ($cfg !== false) return $cfg;
    $cfg = null;
    foreach ([home_dir() . '/antikvar-data/db.php', __DIR__ . '/.antikvar-data/db.php'] as $f) {
        if (!is_file($f)) continue;
        $c = include $f;
        if (is_array($c) && !empty($c['name']) && !empty($c['user'])) {
            $cfg = $c + ['host' => '127.0.0.1', 'pass' => ''];
            break;
        }
    }
    return $cfg;
}

function pdo()
{
    static $pdo = null;
    if ($pdo) return $pdo;
    $c = db_config();
    if (!class_exists('PDO') || !in_array('mysql', PDO::getAvailableDrivers(), true)) {
        fail(500, 'На хостингу немає PHP-розширення pdo_mysql');
    }
    try {
        $pdo = new PDO(
            'mysql:host=' . $c['host'] . ';dbname=' . $c['name'] . ';charset=utf8mb4',
            $c['user'],
            $c['pass'],
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 10]
        );
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS akv_store (
                name VARCHAR(64) NOT NULL PRIMARY KEY,
                data LONGTEXT NOT NULL,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
        );
    } catch (Exception $e) {
        $pdo = null;
        fail(500, 'Немає зʼєднання з базою MySQL — перевірте ~/antikvar-data/db.php (bash ~/antikvar.sh db-setup)');
    }
    return $pdo;
}

function storage_mode()
{
    return db_config() ? 'mysql' : 'files';
}

function db_read($name, $default = [])
{
    if (db_config()) {
        $st = pdo()->prepare('SELECT data FROM akv_store WHERE name = ?');
        $st->execute([$name]);
        $raw = $st->fetchColumn();
        if ($raw === false) {
            // Автоперенесення: дані, що були у файлах до підключення MySQL
            $f = data_dir() . "/$name.json";
            if (is_file($f)) {
                $j = json_decode((string) file_get_contents($f), true);
                if (is_array($j)) {
                    db_write($name, $j);
                    @rename($f, $f . '.migrated');
                    return $j;
                }
            }
            return $default;
        }
        $j = json_decode((string) $raw, true);
        return is_array($j) ? $j : $default;
    }
    $f = data_dir() . "/$name.json";
    if (!is_file($f)) return $default;
    $j = json_decode((string) file_get_contents($f), true);
    return is_array($j) ? $j : $default;
}

function db_write($name, $value)
{
    if (db_config()) {
        $st = pdo()->prepare('INSERT INTO akv_store (name, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)');
        $st->execute([$name, json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
        return;
    }
    $f = data_dir() . "/$name.json";
    $tmp = $f . '.' . bin2hex(random_bytes(4)) . '.tmp';
    if (file_put_contents($tmp, json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) === false) {
        fail(500, 'Не вдалося зберегти дані');
    }
    @chmod($tmp, 0600);
    rename($tmp, $f);
}

function locked(callable $fn)
{
    $h = fopen(data_dir() . '/.lock', 'c');
    flock($h, LOCK_EX);
    try {
        return $fn();
    } finally {
        flock($h, LOCK_UN);
        fclose($h);
    }
}

// ------------------------------------------------------------------
//  Обмеження частоти (вхід, заявки з сайту)
// ------------------------------------------------------------------
function rate_count($bucket, $window)
{
    $all = db_read('rate', []);
    $t = time();
    $n = 0;
    foreach (($all[$bucket . '|' . client_ip()] ?? []) as $x) if ($x > $t - $window) $n++;
    return $n;
}

function rate_add($bucket)
{
    locked(function () use ($bucket) {
        $all = db_read('rate', []);
        $t = time();
        foreach ($all as $k => $v) {
            $all[$k] = array_values(array_filter((array) $v, function ($x) use ($t) {
                return $x > $t - 86400;
            }));
            if (!$all[$k]) unset($all[$k]);
        }
        $all[$bucket . '|' . client_ip()][] = $t;
        db_write('rate', $all);
    });
}

function rate_clear($prefix, $allIps = false)
{
    locked(function () use ($prefix, $allIps) {
        $all = db_read('rate', []);
        foreach (array_keys($all) as $k) {
            if ($allIps ? strpos($k, $prefix . '|') === 0 : $k === $prefix . '|' . client_ip()) unset($all[$k]);
        }
        db_write('rate', $all);
    });
}

// ------------------------------------------------------------------
//  Користувачі та сесії
// ------------------------------------------------------------------
function all_users()
{
    return db_read('users', []);
}

function user_perms(array $u)
{
    if ($u['role'] === 'owner') return array_merge(GRANTABLE, ['users.manage']);
    return array_values(array_intersect(GRANTABLE, isset($u['perms']) ? (array) $u['perms'] : []));
}

function public_user(array $u)
{
    return [
        'id' => $u['id'],
        'login' => $u['login'],
        'name' => $u['name'],
        'role' => $u['role'],
        'permissions' => user_perms($u),
        'active' => !empty($u['active']),
        'createdAt' => $u['createdAt'] ?? 0,
        'lastLoginAt' => $u['lastLoginAt'] ?? null,
    ];
}

function can($u, $perm)
{
    return $u && in_array($perm, user_perms($u), true);
}

function start_session($create)
{
    if (session_status() === PHP_SESSION_ACTIVE) return true;
    session_name('akv_sid');
    if (!$create && empty($_COOKIE['akv_sid'])) return false;
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    if (PHP_VERSION_ID >= 70300) {
        session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Strict']);
    } else {
        session_set_cookie_params(0, '/; samesite=Strict', '', $https, true);
    }
    return session_start();
}

$CURRENT = false;
function current_user()
{
    global $CURRENT;
    if ($CURRENT !== false) return $CURRENT;
    $CURRENT = null;
    if (!start_session(false) || empty($_SESSION['uid'])) return null;
    if (time() - (int) ($_SESSION['seen'] ?? 0) > SESSION_TTL) {
        $_SESSION = [];
        session_destroy();
        return null;
    }
    foreach (all_users() as $u) {
        if ($u['id'] === $_SESSION['uid'] && !empty($u['active'])) {
            $_SESSION['seen'] = time();
            $CURRENT = $u;
            break;
        }
    }
    return $CURRENT;
}

function do_login(array $u)
{
    global $CURRENT;
    start_session(true);
    session_regenerate_id(true);
    $_SESSION['uid'] = $u['id'];
    $_SESSION['seen'] = time();
    $CURRENT = $u;
}

function need_user()
{
    $u = current_user();
    if (!$u) fail(401, 'Сесія завершилась — увійдіть знову');
    return $u;
}

function need_perm($p)
{
    $u = need_user();
    if (!can($u, $p)) fail(403, 'Недостатньо прав для цієї дії');
    return $u;
}

function need_owner()
{
    $u = need_user();
    if ($u['role'] !== 'owner') fail(403, 'Доступно лише власнику');
    return $u;
}

// ------------------------------------------------------------------
//  Журнал дій
// ------------------------------------------------------------------
function audit($u, $action, $target = '', $details = '')
{
    locked(function () use ($u, $action, $target, $details) {
        $log = db_read('audit', []);
        $log[] = [
            't' => now_ms(),
            'uid' => $u['id'] ?? null,
            'name' => $u['name'] ?? 'Сайт',
            'role' => $u['role'] ?? 'public',
            'action' => $action,
            'target' => cut((string) $target, 120),
            'details' => cut((string) $details, 300),
            'ip' => client_ip(),
        ];
        if (count($log) > 2000) $log = array_slice($log, -2000);
        db_write('audit', $log);
    });
}

// ------------------------------------------------------------------
//  Заявки
// ------------------------------------------------------------------
/** Без права «finance.view» суми пропозицій приховуються */
function view_request(array $r, $u)
{
    if (can($u, 'finance.view')) return $r;
    unset($r['myOfferPrice']);
    if (isset($r['messages']) && is_array($r['messages'])) {
        foreach ($r['messages'] as $i => $m) unset($r['messages'][$i]['offerAmount']);
    }
    return $r;
}

/**
 * Обʼєднання змін від користувача зі збереженою заявкою:
 *  • старі повідомлення незмінні (і не видаляються);
 *  • автор нових повідомлень і час — з сервера;
 *  • ціну пропонує лише той, хто має «offers.make»;
 *  • приховані фінанси не затираються.
 */
function merge_request(array $in, $old, array $u)
{
    $now = now_ms();
    $r = $in;
    $r['id'] = $old ? $old['id'] : new_id('req');
    $r['createdAt'] = $old ? $old['createdAt'] : $now;
    $r['createdBy'] = $old ? ($old['createdBy'] ?? null) : $u['name'];
    $r['updatedAt'] = $now;
    $r['updatedBy'] = $u['name'];
    if (!in_array($r['status'] ?? '', STATUSES, true)) $r['status'] = $old['status'] ?? 'new';
    if (!in_array($r['priority'] ?? '', PRIORITIES, true)) $r['priority'] = $old['priority'] ?? 'normal';
    if (isset($r['assignedTo']) && $r['assignedTo'] !== null && !valid_id((string) $r['assignedTo'])) unset($r['assignedTo']);

    $prev = [];
    foreach (($old['messages'] ?? []) as $m) if (isset($m['id'])) $prev[(string) $m['id']] = $m;

    $msgs = [];
    $seen = [];
    $newOffer = null;
    foreach ((array) ($in['messages'] ?? []) as $m) {
        if (!is_array($m) || !isset($m['id']) || !valid_id((string) $m['id'])) continue;
        $id = (string) $m['id'];
        if (isset($seen[$id])) continue;
        $seen[$id] = true;
        if (isset($prev[$id])) {
            $msgs[] = $prev[$id];
            continue;
        }
        $nm = [
            'id' => $id,
            'author' => (($m['author'] ?? '') === 'client') ? 'client' : 'owner',
            'text' => str_in($m['text'] ?? '', 5000),
            'timestamp' => $now,
        ];
        if ($nm['author'] === 'owner') {
            $nm['byName'] = $u['name'];
            $nm['byRole'] = $u['role'];
        }
        if (isset($m['offerAmount']) && is_numeric($m['offerAmount']) && $m['offerAmount'] > 0 && can($u, 'offers.make')) {
            $nm['offerAmount'] = (float) $m['offerAmount'];
            $newOffer = $nm['offerAmount'];
        }
        $msgs[] = $nm;
    }
    foreach ($prev as $id => $m) if (!isset($seen[$id])) $msgs[] = $m;
    usort($msgs, function ($a, $b) {
        return ($a['timestamp'] ?? 0) <=> ($b['timestamp'] ?? 0);
    });
    $r['messages'] = $msgs;

    $offer = $old['myOfferPrice'] ?? null;
    if (can($u, 'offers.make') && can($u, 'finance.view')) {
        $offer = (isset($in['myOfferPrice']) && is_numeric($in['myOfferPrice'])) ? (float) $in['myOfferPrice'] : null;
    }
    if ($newOffer !== null) $offer = $newOffer;
    if ($offer === null) unset($r['myOfferPrice']);
    else $r['myOfferPrice'] = $offer;

    return $r;
}

// ------------------------------------------------------------------
//  Код першого налаштування (захист від чужого «власника»)
// ------------------------------------------------------------------
function setup_code_file()
{
    return data_dir() . '/SETUP-CODE.txt';
}

function setup_code()
{
    $f = setup_code_file();
    if (is_file($f)) {
        $c = trim((string) file_get_contents($f));
        if (preg_match('/^[A-Z0-9]{8}$/', $c)) return $c;
    }
    $c = random_str(8, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
    file_put_contents($f, $c . "\n");
    @chmod($f, 0600);
    return $c;
}

// ------------------------------------------------------------------
//  CLI (Termius)
// ------------------------------------------------------------------
function run_cli(array $argv)
{
    $cmd = $argv[1] ?? 'help';
    $cli = ['id' => null, 'name' => 'Термінал', 'role' => 'cli'];
    switch ($cmd) {
        case 'setup-code':
            if (all_users()) {
                echo "Власника вже створено — код не потрібен.\nЗабули пароль?  php api.php reset-password <логін>\n";
                return;
            }
            echo "Код першого налаштування: " . setup_code() . "\n";
            echo "Відкрийте сайт/#admin і введіть його у формі створення власника.\n";
            return;

        case 'reset-password':
            $login = strtolower($argv[2] ?? '');
            $pw = random_str(12, 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789');
            $found = locked(function () use ($login, $pw) {
                $users = all_users();
                foreach ($users as $i => $u) {
                    if ($u['login'] === $login) {
                        $users[$i]['hash'] = password_hash($pw, PASSWORD_DEFAULT);
                        $users[$i]['active'] = true;
                        db_write('users', $users);
                        return $u;
                    }
                }
                return null;
            });
            if (!$found) {
                fwrite(STDERR, "Користувача «$login» не знайдено. Список:  php api.php users\n");
                exit(1);
            }
            rate_clear('login', true);
            audit($cli, 'password.reset', $login);
            echo "Новий пароль для «{$found['name']}» ($login):  $pw\n";
            echo "Після входу змініть його: адмінка → Профіль.\n";
            return;

        case 'users':
            $users = all_users();
            if (!$users) {
                echo "Користувачів ще немає — відкрийте сайт/#admin і створіть власника.\n";
                return;
            }
            foreach ($users as $u) {
                printf("%-9s %-20s %-25s %s\n", $u['role'] === 'owner' ? 'Власник' : 'Помічник', $u['login'], $u['name'], empty($u['active']) ? 'вимкнено' : 'активний');
            }
            return;

        case 'db-test':
            if (!db_config()) {
                echo "MySQL не налаштовано — дані у файлах (" . pretty_path(data_dir()) . ").\nПідключити:  bash ~/antikvar.sh db-setup\n";
                return;
            }
            pdo();
            foreach (['users', 'requests', 'audit', 'settings'] as $n) db_read($n, []); // перенесення з файлів
            $rows = pdo()->query('SELECT name, CHAR_LENGTH(data) AS size, updated_at FROM akv_store ORDER BY name')->fetchAll(PDO::FETCH_ASSOC);
            echo "✓ MySQL працює: база «" . db_config()['name'] . "», таблиця akv_store\n";
            foreach ($rows as $r) printf("  %-10s %8d символів  %s\n", $r['name'], $r['size'], $r['updated_at']);
            echo "  Заявок: " . count(db_read('requests', [])) . ", користувачів: " . count(all_users()) . "\n";
            return;

        default:
            echo "Команди:\n  php api.php setup-code\n  php api.php reset-password <логін>\n  php api.php users\n  php api.php db-test\n";
    }
}

if (PHP_SAPI === 'cli') {
    run_cli($argv);
    exit(0);
}

// ------------------------------------------------------------------
//  HTTP
// ------------------------------------------------------------------
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
header('X-Content-Type-Options: nosniff');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = isset($_GET['action']) ? (string) $_GET['action'] : 'status';
$GETS = ['status', 'requests', 'team', 'users', 'audit', 'settings'];
$in = [];

if ($method === 'POST') {
    // Власний заголовок: браузер не дозволить чужому сайту надіслати його без дозволу (захист від CSRF)
    if (($_SERVER['HTTP_X_ANTIKVAR'] ?? '') !== '1') fail(400, 'Невірний запит');
    if (in_array($action, $GETS, true)) fail(405, 'Потрібен GET');
    $raw = (string) file_get_contents('php://input');
    if (strlen($raw) > 500000) fail(413, 'Забагато даних');
    $in = json_decode($raw, true);
    if (!is_array($in)) $in = [];
} elseif ($method === 'GET') {
    if (!in_array($action, $GETS, true)) fail(405, 'Потрібен POST');
} else {
    fail(405, 'Метод не підтримується');
}

switch ($action) {
    // ---------- Стан ----------
    case 'status':
        $u = current_user();
        $needs = !all_users();
        $res = ['app' => APP_ID, 'version' => API_VERSION, 'storage' => storage_mode(), 'needsSetup' => $needs, 'user' => $u ? public_user($u) : null];
        if ($needs) {
            setup_code();
            $res['setupCodeRequired'] = true;
            $res['setupCodePath'] = pretty_path(setup_code_file());
        }
        json_out($res);

    // ---------- Перше налаштування: створення власника ----------
    case 'setup':
        if (rate_count('setup', 900) >= 10) fail(429, 'Забагато спроб — зачекайте 15 хвилин');
        $code = strtoupper(str_in($in['code'] ?? '', 20));
        $login = strtolower(str_in($in['login'] ?? '', 40));
        $name = str_in($in['name'] ?? '', 60);
        $pw = $in['password'] ?? '';
        if (!valid_login($login)) fail(422, 'Логін: 3–32 символи — латиниця, цифри, . _ -');
        if ($name === '') fail(422, 'Вкажіть імʼя');
        check_new_password($pw);
        $user = locked(function () use ($code, $login, $name, $pw) {
            if (all_users()) return 'exists';
            if (!hash_equals(setup_code(), $code)) return 'code';
            $u = [
                'id' => new_id('usr'), 'login' => $login, 'name' => $name, 'role' => 'owner', 'perms' => [],
                'active' => true, 'hash' => password_hash($pw, PASSWORD_DEFAULT),
                'createdAt' => now_ms(), 'lastLoginAt' => now_ms(),
            ];
            db_write('users', [$u]);
            @unlink(setup_code_file());
            return $u;
        });
        if ($user === 'exists') fail(409, 'Власника вже створено — увійдіть');
        if ($user === 'code') {
            rate_add('setup');
            fail(403, 'Невірний код налаштування');
        }
        do_login($user);
        audit($user, 'setup', $login);
        json_out(['user' => public_user($user)]);

    // ---------- Вхід / вихід ----------
    case 'login':
        if (rate_count('login', 900) >= 8) fail(429, 'Забагато невдалих спроб — зачекайте 15 хвилин');
        $login = strtolower(str_in($in['login'] ?? '', 40));
        $pw = (string) ($in['password'] ?? '');
        $found = null;
        foreach (all_users() as $u) {
            if ($u['login'] === $login) {
                $found = $u;
                break;
            }
        }
        if (!$found || !password_verify($pw, $found['hash'])) {
            rate_add('login');
            audit(null, 'login.fail', $login);
            usleep(400000);
            fail(401, 'Невірний логін або пароль');
        }
        if (empty($found['active'])) fail(403, 'Обліковий запис вимкнено власником');
        rate_clear('login');
        $found = locked(function () use ($found) {
            $users = all_users();
            foreach ($users as $i => $u) {
                if ($u['id'] === $found['id']) {
                    $users[$i]['lastLoginAt'] = now_ms();
                    db_write('users', $users);
                    return $users[$i];
                }
            }
            return $found;
        });
        do_login($found);
        audit($found, 'login');
        json_out(['user' => public_user($found)]);

    case 'logout':
        $u = current_user();
        if ($u) audit($u, 'logout');
        if (start_session(false)) {
            $_SESSION = [];
            session_destroy();
            setcookie('akv_sid', '', time() - 3600, '/');
        }
        json_out([]);

    // ---------- Заявки ----------
    case 'requests':
        $u = need_user();
        $list = array_map(function ($r) use ($u) {
            return view_request($r, $u);
        }, db_read('requests', []));
        usort($list, function ($a, $b) {
            return ($b['createdAt'] ?? 0) <=> ($a['createdAt'] ?? 0);
        });
        json_out(['requests' => array_values($list)]);

    case 'request.save':
        $u = need_user();
        $r = $in['request'] ?? null;
        if (!is_array($r)) fail(422, 'Немає даних заявки');
        if (strlen(json_encode($r)) > 200000) fail(413, 'Заявка завелика');
        $res = locked(function () use ($r, $u) {
            $list = db_read('requests', []);
            $idx = null;
            if (isset($r['id']) && valid_id((string) $r['id'])) {
                foreach ($list as $i => $x) {
                    if ($x['id'] === $r['id']) {
                        $idx = $i;
                        break;
                    }
                }
            }
            if ($idx === null && !can($u, 'requests.create')) return 'forbidden';
            $old = $idx === null ? null : $list[$idx];
            $new = merge_request($r, $old, $u);
            if ($idx === null) array_unshift($list, $new);
            else $list[$idx] = $new;
            db_write('requests', $list);
            return ['new' => $new, 'old' => $old];
        });
        if ($res === 'forbidden') fail(403, 'Немає права створювати заявки');
        $new = $res['new'];
        $old = $res['old'];
        if (!$old) {
            audit($u, 'request.create', $new['itemTitle'] ?? $new['id']);
        } else {
            $ch = [];
            if (($old['status'] ?? '') !== ($new['status'] ?? '')) $ch[] = 'статус: ' . ($old['status'] ?? '?') . ' → ' . ($new['status'] ?? '?');
            if (count($new['messages'] ?? []) > count($old['messages'] ?? [])) $ch[] = 'повідомлення';
            if (($old['priority'] ?? '') !== ($new['priority'] ?? '')) $ch[] = 'пріоритет';
            if (($old['assignedTo'] ?? '') !== ($new['assignedTo'] ?? '')) $ch[] = 'відповідальний';
            if (($old['notes'] ?? '') !== ($new['notes'] ?? '')) $ch[] = 'нотатки';
            if (($old['myOfferPrice'] ?? null) !== ($new['myOfferPrice'] ?? null)) $ch[] = 'ціна пропозиції';
            audit($u, 'request.update', $new['itemTitle'] ?? $new['id'], implode(', ', $ch));
        }
        json_out(['request' => view_request($new, $u)]);

    case 'request.delete':
        $u = need_perm('requests.delete');
        $id = (string) ($in['id'] ?? '');
        $title = locked(function () use ($id) {
            $list = db_read('requests', []);
            foreach ($list as $i => $x) {
                if ($x['id'] === $id) {
                    array_splice($list, $i, 1);
                    db_write('requests', $list);
                    return $x['itemTitle'] ?? $id;
                }
            }
            return null;
        });
        if ($title === null) fail(404, 'Заявку не знайдено');
        audit($u, 'request.delete', $title);
        json_out([]);

    case 'requests.import':
        $u = need_owner();
        $list = $in['requests'] ?? null;
        if (!is_array($list)) fail(422, 'Немає заявок для імпорту');
        $clean = [];
        foreach ($list as $r) if (is_array($r) && isset($r['id']) && valid_id((string) $r['id'])) $clean[] = $r;
        locked(function () use ($clean) {
            db_write('requests', $clean);
        });
        audit($u, 'import', count($clean) . ' заявок');
        json_out(['count' => count($clean)]);

    // ---------- Заявка з форми на сайті (без входу) ----------
    case 'submit':
        if (!empty($in['website'])) json_out([]); // приховане поле заповнив бот
        if (rate_count('submit', 600) >= 5) fail(429, 'Забагато заявок з вашої адреси — зателефонуйте нам');
        $name = str_in($in['name'] ?? '', 80);
        $phone = str_in($in['phone'] ?? '', 30);
        if ($name === '' || strlen(preg_replace('/\D/', '', $phone)) < 9) fail(422, 'Вкажіть імʼя та номер телефону');
        $title = str_in($in['itemTitle'] ?? '', 150);
        $msg = str_in($in['message'] ?? '', 3000);
        $price = (isset($in['price']) && is_numeric($in['price']) && $in['price'] > 0 && $in['price'] < 1e9) ? (float) $in['price'] : null;
        $now = now_ms();
        $r = [
            'id' => new_id('req'),
            'createdAt' => $now,
            'updatedAt' => $now,
            'status' => 'new',
            'clientName' => $name,
            'phone' => $phone,
            'preferredContact' => in_array($in['contact'] ?? '', CONTACTS, true) ? $in['contact'] : 'phone',
            'category' => preg_match('/^[a-z]{2,20}$/', (string) ($in['category'] ?? '')) ? $in['category'] : 'other',
            'categoryLabel' => str_in($in['categoryLabel'] ?? 'Інше', 80),
            'itemTitle' => $title !== '' ? $title : 'Заявка з сайту',
            'itemDescription' => $msg,
            'currency' => 'UAH',
            'messages' => [[
                'id' => new_id('m'),
                'author' => 'client',
                'text' => $msg !== '' ? $msg : 'Цікавить оцінка',
                'timestamp' => $now,
            ]],
            'tags' => ['з сайту'],
            'notes' => '',
            'priority' => 'normal',
            'needsVisit' => false,
            'createdBy' => 'Сайт',
        ];
        if ($price !== null) $r['ownerAskingPrice'] = $price;
        locked(function () use ($r) {
            $list = db_read('requests', []);
            array_unshift($list, $r);
            db_write('requests', $list);
        });
        rate_add('submit');
        audit(null, 'request.submit', $r['itemTitle'] . ' · ' . $name);
        json_out(['id' => $r['id']]);

    // ---------- Команда ----------
    case 'team':
        need_user();
        $t = [];
        foreach (all_users() as $u) {
            if (!empty($u['active'])) $t[] = ['id' => $u['id'], 'name' => $u['name'], 'role' => $u['role']];
        }
        json_out(['team' => $t]);

    case 'users':
        need_owner();
        json_out(['users' => array_map('public_user', all_users())]);

    case 'user.save':
        $me = need_owner();
        $id = (string) ($in['id'] ?? '');
        $name = str_in($in['name'] ?? '', 60);
        $perms = array_values(array_intersect(GRANTABLE, (array) ($in['permissions'] ?? [])));
        $active = !isset($in['active']) || (bool) $in['active'];
        $pw = (isset($in['password']) && $in['password'] !== '') ? (string) $in['password'] : null;
        if ($pw !== null) check_new_password($pw);
        if ($name === '') fail(422, 'Вкажіть імʼя');
        $res = locked(function () use ($id, $in, $name, $perms, $active, $pw) {
            $users = all_users();
            if ($id === '') {
                $login = strtolower(str_in($in['login'] ?? '', 40));
                if (!valid_login($login)) return 'Логін: 3–32 символи — латиниця, цифри, . _ -';
                foreach ($users as $u) if ($u['login'] === $login) return 'Такий логін уже зайнято';
                if ($pw === null) return 'Задайте пароль для помічника';
                $u = [
                    'id' => new_id('usr'), 'login' => $login, 'name' => $name, 'role' => 'assistant', 'perms' => $perms,
                    'active' => $active, 'hash' => password_hash($pw, PASSWORD_DEFAULT),
                    'createdAt' => now_ms(), 'lastLoginAt' => null,
                ];
                $users[] = $u;
                db_write('users', $users);
                return ['u' => $u, 'created' => true];
            }
            foreach ($users as $i => $u) {
                if ($u['id'] !== $id) continue;
                if ($u['role'] === 'owner') return 'Дані власника змінюються в розділі «Профіль»';
                $users[$i]['name'] = $name;
                $users[$i]['perms'] = $perms;
                $users[$i]['active'] = $active;
                if ($pw !== null) $users[$i]['hash'] = password_hash($pw, PASSWORD_DEFAULT);
                db_write('users', $users);
                return ['u' => $users[$i], 'created' => false];
            }
            return 'Користувача не знайдено';
        });
        if (is_string($res)) fail(422, $res);
        $details = $res['created'] ? implode(', ', $perms) : (($pw !== null ? 'новий пароль; ' : '') . ($active ? 'активний' : 'вимкнено') . '; ' . implode(', ', $perms));
        audit($me, $res['created'] ? 'user.create' : 'user.update', $res['u']['name'], $details);
        json_out(['user' => public_user($res['u'])]);

    case 'user.delete':
        $me = need_owner();
        $id = (string) ($in['id'] ?? '');
        $res = locked(function () use ($id) {
            $users = all_users();
            foreach ($users as $i => $u) {
                if ($u['id'] !== $id) continue;
                if ($u['role'] === 'owner') return 'Власника видалити не можна';
                array_splice($users, $i, 1);
                db_write('users', $users);
                return ['name' => $u['name']];
            }
            return 'Користувача не знайдено';
        });
        if (is_string($res)) fail(422, $res);
        audit($me, 'user.delete', $res['name']);
        json_out([]);

    // ---------- Профіль (власний) ----------
    case 'profile.save':
        $me = need_user();
        $name = array_key_exists('name', $in) ? str_in($in['name'], 60) : null;
        $oldPw = (string) ($in['oldPassword'] ?? '');
        $newPw = (string) ($in['newPassword'] ?? '');
        if ($name !== null && $name === '') fail(422, 'Імʼя не може бути порожнім');
        if ($newPw !== '') {
            check_new_password($newPw);
            if (!password_verify($oldPw, $me['hash'])) fail(403, 'Поточний пароль невірний');
        }
        $u = locked(function () use ($me, $name, $newPw) {
            $users = all_users();
            foreach ($users as $i => $x) {
                if ($x['id'] !== $me['id']) continue;
                if ($name !== null) $users[$i]['name'] = $name;
                if ($newPw !== '') $users[$i]['hash'] = password_hash($newPw, PASSWORD_DEFAULT);
                db_write('users', $users);
                return $users[$i];
            }
            return $me;
        });
        audit($me, 'profile.update', '', $newPw !== '' ? 'змінено пароль' : 'змінено імʼя');
        json_out(['user' => public_user($u)]);

    // ---------- Журнал і налаштування ----------
    case 'audit':
        need_perm('audit.view');
        json_out(['audit' => array_slice(array_reverse(db_read('audit', [])), 0, 500)]);

    case 'settings':
        need_user();
        json_out(['settings' => (object) db_read('settings', [])]);

    case 'settings.save':
        $u = need_perm('settings.edit');
        $s = $in['settings'] ?? null;
        if (!is_array($s) || strlen(json_encode($s)) > 50000) fail(422, 'Некоректні налаштування');
        unset($s['ownerPassword']);
        locked(function () use ($s) {
            db_write('settings', $s);
        });
        audit($u, 'settings.save');
        json_out([]);

    default:
        fail(404, 'Невідома дія');
}
