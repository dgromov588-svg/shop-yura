<?php
/**
 * ==================================================================
 *  Приймач оновлень сайту «Салон АнтикварЪ» (CityHost)
 * ==================================================================
 *  GitHub Actions збирає сайт, кладе збірку в гілку `build` і надсилає
 *  сюди POST-запит. Скрипт сам завантажує збірку з GitHub, робить
 *  резервну копію поточного сайту й оновлює файли.
 *
 *  Чому так: CityHost пускає по SSH/FTP лише з дозволених IP, а сервери
 *  GitHub щоразу мають нові IP. HTTPS-запит до сайту не обмежений.
 *
 *  Захист: секрет перевіряється за SHA-256, який підставляється під час
 *  збірки (scripts/prepare-deploy.mjs). Без секрету файл у збірку не
 *  потрапляє взагалі.
 * ==================================================================
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

const SECRET_SHA256 = '__DEPLOY_SECRET_SHA256__';
const KEEP_BACKUPS = 5;

function out($code, $data)
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

// ---------- 1. Перевірки доступу ----------
if (strpos(SECRET_SHA256, '__') === 0) {
    out(503, ['ok' => false, 'error' => 'Приймач не налаштовано (немає секрету)']);
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    out(405, ['ok' => false, 'error' => 'Дозволено лише POST']);
}
$token = isset($_SERVER['HTTP_X_DEPLOY_TOKEN']) ? (string) $_SERVER['HTTP_X_DEPLOY_TOKEN'] : '';
if ($token === '' || !hash_equals(SECRET_SHA256, hash('sha256', $token))) {
    sleep(2);
    out(403, ['ok' => false, 'error' => 'Невірний секрет']);
}

$repo = isset($_POST['repo']) ? (string) $_POST['repo'] : '';
$ref = isset($_POST['ref']) ? (string) $_POST['ref'] : 'build';
$ghToken = isset($_POST['github_token']) ? (string) $_POST['github_token'] : '';

if (!preg_match('~^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$~', $repo)) {
    out(400, ['ok' => false, 'error' => 'Невірна назва репозиторію']);
}
if (!preg_match('~^[A-Za-z0-9_./-]+$~', $ref) || strpos($ref, '..') !== false) {
    out(400, ['ok' => false, 'error' => 'Невірна гілка']);
}
if (!class_exists('ZipArchive')) {
    out(500, ['ok' => false, 'error' => 'На хостингу немає PHP-розширення zip — увімкніть його в Хостинг 2.0 → Керування → PHP']);
}
if (!function_exists('curl_init')) {
    out(500, ['ok' => false, 'error' => 'На хостингу немає PHP-розширення curl']);
}

@set_time_limit(300);
@ignore_user_abort(true);

// ---------- 2. Блокування від паралельних запусків ----------
$lockFile = sys_get_temp_dir() . '/antikvar-deploy-' . md5(__DIR__) . '.lock';
$lock = fopen($lockFile, 'c');
if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) {
    out(409, ['ok' => false, 'error' => 'Оновлення вже виконується — спробуйте за хвилину']);
}

$siteRoot = __DIR__;
$home = getenv('HOME');
if (!$home || !is_dir($home) || strpos($siteRoot, rtrim($home, '/') . '/') !== 0) {
    $home = dirname($siteRoot, 2);
}
$backupDir = rtrim($home, '/') . '/site-backups';

// ---------- 3. Завантаження збірки з GitHub ----------
$tmpZip = tempnam(sys_get_temp_dir(), 'akv');
$fh = fopen($tmpZip, 'wb');
$headers = ['User-Agent: antikvar-deploy', 'Accept: application/vnd.github+json'];
if ($ghToken !== '') {
    $headers[] = 'Authorization: Bearer ' . $ghToken;
}
$ch = curl_init('https://api.github.com/repos/' . $repo . '/zipball/' . $ref);
curl_setopt_array($ch, [
    CURLOPT_FILE => $fh,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_CONNECTTIMEOUT => 20,
    CURLOPT_TIMEOUT => 180,
    CURLOPT_FAILONERROR => false,
]);
curl_exec($ch);
$http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr = curl_error($ch);
curl_close($ch);
fclose($fh);

if ($http !== 200) {
    @unlink($tmpZip);
    out(502, ['ok' => false, 'error' => "Не вдалося завантажити збірку з GitHub (HTTP $http) $curlErr"]);
}

// ---------- 4. Перевірка архіву ----------
$zip = new ZipArchive();
if ($zip->open($tmpZip) !== true) {
    @unlink($tmpZip);
    out(502, ['ok' => false, 'error' => 'Пошкоджений архів збірки']);
}
$first = $zip->getNameIndex(0);
$prefix = substr($first, 0, strpos($first, '/') + 1); // GitHub додає папку owner-repo-sha/
$index = $zip->getFromName($prefix . 'index.html');
if ($index === false || strpos($index, 'АнтикварЪ') === false) {
    $zip->close();
    @unlink($tmpZip);
    out(422, ['ok' => false, 'error' => 'У збірці немає коректного index.html — сайт НЕ змінено']);
}

// ---------- 5. Резервна копія поточного сайту ----------
$backupFile = null;
if (!is_dir($backupDir)) {
    @mkdir($backupDir, 0755, true);
}
if (is_dir($backupDir) && is_writable($backupDir)) {
    $backupFile = $backupDir . '/site-' . date('Ymd-His') . '.zip';
    $bk = new ZipArchive();
    if ($bk->open($backupFile, ZipArchive::CREATE) === true) {
        $it = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($siteRoot, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::LEAVES_ONLY
        );
        foreach ($it as $file) {
            if ($file->isFile()) {
                $bk->addFile($file->getPathname(), substr($file->getPathname(), strlen($siteRoot) + 1));
            }
        }
        $bk->close();
    }
    $old = glob($backupDir . '/site-*.zip') ?: [];
    rsort($old);
    foreach (array_slice($old, KEEP_BACKUPS) as $f) {
        @unlink($f);
    }
}

// ---------- 6. Розпаковка ----------
$written = 0;
for ($i = 0; $i < $zip->numFiles; $i++) {
    $name = $zip->getNameIndex($i);
    if (strpos($name, $prefix) !== 0) {
        continue;
    }
    $rel = substr($name, strlen($prefix));
    if ($rel === '' || substr($rel, -1) === '/') {
        continue;
    }
    if (strpos($rel, '..') !== false || $rel[0] === '/' || strpos($rel, '.git/') === 0) {
        continue;
    }
    $dest = $siteRoot . '/' . $rel;
    $dir = dirname($dest);
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    $stream = $zip->getStream($name);
    if (!$stream) {
        continue;
    }
    $tmpDest = $dest . '.akvtmp';
    $wfh = fopen($tmpDest, 'wb');
    stream_copy_to_stream($stream, $wfh);
    fclose($wfh);
    fclose($stream);
    rename($tmpDest, $dest); // атомарна заміна — сайт не «ламається» посередині
    @chmod($dest, 0644);
    $written++;
}
$zip->close();
@unlink($tmpZip);
flock($lock, LOCK_UN);

out(200, [
    'ok' => true,
    'message' => 'Сайт оновлено',
    'files' => $written,
    'backup' => $backupFile ? basename($backupFile) : null,
    'time' => date('c'),
]);
