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
  const heading = el('strong','개인 설정 닉네임'), list = el('div'), remove = el('button','선택한 사진 삭제');
  list.style.cssText = 'display:grid;gap:3px;max-height:10em;overflow:auto';
  remove.type = 'button';
  box.append(heading,list,remove,status);
  function selection() { return [...list.querySelectorAll('input:checked')].map(input => input.value); }
  list.onchange = () => { remove.disabled = !selection().length; };
  function refresh() {
    try { records = read(); } catch { records = new Map(); status.textContent = '개인 사진 목록을 불러오지 못했습니다.'; }
    for (const [name, item] of cache) if (records.get(name) !== item.src) cache.delete(name);
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
    refresh(); status.textContent = message; changed();
  }
  remove.onclick = () => {
    const names = selection();
    if (!names.length) return;
    ++serial;
    try {
      const next = read();
      for (const name of names) next.delete(name);
      save(next,names.length + '개의 개인 사진을 삭제했습니다.');
    } catch { status.textContent = '개인 사진을 삭제하지 못했습니다.'; }
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
