let DATA,current='director',charts={},s3='resumen',q4='resumen';
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
const N=v=>(v??'').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const yes=v=>N(v)==='si', fmt=n=>Number(n||0).toLocaleString('es-PE'), pc=(a,b)=>b?((a/b)*100).toFixed(1):'0.0';
if(window.ChartDataLabels) Chart.register(ChartDataLabels);
const UGEL_ORDER=['UGEL 01','UGEL 02','UGEL 03','UGEL 04','UGEL 05','UGEL 06','UGEL 07'];
const orderedKeys=o=>{let ks=Object.keys(o);return ks.sort((a,b)=>{let ia=UGEL_ORDER.indexOf(a),ib=UGEL_ORDER.indexOf(b);if(ia>=0||ib>=0)return (ia<0?99:ia)-(ib<0?99:ib);return a.localeCompare(b,'es')})};
fetch('data/clubes.json?v=20260914-080',{cache:'no-store'}).then(r=>r.json()).then(d=>{DATA=d;init();render()});
function fill(sel,vals){vals.forEach(v=>sel.add(new Option(v,v)))}
function init(){
 const all=[...DATA.director.registros,...DATA.asesor.registros];
 const corte=DATA.meta?.fecha_corte||'09/09/2026';
 if($('#cutoffHeader')) $('#cutoffHeader').textContent='Corte: '+corte;
 if($('#cutoffFooter')) $('#cutoffFooter').textContent='Corte: '+corte;
 fill($('#fUgel'),[...new Set(all.map(x=>x.ugel))].filter(Boolean).sort());
 updateReiOptionsStable();
 fill($('#fModalidad'),[...new Set(all.map(x=>x.modalidad))].filter(Boolean).sort());
 fill($('#fGestion'),[...new Set(all.map(x=>x.gestion))].filter(Boolean).sort());
 fill($('#fArea'),[...new Set([...DATA.director.clubes,...DATA.asesor.registros].map(x=>x.area))].filter(Boolean).sort());
 $('#fUgel').onchange=()=>{updateReiOptionsStable();render()};['fRei','fModalidad','fGestion','fArea'].forEach(id=>$('#'+id).onchange=render);$('#fIE').oninput=render;
 $('#clearFilters').onclick=()=>{['fUgel','fRei','fModalidad','fGestion','fArea'].forEach(x=>$('#'+x).value='');$('#fIE').value='';if($('#ieSuggestions')){$('#ieSuggestions').classList.remove('open');$('#ieSuggestions').innerHTML=''};render()};
 $$('.tab').forEach(b=>b.onclick=()=>{current=b.dataset.tab;$$('.tab').forEach(x=>x.classList.toggle('active',x===b));$$('.panel').forEach(x=>x.classList.toggle('active',x.id===current));render()});
 $$('.subtab[data-s3]').forEach(b=>b.onclick=()=>{s3=b.dataset.s3;$$('.subtab[data-s3]').forEach(x=>x.classList.toggle('active',x===b));renderSection3()});
 $('#exportDirectores').onclick=()=>exportTable('directores');$('#exportIE').onclick=()=>exportTable('ie');$('#exportAsesor').onclick=()=>exportTable('asesor');if($('#exportClubes'))$('#exportClubes').onclick=()=>exportTable('clubes');$('#exportClubes').onclick=()=>exportTable('clubes');
 setupIEAutocomplete();
 setupCollapsibleSections();
 if($('#printTop'))$('#printTop').onclick=()=>window.print();
 buildQ4Tabs();
}


function setupCollapsibleSections(){
 const panel=$('#director'); if(!panel)return;
 const sections=[...panel.querySelectorAll(':scope > .section')].filter(sec=>{
   const t=(sec.querySelector('.num')?.textContent||'').trim();
   return ['1','2','3','4'].includes(t);
 });
 sections.forEach(sec=>{
   if(sec.querySelector('.section-toggle'))return;
   const btn=document.createElement('button');
   btn.type='button';btn.className='section-toggle';btn.textContent='⌃';btn.title='Reducir sección';btn.setAttribute('aria-label','Reducir sección');
   sec.appendChild(btn);
   btn.addEventListener('click',()=>{
     const collapsing=!sec.classList.contains('is-collapsed');
     let el=sec.nextElementSibling;
     while(el && !el.classList.contains('section')){
       el.style.display=collapsing?'none':'';
       el=el.nextElementSibling;
     }
     sec.classList.toggle('is-collapsed',collapsing);
     btn.textContent=collapsing?'⌄':'⌃';btn.title=collapsing?'Expandir sección':'Reducir sección';btn.setAttribute('aria-label',btn.title);
     if(!collapsing)setTimeout(()=>Object.values(charts||{}).forEach(c=>{try{c.resize()}catch(e){}}),40);
   });
 });
}
function ieCandidates(){
 const f=F();
 const rows=[...(DATA.director?.registros||[]),...(DATA.asesor?.registros||[])];
 const map=new Map();
 rows.forEach(x=>{
   if(f.u&&x.ugel!==f.u)return;
   if(f.r&&!matchReiStable(x,f.r))return;
   if(f.m&&x.modalidad!==f.m)return;
   if(f.g&&x.gestion!==f.g)return;
   const code=(x.codigo_local||'').toString().trim(), name=(x.ie||'').toString().trim();
   if(!code&&!name)return;
   const key=code+'|'+name;
   if(!map.has(key))map.set(key,{codigo_local:code,ie:name,ugel:x.ugel||'',rei:x.rei||''});
 });
 return [...map.values()].sort((a,b)=>(a.ie||'').localeCompare(b.ie||'','es',{numeric:true}));
}
function setupIEAutocomplete(){
 const input=$('#fIE'),box=$('#ieSuggestions');if(!input||!box)return;
 let active=-1,shown=[];
 const close=()=>{box.classList.remove('open');box.innerHTML='';active=-1};
 const choose=(item)=>{input.value=item.codigo_local||item.ie;close();render()};
 const paint=()=>{
   const q=N(input.value);
   if(q.length<2){close();return}
   shown=ieCandidates().filter(x=>N((x.codigo_local||'')+' '+(x.ie||'')).includes(q)).slice(0,10);
   if(!shown.length){box.innerHTML='<div class="ie-empty">No se encontraron instituciones.</div>';box.classList.add('open');return}
   box.innerHTML=shown.map((x,i)=>`<div class="ie-option" data-ie-i="${i}" role="option"><span class="ie-option-code">${x.codigo_local||'—'}</span><div class="ie-option-main"><div class="ie-option-name">${x.ie||'Sin nombre'}</div><div class="ie-option-meta">${x.ugel||''}${x.rei?' · '+x.rei:' · Sin REI'}</div></div></div>`).join('');
   box.classList.add('open');active=-1;
   box.querySelectorAll('.ie-option').forEach(el=>el.onclick=()=>choose(shown[+el.dataset.ieI]));
 };
 input.addEventListener('input',paint);
 input.addEventListener('focus',()=>{if(N(input.value).length>=2)paint()});
 input.addEventListener('keydown',e=>{
   if(!box.classList.contains('open')||!shown.length)return;
   if(e.key==='ArrowDown'){e.preventDefault();active=Math.min(shown.length-1,active+1)}
   else if(e.key==='ArrowUp'){e.preventDefault();active=Math.max(0,active-1)}
   else if(e.key==='Enter'&&active>=0){e.preventDefault();choose(shown[active]);return}
   else if(e.key==='Escape'){close();return}
   else return;
   box.querySelectorAll('.ie-option').forEach((el,i)=>el.classList.toggle('active',i===active));
 });
 document.addEventListener('click',e=>{if(!e.target.closest('.ie-search'))close()});
}

