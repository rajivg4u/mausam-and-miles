"use client";
import {useEffect,useState,type FormEvent} from "react";
import {useRouter,useSearchParams} from "next/navigation";
import {Suspense} from "react";
import AuthShell from "@/components/AuthShell";
import {createClient} from "@/lib/supabase/client";
function VerifyForm(){const router=useRouter();const params=useSearchParams();const flow=params.get('flow')==='signup'?'signup':'login';
 const [email,setEmail]=useState('');const [token,setToken]=useState('');const [error,setError]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 useEffect(()=>{setEmail(sessionStorage.getItem('mausam_otp_email')||'');},[]);
 async function verify(e:FormEvent){e.preventDefault();setBusy(true);setError('');
  const {error:authError}=await createClient().auth.verifyOtp({email,token,type:flow==='signup'?'signup':'email'});
  setBusy(false);if(authError){setError('Invalid or expired code. Request a new code if needed.');return;}
  sessionStorage.removeItem('mausam_otp_email');router.replace('/');router.refresh();
 }
 async function resend(){setError('');setMessage('');setBusy(true);
  const supabase=createClient();
  const result=flow==='signup'?await supabase.auth.resend({type:'signup',email}):await supabase.auth.signInWithOtp({email,options:{shouldCreateUser:false}});
  setBusy(false);if(result.error){setError(result.error.message);return;}setMessage('A new code has been requested. Check your inbox.');
 }
 return <AuthShell title="Verify your email" subtitle={'Enter the six-digit code sent to '+(email||'your email')+'.'}>
  <form className="auth-form" onSubmit={verify}><label>Verification code<input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoComplete="one-time-code" value={token} onChange={e=>setToken(e.target.value.replace(/\D/g,''))} placeholder="123456"/></label>
  <p className="auth-hint">Code expires after 10 minutes (configured in Supabase Auth).</p>
  {error&&<p className="auth-error" role="alert">{error}</p>}{message&&<p className="auth-success" role="status">{message}</p>}
  <button className="auth-submit" disabled={busy||!email}>{busy?'Please wait…':'Verify & continue'}</button></form>
  <button className="auth-text-button" disabled={busy||!email} onClick={resend}>Resend code</button>
 </AuthShell>;
}
export default function VerifyPage(){return <Suspense fallback={<main className="auth-page">Loading…</main>}><VerifyForm/></Suspense>}
