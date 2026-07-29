(function(){
  var root=document.documentElement;
  function fitSite(){
    var mobile=window.innerWidth<=760;
    var scale=mobile?1:Math.max(.72,Math.min(1,window.innerWidth/1440,window.innerHeight/800));
    window.__siteFit=scale;
    root.style.setProperty('--site-fit',scale.toFixed(4));
    root.style.setProperty('--site-viewport-height',(window.innerHeight/scale).toFixed(2)+'px');
  }
  fitSite();
  window.addEventListener('resize',fitSite,{passive:true});
  window.addEventListener('orientationchange',fitSite,{passive:true});
})();