function updateReiOptionsStable(){
 const sel=$('#fRei'); if(!sel||!DATA)return;
 const ug=$('#fUgel')?.value||'';
 const rows=[...(DATA.director?.registros||[]),...(DATA.asesor?.registros||[])];
 const scoped=rows.filter(x=>!ug||x.ugel===ug);
 const vals=[...new Set(scoped.map(x=>(x.rei||'').trim()).filter(Boolean))]
   .sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));
 const hasSin=scoped.some(x=>!(x.rei||'').trim());
 const current=sel.value;
 sel.innerHTML='<option value="">Todas las REI</option>'
   +(hasSin?'<option value="__SIN_REI__">Sin REI</option>':'')
   +vals.map(v=>`<option value="${v}">${v}</option>`).join('');
 if(current==='__SIN_REI__'&&hasSin) sel.value=current;
 else if(vals.includes(current)) sel.value=current;
 else sel.value='';
}
function matchReiStable(x,r){
 if(!r)return true;
 if(r==='__SIN_REI__')return !(x.rei||'').trim();
 return (x.rei||'').trim()===r;
}

function F(){return {u:$('#fUgel').value||'',r:$('#fRei').value||'',m:$('#fModalidad').value||'',g:$('#fGestion').value||'',a:$('#fArea').value||'',q:N($('#fIE').value||'')}}
function ok(x,f){return(!f.u||x.ugel===f.u)&&matchReiStable(x,f.r)&&(!f.m||x.modalidad===f.m)&&(!f.g||x.gestion===f.g)&&(!f.q||N((x.ie||'')+' '+(x.codigo_local||'')+' '+(x.club||'')).includes(f.q))}
function group(rows,key,val=()=>1){let m={};rows.forEach(x=>{let k=x[key]||'Sin dato';m[k]=(m[k]||0)+val(x)});return m}
function kpi(label,value,sub,pctv){
 const l=N(label);let icon='📊';
 if(l.includes('instituc'))icon='🏫';
 else if(l.includes('ugel'))icon='🏢';
 else if(l.includes('modal'))icon='🎓';
 else if(l.includes('gestion'))icon='⚙️';
 else if(l.includes('local'))icon='📍';
 else if(l.includes('club'))icon='🏅';
 else if(l.includes('ficha'))icon='📋';
 else if(l.includes('inscrip'))icon='🧑‍🎓';
 else if(l.includes('promedio'))icon='📈';
 return `<div class="kpi"><span class="kpi-icon">${icon}</span><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${sub||''}</div>${pctv!==undefined?`<div class="progress"><i style="width:${Math.min(100,pctv)}%"></i></div>`:''}</div>`
}
function destroyChart(id){if(charts[id]){charts[id].destroy();delete charts[id]}}
function draw(id,type,labels,vals,label,totalOverride){
 destroyChart(id);
 const total=totalOverride??vals.reduce((a,b)=>a+(+b||0),0);
 const horizontal=type==='bar'&&(labels.length>=6||labels.some(x=>(x||'').length>18));
 const pctVals=vals.map(v=>total?(+v/total)*100:0);
 const legendGenerator=(chart)=>{
   const ds=chart.data.datasets[0];
   const meta=chart.getDatasetMeta(0);
   return chart.data.labels.map((lbl,i)=>{
     const v=+ds.data[i]||0;
     const style=meta.controller?.getStyle(i) || {};
     return {
       text:`${lbl} · ${fmt(v)} (${pc(v,total)}%)`,
       fillStyle:style.backgroundColor || '#7aaed1',
       strokeStyle:style.borderColor || '#ffffff',
       lineWidth:style.borderWidth || 1,
       hidden:!chart.getDataVisibility(i),
       index:i,
       pointStyle:'rect',
       fontColor:'#38536b'
     };
   });
 };
 charts[id]=new Chart(document.getElementById(id),{
   type,
   data:{labels,datasets:[{label,data:vals,borderWidth:1,backgroundColor:type==='bar'?'#78b9e2':undefined}]},
   options:{
     responsive:true,maintainAspectRatio:false,indexAxis:horizontal?'y':'x',
     layout:{padding:{top:18,right:horizontal?36:12,bottom:2,left:2}},
     plugins:{
       legend:{display:true,position:'bottom',labels:{boxWidth:11,boxHeight:11,padding:12,font:{size:9},generateLabels:type==='doughnut'?legendGenerator:undefined}},
       datalabels:{
         color:type==='doughnut'?'#fff':'#15344f',
         font:{weight:'800',size:9},
         anchor:type==='bar'?'end':'center',
         align:type==='bar'?'end':'center',
         clamp:true,
         formatter:(v,ctx)=>`${fmt(v)} (${pc(v,total)}%)`,
         display:(ctx)=>{
           const v=ctx.dataset.data[ctx.dataIndex]||0;
           if(type==='doughnut') return total && (v/total)>=0.035;
           return v>0;
         }
       },
       tooltip:{callbacks:{label:(ctx)=>{let v=ctx.raw||0;return `${ctx.dataset.label||ctx.label}: ${fmt(v)} (${pc(v,total)}%)`}}}
     },
     scales:type==='bar'?(horizontal?{
       x:{beginAtZero:true,grid:{color:'#eef2f6'},ticks:{font:{size:9}}},
       y:{grid:{display:false},ticks:{font:{size:9}}}
     }:{
       x:{grid:{display:false},ticks:{font:{size:9}}},
       y:{beginAtZero:true,grid:{color:'#eef2f6'},ticks:{font:{size:9}}}
     }):{}
   }
 });
}
function drawStackedYesNo(id,labels,yesVals,noVals,horizontal=false){
 destroyChart(id);
 const totals=labels.map((_,i)=>(yesVals[i]||0)+(noVals[i]||0));
 charts[id]=new Chart(document.getElementById(id),{
   type:'bar',
   data:{labels,datasets:[
     {label:'Sí / Implementa',data:yesVals,backgroundColor:'#1596df',stack:'total'},
     {label:'No / No implementa',data:noVals,backgroundColor:'#ff4967',stack:'total'}
   ]},
   options:{
     responsive:true,maintainAspectRatio:false,indexAxis:horizontal?'y':'x',
     layout:{padding:{top:16,right:horizontal?18:8}},
     plugins:{
       legend:{position:'top',labels:{boxWidth:12,font:{size:9}}},
       datalabels:{
         color:'#fff',font:{weight:'800',size:9},
         formatter:(v,ctx)=>v?`${fmt(v)}
(${pc(v,totals[ctx.dataIndex])}%)`:'',
         textAlign:'center',clamp:true
       },
       tooltip:{callbacks:{label:(ctx)=>`${ctx.dataset.label}: ${fmt(ctx.raw)} (${pc(ctx.raw,totals[ctx.dataIndex])}%)`}}
     },
     scales:horizontal?{
       x:{stacked:true,beginAtZero:true,title:{display:true,text:'Cantidad'},grid:{color:'#eef2f6'}},
       y:{stacked:true,grid:{display:false},ticks:{font:{size:9}}}
     }:{
       x:{stacked:true,grid:{display:false},ticks:{font:{size:9}}},
       y:{stacked:true,beginAtZero:true,title:{display:true,text:'Cantidad'},grid:{color:'#eef2f6'}}
     }
   }
 });
}
function drawPctBar(id,labels,counts,totals,label){
 destroyChart(id); const pcts=counts.map((v,i)=>+(pc(v,totals[i])));
 charts[id]=new Chart(document.getElementById(id),{type:'bar',data:{labels,datasets:[{label,data:pcts,backgroundColor:'#1596df'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'bottom',labels:{boxWidth:11,font:{size:9}}},datalabels:{anchor:'end',align:'end',color:'#18344e',font:{weight:'800',size:9},formatter:(v,ctx)=>`${fmt(counts[ctx.dataIndex])} (${v.toFixed(1)}%)`},tooltip:{callbacks:{label:(ctx)=>`${fmt(counts[ctx.dataIndex])} (${ctx.raw.toFixed(1)}%)`}}},scales:{y:{beginAtZero:true,max:105,title:{display:true,text:'Porcentaje (%)'}}}}});
}

