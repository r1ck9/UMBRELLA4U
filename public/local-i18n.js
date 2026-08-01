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
    document.querySelectorAll('[data-language-select]').forEach(function(sel){
      sel.value=lang;
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
