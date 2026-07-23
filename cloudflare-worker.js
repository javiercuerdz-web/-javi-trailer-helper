export default {
  async fetch(request, env) {
    const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type","Access-Control-Allow-Methods":"GET,POST,OPTIONS"};
    if (request.method === "OPTIONS") return new Response(null,{headers:cors});
    const url = new URL(request.url);
    if (url.pathname === "/health") return Response.json({ok:true,service:"Javi Trailer Helper AI"},{headers:cors});
    if (url.pathname !== "/analyze" || request.method !== "POST") return Response.json({error:"Not found"},{status:404,headers:cors});
    if (!env.OPENAI_API_KEY) return Response.json({error:"OPENAI_API_KEY is not configured"},{status:500,headers:cors});
    try {
      const {images=[],trailerNumber=""}=await request.json();
      if (!Array.isArray(images)||!images.length) return Response.json({error:"No photos received"},{status:400,headers:cors});
      const fields=["number","vin","vinLast6","imei","iccid","mac","caseNumber","nosebox","atis","receiver","camera","door","tank","regulator","lfo","lfi","rfi","rfo","lro","lri","rri","rro","cargo"];
      const prompt=`Analyze all attached photos as one trailer record. Known trailer number: ${trailerNumber||"unknown"}. Extract only information visibly supported by the photos. Return one JSON object using exactly these keys: ${fields.join(", ")}. VIN must be the full 17-character VIN, excluding I, O, and Q; derive vinLast6 from it. For tire positions map app labels L01/L1 to LFO, LI1 to LFI, RI1 to RFI, R01/R1 to RFO, L02/L2 to LRO, LI2 to LRI, RI2 to RRI, R02/R2 to RRO when the screen context supports that mapping. Do not place headings such as HARDWARE or INFORMATION into fields. Leave uncertain or unseen values as empty strings. Return JSON only.`;
      const content=[{type:"input_text",text:prompt},...images.slice(0,20).map(image_url=>({type:"input_image",image_url}))];
      const api=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Authorization":`Bearer ${env.OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:env.OPENAI_MODEL||"gpt-4.1-mini",input:[{role:"user",content}],temperature:0})});
      const raw=await api.json();
      if(!api.ok) return Response.json({error:raw?.error?.message||"OpenAI request failed"},{status:502,headers:cors});
      let text=raw.output_text||"";
      if(!text&&Array.isArray(raw.output)) for(const item of raw.output) for(const c of (item.content||[])) if(c.type==="output_text"||c.type==="text") text+=c.text||"";
      text=text.trim().replace(/^```(?:json)?/i,"").replace(/```$/i,"").trim();
      const data=JSON.parse(text);
      return Response.json({data,notes:"Analyzed with OpenAI vision. Review all values before saving."},{headers:cors});
    } catch (e) {return Response.json({error:e.message||"Analysis failed"},{status:500,headers:cors});}
  }
};
