(function(){
  var T={
    it:{
      navLinks:['Funzionalità','Chi siamo','Tecnologia','Sicurezza','Pricing'],
      navCta:'Inizia ora',
      heroSub:'Unifica il tuo patrimonio e ottimizzalo con Modelli Quantitativi e Intelligenza Artificiale.',
      heroBtn1:'Accedi alla beta privata',heroBtn2:'Guarda la demo →',
      heroCardLbl:'Portfolio overview — Aggiornato in tempo reale',heroLive:'Live',
      hkpiLbl:['Net worth totale','Performance YTD','Sharpe ratio','Asset allocati'],
      hkpiMeta:['+12.4% questo mese','+5.2% vs benchmark','Profilo ottimizzato','Ben diversificato'],
      hkpiAI:'Elara ha identificato <strong>3 opportunità di ottimizzazione</strong> nel tuo portafoglio — clicca per vedere i dettagli.',
      statsCat:['velocità','ottimizzazione','monitoraggio'],
      statsDesc:["Tempo risparmiato nell'analisi del patrimonio",'Miglioramento medio del Sharpe ratio','AI attiva in continuo sui tuoi asset'],
      visionLabel:'La nostra visione',
      visionH2:'Vogliamo rendere accessibile a tutti la gestione patrimoniale di livello istituzionale',
      visionP:'Algoritmi quantitativi, intelligenza artificiale e aggregazione dei dati: gli stessi strumenti usati dai grandi hedge fund, ora a disposizione di ogni investitore consapevole.',
      vcardH:['Unifichiamo il patrimonio','Ottimizziamo i rendimenti','Creiamo chiarezza'],
      vcardP:["Conti bancari, broker, immobili, veicoli: tutto in un'unica vista intelligente aggiornata in tempo reale.",'Modelli quantitativi che lavorano in continuo per massimizzare il rapporto rischio-rendimento del tuo portafoglio.','Dati complessi tradotti in insight azionabili: sai sempre dove sei, dove stai andando e cosa fare.'],
      servLabel:'Funzionalità',
      servH2:'Cosa fa Elara<br>per il tuo patrimonio',
      servP:"Dalla raccolta dati all'ottimizzazione automatica, Elara gestisce ogni aspetto del tuo patrimonio con algoritmi quantitativi e intelligenza artificiale.",
      scardH:['Ottimizzazione di portafoglio','Patrimonio unificato','Chat conversazionale'],
      scardP:['Algoritmi quantitativi che ribilanciano continuamente il tuo portafoglio per massimizzare il rapporto rischio-rendimento.',"Tutti i tuoi asset finanziari e beni fisici aggregati da banche, broker e conti personali in un'unica schermata.",'Chiedi qualsiasi cosa sul tuo patrimonio e ricevi risposte immediate basate sui tuoi dati reali.'],
      scardLi:[['Mean-Variance Optimization','Black-Litterman Model','Risk Parity & Sharpe Max'],['Aggregazione bancaria PSD2','Beni fisici e immobili','Dashboard real-time'],['Analisi del rischio istantanea','Tax-loss harvesting automatico','Simulazioni what-if']],
      demoLabel:'Demo interattiva',demoH2:'Parla con il tuo copilota finanziario',
      demoP:'Premi una domanda per vedere come Elara analizza il tuo portafoglio in tempo reale.',
      chatName:'Elara AI',chatStatus:'Online — Analisi attiva',
      chatInit:'Ciao! Sono Elara, il tuo copilota finanziario. Ho analizzato il tuo portafoglio. Cosa vuoi sapere?',
      chatPlaceholder:'Chiedimi qualcosa sul tuo patrimonio…',chatSend:'Invia →',
      pills:['Sto prendendo troppo rischio?','Il portafoglio è diversificato?','Come ottimizzare le tasse?','Quanto crypto dovrei avere?'],
      algoLabel:'Tecnologia',
      algoH2:'Algoritmi istituzionali<br>di livello internazionale',
      algoP:"Utilizziamo i metodi di ottimizzazione più avanzati del settore finanziario — gli stessi usati dai grandi hedge fund e dai gestori patrimoniali globali — resi accessibili attraverso un'interfaccia intuitiva.",
      algoCardH:['Mean-Variance Optimization','Black-Litterman Model','Risk Parity','Minimum Variance','Sharpe Ratio Maximization'],
      algoCardP:['La teoria classica di Markowitz: trade-off ottimale tra rischio e rendimento atteso, ricalcolato in continuo sui tuoi dati reali.',"Integrazione delle tue view personali di mercato con l'equilibrio globale degli asset. La tua opinione entra nel modello.",'Bilanciamento ottimale del contributo al rischio di ogni asset. Nessun titolo domina la volatilità complessiva.','Minimizzazione della volatilità complessiva mantenendo i rendimenti target. Più stabilità, meno sorprese.','Massimizzazione del rendimento per unità di rischio con vincoli personalizzabili. Il gold standard della gestione quantitativa.'],
      chartMetricLbl:['Performance YTD','Sharpe ratio','Rischio ridotto'],
      chartXLabel:'Ultimi 24 mesi →',
      capLabel:'AI in azione',
      capH2:"Modelli quantitativi<br>per l'ottimizzazione del patrimonio",
      capP:'La nostra AI lavora 24/7 per massimizzare i tuoi rendimenti e minimizzare i rischi.',
      capH:['Ottimizzazione di portafoglio','Patrimonio unificato','Chat conversazionale','Analisi predittiva','Insight intelligenti','Valutazione beni fisici'],
      capP2:['Algoritmi quantitativi che ribilanciano continuamente il tuo portafoglio per massimizzare il rapporto rischio-rendimento.',"Tutti i tuoi asset finanziari e beni fisici, aggregati da banche, conti personali e broker, riuniti in un'unica schermata.",'Chiedi qualsiasi cosa sul tuo patrimonio e ricevi risposte immediate basate sui tuoi dati reali e sul contesto di mercato.',"Simulazioni quantitative e scenari what-if per anticipare l'evoluzione del tuo patrimonio in diverse condizioni di mercato.",'Analisi statistiche sui dati del tuo patrimonio, tradotte in metriche chiare e coerenti con i tuoi obiettivi finanziari.','Stima automatica del valore di immobili, veicoli e oggetti di valore con aggiornamenti real-time nel tuo net worth.'],
      methodLabel:'come lavoriamo',methodH2:'Il nostro metodo',
      methodP:'Pragmatismo e orientamento al risultato. Combiniamo ricerca avanzata e applicazione pratica per affiancare i nostri utenti nel loro percorso di crescita patrimoniale.',
      stepH:['Aggregazione dei dati','Analisi quantitativa','Ottimizzazione del portafoglio','Monitoraggio continuo'],
      stepP:['Connettiamo in modo sicuro (read-only, PSD2) tutti i tuoi conti bancari, broker, conti deposito e beni fisici. Una sola fonte di verità per tutto il tuo patrimonio.','I nostri modelli calcolano esposizione al rischio, correlazione tra asset, Sharpe ratio e deviazione standard su tutti i tuoi investimenti in tempo reale.',"Mean-Variance, Black-Litterman, Risk Parity: l'AI sceglie l'algoritmo più adatto al tuo profilo e genera raccomandazioni di ribilanciamento concrete.",'Alert personalizzati, report mensili automatici, simulazioni what-if. Il sistema lavora 24/7 per tenerti aggiornato su ogni variazione rilevante.'],
      teamLabel:'Team imprenditoriale',teamH2:'Chi siamo',teamNote:'Fintech guidata dai founder',
      teamP:'Un team multidisciplinare che unisce economia, informatica, matematica e fisica teorica per rendere accessibili strumenti quantitativi avanzati agli investitori retail.',
      teamNames:['Gianluca Giusti','Federico Giusti','Lorenzo Baroni','Andrea Nicoletti'],
      teamRoles:['Co-Founder & CEO','Co-Founder & CTO','Co-Founder & Head of Quant Research','Co-Founder & Head of Quant Development'],
      teamDegrees:[['Laurea in Economia · Università di Bologna',"Matematica per l’Ingegneria · Politecnico di Torino"],['Laurea in Informatica · Università di Pisa','Laurea magistrale in Artificial Intelligence · Università di Pisa'],['Laurea in Matematica · Università di Bologna'],['Laurea in Fisica · Università di Bologna','Laurea magistrale in Fisica Teorica · Università di Bologna']],
      teamBio:['Guida la visione economica e strategica di Elara, collegando finanza, mercati, sostenibilità del modello di business e sviluppo imprenditoriale.','Guida architettura, backend e AI del prodotto, unendo sviluppo software, visione imprenditoriale e conoscenza diretta della gestione patrimoniale.','Sviluppa la visione quantitativa del prodotto, trasformando modelli matematici, dati finanziari e ricerca in strumenti di rischio e ottimizzazione.','Porta rigore scientifico e capacità di sviluppo, lavorando su implementazione, validazione e integrazione dei modelli quantitativi nel prodotto.'],
      secLabel:'Sicurezza',secH2:'La tua sicurezza<br>è la nostra priorità',
      secP:'Standard di sicurezza bancari, conformità normativa completa e audit regolari da enti certificati indipendenti.',
      tcardH:['Crittografia End-to-End','Conformità Normativa','Read-Only Access'],
      tcardP:['Tutti i dati protetti con AES-256 in transito e a riposo. Credenziali mai memorizzate. Tokenizzazione avanzata per ogni connessione bancaria.','Pienamente conformi a PSD2, GDPR e ISO 27001. Audit di sicurezza trimestrali da enti indipendenti con penetration testing regolari.','Accesso esclusivamente in sola lettura. Non possiamo mai eseguire transazioni o movimentare fondi in alcun modo. Zero rischio di manipolazione.'],
      testiLabel:'Dicono di noi',testiH2:'Cosa dicono<br>i primi utenti',
      testiP:'Investitori reali che usano Elara per analizzare e ottimizzare il proprio patrimonio. Non suggerimenti generici — risultati concreti.',
      pricingLabel:'Pricing',pricingH2:'Scegli il piano<br>perfetto per te',
      pricingP:'Prezzi trasparenti, nessun costo nascosto. Annulla quando vuoi, nessun vincolo contrattuale.',
      planNm:['Starter','Pro','Enterprise'],planPrice:['Gratis','€29','Custom'],planPer:['per sempre','/mese','su misura'],
      planDesc:['Perfetto per iniziare a tracciare il tuo patrimonio e esplorare le funzionalità base.','Per investitori seri che vogliono ottimizzare e massimizzare i rendimenti.','Per family office, wealth manager e team che gestiscono patrimoni complessi.'],
      planBtn:['Inizia gratis','Inizia 14 giorni gratis','Contatta il team sales'],planBadge:'Più popolare',
      ctaLabel:'contattaci',ctaP:'Unisciti a migliaia di investitori che stanno già usando Elara per gestire il loro patrimonio in modo intelligente e data-driven.',
      ctaInput:'La tua email',ctaBtn:'Richiedi accesso beta',ctaNote:'✓ Nessuna carta richiesta   ·   ✓ Cancella quando vuoi',
      footerDesc:'Portfolio Intelligence & Net Worth Optimization. Il copilota finanziario intelligente per investitori moderni.',
      footerColH:['Prodotto','Risorse','Azienda','Legale'],
      footerColLinks:[['Funzionalità','Pricing','Integrazioni','Changelog','Roadmap'],['Documentazione','Blog','Guide','API Reference','Help Center'],['Chi siamo','Careers','Press Kit','Partner','Contatti'],['Privacy Policy','Termini di servizio','Cookie Policy','Conformità','Sicurezza']],
      footerCopy:'© 2026 Elara Technologies S.r.l. — Tutti i diritti riservati.',footerStatus:'Stato dei servizi',toggle:'EN',
      heroH1:'<span class="hw"><span class="hw-inner">Il</span></span><span class="hw"><span class="hw-inner">tuo</span></span><span class="hw"><span class="hw-inner">CFO</span></span><span class="hw"><span class="hw-inner">personale</span></span><br><span class="hw hw-accent"><span class="hw-inner">quantitativo</span></span>'
    },
    en:{
      navLinks:['Features','About us','Technology','Security','Pricing'],
      navCta:'Get started',
      heroSub:'Unify your wealth and optimise it with Quantitative Models and Artificial Intelligence.',
      heroBtn1:'Join the private beta',heroBtn2:'Watch the demo →',
      heroCardLbl:'Portfolio overview — Updated in real time',heroLive:'Live',
      hkpiLbl:['Total net worth','YTD Performance','Sharpe ratio','Allocated assets'],
      hkpiMeta:['+12.4% this month','+5.2% vs benchmark','Optimised profile','Well diversified'],
      hkpiAI:'Elara has identified <strong>3 optimisation opportunities</strong> in your portfolio — click to see details.',
      statsCat:['speed','optimisation','monitoring'],
      statsDesc:['Time saved in wealth analysis','Average improvement in Sharpe ratio','AI continuously active on your assets'],
      visionLabel:'Our vision',
      visionH2:'We want to make institutional-grade wealth management accessible to everyone',
      visionP:'Quantitative algorithms, artificial intelligence and data aggregation: the same tools used by major hedge funds, now available to every informed investor.',
      vcardH:['We unify your wealth','We optimise returns','We create clarity'],
      vcardP:['Bank accounts, brokers, real estate, vehicles: everything in a single intelligent view updated in real time.','Quantitative models working continuously to maximise the risk-return ratio of your portfolio.','Complex data translated into actionable insights: you always know where you are, where you\'re going and what to do.'],
      servLabel:'Features',
      servH2:'What Elara does<br>for your wealth',
      servP:'From data collection to automatic optimisation, Elara manages every aspect of your wealth with quantitative algorithms and artificial intelligence.',
      scardH:['Portfolio optimisation','Unified wealth','Conversational chat'],
      scardP:['Quantitative algorithms that continuously rebalance your portfolio to maximise the risk-return ratio.','All your financial assets and physical assets aggregated from banks, brokers and personal accounts in a single screen.','Ask anything about your wealth and get immediate answers based on your real data.'],
      scardLi:[['Mean-Variance Optimization','Black-Litterman Model','Risk Parity & Sharpe Max'],['PSD2 bank aggregation','Physical & real estate assets','Real-time dashboard'],['Instant risk analysis','Automatic tax-loss harvesting','What-if simulations']],
      demoLabel:'Interactive demo',demoH2:'Talk to your financial copilot',
      demoP:'Press a question to see how Elara analyses your portfolio in real time.',
      chatName:'Elara AI',chatStatus:'Online — Active analysis',
      chatInit:"Hi! I'm Elara, your financial copilot. I've analysed your portfolio. What would you like to know?",
      chatPlaceholder:'Ask me anything about your wealth…',chatSend:'Send →',
      pills:['Am I taking too much risk?','Is my portfolio diversified?','How to optimise taxes?','How much crypto should I hold?'],
      algoLabel:'Technology',
      algoH2:'Institutional-grade<br>international algorithms',
      algoP:'We use the most advanced optimisation methods in the financial industry — the same used by major hedge funds and global wealth managers — made accessible through an intuitive interface.',
      algoCardH:['Mean-Variance Optimization','Black-Litterman Model','Risk Parity','Minimum Variance','Sharpe Ratio Maximization'],
      algoCardP:["Markowitz's classic theory: optimal trade-off between risk and expected return, recalculated continuously on your real data.","Integration of your personal market views with the global asset equilibrium. Your opinion enters the model.","Optimal balancing of each asset's risk contribution. No single security dominates overall volatility.",'Minimisation of overall volatility while maintaining target returns. More stability, fewer surprises.','Maximising return per unit of risk with customisable constraints. The gold standard of quantitative management.'],
      chartMetricLbl:['YTD Performance','Sharpe ratio','Risk reduced'],
      chartXLabel:'Last 24 months →',
      capLabel:'AI in action',
      capH2:'Quantitative models<br>for wealth optimisation',
      capP:'Our AI works 24/7 to maximise your returns and minimise risks.',
      capH:['Portfolio optimisation','Unified wealth','Conversational chat','Predictive analysis','Smart insights','Physical asset valuation'],
      capP2:['Quantitative algorithms that continuously rebalance your portfolio to maximise the risk-return ratio.','All your financial assets and physical goods, aggregated from banks, personal accounts and brokers, brought together in a single screen.','Ask anything about your wealth and get immediate answers based on your real data and market context.','Quantitative simulations and what-if scenarios to anticipate the evolution of your wealth under different market conditions.','Statistical analyses of your wealth data, translated into clear metrics consistent with your financial goals.','Automatic valuation of real estate, vehicles and valuables with real-time updates in your net worth.'],
      methodLabel:'how we work',methodH2:'Our method',
      methodP:'Pragmatism and results orientation. We combine advanced research and practical application to support our users in their wealth growth journey.',
      stepH:['Data aggregation','Quantitative analysis','Portfolio optimisation','Continuous monitoring'],
      stepP:['We securely connect (read-only, PSD2) all your bank accounts, brokers, deposit accounts and physical assets. A single source of truth for your entire wealth.','Our models calculate risk exposure, asset correlation, Sharpe ratio and standard deviation across all your investments in real time.','Mean-Variance, Black-Litterman, Risk Parity: the AI chooses the most suitable algorithm for your profile and generates concrete rebalancing recommendations.','Custom alerts, automatic monthly reports, what-if simulations. The system works 24/7 to keep you updated on every relevant change.'],
      teamLabel:'Entrepreneurial Team',teamH2:'About us',teamNote:'Founder-led fintech',
      teamP:'A multidisciplinary team combining economics, computer science, mathematics and theoretical physics to make advanced quantitative tools accessible to retail investors.',
      teamNames:['Gianluca Giusti','Federico Giusti','Lorenzo Baroni','Andrea Nicoletti'],
      teamRoles:['Co-Founder & CEO','Co-Founder & CTO','Co-Founder & Head of Quant Research','Co-Founder & Head of Quant Development'],
      teamDegrees:[['BSc Economics · University of Bologna',"Mathematics for Engineering · Politecnico di Torino"],['BSc Computer Science · University of Pisa','MSc Artificial Intelligence · University of Pisa'],['BSc Mathematics · University of Bologna'],['BSc Physics · University of Bologna','MSc Theoretical Physics · University of Bologna']],
      teamBio:['Leads Elara’s economic and strategic vision, connecting finance, markets, business-model sustainability and entrepreneurial execution.','Leads product architecture, backend and AI, combining software development, entrepreneurial experience and direct portfolio-management knowledge.','Shapes the quantitative vision of the product, turning mathematical models, financial data and research into risk and optimisation tools.','Brings scientific rigour and software development skills, working on implementation, validation and integration of quantitative models into the product.'],
      secLabel:'Security',secH2:'Your security<br>is our priority',
      secP:'Bank-grade security standards, full regulatory compliance and regular audits by independent certified bodies.',
      tcardH:['End-to-End Encryption','Regulatory Compliance','Read-Only Access'],
      tcardP:['All data protected with AES-256 in transit and at rest. Credentials never stored. Advanced tokenisation for every bank connection.','Fully compliant with PSD2, GDPR and ISO 27001. Quarterly security audits by independent bodies with regular penetration testing.','Exclusively read-only access. We can never execute transactions or move funds in any way. Zero manipulation risk.'],
      testiLabel:'What they say',testiH2:'What the first<br>users say',
      testiP:'Real investors using Elara to analyse and optimise their wealth. No generic advice — concrete results.',
      pricingLabel:'Pricing',pricingH2:'Choose the plan<br>that\'s right for you',
      pricingP:'Transparent pricing, no hidden costs. Cancel anytime, no contractual obligations.',
      planNm:['Starter','Pro','Enterprise'],planPrice:['Free','€29','Custom'],planPer:['forever','/month','tailored'],
      planDesc:['Perfect to start tracking your wealth and explore the basic features.','For serious investors who want to optimise and maximise returns.','For family offices, wealth managers and teams managing complex portfolios.'],
      planBtn:['Start free','Start 14-day free trial','Contact sales team'],planBadge:'Most popular',
      ctaLabel:'contact us',ctaP:'Join thousands of investors already using Elara to manage their wealth intelligently and data-driven.',
      ctaInput:'Your email',ctaBtn:'Request beta access',ctaNote:'✓ No credit card required   ·   ✓ Cancel anytime',
      footerDesc:'Portfolio Intelligence & Net Worth Optimization. The intelligent financial copilot for modern investors.',
      footerColH:['Product','Resources','Company','Legal'],
      footerColLinks:[['Features','Pricing','Integrations','Changelog','Roadmap'],['Documentation','Blog','Guides','API Reference','Help Center'],['About us','Careers','Press Kit','Partners','Contact'],['Privacy Policy','Terms of Service','Cookie Policy','Compliance','Security']],
      footerCopy:'© 2026 Elara Technologies S.r.l. — All rights reserved.',footerStatus:'Service status',toggle:'IT',
      heroH1:'<span class="hw"><span class="hw-inner">Your</span></span><span class="hw"><span class="hw-inner">personal</span></span><span class="hw"><span class="hw-inner">quantitative</span></span><br><span class="hw hw-accent"><span class="hw-inner">CFO</span></span>'
    }
  };

  var _lang = localStorage.getItem('elara_lang')||'it';

  function _q(s,c){return (c||document).querySelector(s);}
  function _qq(s,c){return Array.from((c||document).querySelectorAll(s));}
  function _t(el,v){if(el)el.textContent=v;}
  function _h(el,v){if(el)el.innerHTML=v;}

  function resetAiChat(t){
    var ds=_q('#ai-demo');
    if(!ds) return;
    var msgs=_q('#chatMsgs',ds);
    if(!msgs) return;

    // Keep only the initial Elara message when the site language changes.
    // This avoids mixed-language conversations after switching IT/EN.
    var initWrap=null;
    _qq(':scope > div',msgs).forEach(function(child){
      if(!initWrap && _q('.ai-bubble-init',child)) initWrap=child;
    });
    if(initWrap){
      msgs.innerHTML=initWrap.outerHTML;
    }
    _t(_q('.ai-bubble-init p',msgs),t.chatInit);
    msgs.scrollTop=0;
  }

  function setLang(l){
    _lang=l;
    localStorage.setItem('elara_lang',l);
    document.documentElement.setAttribute('lang',l);
    var t=T[l];

    // toggle buttons
    _qq('#langBtn,#langBtnFooter').forEach(function(b){_t(b,t.toggle);});

    // nav
    _qq('.nav-links a').forEach(function(a,i){if(t.navLinks[i])_t(a,t.navLinks[i]);});
    _qq('.btn-nav-cta').forEach(function(b){_t(b,t.navCta);});

    // hero headline
    var h1=_q('#hero-h1');
    if(h1){h1.innerHTML=t.heroH1;requestAnimationFrame(function(){h1.classList.add('in');});}

    // hero subtitle + buttons
    _t(_q('#hero-sub'),t.heroSub);
    var b1=_q('#hero-btn1');if(b1){var lbl=b1.querySelector('.btn-label');_t(lbl||b1,t.heroBtn1);}
    _t(_q('#hero-btn2'),t.heroBtn2);

    // hero card
    _qq('.hcard-lbl').forEach(function(e){_t(e,t.heroCardLbl);});
    _qq('.hcard-live').forEach(function(e){var dot=e.querySelector('.live-dot');e.innerHTML='';if(dot)e.appendChild(dot);e.appendChild(document.createTextNode(t.heroLive));});
    _qq('.hkpi-lbl').forEach(function(e,i){if(t.hkpiLbl[i])_t(e,t.hkpiLbl[i]);});
    _qq('.hkpi-meta').forEach(function(e,i){if(t.hkpiMeta[i])_t(e,t.hkpiMeta[i]);});
    _h(_q('.hcard-ai p'),t.hkpiAI);

    // stats
    _qq('.sbar-cat').forEach(function(e,i){if(t.statsCat[i])_t(e,t.statsCat[i]);});
    _qq('.sbar-desc').forEach(function(e,i){if(t.statsDesc[i])_t(e,t.statsDesc[i]);});

    // vision
    var vs=_q('.vision');
    if(vs){
      var vl=_qq('.label',vs);if(vl[0])_t(vl[0],t.visionLabel);
      _t(_q('.vision-copy h2',vs),t.visionH2);
      _t(_q('.vision-copy p',vs),t.visionP);
      _qq('.vcard',vs).forEach(function(c,i){_t(_q('h4',c),t.vcardH[i]);_t(_q('p',c),t.vcardP[i]);});
    }

    // services
    var ss=_q('#features');
    if(ss){
      var sl=_qq('.label',ss);if(sl[0])_t(sl[0],t.servLabel);
      _h(_q('.section-title-lg',ss),t.servH2);
      _t(_q('.services-hd p',ss),t.servP);
      _qq('.scard',ss).forEach(function(c,i){
        _t(_q('h3',c),t.scardH[i]);
        _t(_q('.scard > p',c),t.scardP[i]);
        _qq('.scard-list li',c).forEach(function(li,j){if(t.scardLi[i]&&t.scardLi[i][j])_t(li,t.scardLi[i][j]);});
      });
    }

    // ai demo
    var ds=_q('#ai-demo');
    if(ds){
      var dl=_qq('.label',ds);if(dl[0])_t(dl[0],t.demoLabel);
      _h(_q('.section-title-lg',ds),t.demoH2);
      _t(_q('.ai-demo-hd p',ds),t.demoP);
      _t(_q('.chat-hdr-name',ds),t.chatName);
      var cst=_q('.chat-hdr-status',ds);if(cst)cst.innerHTML='<span class="online-dot"></span>'+t.chatStatus;
      _t(_q('.ai-bubble-init p',ds),t.chatInit);
      var ci=_q('.chat-text-input',ds);if(ci)ci.placeholder=t.chatPlaceholder;
      _t(_q('.chat-send',ds),t.chatSend);
      _qq('.qpill',ds).forEach(function(p,i){if(t.pills[i])_t(p,t.pills[i]);});
      resetAiChat(t);
    }

    // algo section
    var as=_q('#technology');
    if(as){
      var al=_qq('.label',as);if(al[0])_t(al[0],t.algoLabel);
      _h(_q('.section-title-lg',as),t.algoH2);
      _t(_q('.algo-left > p',as),t.algoP);
      _qq('.algo-card',as).forEach(function(c,i){_t(_q('h4',c),t.algoCardH[i]);_t(_q('p',c),t.algoCardP[i]);});
      _t(_q('.chart-x-label',as),t.chartXLabel);
      _qq('.cmetric-lbl',as).forEach(function(e,i){if(t.chartMetricLbl[i])_t(e,t.chartMetricLbl[i]);});
    }

    // capabilities
    var cs=_q('.capabilities');
    if(cs){
      var cl=_qq('.label',cs);if(cl[0])_t(cl[0],t.capLabel);
      _h(_q('.section-title-lg',cs),t.capH2);
      _t(_q('.capabilities-hd p',cs),t.capP);
      _qq('.cap-card',cs).forEach(function(c,i){_t(_q('h3',c),t.capH[i]);_t(_q('p',c),t.capP2[i]);});
    }

    // method
    var ms=_q('.method');
    if(ms){
      var ml=_qq('.label',ms);if(ml[0])_t(ml[0],t.methodLabel);
      _h(_q('.section-title-lg',ms),t.methodH2);
      _t(_q('.method-hd p',ms),t.methodP);
      _qq('.step',ms).forEach(function(s,i){_t(_q('h4',s),t.stepH[i]);_t(_q('.step-body p',s),t.stepP[i]);});
    }

    // team
    var team=_q('#chi-siamo');
    if(team && t.teamNames){
      _t(_q('.team-label',team),t.teamLabel);
      _h(_q('.team-title',team),t.teamH2);
      _t(_q('.team-intro',team),t.teamP);
      if(t.teamNote){_t(_q('.team-note',team),t.teamNote);}
      _qq('.team-card',team).forEach(function(c,i){
        if(!t.teamNames[i])return;
        _t(_q('.team-name',c),t.teamNames[i]);
        _t(_q('.team-role',c),t.teamRoles[i]);
        _qq('.team-degree',c).forEach(function(d,j){
          if(t.teamDegrees[i]&&t.teamDegrees[i][j]){_h(d,t.teamDegrees[i][j]);d.style.display='inline-flex';}
          else{d.style.display='none';}
        });
        _t(_q('.team-bio',c),t.teamBio[i]);
      });
    }

    // security
    var sec=_q('#security');
    if(sec){
      var secl=_qq('.label',sec);if(secl[0])_t(secl[0],t.secLabel);
      _h(_q('.security-hd h2',sec),t.secH2);
      _t(_q('.security-hd p',sec),t.secP);
      _qq('.tcard',sec).forEach(function(c,i){_t(_q('h4',c),t.tcardH[i]);_t(_q('p',c),t.tcardP[i]);});
    }

    // testimonials
    var ts=_q('.testimonials');
    if(ts){
      var tl=_qq('.label',ts);if(tl[0])_t(tl[0],t.testiLabel);
      _h(_q('.section-title-lg',ts),t.testiH2);
      _t(_q('.testi-top p',ts),t.testiP);
    }

    // pricing
    var ps=_q('#pricing');
    if(ps){
      var pl=_qq('.label',ps);if(pl[0])_t(pl[0],t.pricingLabel);
      _h(_q('.section-title-lg',ps),t.pricingH2);
      _t(_q('.pricing-hd p',ps),t.pricingP);
      _qq('.pcard',ps).forEach(function(c,i){
        _t(_q('.pcard-nm',c),t.planNm[i]);
        _t(_q('.pcard-price',c),t.planPrice[i]);
        _t(_q('.pcard-per',c),t.planPer[i]);
        _t(_q('.pcard-desc',c),t.planDesc[i]);
        _t(_q('.pcard-btn',c),t.planBtn[i]);
        var badge=_q('.pbadge',c);if(badge)_t(badge,t.planBadge);
      });
    }

    // cta
    var cta=_q('#cta');
    if(cta){
      _t(_q('.cta-label',cta),t.ctaLabel);
      _t(_q('.cta-inner > p',cta),t.ctaP);
      var inp=_q('.cta-input',cta);if(inp)inp.placeholder=t.ctaInput;
      var cb=_q('#ctaBtn');if(cb){var cbl=cb.querySelector('.btn-label');_t(cbl||cb,t.ctaBtn);}
      _t(_q('#ctaNote'),t.ctaNote);
    }

    // footer
    var ft=_q('footer');
    if(ft){
      _t(_q('.fb-desc',ft),t.footerDesc);
      _qq('.fcol',ft).forEach(function(col,i){
        _t(_q('h5',col),t.footerColH[i]);
        _qq('a',col).forEach(function(a,j){if(t.footerColLinks[i]&&t.footerColLinks[i][j])_t(a,t.footerColLinks[i][j]);});
      });
      _t(_q('#footerCopy'),t.footerCopy);
      var sa=_q('.fbottom-right a',ft);if(sa)_t(sa,t.footerStatus);
    }
  }

  // replace broken lang button listeners
  _qq('#langBtn,#langBtnFooter').forEach(function(btn){
    var clone=btn.cloneNode(true);
    btn.parentNode.replaceChild(clone,btn);
    clone.addEventListener('click',function(){setLang(_lang==='it'?'en':'it');});
  });

  // apply on load
  setLang(_lang);

  // expose globally (chat still needs lang)
  window.__setLang=setLang;
  window.__getLang=function(){return _lang;};
})();