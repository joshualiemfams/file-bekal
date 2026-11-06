'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole, Mail, UserRound } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function RegisterPage(){
 const router=useRouter();
 const [name,setName]=useState(''); const [email,setEmail]=useState(''); const [password,setPassword]=useState('');
 const [error,setError]=useState(''); const [info,setInfo]=useState(''); const [loading,setLoading]=useState(false);
 async function submit(e:FormEvent){
  e.preventDefault();setError('');setInfo('');
  if(!supabase){setError('Supabase belum dikonfigurasi.');return;}
  if(password.length<8){setError('Password minimal 8 karakter.');return;}
  setLoading(true);
  const {data,error}=await supabase.auth.signUp({email:email.trim().toLowerCase(),password,options:{data:{full_name:name.trim(),requested_role:'member'}}});
  setLoading(false);
  if(error){setError(error.message);return;}
  if(data.session){router.replace('/');return;}
  setInfo('Pendaftaran diterima. Periksa email untuk verifikasi. Setelah verifikasi, Owner akan menghubungkan akun Anda ke data member Bekal Pagi.');
 }
 return <main className="login-page"><form className="login-card" onSubmit={submit}><div className="login-brand"><img className="login-logo" src="/bekal-pagi-logo.jpg" alt="Logo Bekal Pagi"/><div><b>BEKAL PAGI MOBILE</b><small>Pendaftaran akun member</small></div></div><h1>Daftar akun</h1><p>Gunakan nama sesuai nama member yang terdaftar di Bekal Pagi.</p><label>Nama sesuai data member<div className="login-input"><UserRound size={17}/><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Nama lengkap"/></div></label><label>Email<div className="login-input"><Mail size={17}/><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="nama@email.com"/></div></label><label>Password<div className="login-input"><LockKeyhole size={17}/><input type="password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimal 8 karakter"/></div></label>{error&&<div className="login-error">{error}</div>}{info&&<div className="notice">{info}</div>}<button className="primary-btn" disabled={loading}>{loading?'Mengirim...':'Daftar'}</button><small className="login-note">Akun hanya mendapat akses setelah diverifikasi dan dihubungkan oleh Owner.</small><a href="/login" className="login-link">Sudah punya akun? Masuk</a></form></main>;
}