function drawStacked100(id,labels,yesVals,noVals){
 destroyChart(id);
 const totals=labels.map((_,i)=>(yesVals[i]||0)+(noVals[i]||0));
 const yPct=labels.map((_,i)=>totals[i]?yesVals[i]/totals[i]*100:0);
 const nPct=labels.map((_,i)=>totals[i]?noVals[i]/totals[i]*100:0);
 charts[id]=new Chart(document.getElementById(id),{
   type:'bar',
   data:{labels,datasets:[
     {label:'Sí / Implementa',data:yPct,raw:yesVals,backgroundColor:'#1596df',stack:'total'},
     {label:'No / No implementa',data:nPct,raw:noVals,backgroundColor:'#ff4967',stack:'total'}
   ]},
   options:{
     responsive:true,maintainAspectRatio:false,
     layout:{padding:{top:12,right:8}},
     plugins:{
       legend:{position:'top',labels:{boxWidth:12,font:{size:9}}},
       datalabels:{
         color:'#fff',font:{weight:'800',size:9},textAlign:'center',clamp:true,
         formatter:(v,ctx)=>{
           const raw=ctx.dataset.raw[ctx.dataIndex]||0;
           return v>=7?`${fmt(raw)}\n(${v.toFixed(1)}%)`:'';
         }
       },
       tooltip:{callbacks:{label:(ctx)=>{
         const raw=ctx.dataset.raw[ctx.dataIndex]||0;
         return `${ctx.dataset.label}: ${fmt(raw)} (${ctx.raw.toFixed(1)}%)`;
       }}}
     },
     scales:{
       x:{stacked:true,grid:{display:false},ticks:{font:{size:9}}},
       y:{stacked:true,min:0,max:100,title:{display:true,text:'Porcentaje'},ticks:{callback:v=>v+'%'},grid:{color:'#eef2f6'}}
     }
   }
 });
}


function drawAdvanceStable(id,labels,regVals,metaVals){
 const vals=labels.map((_,i)=>metaVals[i]?+(regVals[i]*100/metaVals[i]).toFixed(1):0);
 draw(id,'bar',labels,vals,'Avance',100);
}

