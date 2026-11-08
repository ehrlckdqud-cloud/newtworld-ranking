import {testHeaders} from './test-access.mjs?v=98';

import {lobbyAudio} from './lobby-audio.mjs?v=98';

const launcher='https://newtworld-ms3-coop-5p.ehrlckdqud.chatgpt.site/psp6/';
export function openPspArcade(game='mslug6'){
 if(game!=='mslug6')return;
 const session=new Headers(testHeaders());
 const fields={handoff:'1',
  memberToken:localStorage.getItem('nwProfileToken'),
  device:localStorage.getItem('nwProfileDevice'),
  session:session.get('x-nw-site-session'),connection:session.get('x-nw-site-connection')
 };
 if(Object.values(fields).some(value=>!value)){alert('뉴트월드 회원식별 후 다시 입장해 주세요.');return;}
 const form=document.createElement('form');
 form.action=launcher;form.method='POST';form.target='_self';form.hidden=true;
 for(const [name,value] of Object.entries(fields)){
  const input=document.createElement('input');input.type='hidden';input.name=name;input.value=value;form.append(input);
 }
 document.body.append(form);try{lobbyAudio.suspend();form.submit();}catch(error){lobbyAudio.setWaiting(true);throw error;}finally{form.remove();}
}
