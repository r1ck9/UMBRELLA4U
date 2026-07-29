(function(){
  var root=document.documentElement,resizeFrame=0;
  function fitSite(){
    resizeFrame=0;
    var mobile=window.innerWidth<=760;
    var scale=mobile?1:Math.max(.72,Math.min(1,window.innerWidth/1440,window.innerHeight/800));
    root.style.setProperty('--site-fit',scale.toFixed(4));
    root.style.setProperty('--site-viewport-height',(window.innerHeight/scale).toFixed(2)+'px');
  }
  function queueFit(){
    if(!resizeFrame)resizeFrame=requestAnimationFrame(fitSite);
  }
  fitSite();
  window.addEventListener('resize',queueFit,{passive:true});
  window.addEventListener('orientationchange',queueFit,{passive:true});
})();