function table(el,h,rows){el.innerHTML='<thead><tr>'+h.map(x=>`<th>${x}</th>`).join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(v=>`<td>${v??''}</td>`).join('')+'</tr>').join('')+'</tbody>'}
function render(){if(!DATA)return;if(current==='director')renderDirector();if(current==='asesor')renderAsesor()}
function filteredDirector(){
 let f=F(), regs=DATA.director.registros.filter(x=>ok(x,f));
 let clubs=DATA.director.clubes.filter(x=>ok(x,f)&&(!f.a||x.area===f.a));
 return {f,regs,clubs}
}
function renderDirector(){
 let {f,regs,clubs}=filteredDirector(),locals=new Set(regs.map(x=>x.codigo_local).filter(Boolean)).size;
 $('#kpi1').innerHTML=[
  kpi('Instituciones / registros',fmt(regs.length),'Registros del formulario'),
  kpi('UGEL',fmt(new Set(regs.map(x=>x.ugel).filter(Boolean)).size),'Unidades de gestión'),
  kpi('Modalidades',fmt(new Set(regs.map(x=>x.modalidad).filter(Boolean)).size),'EBR, EBA y EBE'),
  kpi('Gestión',fmt(new Set(regs.map(x=>x.gestion).filter(Boolean)).size),'Tipos de gestión'),
  kpi('Locales educativos',fmt(locals),'Según código local'),
  kpi('Clubes declarados',fmt(clubs.length),'Total de clubes registrados')
 ].join('');
 let gu=group(regs,'ugel'), gul=orderedKeys(gu);draw('chartUgel','bar',gul,gul.map(k=>gu[k]),'Registros',regs.length);
 let gm=group(regs,'modalidad');draw('chartModalidad','doughnut',Object.keys(gm),Object.values(gm),'Modalidad',regs.length);
 let gg=group(regs,'gestion');draw('chartGestion','doughnut',Object.keys(gg),Object.values(gg),'Gestión',regs.length);
 let ga=group(clubs,'area'), gal=Object.keys(ga).sort((a,b)=>ga[b]-ga[a]);draw('chartArea','bar',gal,gal.map(k=>ga[k]),'Clubes',clubs.length);
 let unique=[...new Map(regs.map(x=>[x.codigo_local+'|'+x.modalidad,x])).values()];
 table($('#tableDirectores'),['UGEL','REI','Núcleo REI','Código local','Institución educativa','Modalidad','Gestión','Director'],
   unique.map(x=>[x.ugel,x.rei||'Sin REI',x.rei_nucleo||'',x.codigo_local,x.ie,x.modalidad,x.gestion,x.director]));
 renderSection3();renderSection4();
 const allRegs=filteredDirector().regs;
 const mf=F();
 const metaRows=(DATA.meta_ie||[]).filter(x=>
   (!mf.u||x.ugel===mf.u) &&
   matchReiStable(x,mf.r) &&
   (!mf.m||x.modalidad===mf.m) &&
   (!mf.g||x.gestion===mf.g) &&
   (!mf.q||N((x.ie||'')+' '+(x.codigo_local||'')).includes(mf.q))
 );
 const distinctCount=(rows,u)=>new Set(rows.filter(x=>x.ugel===u).map(x=>x.codigo_local).filter(Boolean)).size;
 const labs=UGEL_ORDER.filter(u=>distinctCount(metaRows,u)>0||distinctCount(allRegs,u)>0);
 const regVals=labs.map(u=>distinctCount(allRegs,u));
 const metaVals=labs.map(u=>distinctCount(metaRows,u));
 const totalMeta=metaVals.reduce((a,b)=>a+b,0),totalReg=regVals.reduce((a,b)=>a+b,0),totalPend=Math.max(0,totalMeta-totalReg);
 const tRows=labs.map((u,i)=>[u,metaVals[i],regVals[i],Math.max(0,metaVals[i]-regVals[i]),metaVals[i]?pc(regVals[i],metaVals[i])+'%':'—']);
 tRows.push(['TOTAL DRELM',totalMeta,totalReg,totalPend,totalMeta?pc(totalReg,totalMeta)+'%':'—']);
 table($('#tableMetaUgel'),['UGEL','Meta IE','IE registradas','Pendientes','% avance'],tRows);
 if($('#sumMeta'))$('#sumMeta').textContent=fmt(totalMeta);
 if($('#sumReg'))$('#sumReg').textContent=fmt(totalReg);
 if($('#sumPend'))$('#sumPend').textContent=fmt(totalPend);
 if($('#sumPct'))$('#sumPct').textContent=(totalMeta?pc(totalReg,totalMeta):'0.0')+'%';
 drawAdvanceStable('chartAvanceUgel',labs,regVals,metaVals);
 renderClubDetailStable();

}
function renderSection3(){
 let {regs,clubs}=filteredDirector(), info=regs.filter(x=>yes(x.q31)).length, imp=regs.filter(x=>yes(x.q32)).length, noimp=regs.filter(x=>N(x.q32)==='no').length;
 $('#kpi3').innerHTML=[
  kpi('Recibió información (3.1)',fmt(info),`${pc(info,regs.length)}%`,+pc(info,regs.length)),
  kpi('Implementa algún club (3.2)',fmt(imp),`${pc(imp,regs.length)}%`,+pc(imp,regs.length)),
  kpi('No implementa (3.2)',fmt(noimp),`${pc(noimp,regs.length)}%`,+pc(noimp,regs.length)),
  kpi('Planifica implementar (3.3)','—','No disponible en la exportación'),
  kpi('Tipo planificado (3.4)','—','No disponible en la exportación')
 ].join('');
 const host=$('#section3content');

 if(s3==='33'||s3==='34'){
   host.innerHTML=`<article class="analysis-box"><h3>${s3==='33'?'3.3 En su IE tiene planificado implementar un Club Escolar en el presente año':'3.4 ¿Qué tipo de Club Escolar tiene planificado implementar?'}</h3><p class="question-text">Esta pregunta forma parte de la ruta que se activa cuando la IE responde <b>No</b> en 3.2.</p><div class="finding"><b>Dato no disponible en la exportación actual.</b> La pregunta está en la Ficha del Director, pero no aparece como campo en la base exportada de Mundo IE. Para evitar conclusiones incorrectas, el tablero no estima ni imputa valores.</div></article>`;
   return;
 }

 if(s3==='resumen'){
   let total=group(regs,'ugel'), yi=group(regs,'ugel',x=>yes(x.q32)?1:0), yn=group(regs,'ugel',x=>N(x.q32)==='no'?1:0);
   let labs=['UGEL 01','UGEL 02','UGEL 03','UGEL 04','UGEL 05','UGEL 06','UGEL 07'].filter(k=>total[k]);
   let area=group(clubs,'area'), areaLabs=Object.keys(area).sort((a,b)=>area[b]-area[a]);
   let liderY=clubs.filter(x=>yes(x.liderazgo_estudiantil)).length, liderN=clubs.filter(x=>N(x.liderazgo_estudiantil)==='no').length;
   let monY=clubs.filter(x=>yes(x.monitoreo_asesor)).length, monN=clubs.filter(x=>N(x.monitoreo_asesor)==='no').length;
   let cond=group(clubs,'condicion_laboral'), condLabs=Object.keys(cond).filter(x=>x!=='Sin dato').sort((a,b)=>cond[b]-cond[a]);
   host.innerHTML=`
   <div class="route-grid">
     <article class="route-card yes">
       <span class="route-tag">RUTA A · RESPONDE SÍ EN 3.2</span>
       <h3>IE que implementan al menos un Club Escolar</h3>
       <div class="route-big">${fmt(imp)} <small>(${pc(imp,regs.length)}%)</small></div>
       <p>Estas IE continúan con el registro de cada club: nombre, área, tipo, nivel/ciclo, condición laboral, horario, liderazgo estudiantil y monitoreo al docente asesor.</p>
     </article>
     <article class="route-card no">
       <span class="route-tag">RUTA B · RESPONDE NO EN 3.2</span>
       <h3>IE que no implementan Clubes Escolares</h3>
       <div class="route-big">${fmt(noimp)} <small>(${pc(noimp,regs.length)}%)</small></div>
       <p>Según la ficha, estas IE deben responder 3.3 y, si corresponde, 3.4. Esos campos no están disponibles en la exportación actual.</p>
     </article>
   </div>
   <div class="summary-grid">
     <article class="analysis-box">
       <h3>Lectura de la ruta 3.1 → 3.2</h3>
       <div class="kpi-inline">
         <div class="mini-kpi">3.1 Recibió información<b>${fmt(info)} (${pc(info,regs.length)}%)</b></div>
         <div class="mini-kpi">3.2 Implementa<b>${fmt(imp)} (${pc(imp,regs.length)}%)</b></div>
         <div class="mini-kpi">3.2 No implementa<b>${fmt(noimp)} (${pc(noimp,regs.length)}%)</b></div>
       </div>
       <div class="flow-note"><b>Interpretación:</b> el flujo de la ficha no es lineal. La respuesta de 3.2 define dos rutas diferentes. Por eso el tablero separa la implementación efectiva de la planificación futura.</div>
     </article>
     <article class="analysis-box">
       <div class="chart-head"><div><h3>Implementación por UGEL</h3><p>Comparación porcentual para que una UGEL con más registros no domine visualmente el gráfico.</p></div><span class="chart-badge">100% · N + %</span></div>
       <div class="chartbox section3-chart"><canvas id="s3ugel"></canvas></div>
       <div class="chart-callout">Cada barra suma 100%. La etiqueta muestra la cantidad de registros y el porcentaje dentro de su UGEL.</div>
     </article>
     <article class="finding"><b>Principales hallazgos</b><ul><li>${pc(imp,regs.length)}% de los registros declara implementar al menos un club.</li><li>${pc(noimp,regs.length)}% declara no implementarlo.</li><li>Se registran ${fmt(clubs.length)} clubes en el filtro actual.</li><li>3.3 y 3.4 quedan pendientes hasta disponer de esos campos en la exportación.</li></ul></article>
   </div>
   <div class="section slate"><div class="num">3.2+</div><div><h2>PERFIL DE LOS CLUBES IMPLEMENTADOS</h2><p>Información que la ficha solicita cuando la IE responde Sí en 3.2.</p></div></div>
   <div class="profile-grid">
     <article class="analysis-box"><div class="chart-head"><div><h3>Área del Club Escolar</h3><p>Distribución de los clubes declarados.</p></div><span class="chart-badge">N + %</span></div><div class="chartbox"><canvas id="s3area"></canvas></div></article>
     <article class="analysis-box"><div class="chart-head"><div><h3>Liderazgo estudiantil</h3><p>El club está liderado por algún estudiante.</p></div><span class="chart-badge">N + %</span></div><div class="chartbox"><canvas id="s3lider"></canvas></div></article>
     <article class="analysis-box"><div class="chart-head"><div><h3>Monitoreo al docente asesor</h3><p>La IE ha monitoreado al docente asesor.</p></div><span class="chart-badge">N + %</span></div><div class="chartbox"><canvas id="s3mon"></canvas></div></article>
   </div>
   <div class="grid2">
     <article class="analysis-box"><div class="chart-head"><div><h3>Condición laboral del docente asesor</h3><p>Nombrado / contratado según club registrado.</p></div><span class="chart-badge">N + %</span></div><div class="chartbox"><canvas id="s3cond"></canvas></div></article>
     <article class="analysis-box"><h3>Qué información se analiza a nivel de club</h3><div class="flow-note">Nombre del club · Área · Tipo de club · Nivel/ciclo educativo · Condición laboral · Uso de horas de atención (EBR secundaria JER) · Horario · Liderazgo estudiantil · Monitoreo al docente asesor.</div></article>
   </div>`;
   drawStacked100('s3ugel',labs,labs.map(k=>yi[k]||0),labs.map(k=>yn[k]||0));
   draw('s3area','bar',areaLabs,areaLabs.map(k=>area[k]),'Clubes',clubs.length);
   draw('s3lider','doughnut',['Sí','No'],[liderY,liderN],'Liderazgo',liderY+liderN);
   draw('s3mon','doughnut',['Sí','No'],[monY,monN],'Monitoreo',monY+monN);
   draw('s3cond','bar',condLabs,condLabs.map(k=>cond[k]),'Clubes',condLabs.reduce((s,k)=>s+cond[k],0));
 }else{
   let field=s3==='31'?'q31':'q32';
   let title=s3==='31'?'3.1 Ha recibido información de los Clubes Escolares por parte de la UGEL':'3.2 En su IE se viene implementando algún Club Escolar';
   let sy=regs.filter(x=>yes(x[field])).length,sn=regs.filter(x=>N(x[field])==='no').length;
   let gt=group(regs,'ugel'),gy=group(regs,'ugel',x=>yes(x[field])?1:0),gn=group(regs,'ugel',x=>N(x[field])==='no'?1:0);
   let labs=['UGEL 01','UGEL 02','UGEL 03','UGEL 04','UGEL 05','UGEL 06','UGEL 07'].filter(k=>gt[k]);
   host.innerHTML=`<div class="summary-grid two"><article class="analysis-box"><h3>${title}</h3><p class="question-text">Pregunta dicotómica de la Ficha del Director.</p><table class="simple"><tr><th>Respuesta</th><th>N</th><th>%</th></tr><tr><td>Sí</td><td>${sy}</td><td>${pc(sy,sy+sn)}%</td></tr><tr><td>No</td><td>${sn}</td><td>${pc(sn,sy+sn)}%</td></tr></table></article><article class="analysis-box"><div class="chart-head"><div><h3>Comparativo por UGEL</h3><p>Barras al 100% con cantidad y porcentaje para facilitar la comparación entre UGEL.</p></div><span class="chart-badge">100% · N + %</span></div><div class="chartbox section3-chart"><canvas id="s3detail"></canvas></div></article></div>`;
   drawStacked100('s3detail',labs,labs.map(k=>gy[k]||0),labs.map(k=>gn[k]||0));
 }
 let byLocal={};clubs.forEach(c=>byLocal[c.codigo_local]=(byLocal[c.codigo_local]||0)+1);
 table($('#tableIE'),['UGEL','REI','Código local','Institución educativa','Director','Modalidad','Gestión','Recibió info. (3.1)','Implementa (3.2)','Planifica (3.3)','Tipo planificado (3.4)','Total clubes'],
   regs.map(x=>[x.ugel,x.rei||'Sin REI',x.codigo_local,x.ie,x.director,x.modalidad,x.gestion,x.q31,x.q32,'No disponible','No disponible',byLocal[x.codigo_local]||0]));
}
const Q4DIRECTOR=[
 ['q41','4.1','Encuestas a estudiantes y docentes'],
 ['q42','4.2','Alianzas o convenios'],
 ['q43','4.3','Autorización mediante resolución o memorando'],
 ['q44','4.4','Reunión con CONEI/COPAE'],
 ['q45','4.5','Incorporación en PAT u otro instrumento'],
 ['q46','4.6','Medidas necesarias para la implementación'],
 ['q48','4.7','Ceremonia de apertura para la comunidad educativa']
];
const Q4ASESOR=[
 ['q41','4.1','Sensibilización por directivo o Comité de Gestión del Bienestar'],
 ['q42','4.2','Documento de formalización del club'],
 ['q43','4.3','Autorización de las familias'],
 ['q44','4.4','Retroalimentación a estudiantes'],
 ['q45','4.5','Evaluación continua de actividades y rol'],
 ['q46','4.6','Reporte de asistencia a las familias'],
 ['q47','4.7','Cuenta con plan de trabajo'],
 ['q48','4.8','Cuenta con actividades o sesiones del plan'],
 ['usa_horas_atencion','4.9','Usa horas de atención a estudiantes (solo EBR secundaria JER)']
];
function buildQ4Tabs(){
 $('#q4tabs').innerHTML=`<button class="subtab active" data-q4="resumen">Resumen general</button>`+Q4DIRECTOR.map(q=>`<button class="subtab" data-q4="${q[0]}">${q[1]} ${q[2]}</button>`).join('');
 $$('#q4tabs .subtab').forEach(b=>b.onclick=()=>{q4=b.dataset.q4;$$('#q4tabs .subtab').forEach(x=>x.classList.toggle('active',x===b));renderSection4()});
}
function renderSection4(){
 if(!DATA)return;let {regs}=filteredDirector(),host=$('#section4content');
 if(q4==='resumen'){
   let rows=Q4DIRECTOR.map(([f,c,t])=>{let y=regs.filter(x=>yes(x[f])).length,n=regs.filter(x=>N(x[f])==='no').length;return [c,t,y,n,+pc(y,y+n)]});
   host.innerHTML=`<div class="summary-grid"><article class="analysis-box"><h3>Resumen de resultados</h3><table class="simple"><tr><th>Pregunta</th><th>Sí</th><th>No</th><th>% Sí</th></tr>${rows.map(r=>`<tr><td>${r[0]} ${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}%</td></tr>`).join('')}</table></article><article class="analysis-box"><div class="chart-head"><div><h3>Gestión de los clubes: respuestas Sí / No</h3><p>Cantidad y porcentaje sobre respuestas válidas de cada pregunta.</p></div><span class="chart-badge">N + %</span></div><div class="chartbox q4-chart"><canvas id="q4summary"></canvas></div></article><article class="finding green"><b>Lectura general</b><ul><li>Azul representa respuestas afirmativas y coral respuestas negativas.</li><li>Cada segmento presenta cantidad y porcentaje sobre respuestas válidas.</li><li>Los filtros superiores actualizan toda la sección.</li><li>Use las pestañas para revisar cada pregunta por UGEL.</li></ul></article></div>`;
   drawStackedYesNo('q4summary',rows.map(r=>r[0]),rows.map(r=>r[2]),rows.map(r=>r[3]),true);
 }else{
   let q=Q4DIRECTOR.find(x=>x[0]===q4),field=q[0],y=regs.filter(x=>yes(x[field])).length,n=regs.filter(x=>N(x[field])==='no').length;
   host.innerHTML=`<div class="summary-grid two"><article class="analysis-box"><h3>${q[1]} ${q[2]}</h3><table class="simple"><tr><th>Respuesta</th><th>N</th><th>%</th></tr><tr><td>Sí</td><td>${y}</td><td>${pc(y,y+n)}%</td></tr><tr><td>No</td><td>${n}</td><td>${pc(n,y+n)}%</td></tr></table></article><article class="analysis-box"><div class="chart-head"><div><h3>Comparativo por UGEL</h3><p>Cantidad y porcentaje Sí / No por UGEL.</p></div><span class="chart-badge">N + %</span></div><div class="chartbox section3-chart"><canvas id="q4detail"></canvas></div></article></div>`;
   let gt=group(regs,'ugel'),gy=group(regs,'ugel',x=>yes(x[field])?1:0),gn=group(regs,'ugel',x=>N(x[field])==='no'?1:0),labs=orderedKeys(gt);drawStackedYesNo('q4detail',labs,labs.map(k=>gy[k]||0),labs.map(k=>gn[k]||0));
 }
}

