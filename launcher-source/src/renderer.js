const play=document.getElementById('play');
const installFabric=document.getElementById('installFabric');
const status=document.getElementById('status');
const accountType=document.getElementById('accountType');
const localNameField=document.getElementById('localNameField');
const loginMicrosoft=document.getElementById('loginMicrosoft');
const logoutMicrosoft=document.getElementById('logoutMicrosoft');
const accountStatus=document.getElementById('accountStatus');
const log=document.getElementById('log');
function add(message){log.textContent=(log.textContent+'\n'+message).slice(-6000);log.scrollTop=log.scrollHeight}
function settings(){return {
  accountType:accountType.value,
  username:document.getElementById('username').value,
  profile:document.getElementById('profile').value,
  ram:document.getElementById('ram').value,
  gameDir:document.getElementById('gameDir').value,
  javaPath:document.getElementById('javaPath').value
}}
function syncAccountFields(){localNameField.style.display=accountType.value==='local'?'block':'none'}
accountType.addEventListener('change',syncAccountFields);
syncAccountFields();
window.aether.accountStatus().then(result=>{
  if(result.signedIn){accountType.value='microsoft';accountStatus.textContent='A Microsoft account is saved securely on this PC.';}
  syncAccountFields();
}).catch(error=>add('Account status: '+error.message));
loginMicrosoft.addEventListener('click',async()=>{
  loginMicrosoft.disabled=true;accountStatus.textContent='Waiting for Microsoft sign-in...';
  try{const result=await window.aether.loginMicrosoft();accountType.value='microsoft';accountStatus.textContent='Connected: '+result.username;add('Microsoft account verified: '+result.username);syncAccountFields();}
  catch(error){accountStatus.textContent='Sign-in failed: '+error.message;add('Microsoft sign-in error: '+error.message);alert(error.message)}
  finally{loginMicrosoft.disabled=false}
});
logoutMicrosoft.addEventListener('click',async()=>{
  try{await window.aether.logoutMicrosoft();accountType.value='local';accountStatus.textContent='Microsoft account signed out.';syncAccountFields();}
  catch(error){add('Sign-out error: '+error.message)}
});
window.aether.onLog(add);
window.aether.onProgress(value=>{if(value&&value.status)status.textContent=value.status});
installFabric.addEventListener('click',async()=>{
  installFabric.disabled=true;play.disabled=true;status.textContent='PREPARING JAVA / FABRIC';
  try{
    const result=await window.aether.installFabric({gameDir:settings().gameDir,javaPath:settings().javaPath});
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
