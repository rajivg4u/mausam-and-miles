"use client";
import {useState,type FormEvent} from "react";
import AuthShell from "@/components/AuthShell";
import {createClient} from "@/lib/supabase/client";
export default function ForgotPassword(){const [email,setEmail]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);await createClient().auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/reset-password'});setBusy(false);setMessage('If an account exists, a password reset email has been sent.');}
 return <AuthShell title="Reset your password" subtitle="Request a password reset link if you need one."><form className="auth-form" onSubmit={submit}><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><button className="auth-submit" disabled={busy}>Send reset link</button></form>{message&&<p className="auth-success">{message}</p>}</AuthShell>;
}
