const play=document.getElementById('play');
const installFabric=document.getElementById('installFabric');
const status=document.getElementById('status');
const mainContent=document.querySelector('.main');
const homePanel=document.getElementById('homePanel');
const friendsPanel=document.getElementById('friendsPanel');
const accountRow=document.getElementById('accountSection');
const settingsBlock=document.getElementById('settingsSection');
const accountStatusPanel=document.getElementById('accountStatus');
const accountActions=document.getElementById('loginMicrosoft').parentElement;
const downloadActions=document.getElementById('downloadSection');
const makeView=(id,title)=>{const section=document.createElement('section');section.id=id;section.className='view';const panel=document.createElement('div');panel.className='panel';const heading=document.createElement('h2');heading.textContent=title;panel.append(heading);section.append(panel);mainContent.append(section);return panel};
const homePanelOriginalTitle=homePanel.querySelector('h2');
const homeView=document.createElement('section');homeView.id='homeView';homeView.className='view active';mainContent.append(homeView);homeView.append(homePanel);
const accountPanel=makeView('accountView','Account');
accountPanel.append(accountRow,accountActions,accountStatusPanel);
const settingsPanel=makeView('settingsView','Settings');
settingsPanel.append(settingsBlock);
const downloadsPanel=makeView('downloadsView','Downloads');
const downloadsDescription=document.createElement('p');downloadsDescription.className='sub';downloadsDescription.textContent='Install the Fabric profile, then browse and install Mods, Resource Packs and Shaders from Modrinth.';downloadsPanel.append(downloadsDescription);

const libraryHeading=document.createElement('div');
libraryHeading.className='library-heading';
libraryHeading.innerHTML='<div class="eyebrow">GLORY CONTENT LIBRARY</div><h2>Mods, Packs & Shaders</h2><p class="sub">Search Modrinth and install the compatible download straight into your Minecraft folder.</p>';
downloadsPanel.append(libraryHeading);
const libraryControls=document.createElement('div');libraryControls.className='library-controls';
const libraryTypeSelect=document.createElement('select');libraryTypeSelect.id='libraryType';libraryTypeSelect.setAttribute('aria-label','Content type');
[['mod','Mods · Fabric'],['resourcepack','Resource Packs'],['shader','Shaders']].forEach(([value,label])=>{const option=document.createElement('option');option.value=value;option.textContent=label;libraryTypeSelect.append(option)});
const libraryQuery=document.createElement('input');libraryQuery.id='libraryQuery';libraryQuery.type='search';libraryQuery.placeholder='Search Modrinth (e.g. Sodium, Faithful, Complementary)';
const librarySearchButton=document.createElement('button');librarySearchButton.type='button';librarySearchButton.textContent='SEARCH';
libraryControls.append(libraryTypeSelect,libraryQuery,librarySearchButton);downloadsPanel.append(libraryControls);
const libraryHint=document.createElement('p');libraryHint.className='notice';libraryHint.textContent='Target: Minecraft Java '+ '1.21.11'+'. Mods are filtered for Fabric. Downloads are installed to your selected game directory: mods / resourcepacks / shaderpacks.';downloadsPanel.append(libraryHint);
const libraryResults=document.createElement('div');libraryResults.className='library-results';libraryResults.setAttribute('aria-live','polite');libraryResults.textContent='Choose a category, enter a search and press SEARCH to browse compatible Modrinth projects.';downloadsPanel.append(libraryResults);
function libraryCard(item,type){
  const card=document.createElement('article');card.className='library-card';
  const info=document.createElement('div');info.className='library-info';
  const title=document.createElement('h3');title.textContent=item.title||item.slug;
  const meta=document.createElement('div');meta.className='library-meta';meta.textContent='by '+(item.author||'Unknown author')+' · '+Number(item.downloads||0).toLocaleString()+' downloads';
  const desc=document.createElement('p');desc.textContent=item.description||'No description provided.';
  info.append(title,meta,desc);
  const install=document.createElement('button');install.type='button';install.className='library-install';install.textContent='INSTALL';
  install.addEventListener('click',async()=>{
    install.disabled=true;install.textContent='DOWNLOADING…';
    try{
      const result=await window.aether.installLibraryItem({type,projectId:item.projectId,gameDir:settings().gameDir});
      install.textContent=result.alreadyInstalled?'ALREADY INSTALLED':'INSTALLED ✓';
      add('Library: '+result.filename+' → '+result.folder+'/');
      libraryHint.textContent=(result.alreadyInstalled?'Already installed: ':'Installed: ')+result.filename+' in '+result.folder+'/';
    }catch(error){install.disabled=false;install.textContent='RETRY';libraryHint.textContent='Install failed: '+error.message;add('Library install error: '+error.message)}
  });
  card.append(info,install);return card;
}
async function searchLibrary(){
  const query=libraryQuery.value.trim(),type=libraryTypeSelect.value;
  if(query.length<2){libraryResults.textContent='Enter at least 2 characters to search.';return}
  librarySearchButton.disabled=true;librarySearchButton.textContent='SEARCHING…';libraryResults.replaceChildren();
  const loading=document.createElement('p');loading.className='sub';loading.textContent='Searching Modrinth for Minecraft 1.21.11 compatible projects…';libraryResults.append(loading);
  try{
    const results=await window.aether.searchLibrary({type,query});
    libraryResults.replaceChildren();
    if(!results.length){libraryResults.textContent='No compatible projects found. Try another search term.';return}
    results.forEach(item=>libraryResults.append(libraryCard(item,type)));
    libraryHint.textContent=results.length+' results from Modrinth · '+(type==='mod'?'Fabric mods':'Minecraft '+ '1.21.11 '+(type==='shader'?'shaders':'resource packs'))+'. Select INSTALL on the item you want.';
  }catch(error){libraryResults.textContent='Search failed: '+error.message;add('Library search error: '+error.message)}
  finally{librarySearchButton.disabled=false;librarySearchButton.textContent='SEARCH'}
}
librarySearchButton.addEventListener('click',searchLibrary);
libraryQuery.addEventListener('keydown',event=>{if(event.key==='Enter')searchLibrary()});

