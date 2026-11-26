import { readBrowserBoard, saveBrowserResult, deleteBrowserRows } from './draw-browser-ranking.mjs';

const themes = {
  pinball: { name: '생존핀볼', result: '구슬 추첨 결과', stats: ['먼저 도착 당첨', '마지막 생존 당첨'] },
  pond: { name: '생존연못', result: '연못의 생존 결과', stats: ['최종 생존', '부활 후 생존'] },
  space: { name: '우주대탈출', result: '우주선 탈출 결과', stats: ['탈출 성공', '출격 판수'] },
  'wild-run-91': { name: '양서파충류 달리기 대회', result: '결승선 통과 기록', stats: ['1위', '당첨권 진입'] },
  'pet-race': { name: '멍냥이 달리기 대회', result: '멍냥이 결승 기록', stats: ['1위', '당첨권 진입'] }
};
const finishRules = {
  pinball: '먼저 도착 모드는 결승선에 먼저 들어온 구슬이, 마지막 생존 모드는 끝까지 남은 구슬이 앞섭니다. 당첨 구슬이 우선이며, 순서가 정해지지 않은 같은 그룹은 공동 순위입니다.',
  pond: '마지막까지 살아남은 참가자는 공동 1위입니다. 나머지는 최종 탈락이 늦을수록 순위가 높고, 동시에 탈락하면 공동 순위입니다. 부활한 참가자도 최종 결과로 계산합니다.',
  space: '탈출에 성공한 우주선은 공동 1위입니다. 나머지는 늦게 탈락할수록 순위가 높고, 같은 공격에 동시에 탈락하면 공동 순위입니다.',
  'wild-run-91': '결승선을 통과한 순서대로 첫 번째 주자부터 마지막 주자까지 점수를 받습니다. 당첨 인원 밖의 주자도 완주 순위에 따라 점수를 받습니다.',
  'pet-race': '결승선을 통과한 순서대로 첫 번째 멍냥이부터 마지막 멍냥이까지 점수를 받습니다. 당첨 인원 밖의 멍냥이도 완주 순위에 따라 점수를 받습니다.'
};
function scoringGuide(game) {
  const guide = element('section', null, 'ndr-guide');
  guide.append(element('h3', '점수 기준'), element('p', finishRules[game]),
    element('p', '1위는 10점, 마지막은 0점이며 그 사이는 같은 간격으로 배점합니다. 예를 들어 5명이면 10 · 7.5 · 5 · 2.5 · 0점입니다. 혼자 참가하면 10점입니다.'),
    element('p', '공동 순위는 해당 등수들의 평균점수를 받습니다. 한 판에 같은 닉네임이 여러 번 참가하면 그 닉네임의 평균점수를 한 번 더합니다. 전체순위는 이렇게 쌓인 누적점수 순입니다.'));
  return guide;
}
const dates = new Intl.DateTimeFormat('ko-KR',{ timeZone:'Asia/Seoul', year:'numeric', month:'2-digit', day:'2-digit' });
const points = n => Number(n).toFixed(1);
function element(tag, text, cls) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = String(text);
  if (cls) node.className = cls;
  return node;
}
function button(label, action, cls) {
  const node = element('button', label, cls);
  node.type = 'button';
  node.onclick = action;
  return node;
}
function table(labels, rows) {
  const wrap = element('div',null,'ndr-table-wrap');
  const grid = element('table');
  const head = grid.createTHead().insertRow();
  for (const label of labels) {
    const th = element('th',label);
    th.scope = 'col';
    head.append(th);
  }
  const body = grid.createTBody();
  for (const values of rows) {
    const tr = body.insertRow();
    for (const value of values) tr.insertCell().append(value);
  }
  wrap.append(grid);
  return wrap;
}

