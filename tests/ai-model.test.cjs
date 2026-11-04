const test=require('node:test');const assert=require('node:assert/strict');const handler=require('../api/chat.js');
test('Astra Responses request preserves history and returns actual model',async()=>{
 const previous=global.fetch,key=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test';let sent,url;
 global.fetch=async(u,init)=>{url=u;sent=JSON.parse(init.body);return {ok:true,text:async()=>JSON.stringify({status:'completed',model:'gpt-6-astra',output:[{type:'message',content:[{type:'output_text',text:'Olá.'}]}]})};};
 const res={setHeader(){},end(body){this.body=JSON.parse(body)}};
 try {await handler({method:'POST',body:{question:'Olá.'}},res);assert.equal(res.statusCode,200);assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(sent.model,'gpt-6-astra');assert.equal(sent.store,false);assert.deepEqual(sent.reasoning,{effort:'low'});assert.equal(sent.temperature,undefined);assert.equal(res.body.model,'gpt-6-astra');}finally{global.fetch=previous;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
});
