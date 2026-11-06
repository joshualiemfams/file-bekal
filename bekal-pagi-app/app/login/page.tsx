'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LoginPage(){
  const router=useRouter();
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  async function submit(e:FormEvent){
    e.preventDefault();setError('');
    if(!supabase){setError('Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.');return;}
    setLoading(true);
    const {error}=await supabase.auth.signInWithPassword({email,password});
    setLoading(false);
    if(error){setError(error.message);return;}
    router.push('/');
  }
  return <main className="login-page"><form className="login-card" onSubmit={submit}><div className="login-brand"><img className="login-logo" src="/bekal-pagi-logo.jpg" alt="Logo Bekal Pagi"/><div><b>BEKAL PAGI MOBILE</b><small>Member · Operasional</small></div></div><h1>Selamat datang</h1><p>Masuk untuk melanjutkan ke aplikasi Bekal Pagi.</p><label>Email<div className="login-input"><Mail size={17}/><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="nama@email.com"/></div></label><label>Password<div className="login-input"><LockKeyhole size={17}/><input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Masukkan password"/></div></label>{error&&<div className="login-error">{error}</div>}<button className="primary-btn" disabled={loading}>{loading?'Memproses...':'Masuk'}</button><small className="login-note">Belum punya akun? <a href='/daftar' className='login-link'>Daftar sebagai member</a></small></form></main>
}