function renderClubes(){
 let f=F(), rows=DATA.director.clubes.filter(x=>ok(x,f)&&(!f.a||x.area===f.a));
 let locales=new Set(rows.map(x=>x.codigo_local).filter(Boolean)).size;
 let reis=new Set(rows.map(x=>x.rei).filter(Boolean)).size;
 let monY=rows.filter(x=>yes(x.monitoreo_asesor)).length, monValid=rows.filter(x=>N(x.monitoreo_asesor)==='si'||N(x.monitoreo_asesor)==='no').length;
 let lidY=rows.filter(x=>yes(x.liderazgo_estudiantil)).length, lidValid=rows.filter(x=>N(x.liderazgo_estudiantil)==='si'||N(x.liderazgo_estudiantil)==='no').length;
 $('#kpiClubes').innerHTML=[
   kpi('Clubes declarados',fmt(rows.length),'Una fila por club'),
   kpi('Locales educativos',fmt(locales),'Con al menos un club'),
   kpi('REI representadas',fmt(reis),'Según código local'),
   kpi('Monitoreados',fmt(monY),`${pc(monY,monValid)}% de respuestas válidas`,+pc(monY,monValid)),
   kpi('Liderazgo estudiantil',fmt(lidY),`${pc(lidY,lidValid)}% de respuestas válidas`,+pc(lidY,lidValid))
 ].join('');
 let ga=group(rows,'area'), gal=Object.keys(ga).sort((a,b)=>ga[b]-ga[a]);
 draw('chartClubArea','bar',gal,gal.map(k=>ga[k]),'Clubes',rows.length);
 let gm=group(rows,'modalidad'); draw('chartClubModalidad','doughnut',Object.keys(gm),Object.values(gm),'Modalidad',rows.length);
 let gc=group(rows,'condicion_laboral'), gcl=Object.keys(gc).filter(k=>k!=='Sin dato'&&k).sort((a,b)=>gc[b]-gc[a]);
 draw('chartClubCond','bar',gcl,gcl.map(k=>gc[k]),'Clubes',gcl.reduce((s,k)=>s+gc[k],0));
 let gr=group(rows.filter(x=>x.rei),'rei'), grl=Object.keys(gr).sort((a,b)=>gr[b]-gr[a]).slice(0,12);
 draw('chartClubRei','bar',grl,grl.map(k=>gr[k]),'Clubes',grl.reduce((s,k)=>s+gr[k],0));
 table($('#tableClubes'),
   ['UGEL','REI','Núcleo REI','Código local','Institución educativa','Modalidad','Gestión','Director','Nombre del club','Área','Tipo de club','Nivel/Ciclo','Código modular','Docente asesor','Condición laboral','Usa horas de atención','Horario','Liderazgo estudiantil','Monitoreo al asesor'],
   rows.map(x=>[x.ugel,x.rei||'Sin REI',x.rei_nucleo||'',x.codigo_local,x.ie,x.modalidad,x.gestion,x.director,x.club,x.area,x.tipo,x.nivel_ciclo,x.codigo_modular,x.docente_asesor,x.condicion_laboral,x.usa_horas_atencion,x.horario,x.liderazgo_estudiantil,x.monitoreo_asesor])
 );
}


