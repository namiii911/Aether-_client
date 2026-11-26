const play=document.getElementById('play');
const installFabric=document.getElementById('installFabric');
const status=document.getElementById('status');
const log=document.getElementById('log');
function add(message){log.textContent=(log.textContent+'\n'+message).slice(-6000);log.scrollTop=log.scrollHeight}
function settings(){return {
  accountType:document.getElementById('accountType').value,
  username:document.getElementById('username').value,
  profile:document.getElementById('profile').value,
  ram:document.getElementById('ram').value,
  gameDir:document.getElementById('gameDir').value
}}
window.aether.onLog(add);
window.aether.onProgress(value=>{if(value&&value.status)status.textContent=value.status});
installFabric.addEventListener('click',async()=>{
  installFabric.disabled=true;play.disabled=true;status.textContent='INSTALLING FABRIC';
  try{
    const result=await window.aether.installFabric({gameDir:settings().gameDir});
    status.textContent='FABRIC READY';add('Installed Fabric profile: '+result.profile);
  }catch(error){status.textContent='ERROR';add('ERROR: '+error.message);alert(error.message)}
  finally{installFabric.disabled=false;play.disabled=false}
});
play.addEventListener('click',async()=>{
  play.disabled=true;installFabric.disabled=true;status.textContent='STARTING';
  try{
    const result=await window.aether.launch(settings());
    status.textContent=result.message;add(result.message);
  }catch(error){status.textContent='ERROR';add('ERROR: '+error.message);alert(error.message)}
  finally{play.disabled=false;installFabric.disabled=false}
});
