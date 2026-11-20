(() => {
const cfg=window.AETHER_CONFIG||{};
const $=id=>document.getElementById(id);
let supabase=null,mode="signup",currentUser=null;
const configured=cfg.supabaseUrl?.startsWith("https://")&&cfg.supabaseAnonKey&&!cfg.supabaseAnonKey.includes("PASTE_");
function message(msg,error=false){$("authMessage").textContent=msg;$("authMessage").style.display="block";$("authMessage").classList.toggle("error",error)}
function hideMessage(){$("authMessage").style.display="none"}
function setMode(next){mode=next;$("signupTab").classList.toggle("active",mode==="signup");$("loginTab").classList.toggle("active",mode==="login");$("authTitle").textContent=mode==="signup"?"Request access":"Welcome back";$("authSubmit").innerHTML=mode==="signup"?'Send access request <span>↗</span>':'Sign in <span>↗</span>';$("authHint").textContent=mode==="signup"?"Create an account. The owner must approve it before downloads unlock.":"Sign in with the account you registered.";hideMessage()}
$("signupTab").onclick=()=>setMode("signup");$("loginTab").onclick=()=>setMode("login");
function showMember(){ $("authPanel").classList.add("hidden");$("memberPanel").classList.remove("hidden"); }
async function loadProfile(){
 const {data,error}=await supabase.from("profiles").select("email,status,is_admin").eq("id",currentUser.id).single();
 if(error){$("memberTitle").textContent="Account setup pending";$("memberDescription").textContent="Your account was created, but its access profile is not ready. Contact the site owner.";return}
 $("adminBox").classList.toggle("hidden",!data.is_admin);\n $("downloadBox").classList.remove("hidden");\n const downloadReady = data.is_admin || data.status === "approved";\n $("downloadBtn").disabled = !downloadReady;\n $("downloadBtn").textContent = downloadReady ? "Download Hack Client ↓" : "Awaiting approval";\n $("fileStatus").textContent = downloadReady ? "Access approved · Private download" : "Available after owner approval";
 if(data.is_admin){$("memberTitle").textContent="Owner dashboard";$("memberDescription").textContent="Manage access requests and approved members.";await loadRequests()}
 else if(data.status==="approved"){$("memberTitle").textContent="Access approved";$("memberDescription").textContent="You're approved. Your private project download is unlocked.";$("downloadBox").classList.remove("hidden")}
 else if(data.status==="revoked"){$("memberTitle").textContent="Access revoked";$("memberDescription").textContent="Your access has been revoked by the owner. Contact them if you believe this is a mistake."; }
 else {$("memberTitle").textContent="Access pending";$("memberDescription").textContent="Your request is waiting for the owner to approve it. This page will update when you sign in again."}
}
async function loadRequests(){
 const host=$("requests");host.innerHTML='<p class="hint">Loading…</p>';
 const {data,error}=await supabase.from("profiles").select("id,email,status").eq("is_admin",false).order("created_at",{ascending:false});
 if(error){host.innerHTML='<p class="hint">Could not load requests. Check the database policies.</p>';return}
 if(!data?.length){host.innerHTML='<p class="hint">No member accounts yet.</p>';return}
 host.innerHTML="";
 data.forEach(p=>{const row=document.createElement("div");row.className="request";const email=document.createElement("span");email.className="request-email";email.textContent=p.email+" · "+p.status;const actions=document.createElement("div");actions.className="request-actions";
 if(p.status!=="approved"){const a=document.createElement("button");a.className="approve";a.textContent="Approve";a.onclick=()=>changeStatus(p.id,"approved");actions.append(a)}
 if(p.status!=="revoked"){const r=document.createElement("button");r.className="revoke";r.textContent="Revoke";r.onclick=()=>changeStatus(p.id,"revoked");actions.append(r)}
 row.append(email,actions);host.append(row)})
}
async function changeStatus(id,status){const {error}=await supabase.from("profiles").update({status}).eq("id",id);if(error){alert("Update failed: "+error.message);return}await loadRequests()}
$("refreshBtn").onclick=loadRequests;
$("authForm").addEventListener("submit",async e=>{e.preventDefault();hideMessage();const email=$("email").value.trim(),password=$("password").value;$("authSubmit").disabled=true;
 try{
 if(mode==="signup"){const {data,error}=await supabase.auth.signUp({email,password});if(error)throw error;if(data.session){currentUser=data.user;showMember();await loadProfile()}else message("Account created. Check your email if confirmation is enabled, then sign in. Your access remains pending until the owner approves it.")}
 else{const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;currentUser=data.user;showMember();await loadProfile()}
 }catch(err){message(err.message,true)}finally{$("authSubmit").disabled=false}
});
$("downloadBtn").onclick=async()=>{const {data:profile}=await supabase.from("profiles").select("status,is_admin").eq("id",currentUser.id).single();if(profile?.status!=="approved"&&!profile?.is_admin){alert("Your account is not approved.");return}const {data,error}=await supabase.storage.from(cfg.downloadBucket).createSignedUrl(cfg.downloadFile,90);if(error){alert("Download unavailable: "+error.message);return}window.location.href=data.signedUrl};
$("signoutBtn").onclick=async()=>{await supabase.auth.signOut();currentUser=null;$("memberPanel").classList.add("hidden");$("authPanel").classList.remove("hidden");setMode("login")};
async function start(){
 if(!configured){$("statusLine").textContent="Setup required: connect a Supabase project using config.js and the included SQL setup guide.";return}
 supabase=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
 const {data:{session}}=await supabase.auth.getSession();if(session){currentUser=session.user;showMember();await loadProfile()}
 supabase.auth.onAuthStateChange(async(_event,session)=>{if(session&&!currentUser){currentUser=session.user;showMember();await loadProfile()}});
}
start();
})();