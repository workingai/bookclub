self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
  let data={};try{data=event.data.json();}catch(_){}
  event.waitUntil(self.registration.showNotification(data.title||'북클럽 새 소식',{body:data.body||'새 글 또는 댓글이 등록되었습니다.',icon:'/icons/bookclub-192.png',badge:'/icons/bookclub-192.png',tag:data.tag,data:{url:data.url||'/#discussion'},renotify:false}));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const url=new URL(event.notification.data?.url||'/#discussion',self.location.origin);
  if(url.origin!==self.location.origin)return;
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const win of windows){if(new URL(win.url).origin===url.origin){await win.navigate(url.href);return win.focus();}}
    return self.clients.openWindow(url.href);
  })());
});
