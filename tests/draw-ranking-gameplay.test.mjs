import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { drawRankingApi } from '../server/draw-ranking-api.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const site = 'https://ehrlckdqud-cloud.github.io/newtworld-ranking/';
const api = 'https://newtworld-ms3-coop-5p.ehrlckdqud.chatgpt.site';
const root = new URL('../', import.meta.url);
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg==', 'base64');
const participants = ['테스트A', '테스트B', '테스트C'];
const games = {
  pinball: { file: 'index', gate: 'html:not(.member-gated)', settings: '#settingsToggle', names: '#names',
    count: '#winnerCount', start: '#start', record: '#record', winners: '#resultNames' },
  pond: { file: 'pond', gate: '#pondRoot', settings: '#pondConfigToggle', names: '#pondNames',
    count: '#pondKeep', start: '#pondStart', record: '#pondRecord', winners: '#pondWinners' },
  space: { file: 'space', gate: '#nwspace', settings: '#spSettings', names: '#spnames',
    count: '#spcount', start: '#spstart', record: '#spAutoRecord', winners: '#spresult' },
};

const profile = { ok: true, auth: true, kind: 'member', memberId: 'qa', profile: { memberId: 'qa', nickname: 'QA' },
  avatars: [], images: [], tracks: [], shops: [], config: { courses: {}, games: {} } };
const accessFixture = `window.NWContent = {
  account: 'qa', access: async () => (${JSON.stringify(profile)}), status: async () => (${JSON.stringify(profile)}),
  start: async () => true, refreshStartCost() {}, credentials: () => ({ token: 'test-token', device: 'test-device' })
};`;
const mime = { html: 'text/html', css: 'text/css', wasm: 'application/wasm', json: 'application/json', bin: 'application/octet-stream' };

async function isolate(context, sqlite, traffic) {
  sqlite.exec(readFileSync(new URL('server/draw-ranking.sql', root), 'utf8'));
  const database = { prepare(sql) {
    const statement = sqlite.prepare(sql);
    return { bind: (...values) => ({
      first: async () => statement.get(...values),
      all: async () => ({ results: statement.all(...values) })
    }) };
  } };
  await context.addInitScript(() => {
    localStorage.setItem('nwProfileToken', 'test-token');
    localStorage.setItem('nwProfileDevice', 'test-device');
    window.addEventListener('nw-draw-result', event => { window.qaCompleted = event.detail; });
  });
  // All requests terminate locally, including membership, entry charges and the real ranking API handler.
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const script = body => route.fulfill({ contentType: 'text/javascript', body });
    if (url.origin === api && url.pathname.startsWith('/api/draw-rankings/')) {
      if (request.method() === 'POST' && url.pathname.endsWith('/finish')) traffic.finishes++;
      const response = await drawRankingApi(new Request(request.url(), {
        method: request.method(), headers: request.headers(), body: request.postData() || undefined
      }), database, async () => true);
      return route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: await response.text() });
    }
    if (url.hostname === 'script.google.com') {
      const callback = url.searchParams.get('callback');
      return script(callback ? callback + '(' + JSON.stringify(profile) + ');' : '');
    }
    if (!url.href.startsWith(site)) return route.abort();
    const path = decodeURIComponent(url.pathname.slice('/newtworld-ranking/'.length));
    if (path === 'assets/content-access.js') return script(accessFixture);
    if (path === 'site-config.js') return script('window.NW_CONFIG={appScriptUrl:"https://script.google.com/test"}');
    if (path === 'assets/game-defaults.mjs') return script('export async function installGameDefaults() {}');
    if (path === 'draw/space-score-assets.js') return script('export const SCORE_ASSETS = {};');
    if (path === 'draw/space-score.js') {
      // The ranking simulation runs with sound and recording off. Skip the audio-device warm-up.
      return script(readFileSync(new URL(path, root), 'utf8') + '\nSpaceScore.prototype.arm = async function () {};');
    }
    if (/\.(png|webp|jpe?g|gif|svg)$/i.test(path)) return route.fulfill({ contentType: 'image/png', body: pixel });
    if (/\.(mp3|wav|ogg|mp4)(\.|$)/i.test(path)) return route.fulfill({ status: 204, body: '' });
    const file = new URL(path, root);
    if (!existsSync(file)) return route.fulfill({ status: 404, body: '' });
    const extension = path.split('.').at(-1);
    return route.fulfill({ contentType: mime[extension] || 'text/javascript', body: readFileSync(file) });
  });
}

