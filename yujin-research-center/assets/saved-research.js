/* ══════════════════════════════════════════════════════════════════════
   saved-research.js — 저장한 리서치(리포트 · 카드뉴스). Private Desk(desk.html)와
   리서치 리포트(reports.html)가 같이 쓴다. 서버 저장소가 아직 없어 이 브라우저에만 저장한다.
   항목: {kind:'report'|'cardnews', id, title, category, date, at}
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  const KEY='il.saved-research-v1';
  const read=()=>{ try{ const a=JSON.parse(localStorage.getItem(KEY)||'[]'); return Array.isArray(a)?a:[]; }catch(e){ return []; } };
  const write=a=>{ try{ localStorage.setItem(KEY,JSON.stringify(a)); }catch(e){} };
  const same=(x,kind,id)=>x.kind===kind&&String(x.id)===String(id);
  const subs=[];
  function list(){ return read().sort((a,b)=>String(b.at).localeCompare(String(a.at))); }
  function has(kind,id){ return read().some(x=>same(x,kind,id)); }
  /* 저장돼 있으면 해제, 없으면 저장. 결과(true=저장됨)를 돌려준다 */
  function toggle(item){
    const a=read(), i=a.findIndex(x=>same(x,item.kind,item.id));
    if(i>=0) a.splice(i,1);
    else a.push({kind:item.kind,id:item.id,title:item.title||'',category:item.category||'',date:item.date||'',at:new Date().toISOString()});
    write(a); subs.forEach(cb=>{ try{ cb(); }catch(e){} });
    return i<0;
  }
  function remove(kind,id){ write(read().filter(x=>!same(x,kind,id))); subs.forEach(cb=>{ try{ cb(); }catch(e){} }); }
  window.addEventListener('storage',e=>{ if(e.key===KEY) subs.forEach(cb=>{ try{ cb(); }catch(err){} }); });
  window.ILSaved={list,has,toggle,remove,onChange:cb=>subs.push(cb)};
})();
