import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createRequire } from 'node:module';
import { addRaceRanking } from '../server/race-ranking-html.mjs';
import { drawRankingApi } from '../server/draw-ranking-api.mjs';

const {chromium} = createRequire(import.meta.url)('playwright');
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const hub='https://ehrlckdqud-cloud.github.io', server='https://newtworld-ms3-coop-5p.ehrlckdqud.chatgpt.site';
const titles=['구슬 추첨 결과','연못의 생존 결과','우주선 탈출 결과','결승선 통과 기록','멍냥이 결승 기록'];
const games=['pinball','pond','space','wild-run-91','pet-race'];
const pages=['index','pond','space'];
const fixtureName='테스트 대원';
function raceDocument(game) {
  const markup='<!doctype html><html lang="ko"><body><label>당첨 인원<input id="winners"></label><canvas id="cv"></canvas><script>function refresh(){} function end(){order=arrivals.concat([]);if(arrivals.length===runners.length)refresh()}</script></body></html>';
  return addRaceRanking(markup,game,'/draw/draw-game-results.mjs');
}
test('ranking controls, themed results, official read/write and retry work at desktop and mobile widths',async t=>{
  const db=new DatabaseSync(':memory:');
  db.exec(read('server/draw-ranking.sql'));
  const binding={prepare:sql=>({bind:(...v)=>({first:async()=>db.prepare(sql).get(...v),all:async()=>({results:db.prepare(sql).all(...v)})})})};
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
  t.after(async()=>{await browser.close();db.close()});
  for(const [i,game] of games.entries()){
    const race=i>=3;
    const ctx=await browser.newContext();
    try {
      const page=await ctx.newPage();
      const doc=race?raceDocument(game):read('draw/'+pages[i]+'.html');
      let finishCalls=0, retryOnce=true;
      await page.route('**/*',async route=>{
        const req=route.request(), url=new URL(req.url());
        if(url.pathname.startsWith('/api/draw-rankings/')){
          if(url.pathname.endsWith('/finish')&&req.method()==='POST'){
            finishCalls++;
            if(retryOnce){retryOnce=false;return route.abort('failed');}
          }
          const res=await drawRankingApi(new Request(req.url(),{method:req.method(),headers:req.headers(),body:req.postData()||undefined}),binding,async()=>true);
          return route.fulfill({status:res.status,headers:Object.fromEntries(res.headers),body:await res.text()});
        }
        if(req.isNavigationRequest())return route.fulfill({contentType:'text/html',body:doc});
        const name=url.pathname.split('/').pop();
        if(['draw-ranking-ui.mjs','draw-ranking-ui.css','draw-game-results.mjs','draw-ranking.mjs','space-selection.js','newtworld-v326-source.7ccbf679.css','pond.64425dec.css','space.css'].includes(name)){
          return route.fulfill({contentType:name.endsWith('.css')?'text/css':'text/javascript',body:read('draw/'+name)});
        }
        return route.fulfill({contentType:'text/javascript',body:''});
      });
      await page.goto(race?server+'/'+game+'/':hub+'/newtworld-ranking/draw/'+pages[i]+'.html');
      await page.evaluate(()=>{
        document.documentElement.classList.remove('member-gated');
        document.body.classList.add('space-authorized');
        for(const id of ['memberGate','pondGate']) {const el=document.getElementById(id);if(el)el.hidden=true;}
        for(const id of ['nwspace','pondRoot']){const el=document.getElementById(id);if(el){el.hidden=false;el.inert=false;}}
      });
      const open=page.getByRole('button',{name:'전체순위',exact:true}).first(), panel=page.locator('.ndr-dialog');
      const select=page.locator('.ndr-setting select');
      const emit=async()=>page.evaluate(async({game,race,name})=>{
        const base=race?'/draw/':'./';
        const {beginGameRound}=await import(base+'draw-game-results.mjs');
        const {scoreDrawRound}=await import(base+'draw-ranking.mjs');
        const round=beginGameRound(game,[{id:0,name},{id:1,name:'다른 참가자'},{id:2,name}]);
        const groups=[[0],[1],[2]],winnerIds=['0'];
        const detail={round,groups,winnerIds,revivedWinnerIds:game==='pond'?['0']:[],finishedAt:'2026-11-26T16:00:00Z',...scoreDrawRound(round,groups)};
        if(game==='pinball')detail.mode='first';
        window.dispatchEvent(new CustomEvent('nw-draw-result',{detail}));
      },{game,race,name:fixtureName});
      // The real settings panes can start collapsed on small displays.
      await select.evaluate(el=>{el.value='off';el.dispatchEvent(new Event('change'));});
      await page.setViewportSize({width:1280,height:760});
      const desktopButton=await open.boundingBox();
      assert.ok(desktopButton.x+desktopButton.width>=1280*.85,game+' desktop button');
      await open.click({timeout:5000});
      await panel.getByText('순위에 반영된 경기가 아직 없습니다.').waitFor();
      await panel.getByRole('button',{name:'닫기'}).click();
      await emit();
      await panel.getByRole('heading',{name:titles[i]}).waitFor();
      await panel.getByText(/공식 기록에서 제외/).waitFor();
      assert.equal(finishCalls,0);
      const box=await panel.boundingBox();
      assert.ok(box.x>640 && box.x+box.width<=1280,game);
      await panel.getByRole('button',{name:'닫기'}).click();
      await select.evaluate(el=>{el.value='on';el.dispatchEvent(new Event('change'));});
      await page.setViewportSize({width:390,height:844});
      const mobileButton=await open.boundingBox();
      assert.ok(mobileButton.x+mobileButton.width>=390*.85,game+' mobile button');
      await open.click({timeout:5000});
      await panel.getByRole('button',{name:'닫기'}).click();
      await emit();
      await panel.getByRole('button',{name:'저장 재시도'}).click();
      await panel.getByText('전체순위에 반영했습니다.').waitFor();
      await panel.getByRole('heading',{name:'중복 참가 평균점수'}).waitFor();
      await panel.getByRole('button',{name:'전체순위'}).click();
      const row=panel.locator('tbody tr').filter({hasText:fixtureName});
      await row.waitFor();
      const values=await row.locator('td').allTextContents();
      assert.equal(values[3],'1');assert.equal(values[4],'2');
      assert.deepEqual(values.slice(5),['1',game==='pinball'?'0':'1','5.0']);
      assert.ok(values[2].includes('27'));
      const mobile=await panel.boundingBox();
      assert.ok(mobile.x>=0 && mobile.x+mobile.width<=391);
      await panel.getByRole('button',{name:'닫기'}).click();
      assert.equal(finishCalls,2);
    }finally{await ctx.close();}
  }
});