export function mountDrawRanking(game) {
  const theme = themes[game];
  if (!theme || document.querySelector('.ndr-dialog')) return;
  const style = element('link');
  style.rel = 'stylesheet';
  style.href = new URL('./draw-ranking-ui.css',import.meta.url).href;
  document.head.append(style);
  const key = 'nw-draw-ranked:' + game;
  const field = element('label',null,'ndr-setting');
  field.append(element('span','순위 반영'));
  const select = element('select');
  select.ariaLabel = '순위 반영';
  select.append(new Option('반영','on'),new Option('끄기','off'));
  try { select.value = localStorage.getItem(key) === 'off' ? 'off' : 'on'; } catch {}
  select.onchange = () => {
    select.setCustomValidity('');
    try { localStorage.setItem(key,select.value); }
    catch { select.value='on'; select.setCustomValidity('이 브라우저에 설정을 저장할 수 없습니다.'); select.reportValidity(); }
  };
  field.append(select);
  let settings = document.querySelector('[data-draw-ranking-settings]');
  const race = game === 'wild-run-91' || game === 'pet-race';
  if (!settings && race) {
    const winners = document.getElementById('winners');
    if (winners) {
      settings = element('div');
      (winners.closest('label') || winners).after(settings);
    }
  }
  settings?.append(field);

  const dialog = element('dialog',null,'ndr-dialog');
  dialog.dataset.game = game;
  dialog.setAttribute('aria-labelledby','ndr-title');
  document.body.append(dialog);
  const head = element('div',null,'ndr-head');
  const titles = element('div');
  const title = element('h2');
  title.id = 'ndr-title';
  titles.append(element('small',theme.name),title);
  const close = button('닫기',()=>dialog.close(),'ndr-close');
  head.append(titles,close);
  const body = element('div',null,'ndr-body');
  const foot = element('div',null,'ndr-foot');
  dialog.append(head,body,foot);
  let view = '', generation = 0, latest = null;
  const unconfirmed=new Set();
  const open = button('전체순위',showBoard,'ndr-open');
  open.dataset.game = game;
  open.setAttribute('aria-haspopup','dialog');
  const slot = document.querySelector('[data-draw-ranking-button]');
  if (slot) slot.append(open);
  else { open.classList.add('ndr-floating'); document.body.append(open); }
  if (slot?.classList.contains('ndr-corner')) {
    const header=document.querySelector(game==='pinball'?'#headerPanel':'body > nav');
    const place=()=>{
      const box=open.getBoundingClientRect();
      if (!box.width || !header) return;
      let top=8;
      const controls=Array.from(header.querySelectorAll('button,a,input,select'),el=>el.getBoundingClientRect())
        .filter(rect=>rect.width && rect.right>box.left-4 && rect.left<box.right+4)
        .sort((a,b)=>a.top-b.top);
      for (const rect of controls) {
        if (rect.bottom>top && rect.top<top+box.height+4) top=Math.ceil(rect.bottom+6);
      }
      slot.style.setProperty('--ndr-top',top+'px');
    };
    const observer=new ResizeObserver(place);
    observer.observe(open);
    if(header)observer.observe(header);
    window.addEventListener('resize',place);
    place();
  }
  const home = open.parentNode;
  document.addEventListener('fullscreenchange',()=>{
    const full = document.fullscreenElement;
    if (full && !(full instanceof HTMLCanvasElement) && !full.contains(open)) {
      full.append(open); open.classList.add('ndr-floating');
    } else if (!full && open.parentNode !== home) {
      home.append(open); open.classList.toggle('ndr-floating',!slot);
    }
  });
  function show(next, heading) {
    generation++;
    view=next;
    dialog.dataset.view=next;
    title.textContent=heading;
    body.replaceChildren(); foot.replaceChildren();
    if (!dialog.open) dialog.showModal();
    close.focus({preventScroll:true});
    return generation;
  }
  dialog.addEventListener('click',event=>{
    if (event.target !== dialog) return;
    const box=dialog.getBoundingClientRect();
    if (event.clientX<box.left || event.clientX>box.right || event.clientY<box.top || event.clientY>box.bottom) dialog.close();
  });
  function note(message) {
    const text=element('p',message,'ndr-note');
    text.setAttribute('role','status');
    return text;
  }
  async function showBoard() {
    const seq=show('board','전체순위');
    if (!settings) foot.append(field);
    if (latest) foot.append(button('이번 판 결과',()=>showResult(latest)));
    const failed=[...unconfirmed].filter(item=>item.state==='error');
    if (failed.length) foot.prepend(button('미반영 '+failed.length+'판 저장 재시도',async event=>{
      event.currentTarget.disabled=true;
      for (const item of failed) await save(item);
      if (generation===seq && dialog.open) showBoard();
    }));
    const board = element('div');
    body.append(element('p','이 브라우저에서 완료한 '+theme.name+'의 누적 순위입니다.','ndr-scope'),scoringGuide(game), board);
    board.append(note('전체순위를 불러오는 중입니다.'));
    try {
      if (latest?.saving) await latest.saving;
      const rows=await readBrowserBoard(game);
      if (!Array.isArray(rows)) throw new Error();
      if (seq!==generation) return;
      board.replaceChildren();
      if (!rows.length) { board.append(note('순위에 반영된 경기가 아직 없습니다.')); return; }
      const selected = new Set();
      const controls = element('div', null, 'ndr-management');
      const status = note('');
      const removeSelected = button('선택 삭제', () => remove(false));
      const removeAll = button('전체 삭제', () => remove(true));
      removeSelected.disabled = true;
      controls.append(removeSelected, removeAll, status);
      function sync() {
        removeSelected.disabled = selected.size === 0;
        status.textContent = selected.size ? selected.size + '명 선택' : '';
      }
      async function remove(all) {
        const message = all ? theme.name + '의 전체순위를 이 브라우저에서 모두 삭제할까요?'
          : theme.name + '에서 선택한 ' + selected.size + '명의 누적 기록을 삭제할까요?';
        if ((!all && !selected.size) || !window.confirm(message)) return;
        removeAll.disabled = removeSelected.disabled = true;
        try {
          await deleteBrowserRows(game, all ? null : [...selected]);
          if (generation === seq && dialog.open) await showBoard();
        } catch {
          removeAll.disabled = false;
          sync();
          status.textContent = '삭제하지 못했습니다. 다시 시도해주세요.';
        }
      }
      const data = rows.map(row => {
        const check = element('input', null, 'ndr-check');
        check.type = 'checkbox';
        check.setAttribute('aria-label', row.nickname + ' 선택');
        check.onchange = () => {
          if (check.checked) selected.add(row.key);
          else selected.delete(row.key);
          sync();
        };
        return [check, row.rank, row.nickname, dates.format(new Date(row.lastPlayedAt)), row.rounds,
          row.entries, row.statA, row.statB, points(row.points)];
      });
      board.append(controls, table(['선택','순위','닉네임','최근 참가일','참가 판수','누적 참가 인원',...theme.stats,'획득점수'], data));
    } catch {
      if (seq===generation) board.replaceChildren(note('전체순위를 불러오지 못했습니다.'),button('다시 불러오기',showBoard));
    }
  }
  function updateStatus(item) {
    if (view!=='result' || item!==latest) return;
    const message = {off:'순위 반영 끄기 · 이 브라우저의 누적 기록에서 제외했습니다.',saving:'전체순위에 반영하는 중입니다.',
      saved:'전체순위에 반영했습니다.',error:'저장을 확인하지 못했습니다.'}[item.state];
    foot.replaceChildren(note(message));
    if (item.state==='error') foot.append(button('저장 재시도',()=>save(item)));
    foot.append(button('전체순위',showBoard));
  }
  async function save(item) {
    if (item.state==='saved' || item.state==='off' || item.saving) return;
    unconfirmed.add(item);
    item.state='saving';
    updateStatus(item);
    item.saving=saveBrowserResult(item.result)
      .then(()=>{ item.state='saved'; unconfirmed.delete(item); })
      .catch(()=>{item.state='error';})
      .finally(()=>{item.saving=null;updateStatus(item);});
    return item.saving;
  }
  function showResult(item) {
    const r=item.result;
    show('result',theme.result);
    const wins=new Set(r.winnerIds);
    const rankCounts=new Map();
    for (const entry of r.standings) rankCounts.set(entry.rank,(rankCounts.get(entry.rank)||0)+1);
    const winners=r.standings.filter(entry=>wins.has(entry.id));
    const ribbon=element('section',null,'ndr-winners');
    ribbon.append(element('small','당첨 '+winners.length+'명'),element('strong',winners.map(x=>x.name).join(' · ')));
    body.append(ribbon,table(['순위','닉네임','이번 판 점수'],r.standings.map(row=>[
      (rankCounts.get(row.rank)>1?'공동 ':'')+row.rank+'위',row.name,points(row.points)])));
    const multi=r.scores.filter(row=>row.entries>1);
    if (multi.length) {
      body.append(element('h3','중복 참가 평균점수'),table(['닉네임','참가 수','평균점수'],
        multi.map(row=>[row.name,row.entries,points(row.points)])));
    }
    updateStatus(item);
  }
  window.addEventListener('nw-draw-result',event=>{
    const result=event.detail;
    if (result?.round?.game!==game) return;
    if (latest?.result.round.id===result.round.id) return;
    latest={result,state:result.round.ranked?'saving':'off',saving:null};
    showResult(latest);
    if (result.round.ranked) save(latest);
  });
}
const entry = document.querySelector('script[data-draw-ranking-game]');
if (entry) mountDrawRanking(entry.dataset.drawRankingGame);
