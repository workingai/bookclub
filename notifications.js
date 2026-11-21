/* Account preference controls delivery; only opted-in mobile browsers receive push. */
(() => {
const API='https://script.google.com/macros/s/AKfycbxAOsg5g3sr2w4HrbpSMXc51hbC96h0cYnzoZoEq3v4-4lOjrWi2DnMuMY_CSG82XfNJA/exec';
const OWNER='readers_push_owner',TOKEN='readers_push_token';
let busy=false,preferences=null,preferenceUser='',linked=false,requestVersion=0,refreshPromise=null;
const user=()=>localStorage.getItem('readers_user_id')||'';
const mobile=()=>/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||(/Macintosh/i.test(navigator.userAgent)&&navigator.maxTouchPoints>1);
const supported=()=>isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
const elements=()=>Array.from(document.querySelectorAll('readers-nav')).flatMap(nav=>Array.from(nav.shadowRoot?.querySelectorAll('readers-push-toggle')||[]));
const paint=()=>elements().forEach(el=>el.paint());
async function post(data){const response=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(data),signal:AbortSignal.timeout(30000)});const body=await response.json();if(!body.success)throw Error(body.error||'알림 설정을 저장하지 못했습니다.');return body;}
async function disconnectDevice(){
 if('serviceWorker' in navigator){const reg=await navigator.serviceWorker.getRegistration('/');const sub=await reg?.pushManager?.getSubscription();if(sub){const token=localStorage.getItem(TOKEN);await sub.unsubscribe();try{await post({action:'unsubscribePush',endpoint:sub.endpoint,token});}catch(_){/* An expired endpoint is removed on the next attempted delivery. */}}}
 localStorage.removeItem(OWNER);linked=false;
}
async function localRegistration(){
 if(!mobile()||!supported())return false;
 const reg=await navigator.serviceWorker.getRegistration('/');const sub=await reg?.pushManager.getSubscription();
 return !!sub&&localStorage.getItem(OWNER)===user()&&Notification.permission==='granted';
}
async function refreshState(){
 const member=user(),version=++requestVersion;
 if(!member){preferences=null;preferenceUser='';linked=false;paint();return;}
 if(preferenceUser!==member){preferences=null;preferenceUser=member;linked=false;paint();}
 const result=await post({action:'getPushPreferences',id:member});
 if(user()!==member||version!==requestVersion)return;
 preferences=result;linked=await localRegistration();paint();
}
async function connectMobile(){
 if(!mobile())throw Error('휴대폰에서 로그인한 뒤 연결해 주세요. PC에는 알림을 보내지 않습니다.');
 if(!supported())throw Error('아이폰은 Safari에서 공유 → 홈 화면에 추가한 뒤, 홈 화면의 북클럽을 열어 연결해 주세요.');
 const member=user();if(!member)throw Error('먼저 로그인해 주세요.');
 // Request directly from the user's click, before any network operation.
 if(await Notification.requestPermission()!=='granted')throw Error('휴대폰 브라우저의 사이트 설정에서 북클럽 알림을 허용해 주세요.');
 const response=await fetch('/api/push',{signal:AbortSignal.timeout(15000)}),config=await response.json();
 if(!response.ok||!config.publicKey)throw Error('알림 서버 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.');
 await navigator.serviceWorker.register('/sw.js',{scope:'/'});const reg=await navigator.serviceWorker.ready;
 let sub=await reg.pushManager.getSubscription();
 if(sub&&localStorage.getItem(OWNER)!==member){await disconnectDevice();sub=null;}
 const key=Uint8Array.from(atob(config.publicKey.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-config.publicKey.length%4)%4)),c=>c.charCodeAt(0));
 sub=sub||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
 let token=localStorage.getItem(TOKEN);if(!token){token=crypto.randomUUID()+crypto.randomUUID();localStorage.setItem(TOKEN,token);}
 try{
   await post({action:'subscribePush',id:member,subscription:sub.toJSON(),token,device:'mobile',userAgent:navigator.userAgent,maxTouchPoints:navigator.maxTouchPoints||0});
   if(user()!==member){await sub.unsubscribe();throw Error('계정이 바뀌었습니다. 다시 로그인한 후 연결해 주세요.');}
   localStorage.setItem(OWNER,member);linked=true;
 }catch(e){await sub.unsubscribe();localStorage.removeItem(OWNER);linked=false;throw e;}
}
class PushToggle extends HTMLElement{
 connectedCallback(){
  if(!this.shadowRoot)this.attachShadow({mode:'open'});
  this.shadowRoot.innerHTML=`<style>:host{display:inline-block}button{background:white;border:1px solid #2a6b52;color:#2a6b52;padding:6px 10px;border-radius:6px;font:600 12px/1.2 sans-serif;cursor:pointer;white-space:nowrap}button:disabled{opacity:.55;cursor:wait}button:focus-visible{outline:2px solid #2a6b52;outline-offset:3px}dialog{box-sizing:border-box;width:min(440px,calc(100vw - 32px));padding:26px;border:1px solid #d9e2dc;border-radius:16px;color:#25382e;font-family:'Malgun Gothic',sans-serif;box-shadow:0 16px 70px #0002}dialog::backdrop{background:#0005}h2{margin:0 0 18px;font-size:21px}p{font-size:14px;line-height:1.8;white-space:normal;overflow-wrap:anywhere}.state{font-weight:700}.hint{color:#59695e}.actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}.actions button{padding:12px 16px;font-size:14px;white-space:normal}.primary{background:#2a6b52;color:white}.message{color:#795b35;min-height:22px;font-size:13px}.close{margin-top:20px;display:block;margin-left:auto}</style><button class="open" type="button">모바일 알림</button><dialog aria-labelledby="push-title"><h2 id="push-title">모바일 알림 설정</h2><p class="state" aria-live="polite"></p><p class="hint"></p><div class="actions"><button type="button" class="toggle primary"></button><button type="button" class="connect">이 휴대폰 연결</button></div><p class="message" role="status"></p><button type="button" class="close">닫기</button></dialog>`;
  const $=s=>this.shadowRoot.querySelector(s);
  $('.open').onclick=()=>this.open();$('.close').onclick=()=> $('dialog').close();
  $('.toggle').onclick=()=>this.change();$('.connect').onclick=()=>this.connect();this.paint();
 }
 paint(){
  if(!this.shadowRoot)return;const $=s=>this.shadowRoot.querySelector(s),known=preferences&&preferenceUser===user();
  $('.open').textContent=known&&preferences.enabled?'모바일 알림 켜짐':'모바일 알림';
  $('.state').textContent=known?(preferences.enabled?'계정 알림이 켜져 있습니다.':'계정 알림이 꺼져 있습니다.'):'설정을 확인하고 있습니다…';
  $('.hint').textContent=mobile()?(linked?'이 휴대폰이 연결되어 있습니다. 계정 알림을 끄면 등록된 모든 모바일에서 수신이 중지됩니다.':supported()?'이 휴대폰에서 알림을 받으려면 한 번 연결하고 브라우저 알림을 허용해 주세요.':'아이폰은 Safari에서 공유 → 홈 화면에 추가한 뒤, 홈 화면의 북클럽을 열어 연결해 주세요.'):'PC에는 알림을 보내지 않습니다. 휴대폰에서 로그인한 뒤 이 메뉴를 열고 한 번 연결해 주세요.';
  if(known&&!mobile())$('.hint').textContent+=' 현재 연결된 모바일: '+preferences.mobileDevices+'대';
  $('.toggle').textContent=busy?'설정 중…':known&&preferences.enabled?'모든 모바일 알림 끄기':'모바일 알림 켜기';
  $('.toggle').disabled=busy||!known;$('.connect').hidden=!mobile()||!supported()||linked||!known||!preferences.enabled;$('.connect').disabled=busy;
 }
 async open(){this.shadowRoot.querySelector('dialog').showModal();this.message('');try{await refreshState();}catch(e){this.message(e.message+' 창을 닫고 다시 시도해 주세요.');}}
 message(text){this.shadowRoot.querySelector('.message').textContent=text;}
 async change(){
  if(busy||!preferences)return;const member=user(),enable=!preferences.enabled;busy=true;paint();this.message('');
  try{
   if(enable&&mobile()&&supported()&&!linked)await connectMobile();
   if(user()!==member)throw Error('계정이 바뀌었습니다. 다시 시도해 주세요.');
   const next=await post({action:'setPushPreferences',id:member,enabled:enable});
   if(user()!==member)throw Error('계정이 바뀌었습니다. 다시 시도해 주세요.');
   preferences=next;preferenceUser=member;
   this.message(enable?(next.mobileDevices?'등록된 모바일로 새 글·내 글의 댓글 알림을 보냅니다.':'계정 설정을 켰습니다. 휴대폰을 연결하면 알림을 받을 수 있습니다.'):'이 계정에 등록된 모든 모바일의 알림을 껐습니다.');
  }catch(e){this.message(e.message||'설정을 변경하지 못했습니다.');}finally{busy=false;paint();}
 }
 async connect(){if(busy)return;busy=true;paint();this.message('');try{await connectMobile();await refreshState();this.message('이 휴대폰을 연결했습니다.');}catch(e){this.message(e.message);}finally{busy=false;paint();}}
}
customElements.define('readers-push-toggle',PushToggle);
async function reconcile(){
 if(busy)return;if(refreshPromise)return refreshPromise;
 refreshPromise=(async()=>{
  const owner=localStorage.getItem(OWNER);
  if(owner&&(!mobile()||owner!==user()))await disconnectDevice();
  // Re-register legacy mobile subscriptions with device metadata; desktop subscriptions are never migrated.
  if(mobile()&&supported()&&owner===user()&&await localRegistration()){
    const reg=await navigator.serviceWorker.getRegistration('/'),sub=await reg.pushManager.getSubscription();
    await post({action:'subscribePush',id:user(),subscription:sub.toJSON(),token:localStorage.getItem(TOKEN),device:'mobile',userAgent:navigator.userAgent,maxTouchPoints:navigator.maxTouchPoints||0});
  }
  await refreshState();
 })().finally(()=>{refreshPromise=null;});return refreshPromise;
}
window.addEventListener('readers-logout',()=>{++requestVersion;preferences=null;preferenceUser='';busy=true;elements().forEach(el=>el.shadowRoot.querySelector('dialog')?.close());paint();disconnectDevice().catch(()=>{}).finally(()=>{busy=false;paint();});});
window.addEventListener('readers-login',()=>reconcile().catch(()=>{}));
window.addEventListener('storage',e=>{if(e.key==='readers_user_id'||e.key===OWNER)reconcile().catch(()=>{});});
window.addEventListener('DOMContentLoaded',()=>reconcile().catch(()=>{}));
window.addEventListener('focus',()=>{if(!busy)refreshState().catch(()=>{});});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!busy)refreshState().catch(()=>{});});
})();