test('older rounds preserve mode wins once per nickname and unauthorised requests cannot read or write', async t=>{
  const db=new DatabaseSync(':memory:');
  t.after(()=>db.close());
  db.exec(read('server/draw-ranking.sql'));
  const binding={prepare:sql=>({bind:(...v)=>({first:async()=>db.prepare(sql).get(...v),all:async()=>({results:db.prepare(sql).all(...v)})})})};
  const placements=[{id:'0',name:'CY',winner:true,mode:'last'},{id:'1',name:'cy',winner:true,mode:'last'}];
  db.prepare('INSERT INTO draw_ranking_rounds VALUES(?,?,?,?,?)').run('pinball','old','2026-11-26T11:00:00Z',
    JSON.stringify(placements),JSON.stringify([{key:'cy',name:'CY',entries:2,points:5}]));
  const call=(action,allow)=>drawRankingApi(new Request(server+'/api/draw-rankings/pinball/'+action,{
    method:'POST',headers:{Origin:hub,'Content-Type':'application/json'},body:'{}'
  }),binding,async()=>allow);
  for(const action of ['board','finish']) assert.equal((await call(action,false)).status,403);
  const {rows}=await (await call('board',true)).json();
  assert.deepEqual([rows[0].rounds,rows[0].entries,rows[0].statA,rows[0].statB,rows[0].points],[1,2,0,1,5]);
});
