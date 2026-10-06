const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'../../game')), out=path.resolve(process.argv[3]||path.join(__dirname,'../dist'));
const commit=require('child_process').execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const ctx=vm.createContext({document:{addEventListener(){}},localStorage:{getItem(){return null}},console});
const read=n=>fs.readFileSync(path.join(root,'js',n+'.js'),'utf8');
for(const n of ['progression','story','quests','restoration-content','guardian-content','guardian-combat'])vm.runInContext(read(n),ctx,{filename:n});
vm.runInContext(read('world').split('const World =')[0],ctx);
vm.runInContext(read('restoration').split('const Restoration =')[0],ctx);
for(const n of ['fury','mari-return','play-core','minigames'])vm.runInContext(read(n),ctx,{filename:n});
const board=read('board');
for(const n of ['GROW','KIND_NAME','SPIRITS','TIER','TIER_AT']){
 const start=board.indexOf('const '+n+' ='), end=board.indexOf(';',start);
 vm.runInContext(board.slice(start,end+1),ctx);
}
vm.runInContext(board.slice(board.indexOf('SPIRITS.vard ='),board.indexOf('const effMov')),ctx);
vm.runInContext(`globalThis.raw={Progression,CHAPTERS,BOARDS,SIDE_QUESTS,RESTORATION_STAGES,RESTORATION_CHAPTERS,GUARDIAN_STAGES,GUARDIANS,GuardianCombat,EQUIP,ITEMS,SHOPS,MATERIAL_SHOPS,FREE_STAGES,WORLD_NODES,Minigames,PlayCore,GROW,KIND_NAME,SPIRITS,TIER,TIER_AT,SCRIPT,CHOICES,FINALE_PHASE0,SPEAKERS,Fury,MariReturn};globalThis.guideColors=['teal','green','gold','violet'];globalThis.guideUnlocked=['prologue','act1','act2','act3','act4','act5','finale','epilogue','done','vardbond','maribond'];globalThis.Engine={unlocked:()=>guideUnlocked,load:()=>({colors:guideColors})}`,ctx);
const d=ctx.raw,P=d.Progression;
const all=Object.values({...d.BOARDS,...d.FREE_STAGES,...d.SIDE_QUESTS,...d.RESTORATION_STAGES,...d.GUARDIAN_STAGES});
const group=c=>c.hardOnly?'legend':c.id.startsWith('rq_')?'restRequest':c.postgame?'restoration':c.id.startsWith('q_')?'quest':c.id.startsWith('f_')||c.id==='gp_vard'?'free':'main';
const stages=all.map(c=>({id:c.id,title:c.title,act:c.act,description:c.desc||c.missionGuide||c.goal||'',group:group(c),postgame:!!c.postgame||c.need==='done',boss:P.isBossStage(c),guardian:c.guardian||null,gate:c.chapterGate||c.need||d.WORLD_NODES.find(n=>n.board===c.id)?.chapter||(c.gate??null),requiredCompanions:P.journeyGate(c.chapterGate||d.WORLD_NODES.find(n=>n.board===c.id)?.chapter,[])?.missing||[],bondNeed:c.bondNeed,bossName:c.bossName,bossHP:c.bossHP||1,bossShield:!!c.bossShield,hardOnly:!!c.hardOnly,board:{rows:c.rows,cols:c.cols},par:c.par,beacons:c.restoreBeacons||0,spStart:c.spStart,firstGold:c.reward||null,missionGuide:c.missionGuide||null,missions:c.missions||[],spirits:c.spirits,tiers:Object.fromEntries((c.hardOnly?['hard']:Object.keys(P.difficulties)).map(key=>{const prepared=P.prepare(c,key);return [key,{level:P.level(c,key),enemies:prepared.enemies,rewards:P.rewards(c,key),materials:P.battleMaterials(c,key),hpScale:P.difficulties[key].hp,atkScale:P.difficulties[key].atk,rewardScale:P.difficulties[key].reward}]}))}));
const skills=P.skills.map(s=>({...s,levels:[0,1,2,3].map(n=>P.skill({aria:{skillLevels:{}}},s.id,n)),recipes:[0,1,2].map(n=>P.recipe({aria:{skillLevels:{[s.id]:n}}},s.id))}));
const gear=Object.entries(d.EQUIP).map(([id,g])=>({id,...g,sources:stages.filter(c=>c.tiers.hard.rewards.sEquipment===id).map(c=>c.id),shops:Object.entries(d.SHOPS).filter(([,v])=>v.includes(id)).map(([k])=>k)}));
const items=Object.entries(d.ITEMS).map(([id,v])=>({id,...v,shops:Object.entries(d.SHOPS).filter(([,v])=>v.includes(id)).map(([k])=>k)}));
const guardians=d.GUARDIANS.map(p=>({...p,phases:[0,1,2].map(i=>({name:d.GuardianCombat.phaseNames[i],...d.GuardianCombat.mode(p,i),skill:p.skills[i],lines:p.lines[i]}))}));
const leisure={};for(const [id,g]of Object.entries(d.Minigames.games)){leisure[id]={...g,tiers:{}};for(const tier of ['gentle','normal','hard']){const party=P.migrate({});const rec=party.minigames.records[id][tier]={};leisure[id].tiers[tier]=['C','B','A','S'].map(rank=>({rank,materials:P.leisureMaterials(party,id,tier,rank,rec)}));}}
const chats={fury:{},mari:{}};for(const id of ['mari_news','gran','ivy','spinel','king','ending','forest_before','forest_after','forest_meeting'])chats.fury[id]=d.Fury.chat(id);for(const id of ['vard','friends'])chats.mari[id]=d.MariReturn.chat(id);
vm.runInContext(`guideUnlocked=guideUnlocked.filter(id=>!['done','maribond'].includes(id))`,ctx);chats.fury.mari_news_before=d.Fury.chat('mari_news');chats.fury.ending_before=d.Fury.chat('ending');
vm.runInContext(`guideUnlocked=['prologue','act1','act2','act3','act4'];guideColors=['teal','green']`,ctx);chats.fury.forest_after_ivy_first=d.Fury.chat('forest_after');
const stories=Object.entries(d.SCRIPT).map(([id,script])=>({id,script,postgame:id.startsWith('restore')||id.startsWith('mari_'),title:d.CHAPTERS.find(c=>c.key===id)?.title||(id==='fury'?'怒りの向け先':id==='fury_reunion'?'色たちの語らい':'ただいまの、その先'),act:d.CHAPTERS.find(c=>c.key===id)?.act||(id==='fury'?'第三幕・紅角の丘':id==='fury_reunion'?'紅角の丘':'マリーと仲間たち')}));
fs.writeFileSync(path.join(out,'story-data.json'),JSON.stringify({version:'1.14.0',stories,choices:d.CHOICES,phase0:d.FINALE_PHASE0,chats,speakers:d.SPEAKERS},null,2)+'\n');
const data={version:'1.14.0',commit,spirits:P.spirits,skills,stages,guardians,gear,items,materials:P.materials,shops:d.SHOPS,materialShops:d.MATERIAL_SHOPS,chapters:d.CHAPTERS,restorationChapters:d.RESTORATION_CHAPTERS,worldNodes:d.WORLD_NODES,difficulties:P.difficulties,mini:leisure,voyageRules:d.PlayCore.voyageRules,crystalRules:d.PlayCore.crystalRules,grow:d.GROW,kindNames:d.KIND_NAME,spiritActions:d.SPIRITS,floorTiers:d.TIER,floorThresholds:d.TIER_AT};
fs.writeFileSync(path.join(out,'data.json'),JSON.stringify(data,null,2)+'\n');
const ids=[...gear,...items].map(x=>x.id).concat(Object.keys(P.materials));
for(const id of ids){const src=path.join(root,'assets/inventory',id+'.webp');if(fs.existsSync(src))fs.copyFileSync(src,path.join(out,'media',id+'.webp'));}
console.log(JSON.stringify({stages:stages.length,groups:Object.fromEntries(['main','quest','free','restoration','restRequest','legend'].map(g=>[g,stages.filter(c=>c.group===g).length])),bosses:stages.filter(c=>c.boss).length,guardians:guardians.length,skills:skills.length,gear:gear.length,items:items.length,art:ids.filter(id=>fs.existsSync(path.join(out,'media',id+'.webp'))).length},null,2));
