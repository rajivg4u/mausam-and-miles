"use client";
import {useEffect,useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import AuthShell from "@/components/AuthShell";
import {createClient} from "@/lib/supabase/client";
export default function ResetPassword(){const [ready,setReady]=useState(false);const [password,setPassword]=useState('');const [error,setError]=useState('');const router=useRouter();
 useEffect(()=>{const supabase=createClient();supabase.auth.getSession().then(({data})=>setReady(!!data.session));const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setReady(!!session));return ()=>subscription.unsubscribe()},[]);
 async function submit(e:FormEvent){e.preventDefault();const {error:err}=await createClient().auth.updateUser({password});if(err){setError(err.message);return;}await createClient().auth.signOut();router.replace('/login')}
 return <AuthShell title="Choose a new password" subtitle="Set a new password for your account.">{!ready?<p>Open the password reset link from your email to continue.</p>:<form className="auth-form" onSubmit={submit}><label>New password<input required minLength={8} type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p className="auth-error">{error}</p>}<button className="auth-submit">Update password</button></form>}</AuthShell>;
}
