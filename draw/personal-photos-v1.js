// Manual nickname portraits are separate from the member directory and its cache.
globalThis.createDrawPersonalPhotos = function createDrawPersonalPhotos(anchor, key, roster, changed, existing = false) {
  const el = (tag, text) => {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    return node;
  };
  const panel = existing ? anchor : el('details');
  if (!existing) {
    panel.append(el('summary', '대표사진 설정'));
    anchor.before(panel);
  }
  const box = el('div');
  box.style.cssText = 'display:grid;gap:6px;padding:8px 0;min-width:0;text-align:left';
  panel.append(box);
  const cache = new Map();
  let records, serial = 0;
  const status = el('small');
  status.setAttribute('role','status');
  const read = () => new Map(Object.entries(JSON.parse(localStorage.getItem(key) || '{}')).filter(([, value]) => typeof value === 'string' && value.length));
  if (existing !== true) {
    const name = el('input'), options = el('datalist'), file = el('input');
    const label = el('label', '참가자 닉네임');
    name.type = 'text';
    name.placeholder = '닉네임 선택 또는 입력';
    options.id = 'personal-nicknames-' + key;
    name.setAttribute('list', options.id);
    name.onfocus = () => options.replaceChildren(...Array.from(new Set(roster()), n => new Option(n,n)));
    label.append(name,options);
    const upload = el('label', '개인 사진 선택');
    file.type = 'file';
    file.accept = 'image/*';
    upload.append(file);
    box.append(label,upload);
    file.onchange = async () => {
      const nick = name.value.trim().normalize('NFC'), item = file.files[0], request = ++serial;
      if (!item) return;
      file.value = '';
      if (!nick) { status.textContent = '먼저 닉네임을 입력해주세요.'; name.focus(); return; }
      const url = URL.createObjectURL(item);
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        if (request !== serial) return;
        const side = Math.min(image.width,image.height), canvas = el('canvas');
        canvas.width = canvas.height = 128;
        canvas.getContext('2d').drawImage(image,(image.width-side)/2,(image.height-side)/2,side,side,0,0,128,128);
        const next = read();
        next.set(nick,canvas.toDataURL('image/jpeg',0.85));
        save(next, nick + ' 사진을 저장했습니다.');
      } catch { status.textContent = '사진을 저장하지 못했습니다. 파일과 저장 공간을 확인해주세요.'; }
      finally { URL.revokeObjectURL(url); }
    };
  }
  const open = el('button'), dialog = el('dialog'), title = el('h2','개인 설정 목록');
  const close = el('button','닫기'), list = el('div'), remove = el('button','선택한 사진 삭제');
  const header = el('div'), footer = el('div'), feedback = el('small');
  for (const button of [open, close, remove]) button.type = 'button';
  open.setAttribute('aria-haspopup','dialog');
  title.id = 'personal-photo-title-' + key;
  dialog.setAttribute('aria-labelledby',title.id);
  dialog.className = 'nw-personal-photo-dialog';
  feedback.setAttribute('role','status');
  if (!document.getElementById('nw-personal-photo-style')) {
    const style = el('style'); style.id = 'nw-personal-photo-style';
    style.textContent = `
      dialog.nw-personal-photo-dialog{box-sizing:border-box;width:min(26rem,calc(100vw - 2rem));max-height:calc(100vh - 2rem);max-height:calc(100dvh - 2rem);position:fixed;inset:0;margin:auto;padding:16px;overflow:hidden;border:1px solid #909c80;border-radius:12px;background:#f8f7ef;color:#17382f;font:inherit;box-shadow:0 12px 40px #07151066}
      dialog.nw-personal-photo-dialog[open]{display:flex;flex-direction:column;gap:12px}
      dialog.nw-personal-photo-dialog:not([open]){display:none}
      dialog.nw-personal-photo-dialog::backdrop{background:#10251e70}
      .nw-personal-photo-dialog .photo-actions{display:flex;align-items:center;justify-content:space-between;gap:8px;flex:none}
      .nw-personal-photo-dialog h2{margin:0;font-size:1.15rem;color:#17382f}
      .nw-personal-photo-dialog button{width:auto;min-height:40px;padding:6px 12px;border-radius:6px;background:#27493e;color:#fff;border:0;font:inherit;cursor:pointer}
      .nw-personal-photo-dialog button:disabled{opacity:.48;cursor:default}
      .nw-personal-photo-dialog .photo-list{min-height:0;max-height:52vh;max-height:52dvh;overflow:auto;overscroll-behavior:contain;border-block:1px solid #b9c2b2;padding-block:4px}
      .nw-personal-photo-dialog .photo-list label{min-height:38px;padding:2px 4px;cursor:pointer;color:#17382f}
    `;
    document.head.append(style);
  }
  header.className = footer.className = 'photo-actions';
  close.autofocus = true;
  header.append(title,close);
  list.className = 'photo-list';
  footer.append(feedback,remove);
  dialog.append(header,list,footer);
  box.append(open,status);
  open.onclick = () => {
    (document.fullscreenElement || document.body).append(dialog);
    list.replaceChildren(); feedback.textContent='';
    dialog.showModal(); refresh(); list.scrollTop=0;
  };
  close.onclick = () => dialog.close();
  dialog.addEventListener('close',()=>{ list.replaceChildren(); open.focus(); });
  dialog.addEventListener('keydown',event=>{ if(event.code==='Space') event.stopPropagation(); });
  function selection() { return [...list.querySelectorAll('input:checked')].map(input => input.value); }
  list.onchange = () => { remove.disabled = !selection().length; };
  function refresh() {
    try { records = read(); } catch { records = new Map(); status.textContent = '개인 사진 목록을 불러오지 못했습니다.'; }
    for (const [name, item] of cache) if (records.get(name) !== item.src) cache.delete(name);
    open.textContent = '개인 설정 목록 (' + records.size + ')';
    if (!dialog.open) return;
    const selected = new Set(selection());
    list.replaceChildren();
    if (!records.size) list.append(el('small','개인 설정 사진이 없습니다.'));
    for (const name of [...records.keys()].sort((a,b) => a.localeCompare(b,'ko'))) {
      const label = el('label'), check = el('input'), caption = el('span',name);
      label.style.cssText = 'display:flex;align-items:center;gap:.5em;overflow-wrap:anywhere';
      check.style.cssText = 'width:auto;min-width:0;margin:0;flex:none';
      check.type = 'checkbox'; check.value = name; check.checked = selected.has(name);
      label.append(check,caption); list.append(label);
    }
    remove.disabled = !selection().length;
  }
  function save(next,message) {
    localStorage.setItem(key,JSON.stringify(Object.fromEntries(next)));
    refresh(); (dialog.open ? feedback : status).textContent = message; changed();
  }
  remove.onclick = () => {
    const names = selection();
    if (!names.length) return;
    ++serial;
    try {
      const next = read();
      for (const name of names) next.delete(name);
      save(next,names.length + '개의 개인 사진을 삭제했습니다.');
    } catch { feedback.textContent = '개인 사진을 삭제하지 못했습니다.'; }
  };
  addEventListener('storage', e => { if (e.key === key || e.key === null) { ++serial; refresh(); changed(); } });
  function imageFor(name) {
    const src = records.get(name);
    if (!src) return null;
    if (!cache.has(name)) {
      const image = new Image(); image.src = src;
      cache.set(name,{src,image});
    }
    return cache.get(name).image;
  }
  refresh();
  return {
    refresh,
    get(name) { const image = imageFor(name); return image?.naturalWidth ? image : null; },
    async prepare(service,names,force) {
      const overrides = [...new Set(names)].map(name => [name,imageFor(name)]).filter(([,image]) => image);
      const [base,ready] = await Promise.all([
        service.prepare(names,force),
        Promise.all(overrides.map(async ([name,image]) => { try { await image.decode(); return [name,image]; } catch { return null; } }))
      ]);
      if (!ready.some(Boolean)) return base;
      const images = new Map(base.images);
      for (const pair of ready) if (pair) images.set(...pair);
      return {...base,images,message:base.message + ' · 개인 사진 ' + ready.filter(Boolean).length + '명'};
    }
  };
};
