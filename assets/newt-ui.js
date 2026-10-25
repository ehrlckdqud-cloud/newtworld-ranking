(function(){
 const root=new URL('./',document.currentScript.src),css=document.createElement('link');css.rel='stylesheet';css.href=new URL('newt-ui.css',root);document.head.append(css);
 function gem(){const img=document.createElement('img');img.src=new URL('newt-gem.svg',root);img.alt='뉴트젬';img.className='nw-gem-icon';return img;}
 function dialog({password=false,cost=null,message='',title='뉴트월드',accept='진행',cancel='취소'}={}){
  return new Promise(resolve=>{
   const d=document.createElement('dialog');d.className='nw-dialog';d.setAttribute('aria-label',title);
   const form=document.createElement('form'),h=document.createElement('h2'),p=document.createElement('p'),actions=document.createElement('div'),no=document.createElement('button'),yes=document.createElement('button');h.textContent=title;actions.className='nw-dialog-actions';no.type='button';no.textContent=cancel;yes.type='submit';yes.textContent=accept;yes.className='nw-primary';
   let input,finished=false;const finish=value=>{if(finished)return;finished=true;if(input)input.value='';d.close();d.remove();resolve(value);};
   if(cost!==null){const amount=document.createElement('strong');amount.className='nw-gem-amount';amount.append(gem(),document.createTextNode(String(cost)));p.append(amount,document.createTextNode('이 차감됩니다. 진행하시겠습니까?'));}else p.textContent=message;
   form.append(h,p);if(password){input=document.createElement('input');input.type='password';input.autocomplete='current-password';input.required=true;input.setAttribute('aria-label','관리자 비밀번호');form.append(input);}
   actions.append(no,yes);form.append(actions);d.append(form);no.onclick=()=>finish(password?null:false);d.addEventListener('cancel',e=>{e.preventDefault();finish(password?null:false);});form.onsubmit=e=>{e.preventDefault();finish(password?input.value:true);};document.body.append(d);d.showModal();(input||no).focus();
  });
 }
 window.NWUI={gem,confirm:options=>dialog(options),password:()=>dialog({password:true,title:'관리자 로그인',message:'뉴트월드 관리자 비밀번호를 입력해주세요.',accept:'로그인'})};
})();