const installAction=document.createElement('div');installAction.className='actions';installAction.append(installFabric);downloadsPanel.append(installAction);
const friendsView=document.createElement('section');friendsView.id='friendsView';friendsView.className='view';mainContent.append(friendsView);friendsView.append(friendsPanel);
const homeActions=document.createElement('div');homeActions.className='actions';homeActions.append(play);homePanel.insertBefore(homeActions,downloadActions);
homePanel.querySelectorAll('#accountSection,#settingsSection,#accountStatus,#downloadSection').forEach(node=>node.remove());
const launcherNotice=homePanel.querySelector('.notice');
if(launcherNotice) launcherNotice.remove();
const navLinks=[...document.querySelectorAll('.nav-link')];
function activateView(id){
  document.querySelectorAll('.main>.view').forEach(view=>view.classList.toggle('active',view.id===id));
  navLinks.forEach(link=>link.classList.toggle('active',link.getAttribute('href')==='#'+id));
  history.replaceState(null,'','#'+id);
}
navLinks.forEach(link=>link.addEventListener('click',event=>{event.preventDefault();activateView(link.getAttribute('href').slice(1))}));


// Navigation is wired above to switch between independent launcher screens.
const accountType=document.getElementById('accountType');
const localNameField=document.getElementById('localNameField');
const loginMicrosoft=document.getElementById('loginMicrosoft');
const logoutMicrosoft=document.getElementById('logoutMicrosoft');
const accountStatus=document.getElementById('accountStatus');
const log=document.getElementById('log');
// Restore and persist launcher preferences locally on this device.
const preferenceIds=['accountType','username','profile','ram','autoBoost','gameDir','javaPath'];
function restorePreferences(){
  try{const saved=JSON.parse(localStorage.getItem('glory-launcher-preferences')||'{}');preferenceIds.forEach(id=>{const el=document.getElementById(id);if(el&&saved[id]!==undefined)el.value=saved[id]})}catch(_error){}
}
function savePreferences(){
  const saved={};preferenceIds.forEach(id=>{const el=document.getElementById(id);if(el)saved[id]=el.value});
  localStorage.setItem('glory-launcher-preferences',JSON.stringify(saved));
}
restorePreferences();
preferenceIds.forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('change',savePreferences)});

function add(message){log.textContent=(log.textContent+'\n'+message).slice(-6000);log.scrollTop=log.scrollHeight}
function settings(){return {
  accountType:accountType.value,
  username:document.getElementById('username').value,
  profile:document.getElementById('profile').value,
  ram:document.getElementById('ram').value,
  autoBoost:document.getElementById('autoBoost').value === 'on',
  gameDir:document.getElementById('gameDir').value,
  javaPath:document.getElementById('javaPath').value
}}
function syncAccountFields(){localNameField.style.display=accountType.value==='local'?'block':'none'}
accountType.addEventListener('change',syncAccountFields);
syncAccountFields();
window.aether.accountStatus().then(result=>{
  accountStatus.textContent=result.signedIn?'Microsoft account connected (optional). Local Account remains available.':'No Microsoft account connected. Local Account is ready.';
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
  const name=document.createElement('div');name.className='social-name';name.textContent=profile.display_name||'GLORY Player';
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
  try{const result=await window.aether.socialLogin({email:socialEmail.value.trim(),password:socialPassword.value});if(result.confirmationRequired){socialMessage(result.message);return}socialMessage('Welcome to GLORY, @'+result.profile.username);await refreshSocial()}
  catch(error){socialMessage(error.message,true)}
  finally{socialLogin.disabled=false}
});
socialSignup.addEventListener('click',async()=>{
  socialSignup.disabled=true;
  try{const result=await window.aether.socialSignup({email:socialEmail.value.trim(),password:socialPassword.value});if(result.confirmationRequired){socialMessage(result.message);return}socialMessage('GLORY account created: @'+result.profile.username);await refreshSocial()}
  catch(error){socialMessage(error.message,true)}
  finally{socialSignup.disabled=false}
});
socialLogout.addEventListener('click',async()=>{
  try{await window.aether.socialLogout();socialMessage('Signed out of GLORY Network.');incomingRequests.textContent='Sign in to view requests.';outgoingRequests.replaceChildren();friendsList.textContent='Sign in to view friends.'}
  catch(error){socialMessage(error.message,true)}
});
socialSearchButton.addEventListener('click',async()=>{
  socialSearchButton.disabled=true;socialResults.replaceChildren();
  try{
    const results=await window.aether.socialSearch(socialSearch.value);
    if(!results.length){socialResults.textContent='No players found.';return}
    results.forEach(profile=>socialResults.append(socialCard(profile,'GLORY player',[
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
