/* Subscription management is opt-in and scoped to the current browser + member. */
(() => {
const API='https://script.google.com/macros/s/AKfycbxAOsg5g3sr2w4HrbpSMXc51hbC96h0cYnzoZoEq3v4-4lOjrWi2DnMuMY_CSG82XfNJA/exec';
const OWNER='readers_push_owner', TOKEN='readers_push_token';
let busy=false;
const user=()=>localStorage.getItem('readers_user_id')||'';
const supported=()=>isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
const refresh=()=>document.querySelectorAll('readers-nav').forEach(nav=>nav.shadowRoot?.querySelectorAll('readers-push-toggle').forEach(el=>el.paint()));
async function post(data){const r=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(data),signal:AbortSignal.timeout(30000)});const body=await r.json();if(!body.success)throw Error(body.error||'알림 설정을 저장하지 못했습니다.');return body;}
async function registration(){return navigator.serviceWorker.register('/sw.js',{scope:'/'}).then(()=>navigator.serviceWorker.ready);}
async function disable(){
 const reg=await navigator.serviceWorker.getRegistration('/');const sub=await reg?.pushManager.getSubscription();
 // Stop browser delivery first, even if the server is temporarily unavailable.
 if(sub){await sub.unsubscribe();try{await post({action:'unsubscribePush',endpoint:sub.endpoint,token:localStorage.getItem(TOKEN)});}catch(_){/* Expired endpoint is removed on the next delivery. */}}
 localStorage.removeItem(OWNER);refresh();
}
async function enable(){
 if(!user())throw Error('로그인한 후 알림을 켜 주세요.');
 if(!supported())throw Error('이 브라우저에서는 알림을 지원하지 않습니다. 아이폰은 Safari에서 공유 → 홈 화면에 추가 후 열어 주세요.');
 if(Notification.permission==='denied')throw Error('브라우저의 사이트 설정에서 북클럽 알림을 허용해 주세요.');
 const member=user();
 const permission=await Notification.requestPermission();
 if(permission!=='granted')throw Error('알림이 허용되지 않았습니다. 원하실 때 다시 켤 수 있습니다.');
 const response=await fetch('/api/push',{signal:AbortSignal.timeout(15000)});const config=await response.json();
 if(!response.ok||!config.publicKey)throw Error('알림 서비스 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.');
 const reg=await registration();let sub=await reg.pushManager.getSubscription();
 if(sub&&localStorage.getItem(OWNER)!==member){await disable();sub=null;}
 const key=Uint8Array.from(atob(config.publicKey.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-config.publicKey.length%4)%4)),c=>c.charCodeAt(0));
 sub=sub||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
 let token=localStorage.getItem(TOKEN);if(!token){token=crypto.randomUUID()+crypto.randomUUID();localStorage.setItem(TOKEN,token);}
 try{await post({action:'subscribePush',id:member,subscription:sub.toJSON(),token});if(user()!==member){await disable();throw Error('계정이 변경되어 알림 설정을 취소했습니다.');}localStorage.setItem(OWNER,member);}
 catch(e){await sub.unsubscribe();localStorage.removeItem(OWNER);throw e;}
}
class PushToggle extends HTMLElement{
 connectedCallback(){if(!this.shadowRoot)this.attachShadow({mode:'open'});this.shadowRoot.innerHTML='<style>button{background:white;border:1px solid #2a6b52;color:#2a6b52;padding:6px 10px;border-radius:6px;font:600 12px/1.2 sans-serif;cursor:pointer;white-space:nowrap}button:disabled{opacity:.6;cursor:wait}button:focus-visible{outline:2px solid #2a6b52;outline-offset:3px}</style><button type="button"></button>';this.shadowRoot.querySelector('button').onclick=()=>this.toggle();this.paint();}
 paint(){const b=this.shadowRoot?.querySelector('button');if(!b)return;const on=!!user()&&localStorage.getItem(OWNER)===user()&&supported()&&Notification.permission==='granted';b.textContent=busy?'설정 중…':on?'알림 켜짐':'알림 받기';b.disabled=busy;b.setAttribute('aria-pressed',String(on));b.title=on?'새 글·내 글의 댓글 알림 끄기':'새 글·내 글의 댓글 알림 받기';}
 async toggle(){if(busy)return;busy=true;refresh();try{if(localStorage.getItem(OWNER)===user()&&supported()&&Notification.permission==='granted')await disable();else await enable();}catch(e){alert(e.message||'알림 설정에 실패했습니다.');}finally{busy=false;refresh();}}
}
customElements.define('readers-push-toggle',PushToggle);
async function reconcile(){if(!supported())return;const owner=localStorage.getItem(OWNER);if(owner&&owner!==user()){await disable();return;}if(owner){const reg=await navigator.serviceWorker.getRegistration('/');const sub=await reg?.pushManager.getSubscription();if(!sub||Notification.permission!=='granted')localStorage.removeItem(OWNER);}refresh();}
window.addEventListener('readers-logout',()=>{if(supported()){busy=true;refresh();disable().catch(()=>{}).finally(()=>{busy=false;refresh();});}});
window.addEventListener('readers-login',()=>reconcile().catch(()=>{}));
window.addEventListener('storage',e=>{if(e.key==='readers_user_id'||e.key===OWNER)reconcile().catch(()=>{});});
window.addEventListener('DOMContentLoaded',()=>reconcile().catch(()=>{}));
})();
