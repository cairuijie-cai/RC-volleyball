// Resolve the browser automation runtime for the verify scripts without
// hardcoding one machine's paths.
//
// Resolution order:
//   1. PLAYWRIGHT_MODULE  - explicit path to an installed `playwright` package
//   2. project node_modules (`npm i -D playwright`)
//   3. NODE_PATH entries and the directories next to the running Node binary
//   4. a global/npm-cache install picked up via createRequire resolution
//
// Playwright is intentionally not a project dependency: it is only needed to run
// the verification scripts, so a missing install must produce a clear message
// rather than a module-not-found stack trace.
import { createRequire } from 'node:module';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '..');

/** Candidate directories that may contain a `playwright` package. */
function candidateSearchDirs() {
  const dirs = [
    process.env.PLAYWRIGHT_MODULE,
    join(projectRoot, 'node_modules'),
    join(process.cwd(), 'node_modules'),
  ].filter(Boolean);

  for (const entry of (process.env.NODE_PATH ?? '').split(process.platform === 'win32' ? ';' : ':')) {
    if (entry) dirs.push(entry);
  }

  // Node's sibling library dirs, e.g. <node>/../lib/node_modules or
  // <node>/node_modules for a portable runtime layout.
  const nodeBin = dirname(process.execPath);
  dirs.push(
    join(nodeBin, 'node_modules'),
    join(nodeBin, '..', 'lib', 'node_modules'),
    join(nodeBin, '..', 'node_modules'),
  );

  // A sibling of the project (some harnesses install alongside the checkout).
  try {
    for (const sibling of readdirSync(resolve(projectRoot, '..'))) {
      if (sibling === 'node_modules') dirs.push(resolve(projectRoot, '..', sibling));
    }
  } catch {
    // Parent directory is not listable; ignore.
  }

  return [...new Set(dirs.filter((d) => existsSync(d)))];
}

/** Resolve `playwright`, or return null with the searched locations recorded. */
export function loadPlaywright() {
  const tried = [];

  const explicit = process.env.PLAYWRIGHT_MODULE;
  if (explicit) {
    try {
      const req = createRequire(join(explicit, 'package.json'));
      return { playwright: req('playwright'), from: explicit };
    } catch (error) {
      tried.push(`${explicit} (${error.code ?? 'error'})`);
    }
  }

  for (const dir of candidateSearchDirs()) {
    try {
      const req = createRequire(join(dir, 'noop.js'));
      return { playwright: req('playwright'), from: dir };
    } catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND') throw error;
      tried.push(dir);
    }
  }

  return { playwright: null, tried };
}

/** Locate a Chromium-based browser executable without pinning one machine. */
export function findBrowserExecutable() {
  if (process.env.BROWSER_EXECUTABLE) return process.env.BROWSER_EXECUTABLE;

  const candidates = process.platform === 'win32'
    ? [
        'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
      ]
    : process.platform === 'darwin'
      ? [
          '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        ]
      : [
          '/usr/bin/microsoft-edge',
          '/usr/bin/google-chrome',
          '/usr/bin/chromium',
          '/usr/bin/chromium-browser',
        ];

  return candidates.find((p) => existsSync(p)) ?? null;
}

/** Launch Chromium, or exit with an actionable message when unavailable. */
export async function launchBrowser() {
  const { playwright, from, tried } = loadPlaywright();
  if (!playwright) {
    console.error(
      [
        '未找到 playwright，无法运行浏览器验证脚本。',
        '安装后重试：npm i -D playwright && npx playwright install chromium',
        '或指定已有安装：设置环境变量 PLAYWRIGHT_MODULE=<含 playwright 的目录>',
        tried?.length ? `已尝试：${tried.join(', ')}` : '',
      ].filter(Boolean).join('\n'),
    );
    process.exit(69);
  }

  const executablePath = findBrowserExecutable();
  if (!executablePath) {
    console.error(
      '未找到可用的 Chromium 内核浏览器。\n' +
      '请设置环境变量 BROWSER_EXECUTABLE=<msedge 或 chrome 可执行文件路径>，' +
      '或执行 npx playwright install chromium。',
    );
    process.exit(69);
  }

  return {
    browser: await playwright.chromium.launch({ executablePath, headless: true }),
    from,
    executablePath,
  };
}