async function verifyBoard(panel, result) {
  if (!result.round.ranked) {
    await panel.getByText('순위에 반영된 경기가 아직 없습니다.').waitFor();
    return;
  }
  const rows = panel.locator('tbody tr');
  await rows.first().waitFor();
  assert.equal(await rows.count(), result.scores.length);
  for (const score of result.scores) {
    const cells = await rows.filter({ hasText: score.name }).locator('td').allTextContents();
    assert.deepEqual([cells[3], cells[4], cells.at(-1)], ['1', String(score.entries), score.points.toFixed(1)]);
  }
}
async function play(browser, game, width, ranked) {
  const mobile = width === 390;
  const ui = games[game];
  const context = await browser.newContext({ viewport: { width, height: mobile ? 844 : 760 }, isMobile: mobile, hasTouch: mobile });
  const sqlite = new DatabaseSync(':memory:');
  const traffic = { finishes: 0 };
  try {
    await isolate(context, sqlite, traffic);
    const page = await context.newPage();
    const exceptions = [];
    page.on('pageerror', error => exceptions.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    await page.goto(site + 'draw/' + ui.file + '.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(game => game === 'pinball'
      ? !document.documentElement.classList.contains('member-gated')
      : !document.getElementById(game === 'pond' ? 'pondRoot' : 'nwspace').hidden, game);
    if (!await page.locator(ui.names).isVisible()) await page.locator(ui.settings).click();
    await page.locator(ui.names).fill(participants.join(','));
    await page.locator(ui.names).dispatchEvent('change');
    const prizes = game === 'space' ? 2 : 1;
    await page.locator(ui.count).fill(String(prizes));
    await page.locator(ui.count).dispatchEvent('change');
    await page.locator(ui.record).uncheck();
    if (game === 'space') {
      await page.locator('#spspeed').selectOption('3');
      await page.locator('#spsound').uncheck();
    }
    if (game === 'pond') await page.locator('#pondDuration').selectOption(mobile ? '90' : '45');
    if (game === 'pinball') await page.locator('#mode').selectOption(mobile ? 'last' : 'first');
    const switcher = page.getByRole('combobox', { name: '순위 반영' });
    assert.ok(await switcher.isVisible(), 'ranking switch is accessible in regular settings');
    await switcher.selectOption(ranked ? 'on' : 'off');

    await page.clock.install();
    await page.locator(ui.start).click();
    const panel = page.locator('.ndr-dialog');
    for (let elapsed = 0; elapsed < 180 && !await panel.isVisible(); elapsed += 2) {
      await page.clock.runFor(2000);
      assert.deepEqual(exceptions, []);
      if (game === 'pond') {
        const error = await page.locator('#pondError').textContent();
        assert.ok(!error, error);
      }
    }
    assert.ok(await panel.isVisible(), 'the game must open its own result dialog');
    await page.clock.runFor(2500); // Pinball publishes its native list after the celebration.
    const result = await page.evaluate(() => window.qaCompleted);
    assert.equal(result.round.game, game);
    assert.equal(result.round.ranked, ranked);
    assert.equal(result.standings.length, participants.length);
    const winners = result.standings.filter(entry => result.winnerIds.includes(entry.id)).map(entry => entry.name);
    assert.equal(winners.length, prizes);
    const native = await page.locator(ui.winners).textContent();
    assert.deepEqual(participants.filter(name => native.includes(name)).sort(), [...winners].sort());
    assert.equal(await panel.locator('.ndr-winners strong').textContent(), winners.join(' · '));
    const bounds = await panel.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
    if (!mobile) assert.ok(bounds.x > width / 2, 'desktop results must open on the right');
    const points = await panel.locator('tbody tr').evaluateAll(rows =>
      rows.map(row => [row.cells[1].textContent, row.cells[2].textContent]));
    assert.deepEqual(points, result.standings.map(entry => [entry.name, entry.points.toFixed(1)]));
    await panel.getByText(ranked ? '전체순위에 반영했습니다.' : /공식 기록에서 제외/).waitFor();
    const close = panel.getByRole('button', { name: '닫기' });
    const open = page.locator('.ndr-open');
    await close.click();
    await open.click();
    await verifyBoard(panel, result);
    await close.click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await open.click();
    await verifyBoard(panel, result);
    assert.equal(traffic.finishes, ranked ? 1 : 0);
    assert.deepEqual(exceptions, []);
  } finally {
    await context.close();
    sqlite.close();
  }
}

test('native draws finish, display winners and persist only ranked rounds', async suite => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--autoplay-policy=no-user-gesture-required'] });
  suite.after(() => browser.close());
  for (const game of Object.keys(games)) {
    for (const width of [1280, 390]) {
      const ranked = width === 1280;
      await suite.test(game + ' ' + width + (ranked ? ' ranked' : ' unranked'), () => play(browser, game, width, ranked));
    }
  }
});
