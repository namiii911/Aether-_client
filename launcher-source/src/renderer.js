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

const socialEmail=document.getElementById('socialEmail');
const socialPassword=document.getElementById('socialPassword');
const socialLogin=document.getElementById('socialLogin');
const socialSignup=document.getElementById('socialSignup');
const socialLogout=document.getElementById('socialLogout');
const socialStatus=document.getElementById('socialStatus');
const socialUsername=document.getElementById('socialUsername');
const socialDisplayName=document.getElementById('socialDisplayName');
const socialSaveProfile=document.getElementById('socialSaveProfile');
const socialSearch=document.getElementById('socialSearch');
const socialSearchButton=document.getElementById('socialSearchButton');
const socialResults=document.getElementById('socialResults');
const incomingRequests=document.getElementById('incomingRequests');
const outgoingRequests=document.getElementById('outgoingRequests');
const friendsList=document.getElementById('friendsList');

function socialMessage(message,error=false){socialStatus.textContent=message;socialStatus.classList.toggle('error',error)}
function socialButton(label,handler){
  const button=document.createElement('button');button.type='button';button.textContent=label;button.addEventListener('click',handler);return button;
}
function socialCard(profile,detail,actions=[]){
  const card=document.createElement('div');card.className='social-item';
  const info=document.createElement('div');
  const name=document.createElement('div');name.className='social-name';name.textContent=profile.display_name||'AETHER Player';
  const handle=document.createElement('div');handle.className='social-handle';handle.textContent='@'+(profile.username||'unknown')+(detail?' · '+detail:'');
  info.append(name,handle);card.append(info);
  if(actions.length){const host=document.createElement('div');host.className='social-actions';actions.forEach(action=>host.append(action));card.append(host)}
  return card;
}
async function refreshSocial(){
  try{
    const data=await window.aether.socialState();
    socialMessage('Signed in as @'+data.profile.username);
    if(document.activeElement!==socialUsername)socialUsername.value=data.profile.username;
    if(document.activeElement!==socialDisplayName)socialDisplayName.value=data.profile.display_name;
    incomingRequests.replaceChildren();outgoingRequests.replaceChildren();friendsList.replaceChildren();
    if(!data.incoming.length)incomingRequests.textContent='No incoming requests.';
    data.incoming.forEach(item=>{
      incomingRequests.append(socialCard(item.profile,'Wants to be your friend',[
        socialButton('ACCEPT',async()=>{await window.aether.socialRespond({id:item.id,status:'accepted'});await refreshSocial()}),
        socialButton('DECLINE',async()=>{await window.aether.socialRespond({id:item.id,status:'declined'});await refreshSocial()})
      ]));
    });
    if(!data.outgoing.length)outgoingRequests.textContent='No sent requests.';
    data.outgoing.forEach(item=>{
      outgoingRequests.append(socialCard(item.profile,'Request sent',[
        socialButton('CANCEL',async()=>{await window.aether.socialRemove(item.id);await refreshSocial()})
      ]));
    });
    if(!data.friends.length)friendsList.textContent='No friends yet. Search for a username above.';
    data.friends.forEach(item=>{
      const status=item.online?'Online':'Offline';
      const card=socialCard(item.profile,status,[socialButton('REMOVE',async()=>{await window.aether.socialRemove(item.id);await refreshSocial()})]);
      const handle=card.querySelector('.social-handle');handle.classList.add(item.online?'social-online':'social-offline');
      friendsList.append(card);
    });
  }catch(error){socialMessage(error.message,true)}
}
window.aether.onSocialRefresh(()=>refreshSocial());
refreshSocial();
socialLogin.addEventListener('click',async()=>{
  socialLogin.disabled=true;
  try{const result=await window.aether.socialLogin({email:socialEmail.value.trim(),password:socialPassword.value});if(result.confirmationRequired){socialMessage(result.message);return}socialMessage('Welcome to AETHER, @'+result.profile.username);await refreshSocial()}
  catch(error){socialMessage(error.message,true)}
  finally{socialLogin.disabled=false}
});
socialSignup.addEventListener('click',async()=>{
  socialSignup.disabled=true;
  try{const result=await window.aether.socialSignup({email:socialEmail.value.trim(),password:socialPassword.value});if(result.confirmationRequired){socialMessage(result.message);return}socialMessage('AETHER account created: @'+result.profile.username);await refreshSocial()}
  catch(error){socialMessage(error.message,true)}
  finally{socialSignup.disabled=false}
});
socialLogout.addEventListener('click',async()=>{
  try{await window.aether.socialLogout();socialMessage('Signed out of AETHER Network.');incomingRequests.textContent='Sign in to view requests.';outgoingRequests.replaceChildren();friendsList.textContent='Sign in to view friends.'}
  catch(error){socialMessage(error.message,true)}
});
socialSearchButton.addEventListener('click',async()=>{
  socialSearchButton.disabled=true;socialResults.replaceChildren();
  try{
    const results=await window.aether.socialSearch(socialSearch.value);
    if(!results.length){socialResults.textContent='No players found.';return}
    results.forEach(profile=>socialResults.append(socialCard(profile,'AETHER player',[
      socialButton('ADD FRIEND',async()=>{try{const result=await window.aether.socialRequest(profile.username);socialMessage('Friend request sent to @'+result.username);await refreshSocial()}catch(error){socialMessage(error.message,true)}})
    ])));
  }catch(error){socialMessage(error.message,true)}
  finally{socialSearchButton.disabled=false}
});
setInterval(async()=>{
  try{await window.aether.socialHeartbeat();await refreshSocial()}catch(_error){}
},20000);

socialSaveProfile.addEventListener('click',async()=>{
  socialSaveProfile.disabled=true;
  try{const profile=await window.aether.socialProfileUpdate({username:socialUsername.value,displayName:socialDisplayName.value});socialMessage('Profile saved: @'+profile.username);await refreshSocial()}
  catch(error){socialMessage(error.message,true)}
  finally{socialSaveProfile.disabled=false}
});
