const webpush = require('web-push');
const {validSubscription,vapidKeys,authorized} = require('../lib/push');
module.exports = async (req,res) => {
  res.setHeader('Cache-Control','no-store');
  const secret=process.env.BOOKCLUB_PUSH_SECRET;
  let keys; try {keys=vapidKeys(secret);} catch (_) {return res.status(503).json({error:'알림 서비스 준비 중입니다.'});}
  if(req.method==='GET') return res.status(200).json({publicKey:keys.publicKey});
  if(req.method!=='POST') return res.status(405).end();
  if(!authorized(req.headers.authorization,secret))return res.status(401).end();
  let data;try{data=typeof req.body==='string'?JSON.parse(req.body):req.body;}catch(_){return res.status(400).end();}
  if(!Array.isArray(data?.deliveries)||data.deliveries.length>40)return res.status(400).end();
  const results=[];
  // Only known push providers; never follow an arbitrary URL supplied by a subscriber.
  for(let start=0;start<data.deliveries.length;start+=10){
    await Promise.all(data.deliveries.slice(start,start+10).map(async item=>{
      const result={id:String(item.id||'')};
      if(!validSubscription(item.subscription)){results.push({...result,status:'expired'});return;}
      const topic=String(item.topicId||'');
      const payload=JSON.stringify({title:String(item.title||'북클럽').slice(0,100),body:String(item.body||'새 소식이 있습니다.').slice(0,200),url:'/?topic='+encodeURIComponent(topic)+'#discussion',tag:String(item.tag||'bookclub').slice(0,100),user:String(item.user||'')});
      try{await webpush.sendNotification(item.subscription,payload,{vapidDetails:{subject:'https://bookclub.workingai.kr',...keys},TTL:86400,timeout:5000});result.status='sent';}
      catch(e){result.status=[404,410].includes(e.statusCode)?'expired':'retry';}
      results.push(result);
    }));
  }
  return res.status(200).json({results});
};
