(function(){
  'use strict';
  var root=document.documentElement;
  var storageKey='umbrella4u-font-style';
  var styles=[
    {name:'Editorial',pair:'Lora + Inter'},
    {name:'Geometric',pair:'Space Grotesk + Manrope'},
    {name:'Warm',pair:'Fraunces + Nunito Sans'},
    {name:'Poster',pair:'Oswald + Work Sans'},
    {name:'Classic',pair:'Playfair Display + Source Sans 3'}
  ];
  var current=0,lastF=0,toast=null,toastTimer=0;

  try{
    var saved=parseInt(localStorage.getItem(storageKey),10);
    if(saved>=1&&saved<=styles.length)current=saved-1;
  }catch(error){}
  root.setAttribute('data-font-style',String(current+1));

  function mountToast(){
    if(toast||!document.body)return;
    toast=document.createElement('div');
    toast.id='font-style-toast';
    toast.className='font-style-toast';
    toast.setAttribute('role','status');
    toast.setAttribute('aria-live','polite');
    toast.setAttribute('aria-atomic','true');
    document.body.appendChild(toast);
  }
  function announce(){
    mountToast();
    if(!toast)return;
    toast.textContent='Typography '+(current+1)+'/'+styles.length+' · '+styles[current].name+' · '+styles[current].pair;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(function(){toast.classList.remove('is-visible')},1700);
  }
  function applyNext(){
    current=(current+1)%styles.length;
    root.setAttribute('data-font-style',String(current+1));
    try{localStorage.setItem(storageKey,String(current+1))}catch(error){}
    announce();
  }
  function isEditable(target){
    return target&&target.closest&&target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])');
  }
  addEventListener('keydown',function(event){
    if(event.isComposing||event.repeat||event.ctrlKey||event.metaKey||event.altKey||event.key.toLowerCase()!=='f'||isEditable(event.target))return;
    var now=performance.now();
    if(lastF&&now-lastF<=420){
      lastF=0;
      event.preventDefault();
      applyNext();
    }else lastF=now;
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountToast,{once:true});
  else mountToast();
})();