function renderClubDetailStable(){
 const {clubs}=filteredDirector();
 const el=$('#tableClubes'); if(!el)return;
 table(el,
 ['UGEL','REI','Núcleo REI','Código local','Institución educativa','Modalidad','Gestión','Nombre del club','Área','Tipo de club','Nivel/Ciclo','Código modular','Docente asesor','Condición laboral','Usa horas de atención','Horario','Liderazgo estudiantil','Monitoreo al asesor'],
 clubs.map(x=>[x.ugel,x.rei||'Sin REI',x.rei_nucleo||'',x.codigo_local,x.ie,x.modalidad,x.gestion,x.club,x.area,x.tipo,x.nivel_ciclo,x.codigo_modular,x.docente_asesor,x.condicion_laboral,x.usa_horas_atencion,x.horario,x.liderazgo_estudiantil,x.monitoreo_asesor])
 );
}

function renderAsesor(){
 let f=F(),rows=DATA.asesor.registros.filter(x=>ok(x,f)&&(!f.a||x.area===f.a)),loc=new Set(rows.map(x=>x.codigo_local).filter(Boolean)).size,ins=rows.reduce((s,x)=>s+(+x.inscritos||0),0);
 $('#kpiA').innerHTML=[kpi('Fichas de asesor',fmt(rows.length),'Registros recibidos'),kpi('Locales distintos',fmt(loc),'Con al menos una ficha'),kpi('Inscripciones declaradas',fmt(ins),'No necesariamente estudiantes únicos'),kpi('Promedio por ficha',fmt(rows.length?Math.round(ins/rows.length):0),'Inscripciones')].join('');
 const dirClubs=DATA.director.clubes.filter(x=>ok(x,f)&&(!f.a||x.area===f.a));
 const aLabs=UGEL_ORDER.filter(u=>dirClubs.some(x=>x.ugel===u)||rows.some(x=>x.ugel===u));
 const aMeta=aLabs.map(u=>dirClubs.filter(x=>x.ugel===u).length);
 const aReg=aLabs.map(u=>rows.filter(x=>x.ugel===u).length);
 const aTotalMeta=aMeta.reduce((a,b)=>a+b,0),aTotalReg=aReg.reduce((a,b)=>a+b,0),aTotalPend=Math.max(0,aTotalMeta-aTotalReg);
 const aRows=aLabs.map((u,i)=>[u,aMeta[i],aReg[i],Math.max(0,aMeta[i]-aReg[i]),aMeta[i]?pc(aReg[i],aMeta[i])+'%':'—']);
 aRows.push(['TOTAL DRELM',aTotalMeta,aTotalReg,aTotalPend,aTotalMeta?pc(aTotalReg,aTotalMeta)+'%':'—']);
 table($('#tableMetaAsesor'),['UGEL','Meta clubes','Fichas asesor','Pendientes','% avance'],aRows);
 if($('#sumAMeta'))$('#sumAMeta').textContent=fmt(aTotalMeta);
 if($('#sumAReg'))$('#sumAReg').textContent=fmt(aTotalReg);
 if($('#sumAPend'))$('#sumAPend').textContent=fmt(aTotalPend);
 if($('#sumAPct'))$('#sumAPct').textContent=(aTotalMeta?pc(aTotalReg,aTotalMeta):'0.0')+'%';
 drawAdvanceStable('chartAvanceAsesor',aLabs,aReg,aMeta);

 let gu=group(rows,'ugel',x=>+x.inscritos||0), gul=orderedKeys(gu);draw('chartAdvUgel','bar',gul,gul.map(k=>gu[k]),'Inscripciones',ins);
 let ga=group(rows,'area'), gal=Object.keys(ga).sort((a,b)=>ga[b]-ga[a]);draw('chartAdvArea','bar',gal,gal.map(k=>ga[k]),'Fichas',rows.length);
 let advQ=Q4ASESOR.map(([field,c,t])=>{let y=rows.filter(x=>yes(x[field])).length,n=rows.filter(x=>N(x[field])==='no').length;return [c,t,y,n]});
 $('#advisorQuestions').innerHTML='<table class="simple"><tr><th>Pregunta</th><th>Sí</th><th>No</th><th>% Sí</th></tr>'+advQ.map(r=>`<tr><td>${r[0]} ${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${pc(r[2],r[2]+r[3])}%</td></tr>`).join('')+'</table>';
 drawStackedYesNo('advisorQChart',advQ.map(r=>r[0]),advQ.map(r=>r[2]),advQ.map(r=>r[3]),true);
 table($('#tableAsesor'),['UGEL','REI','Código local','IE','Modalidad','Gestión','Club','Área','Tipo','Nivel/Ciclo','Inscripciones'],
   rows.map(x=>[x.ugel,x.rei||'Sin REI',x.codigo_local,x.ie,x.modalidad,x.gestion,x.club,x.area,x.tipo,x.nivel_ciclo,x.inscritos]));
}
function exportTable(kind){
 let headers,rows,name;
 if(kind==='directores'){let {regs}=filteredDirector();headers=['UGEL','REI','Núcleo REI','Código local','IE','Modalidad','Gestión','Director'];rows=regs.map(x=>[x.ugel,x.rei||'Sin REI',x.rei_nucleo||'',x.codigo_local,x.ie,x.modalidad,x.gestion,x.director]);name='directores_clubes_escolares.xls'}
 if(kind==='ie'){let {regs,clubs}=filteredDirector(),m={};clubs.forEach(c=>m[c.codigo_local]=(m[c.codigo_local]||0)+1);headers=['UGEL','REI','Código local','IE','Director','Modalidad','Gestión','3.1 Recibió información','3.2 Implementa','3.3 Planifica','3.4 Tipo planificado','Total clubes'];rows=regs.map(x=>[x.ugel,x.rei||'Sin REI',x.codigo_local,x.ie,x.director,x.modalidad,x.gestion,x.q31,x.q32,'No disponible','No disponible',m[x.codigo_local]||0]);name='detalle_ie_clubes_escolares.xls'}
 if(kind==='asesor'){let f=F(),rr=DATA.asesor.registros.filter(x=>ok(x,f)&&(!f.a||x.area===f.a));headers=['UGEL','REI','Código local','IE','Modalidad','Gestión','Club','Área','Tipo','Nivel/Ciclo','Inscripciones'];rows=rr.map(x=>[x.ugel,x.rei||'Sin REI',x.codigo_local,x.ie,x.modalidad,x.gestion,x.club,x.area,x.tipo,x.nivel_ciclo,x.inscritos]);name='detalle_asesores_clubes_escolares.xls'}
 if(kind==='clubes'){let f=F(),rr=DATA.director.clubes.filter(x=>ok(x,f)&&(!f.a||x.area===f.a));headers=['UGEL','REI','Núcleo REI','Código local','IE','Modalidad','Gestión','Director','Nombre del club','Área','Tipo de club','Nivel/Ciclo','Código modular','Docente asesor','Condición laboral','Usa horas de atención','Horario','Liderazgo estudiantil','Monitoreo al asesor'];rows=rr.map(x=>[x.ugel,x.rei||'Sin REI',x.rei_nucleo||'',x.codigo_local,x.ie,x.modalidad,x.gestion,x.director,x.club,x.area,x.tipo,x.nivel_ciclo,x.codigo_modular,x.docente_asesor,x.condicion_laboral,x.usa_horas_atencion,x.horario,x.liderazgo_estudiantil,x.monitoreo_asesor]);name='detalle_por_club_clubes_escolares.xls'}
 let html='<table><tr>'+headers.map(h=>`<th>${h}</th>`).join('')+'</tr>'+rows.map(r=>'<tr>'+r.map(v=>`<td>${v??''}</td>`).join('')+'</tr>').join('')+'</table>';
 let blob=new Blob(['\ufeff',html],{type:'application/vnd.ms-excel'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href);
}