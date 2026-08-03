(function(){
  var KEY='umbrella_language';
  var LANGS=['en','fr','zh-CN','es','ar','hi','pa','ko','ja','fa','tl'];
  var loaded=false;
  var loading=false;
  var pending=null;

  // Google Translate wraps/replaces text nodes. React can later try to remove
  // one of the original nodes and throw a client-side exception. Make those DOM
  // operations tolerant so translated pages keep running.
  if(!window.__umbrellaTranslateReactGuard){
    window.__umbrellaTranslateReactGuard=true;
    var removeChild=Node.prototype.removeChild;
    var insertBefore=Node.prototype.insertBefore;
    Node.prototype.removeChild=function(child){
      if(child&&child.parentNode!==this)return child;
      return removeChild.call(this,child);
    };
    Node.prototype.insertBefore=function(newNode,referenceNode){
      if(referenceNode&&referenceNode.parentNode!==this)return this.appendChild(newNode);
      return insertBefore.call(this,newNode,referenceNode);
    };
  }

  function valid(lang){return LANGS.indexOf(lang)>=0?lang:'en';}

  function enhanceLanguageSelect(sel){
    if(sel.dataset.customSelectReady)return;
    sel.dataset.customSelectReady='1';
    var wrap=sel.parentElement;
    var options=Array.prototype.slice.call(sel.options);
    var active=Math.max(0,sel.selectedIndex);
    var open=false;

    var trigger=document.createElement('button');
    trigger.type='button';
    trigger.className='static-language-trigger';
    trigger.setAttribute('aria-label',sel.getAttribute('aria-label')||'Choose language');
    trigger.setAttribute('aria-haspopup','listbox');
    trigger.setAttribute('aria-expanded','false');
    trigger.innerHTML='<span class="static-language-value"></span><span class="static-language-chevron" aria-hidden="true">⌄</span>';

    var menu=document.createElement('div');
    menu.className='static-language-menu notranslate';
    menu.setAttribute('role','listbox');
    menu.setAttribute('tabindex','-1');
    menu.hidden=true;

    function update(){
      var selected=options.filter(function(option){return option.value===sel.value;})[0]||options[0];
      trigger.querySelector('.static-language-value').textContent=selected?selected.textContent:'';
      Array.prototype.forEach.call(menu.children,function(item){
        var selectedItem=item.dataset.value===sel.value;
        item.classList.toggle('is-selected',selectedItem);
        item.setAttribute('aria-selected',selectedItem?'true':'false');
      });
      active=Math.max(0,options.indexOf(selected));
    }

    function position(){
      var rect=trigger.getBoundingClientRect();
      var width=Math.max(rect.width,168);
      menu.style.width=width+'px';
      menu.style.left=Math.max(8,Math.min(rect.right-width,window.innerWidth-width-8))+'px';
      menu.style.top=Math.min(rect.bottom+6,window.innerHeight-18)+'px';
      menu.style.maxHeight=Math.max(120,window.innerHeight-rect.bottom-24)+'px';
    }

    function setActive(next){
      if(!options.length)return;
      active=(next+options.length)%options.length;
      Array.prototype.forEach.call(menu.children,function(item,index){item.classList.toggle('is-active',index===active);});
      menu.children[active]&&menu.children[active].scrollIntoView({block:'nearest'});
    }

    function close(refocus){
      if(!open)return;
      open=false;
      menu.hidden=true;
      trigger.setAttribute('aria-expanded','false');
      wrap.classList.remove('is-open');
      if(refocus)trigger.focus();
    }

    function show(){
      if(open)return;
      open=true;
      position();
      menu.hidden=false;
      trigger.setAttribute('aria-expanded','true');
      wrap.classList.add('is-open');
      setActive(sel.selectedIndex);
      menu.focus();
    }

    options.forEach(function(option,index){
      var item=document.createElement('button');
      item.type='button';
      item.className='static-language-option';
      item.dataset.value=option.value;
      item.setAttribute('role','option');
      item.setAttribute('tabindex','-1');
      item.innerHTML='<span></span><span class="static-language-check" aria-hidden="true">✓</span>';
      item.firstChild.textContent=option.textContent;
      item.addEventListener('pointermove',function(){setActive(index);});
      item.addEventListener('click',function(){
        sel.value=option.value;
        sel.dispatchEvent(new Event('change',{bubbles:true}));
        update();
        close(true);
      });
      menu.appendChild(item);
    });

    trigger.addEventListener('click',function(){open?close(false):show();});
    trigger.addEventListener('keydown',function(event){
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){
        event.preventDefault();
        show();
        setActive(sel.selectedIndex+(event.key==='ArrowDown'?1:-1));
      }
    });
    menu.addEventListener('keydown',function(event){
      if(event.key==='Escape'){event.preventDefault();close(true);return;}
      if(event.key==='Tab'){close(false);return;}
      if(event.key==='Home'||event.key==='End'){event.preventDefault();setActive(event.key==='Home'?0:options.length-1);return;}
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){
        event.preventDefault();setActive(active+(event.key==='ArrowDown'?1:-1));return;
      }
      if(event.key==='Enter'||event.key===' '){event.preventDefault();menu.children[active]&&menu.children[active].click();}
    });
    document.addEventListener('pointerdown',function(event){
      if(open&&!wrap.contains(event.target)&&!menu.contains(event.target))close(false);
    });
    window.addEventListener('resize',function(){if(open)position();});
    window.addEventListener('scroll',function(){if(open)position();},true);
    window.addEventListener('umbrella:languagechange',update);

    sel.classList.add('custom-select-native');
    wrap.classList.add('custom-language-ready');
    wrap.insertBefore(trigger,sel);
    document.body.appendChild(menu);
    update();
  }

  function setCookie(lang){
    var host=location.hostname;
    var value=lang==='en'?'':'/en/'+lang;
    var maxAge=lang==='en'?'Max-Age=0':'Max-Age=31536000';
    document.cookie='googtrans='+value+'; Path=/; '+maxAge+'; SameSite=Lax';
    if(host.indexOf('.')>-1){
      document.cookie='googtrans='+value+'; Path=/; Domain=.'+host+'; '+maxAge+'; SameSite=Lax';
    }
  }

  function hideGoogleChrome(){
    document.documentElement.style.top='0px';
    if(document.body)document.body.style.top='0px';
    var nodes=document.querySelectorAll(
      'body > .skiptranslate, iframe.skiptranslate, iframe.goog-te-banner-frame, .goog-te-banner-frame, #goog-gt-tt, .goog-tooltip, .goog-tooltip:hover'
    );
    nodes.forEach(function(node){
      node.style.setProperty('display','none','important');
      node.style.setProperty('visibility','hidden','important');
      node.style.setProperty('height','0','important');
      node.style.setProperty('width','0','important');
      node.style.setProperty('opacity','0','important');
      node.style.setProperty('pointer-events','none','important');
    });
  }

  function ensureContainer(){
    var el=document.getElementById('google_translate_element');
    if(!el){
      el=document.createElement('div');
      el.id='google_translate_element';
      el.className='notranslate';
      el.setAttribute('aria-hidden','true');
      document.body.appendChild(el);
    }
    return el;
  }

  function protectNames(){
    var selectors=[
      '.brand','.namelink','.pf-name','.pf-user','.pf-avatar','.tb-avatar',
      '.person-chip','.people-row a','.team-card h3','.member-name',
      '.lead-card .name',
      '[data-no-translate]','[data-username]'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(function(el){
      el.classList.add('notranslate');
      el.setAttribute('translate','no');
    });
  }

  function combo(){
    return document.querySelector('.goog-te-combo');
  }

  function applyWithCombo(lang){
    var select=combo();
    if(!select)return false;
    select.value=lang;
    select.dispatchEvent(new Event('change'));
    setTimeout(hideGoogleChrome,50);
    setTimeout(hideGoogleChrome,350);
    setTimeout(hideGoogleChrome,900);
    return true;
  }

  function initGoogle(){
    ensureContainer();
    if(loaded||!window.google||!google.translate||!google.translate.TranslateElement)return;
    loaded=true;
    new google.translate.TranslateElement({
      pageLanguage:'en',
      includedLanguages:LANGS.join(','),
      autoDisplay:false
    },'google_translate_element');
    hideGoogleChrome();
    if(pending&&pending!=='en'){
      setTimeout(function(){applyWithCombo(pending);},250);
    }
  }

  function loadGoogle(){
    ensureContainer();
    if(loaded||loading)return;
    loading=true;
    window.googleTranslateElementInit=initGoogle;
    var script=document.createElement('script');
    script.src='https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async=true;
    script.dataset.umbrellaTranslate='true';
    document.body.appendChild(script);
  }

  function setLanguage(lang){
    lang=valid(lang);
    localStorage.setItem(KEY,lang);
    document.documentElement.lang=lang;
    document.documentElement.dir=(lang==='ar'||lang==='fa')?'rtl':'ltr';
    document.documentElement.classList.toggle('umbrella-translated',lang!=='en');
    document.querySelectorAll('[data-language-select]').forEach(function(sel){sel.value=lang;});
    window.dispatchEvent(new CustomEvent('umbrella:languagechange',{detail:{language:lang}}));
    protectNames();
    setCookie(lang);
    hideGoogleChrome();

    if(lang==='en'){
      location.reload();
      return;
    }

    pending=lang;
    if(!applyWithCombo(lang))loadGoogle();
  }

  function init(){
    var lang=valid(localStorage.getItem(KEY)||'en');
    document.documentElement.lang=lang;
    document.documentElement.dir=(lang==='ar'||lang==='fa')?'rtl':'ltr';
    document.documentElement.classList.toggle('umbrella-translated',lang!=='en');
    window.dispatchEvent(new CustomEvent('umbrella:languagechange',{detail:{language:lang}}));
    document.querySelectorAll('[data-language-select]').forEach(function(sel){
      sel.value=lang;
      enhanceLanguageSelect(sel);
      if(!sel.dataset.i18nBound){
        sel.dataset.i18nBound='1';
        sel.addEventListener('change',function(){setLanguage(sel.value);});
      }
    });
    hideGoogleChrome();
    protectNames();
    if(lang!=='en'){
      pending=lang;
      setCookie(lang);
      loadGoogle();
    }
    if(!window.__umbrellaTranslateCleaner&&document.body){
      window.__umbrellaTranslateCleaner=new MutationObserver(function(){
        protectNames();
        hideGoogleChrome();
      });
      window.__umbrellaTranslateCleaner.observe(document.body,{childList:true,subtree:true});
      setInterval(function(){protectNames();hideGoogleChrome();},1200);
    }
  }

  window.UmbrellaI18n={init:init,setLanguage:setLanguage};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
