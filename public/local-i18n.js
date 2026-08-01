(function(){
  var key='umbrella_language';
  var langs=['en','fr','zh-CN','es','ar','hi','pa','ko','ja','fa','tl'];
  var base={
    'About':['À propos','关于','Acerca de'],
    'Our Team':['Notre équipe','我们的团队','Nuestro equipo'],
    'Products':['Produits','产品','Productos'],
    'Chapters':['Chapitres','分会','Capítulos'],
    'Handbook':['Guide','手册','Guía'],
    'Enter Haven ☂':['Entrer dans Haven ☂','进入 Haven ☂','Entrar a Haven ☂'],
    'Enter Haven →':['Entrer dans Haven →','进入 Haven →','Entrar a Haven →'],
    'Lead a Chapter':['Diriger un chapitre','创建分会','Liderar un capítulo'],
    'Apply to lead →':['Postuler pour diriger →','申请带领 →','Postular para liderar →'],
    'Partner with us':['Devenir partenaire','与我们合作','Colabora con nosotros'],
    'Explore the products':['Explorer les produits','探索产品','Explorar productos'],
    "What we're about":['Ce que nous défendons','我们的理念','Lo que somos'],
    'How it works':['Comment ça marche','如何运作','Cómo funciona'],
    'Home':['Accueil','首页','Inicio'],
    'Inbox':['Boîte de réception','收件箱','Bandeja'],
    'Resources':['Ressources','资源','Recursos'],
    'Settings':['Paramètres','设置','Ajustes'],
    'Feedback':['Commentaires','反馈','Comentarios'],
    'Guidelines':['Règles','指南','Normas'],
    'Weather':['Météo','心情','Estado'],
    'Log in':['Connexion','登录','Entrar'],
    'Sign up':['Inscription','注册','Registrarse'],
    'Log out':['Déconnexion','退出','Salir'],
    'Search stories & people':['Rechercher histoires et personnes','搜索故事和用户','Buscar historias y personas'],
    'Moderation':['Modération','审核','Moderación'],
    'This page is for moderators only.':['Cette page est réservée aux modérateurs.','此页面仅限审核员访问。','Esta página es solo para moderadores.'],
    'Checking access...':['Vérification de l’accès...','正在检查权限...','Verificando acceso...'],
    'We’re working on a mobile app.':['Nous travaillons sur une application mobile.','我们正在开发移动应用。','Estamos trabajando en una app móvil.'],
    'Haven is being built for your phone, too.':['Haven est aussi conçu pour ton téléphone.','Haven 也会适配你的手机。','Haven también se está creando para tu teléfono.'],
    'What is Umbrella4U?':['Qu’est-ce qu’Umbrella4U ?','Umbrella4U 是什么？','¿Qué es Umbrella4U?'],
    'Who we are':['Qui nous sommes','我们是谁','Quiénes somos'],
    'Our products':['Nos produits','我们的产品','Nuestros productos'],
    'Where we’re headed':['Là où nous allons','我们的方向','Hacia dónde vamos'],
    'Chapters & leadership':['Chapitres et leadership','分会与领导力','Capítulos y liderazgo'],
    'A space for real voices':['Un espace pour de vraies voix','真实声音的空间','Un espacio para voces reales'],
    'Meet Haven ☂':['Découvre Haven ☂','认识 Haven ☂','Conoce Haven ☂'],
    'The plan is a continent, not a pilot.':['Le plan vise un continent, pas seulement un projet pilote.','我们的目标不是试点，而是覆盖整个大陆。','El plan es un continente, no una prueba piloto.'],
    'One umbrella, many tools.':['Un parapluie, plusieurs outils.','一把伞，多种工具。','Un paraguas, muchas herramientas.'],
    'Our next step: a Chapter in every city that needs one.':['Notre prochaine étape : un chapitre dans chaque ville qui en a besoin.','下一步：在每个需要的城市建立分会。','Nuestro próximo paso: un capítulo en cada ciudad que lo necesite.'],
    'There is room for every story under the umbrella.':['Il y a de la place pour chaque histoire sous le parapluie.','每一个故事都能在伞下找到位置。','Hay espacio para cada historia bajo el paraguas.'],
    'Help us hold an umbrella over a whole generation.':['Aidez-nous à protéger toute une génération.','帮助我们为整整一代人撑起保护伞。','Ayúdanos a sostener un paraguas sobre toda una generación.'],
    'Umbrella4U is a youth-led movement for self-expression, a place to break the social norm, drop the mask, and be accepted for exactly who you are. Started by students, run by volunteers, spread city by city.':['Umbrella4U est un mouvement mené par des jeunes pour l’expression de soi : un endroit pour briser les normes sociales, laisser tomber le masque et être accepté exactement comme on est. Lancé par des élèves, porté par des bénévoles, ville après ville.','Umbrella4U 是一个由青年主导的自我表达运动。在这里，你可以打破社会规范，放下面具，并因真实的自己而被接纳。它由学生发起，由志愿者运营，正在一座城市一座城市地扩展。','Umbrella4U es un movimiento juvenil de autoexpresión: un lugar para romper la norma social, quitarse la máscara y ser aceptado tal como eres. Iniciado por estudiantes, impulsado por voluntarios y creciendo ciudad por ciudad.'],
    'A youth-led movement for self-expression, helping young people be who they really are and break the social norms that say they can’t.':['Un mouvement mené par des jeunes pour l’expression de soi, qui aide les jeunes à être vraiment eux-mêmes et à briser les normes sociales qui leur disent le contraire.','一个由青年主导的自我表达运动，帮助年轻人成为真实的自己，打破那些限制他们的社会规范。','Un movimiento juvenil de autoexpresión que ayuda a jóvenes a ser quienes realmente son y romper las normas sociales que dicen que no pueden.']
  };
  var index={fr:0,'zh-CN':1,es:2};
  var extra={
    ar:{'About':'حول','Our Team':'فريقنا','Products':'المنتجات','Chapters':'الفروع','Handbook':'الدليل','Enter Haven ☂':'ادخل Haven ☂','Enter Haven →':'ادخل Haven →','Lead a Chapter':'قد فرعًا','Apply to lead →':'تقدّم للقيادة →','Partner with us':'شاركنا','Explore the products':'استكشف المنتجات',"What we're about":'ما هدفنا','How it works':'كيف يعمل','Home':'الرئيسية','Inbox':'الوارد','Resources':'الموارد','Settings':'الإعدادات','Feedback':'ملاحظات','Guidelines':'الإرشادات','Weather':'الحالة','Log in':'تسجيل الدخول','Sign up':'إنشاء حساب','Log out':'تسجيل الخروج','Search stories & people':'ابحث عن القصص والأشخاص','Moderation':'الإشراف','This page is for moderators only.':'هذه الصفحة للمشرفين فقط.','Checking access...':'جارٍ التحقق من الوصول...'},
    hi:{'About':'परिचय','Our Team':'हमारी टीम','Products':'उत्पाद','Chapters':'चैप्टर','Handbook':'हैंडबुक','Enter Haven ☂':'Haven में जाएँ ☂','Enter Haven →':'Haven में जाएँ →','Lead a Chapter':'चैप्टर शुरू करें','Apply to lead →':'नेतृत्व के लिए आवेदन →','Partner with us':'हमसे जुड़ें','Explore the products':'उत्पाद देखें',"What we're about":'हमारा उद्देश्य','How it works':'यह कैसे काम करता है','Home':'होम','Inbox':'इनबॉक्स','Resources':'संसाधन','Settings':'सेटिंग्स','Feedback':'प्रतिक्रिया','Guidelines':'दिशानिर्देश','Weather':'मूड','Log in':'लॉग इन','Sign up':'साइन अप','Log out':'लॉग आउट','Search stories & people':'कहानियाँ और लोग खोजें','Moderation':'मॉडरेशन','This page is for moderators only.':'यह पेज केवल मॉडरेटर के लिए है।','Checking access...':'पहुंच जाँची जा रही है...'},
    pa:{'About':'ਬਾਰੇ','Our Team':'ਸਾਡੀ ਟੀਮ','Products':'ਉਤਪਾਦ','Chapters':'ਚੈਪਟਰ','Handbook':'ਹੈਂਡਬੁੱਕ','Enter Haven ☂':'Haven ਵਿੱਚ ਜਾਓ ☂','Enter Haven →':'Haven ਵਿੱਚ ਜਾਓ →','Lead a Chapter':'ਚੈਪਟਰ ਚਲਾਓ','Apply to lead →':'ਲੀਡ ਕਰਨ ਲਈ ਅਰਜ਼ੀ →','Partner with us':'ਸਾਡੇ ਨਾਲ ਸਾਂਝ ਪਾਓ','Explore the products':'ਉਤਪਾਦ ਵੇਖੋ',"What we're about":'ਸਾਡਾ ਮਕਸਦ','How it works':'ਇਹ ਕਿਵੇਂ ਕੰਮ ਕਰਦਾ ਹੈ','Home':'ਘਰ','Inbox':'ਇਨਬਾਕਸ','Resources':'ਸਰੋਤ','Settings':'ਸੈਟਿੰਗਾਂ','Feedback':'ਫੀਡਬੈਕ','Guidelines':'ਦਿਸ਼ਾ-ਨਿਰਦੇਸ਼','Weather':'ਮੂਡ','Log in':'ਲਾਗ ਇਨ','Sign up':'ਸਾਈਨ ਅਪ','Log out':'ਲਾਗ ਆਉਟ','Search stories & people':'ਕਹਾਣੀਆਂ ਅਤੇ ਲੋਕ ਲੱਭੋ','Moderation':'ਮਾਡਰੇਸ਼ਨ','This page is for moderators only.':'ਇਹ ਪੰਨਾ ਸਿਰਫ਼ ਮਾਡਰੇਟਰਾਂ ਲਈ ਹੈ।','Checking access...':'ਪਹੁੰਚ ਜਾਂਚੀ ਜਾ ਰਹੀ ਹੈ...'},
    ko:{'About':'소개','Our Team':'팀','Products':'제품','Chapters':'챕터','Handbook':'핸드북','Enter Haven ☂':'Haven 들어가기 ☂','Enter Haven →':'Haven 들어가기 →','Lead a Chapter':'챕터 이끌기','Apply to lead →':'리더 신청 →','Partner with us':'함께하기','Explore the products':'제품 보기',"What we're about":'우리가 하는 일','How it works':'이용 방법','Home':'홈','Inbox':'받은함','Resources':'자료','Settings':'설정','Feedback':'피드백','Guidelines':'가이드라인','Weather':'기분','Log in':'로그인','Sign up':'가입','Log out':'로그아웃','Search stories & people':'이야기와 사람 검색','Moderation':'관리','This page is for moderators only.':'이 페이지는 관리자 전용입니다.','Checking access...':'접근 권한 확인 중...'},
    ja:{'About':'概要','Our Team':'チーム','Products':'プロダクト','Chapters':'チャプター','Handbook':'ハンドブック','Enter Haven ☂':'Haven に入る ☂','Enter Haven →':'Haven に入る →','Lead a Chapter':'チャプターを始める','Apply to lead →':'リーダーに応募 →','Partner with us':'提携する','Explore the products':'プロダクトを見る',"What we're about":'私たちについて','How it works':'使い方','Home':'ホーム','Inbox':'受信箱','Resources':'リソース','Settings':'設定','Feedback':'フィードバック','Guidelines':'ガイドライン','Weather':'気分','Log in':'ログイン','Sign up':'登録','Log out':'ログアウト','Search stories & people':'ストーリーと人を検索','Moderation':'モデレーション','This page is for moderators only.':'このページはモデレーター専用です。','Checking access...':'アクセスを確認中...'},
    fa:{'About':'درباره','Our Team':'تیم ما','Products':'محصولات','Chapters':'شعبه‌ها','Handbook':'راهنما','Enter Haven ☂':'ورود به Haven ☂','Enter Haven →':'ورود به Haven →','Lead a Chapter':'رهبری یک شعبه','Apply to lead →':'درخواست رهبری →','Partner with us':'همکاری با ما','Explore the products':'مشاهده محصولات',"What we're about":'هدف ما','How it works':'چطور کار می‌کند','Home':'خانه','Inbox':'صندوق ورودی','Resources':'منابع','Settings':'تنظیمات','Feedback':'بازخورد','Guidelines':'راهنماها','Weather':'حال‌وهوا','Log in':'ورود','Sign up':'ثبت‌نام','Log out':'خروج','Search stories & people':'جستجوی داستان‌ها و افراد','Moderation':'مدیریت','This page is for moderators only.':'این صفحه فقط برای مدیران است.','Checking access...':'در حال بررسی دسترسی...'},
    tl:{'About':'Tungkol','Our Team':'Aming Team','Products':'Mga Produkto','Chapters':'Mga Chapter','Handbook':'Handbook','Enter Haven ☂':'Pumasok sa Haven ☂','Enter Haven →':'Pumasok sa Haven →','Lead a Chapter':'Mamuno ng Chapter','Apply to lead →':'Mag-apply mamuno →','Partner with us':'Makipag-partner','Explore the products':'Tingnan ang produkto',"What we're about":'Tungkol sa amin','How it works':'Paano gumagana','Home':'Home','Inbox':'Inbox','Resources':'Resources','Settings':'Settings','Feedback':'Feedback','Guidelines':'Mga Gabay','Weather':'Mood','Log in':'Log in','Sign up':'Sign up','Log out':'Log out','Search stories & people':'Maghanap ng stories at tao','Moderation':'Moderation','This page is for moderators only.':'Para lang ito sa moderators.','Checking access...':'Sinusuri ang access...'}
  };
  var fallbackNames={ar:'العربية',hi:'हिन्दी',pa:'ਪੰਜਾਬੀ',ko:'한국어',ja:'日本語',fa:'فارسی',tl:'Filipino'};
  var originalText=new WeakMap();
  function clean(v){return String(v||'').replace(/\s+/g,' ').trim();}
  function tr(v,lang){
    if(lang==='en')return v;
    var arr=base[clean(v)];
    if(extra[lang]&&extra[lang][clean(v)])return extra[lang][clean(v)];
    if(!arr)return v;
    if(index[lang]!=null)return arr[index[lang]];
    return v;
  }
  function apply(root,lang){
    if(!root)return;
    if(root.closest&&root.closest('script,style,textarea,input,select,[data-no-translate],.notranslate'))return;
    var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(node){
      var p=node.parentElement;
      if(!clean(node.nodeValue)||!p||p.closest('script,style,textarea,input,select,[data-no-translate],.notranslate'))return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }});
    var nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(function(node){
      if(!originalText.has(node))originalText.set(node,node.nodeValue);
      var source=originalText.get(node);
      node.nodeValue=lang==='en'?source:tr(source,lang);
    });
    if(root.querySelectorAll)root.querySelectorAll('input[placeholder],textarea[placeholder],[aria-label],[title]').forEach(function(el){
      ['placeholder','aria-label','title'].forEach(function(attr){
        if(!el.hasAttribute(attr))return;
        var key='data-i18n-'+attr;
        if(!el.hasAttribute(key))el.setAttribute(key,el.getAttribute(attr));
        var source=el.getAttribute(key);
        el.setAttribute(attr,lang==='en'?source:tr(source,lang));
      });
    });
  }
  function setLanguage(lang){
    if(langs.indexOf(lang)<0)lang='en';
    localStorage.setItem(key,lang);
    document.documentElement.lang=lang;
    document.documentElement.dir=(lang==='ar'||lang==='fa')?'rtl':'ltr';
    if(document.body)apply(document.body,lang);
    document.querySelectorAll('[data-language-select]').forEach(function(s){s.value=lang;});
  }
  function init(){
    var lang=localStorage.getItem(key)||'en';
    document.querySelectorAll('[data-language-select]').forEach(function(s){
      s.value=lang;
      if(!s.dataset.i18nBound){
        s.dataset.i18nBound='1';
        s.addEventListener('change',function(){setLanguage(s.value);});
      }
    });
    setLanguage(lang);
    if(!window.__umbrellaI18nObserver&&document.body){
      window.__umbrellaI18nObserver=new MutationObserver(function(muts){
        var current=localStorage.getItem(key)||'en';
        if(current==='en')return;
        muts.forEach(function(m){m.addedNodes&&m.addedNodes.forEach(function(n){if(n.nodeType===1)apply(n,current);});});
      });
      window.__umbrellaI18nObserver.observe(document.body,{childList:true,subtree:true});
    }
  }
  window.UmbrellaI18n={setLanguage:setLanguage,init:init,languages:langs,labels:fallbackNames};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
