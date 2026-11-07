'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Activity, ArrowDownToLine, ArrowUpRight, Bell, Boxes, Check, ChevronDown, CircleDollarSign, ClipboardList, HeartHandshake, Home, LogOut, Package, Search, Settings, ShieldCheck, Store, Users, Wallet, X, AlertTriangle } from 'lucide-react';

type Role = 'Owner' | 'Admin' | 'Staff' | 'Member';
type Branch = 'Pejanggik' | 'Jempong' | 'Ampenan' | 'Abian Tubuh';
const branches: Branch[] = ['Pejanggik','Jempong','Ampenan','Abian Tubuh'];
const getLocalDateKey = () => {
  // Bentuk YYYY-MM-DD secara eksplisit berdasarkan zona waktu operasional Lombok (WITA).
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const part = (type: string) => parts.find(item => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};
const formatLocalDateKey = (dateKey: string) => new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Makassar', day: 'numeric', month: 'long', year: 'numeric'
}).format(new Date(`${dateKey}T00:00:00+08:00`));
const initialMembers = [
  {id:'m1',name:'Wiwit',products:['Ayam Madu','Risol','Nasi Bakar']},
  {id:'m2',name:'Rina',products:['Pastel','Donat Kentang']},
  {id:'m3',name:'Dewi',products:['Lemper','Puding Cokelat','Brownies']},
  {id:'m4',name:'Ayu',products:['Roti Pisang','Tahu Bakso']},
  {id:'m5',name:'Mbak Sari',products:['Nasi Kuning','Sosis Solo']}
];
const initialReturns: {id:number;date:string;member:string;product:string;branch:Branch;qty:number}[] = [];

export default function Dashboard() {
  const router = useRouter();
  const [role,setRole] = useState<Role>('Owner');
  const [authReady,setAuthReady] = useState(false);
  const [dbMenus,setDbMenus] = useState<{id:string;member_id:string;name:string}[]>([]);
  const [dbMemberIds,setDbMemberIds] = useState<Record<string,string>>({});
  const [dbBranchIds,setDbBranchIds] = useState<Record<string,string>>({});
  const [pendingAccounts,setPendingAccounts] = useState<{user_id:string;full_name:string;email:string|null}[]>([]);
  const [linkSelections,setLinkSelections] = useState<Record<string,string>>({});
  const [linkingUserId,setLinkingUserId] = useState<string|null>(null);
  const [memberLinked,setMemberLinked] = useState(false);
  const [members,setMembers] = useState(initialMembers);
  const [newMenuName,setNewMenuName] = useState('');
  const [newMemberName,setNewMemberName] = useState('');
  const [editingMemberId,setEditingMemberId] = useState<string|null>(null);
  const [editingMemberName,setEditingMemberName] = useState('');
  const [editingMenuId,setEditingMenuId] = useState<string|null>(null);
  const [editingMenuName,setEditingMenuName] = useState('');

  const [branch,setBranch] = useState<Branch>('Pejanggik');
  const [page,setPage] = useState('Dashboard');
  const [monitorMemberId,setMonitorMemberId] = useState('');
  const [payments,setPayments] = useState<{member_id:string;business_date:string;amount:number;paid_at:string}[]>([]);
  const [paymentReady,setPaymentReady] = useState(false);
  const [paymentBusy,setPaymentBusy] = useState(false);
  const [editDate,setEditDate] = useState(getLocalDateKey);
  const [editMember,setEditMember] = useState('');
  const [editRows,setEditRows] = useState<{id:string;kind:string;product:string;branch:string;quantity:number}[]>([]);
  const [editLoading,setEditLoading] = useState(false);

  const [search,setSearch] = useState('');
  const [returnQty,setReturnQty] = useState<Record<string,string>>({});
  const [returns,setReturns] = useState(initialReturns);
  const [branchDelivery,setBranchDelivery] = useState<Record<string,string>>({});
  
  const [incomingHistory,setIncomingHistory] = useState<{date:string;member:string;product:string;branch:Branch|'Online';qty:number}[]>([]);
  const [notice,setNotice] = useState('');
  const [showConfirm,setShowConfirm] = useState(false);
  const [decision,setDecision] = useState<'Ambil Nanti'|'Sedekahkan'|'Menunggu keputusan'>('Menunggu keputusan');
  const [member,setMember] = useState('Wiwit');
  const [unitRate,setUnitRate] = useState('8000');
  const [bonusRate,setBonusRate] = useState('2000');
  const [bonusEvery,setBonusEvery] = useState('5');
  const [menuLimit,setMenuLimit] = useState('4');
  const [specialMember,setSpecialMember] = useState('Wiwit');
  const [specialRate,setSpecialRate] = useState('9000');
  const [specialTariffs,setSpecialTariffs] = useState<Record<string,number>>({});
  const [memberDecisions,setMemberDecisions] = useState<Record<string,'Ambil Nanti'|'Sedekahkan'|'Menunggu keputusan'>>({});
  const [todayKey,setTodayKey] = useState(getLocalDateKey);
  useEffect(()=>{
    let alive=true;
    async function boot(){
      if(!supabase){setNotice('Konfigurasi Supabase belum tersedia.');setAuthReady(true);return;}
      const {data:{session}}=await supabase!.auth.getSession();
      if(!session){router.replace('/login');return;}
      const {data:profile,error:profileError}=await supabase!.from('profiles').select('user_id,full_name,role,member_id').eq('user_id',session.user.id).single();
      if(profileError||!profile){setNotice('Profil akun belum terdaftar. Hubungi Owner.');setAuthReady(true);return;}
      const roleName=String(profile.role).charAt(0).toUpperCase()+String(profile.role).slice(1);
      if(alive){setRole(roleName as Role);}
      const [mr,menuR,br,entryR,deliveryR,onlineR,returnR,decisionR,settingR,profileR]=await Promise.all([
        supabase!.from('members').select('id,name,special_rate,special_rate_flat,active').eq('active',true).order('name'),
        supabase!.from('menus').select('id,member_id,name,active').eq('active',true).order('name'),
        supabase!.from('branches').select('id,name').eq('active',true),
        supabase!.from('daily_item_entries').select('id,business_date,member_id,menu_id,branch_id,channel,quantity'),
        supabase!.from('daily_member_deliveries').select('id,business_date,member_id,branch_id,quantity'),
        supabase!.from('daily_member_online_orders').select('id,business_date,member_id,quantity'),
        supabase!.from('daily_returns').select('id,business_date,member_id,menu_id,branch_id,quantity'),
        supabase!.from('member_daily_decisions').select('business_date,member_id,decision'),
        supabase!.from('app_settings').select('regular_rate,bonus_rate,bonus_every').eq('id',true).single(),
        roleName==='Owner' ? supabase!.from('profiles').select('user_id,full_name,email').eq('role','member').is('member_id',null).order('full_name') : Promise.resolve({data:[],error:null})
      ]);
      if(!alive)return;
      if(mr.error||menuR.error||br.error){setNotice('Gagal membaca katalog database: '+(mr.error||menuR.error||br.error)?.message);setAuthReady(true);return;}
      const memberRows=mr.data||[], menuRows=menuR.data||[], branchRows=br.data||[];
      if(roleName==='Owner'){if(profileR.error){setNotice('Gagal memuat akun member yang menunggu: '+profileR.error.message);}else{setPendingAccounts((profileR.data||[]) as any);}}
      const memberNames:Record<string,string>={}, menuNames:Record<string,string>={}, branchNames:Record<string,Branch>={}, branchIds:Record<string,string>={}, memberIds:Record<string,string>={};
      memberRows.forEach((m:any)=>{memberNames[m.id]=m.name;memberIds[m.name]=m.id;});
      menuRows.forEach((m:any)=>{menuNames[m.id]=m.name;});
      branchRows.forEach((b:any)=>{branchNames[b.id]=b.name;branchIds[b.name]=b.id;});
      setDbMemberIds(memberIds);setDbBranchIds(branchIds);setDbMenus(menuRows);
      setMembers(memberRows.map((m:any)=>({id:m.id,name:m.name,products:menuRows.filter((x:any)=>x.member_id===m.id).map((x:any)=>x.name)})));
      if(profile.member_id){const linked=memberRows.find((m:any)=>m.id===profile.member_id);if(linked)setMember(linked.name);if(roleName==='Member')setMemberLinked(true);}
      if(roleName==='Member'&&!profile.member_id){setNotice('Akun kamu belum dihubungkan ke data member. Hubungi Owner Bekal Pagi.');}
      const special:Record<string,number>={};memberRows.forEach((m:any)=>{if(m.special_rate!==null)special[m.name]=Number(m.special_rate);});setSpecialTariffs(special);
      const newDeliveries=(deliveryR.data||[]).map((x:any)=>({date:String(x.business_date).slice(0,10),member:memberNames[x.member_id],product:'',branch:branchNames[x.branch_id],qty:Number(x.quantity)})).filter((x:any)=>x.member&&x.branch);
      const newKeys=new Set(newDeliveries.map((x:any)=>`${x.member}:${x.date}`));
      const legacy=(entryR.data||[]).map((x:any)=>({date:String(x.business_date).slice(0,10),member:memberNames[x.member_id],product:menuNames[x.menu_id]||'',branch:x.channel==='online'?'Online':branchNames[x.branch_id],qty:Number(x.quantity)})).filter((x:any)=>x.member&&x.branch).filter((x:any)=>x.branch==='Online'||!newKeys.has(`${x.member}:${x.date}`));
      const onlineDeliveries=(onlineR.data||[]).map((x:any)=>({date:String(x.business_date).slice(0,10),member:memberNames[x.member_id],product:'',branch:'Online' as const,qty:Number(x.quantity)})).filter((x:any)=>x.member);
      const loadedEntries=[...newDeliveries,...onlineDeliveries,...legacy] as {date:string;member:string;product:string;branch:Branch|'Online';qty:number}[]; setIncomingHistory(loadedEntries);
      const today=getLocalDateKey(); const todayBranch:Record<string,string>={};
      newDeliveries.filter((x:any)=>x.date===today).forEach((x:any)=>{const m=memberRows.find((v:any)=>v.name===x.member);if(m)todayBranch[`${m.id}:${x.branch}`]=String(x.qty);});
      onlineDeliveries.filter((x:any)=>x.date===today).forEach((x:any)=>{const m=memberRows.find((v:any)=>v.name===x.member);if(m)todayBranch[`${m.id}:Online`]=String(x.qty);});
      setBranchDelivery(todayBranch);
      setReturns((returnR.data||[]).map((x:any,i:number)=>({id:i+1,date:String(x.business_date).slice(0,10),member:memberNames[x.member_id],product:menuNames[x.menu_id],branch:branchNames[x.branch_id],qty:Number(x.quantity)})).filter((x:any)=>x.member&&x.product&&x.branch));
      setMemberDecisions(Object.fromEntries((decisionR.data||[]).map((x:any)=>[`${String(x.business_date).slice(0,10)}:${memberNames[x.member_id]}`,x.decision==='sedekahkan'?'Sedekahkan':'Ambil Nanti'])));
      if(settingR.data){setUnitRate(String(settingR.data.regular_rate));setBonusRate(String(settingR.data.bonus_rate));setBonusEvery(String(settingR.data.bonus_every));}
      const payR=await supabase!.from('member_payments').select('member_id,business_date,amount,paid_at');
      if(payR.error){setPaymentReady(false);setNotice('Fitur pembayaran belum aktif. Jalankan supabase/payment-and-edit-migration.sql dahulu: '+payR.error.message);}
      else {setPayments((payR.data||[]).map((x:any)=>({...x,amount:Number(x.amount)})));setPaymentReady(true);}
      setAuthReady(true);
    }
    boot().catch(e=>{if(alive){setNotice('Gagal menghubungkan database: '+e.message);setAuthReady(true);}});
    return ()=>{alive=false;};
  },[router]);

  useEffect(()=>{
    // Sinkronkan segera setelah hydration agar tanggal SSR Cloudflare tidak tertinggal.
    setTodayKey(getLocalDateKey());
    const timer = setInterval(()=>setTodayKey(getLocalDateKey()),30000);
    return ()=>clearInterval(timer);
  },[]);
  useEffect(()=>{
    const values:Record<string,string>={};
    incomingHistory.filter(x=>x.date===todayKey&&x.product==='').forEach(x=>{
      const memberRow=members.find(v=>v.name===x.member);
      if(memberRow) values[`${memberRow.id}:${x.branch}`]=String(x.qty);
    });
    setBranchDelivery(values);
  },[todayKey,incomingHistory,members]);

  const getMemberDecision = (name:string) => memberDecisions[`${todayKey}:${name}`] || 'Menunggu keputusan';
  const saveMemberDecision = async (name:string,value:'Ambil Nanti'|'Sedekahkan'|'Menunggu keputusan') => {
    const key=`${todayKey}:${name}`;if(memberDecisions[key])return;
    const memberId=dbMemberIds[name];if(!supabase||!memberId){setNotice('Akun member belum terhubung ke data member.');return;}
    const {error}=await supabase!.from('member_daily_decisions').insert({member_id:memberId,business_date:todayKey,decision:value==='Sedekahkan'?'sedekahkan':'ambil_nanti'});
    if(error){setNotice('Keputusan belum tersimpan: '+error.message);return;}
    setMemberDecisions(prev=>({...prev,[key]:value}));setNotice('Keputusan berhasil disimpan dan dikunci untuk hari ini.');
  };

  const visibleMembers = members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.products.some(p=>p.toLowerCase().includes(search.toLowerCase())));
  const visibleIncomingMembers = members.map(m=>({...m,products:m.products.filter(p=>!search.trim() || m.name.toLowerCase().includes(search.toLowerCase()) || p.toLowerCase().includes(search.toLowerCase()))})).filter(m=>m.products.length>0);
  // Payment reports are derived ONLY from persisted Supabase history for today.  // Editable form state is deliberately excluded so prefill/UI state cannot be counted twice.
  const dashboardDate = getLocalDateKey();
  const todayEntries = incomingHistory.filter(x=>String(x.date).slice(0,10)===dashboardDate);
  const totalReturns = returns.filter(r=>String(r.date).slice(0,10)===dashboardDate).reduce((a,r)=>a+r.qty,0);
  const totalDelivery = todayEntries.reduce((a,r)=>a+r.qty,0);
  const memberStats = useMemo(()=>members.map(m=>{
    const memberEntries=todayEntries.filter(x=>x.member===m.name);
    const masukCabang=memberEntries.filter(x=>x.branch!=='Online').reduce((sum,x)=>sum+x.qty,0);
    const masukOnline=memberEntries.filter(x=>x.branch==='Online').reduce((sum,x)=>sum+x.qty,0);
    const masuk=masukCabang+masukOnline;
    const memberReturns=returns.filter(r=>r.member===m.name&&String(r.date).slice(0,10)===dashboardDate);
    const kembali=memberReturns.reduce((a,r)=>a+r.qty,0);
    const terjual=masuk-kembali;
    const paidUnits=Math.max(0,terjual);
    const hasSpecial=Object.prototype.hasOwnProperty.call(specialTariffs,m.name);
    const appliedRate=hasSpecial?specialTariffs[m.name]:(Number(unitRate)||0);
    const bonus=hasSpecial?0:Math.floor(paidUnits/Math.max(1,Number(bonusEvery)||5))*(Number(bonusRate)||0);
    const earned=paidUnits*appliedRate+bonus;
    return {...m,masuk,masukCabang,masukOnline,kembali,terjual,bonus,earned,appliedRate,hasSpecial};
  }),[members,incomingHistory,returns,unitRate,bonusRate,bonusEvery,specialTariffs,todayKey]);

  const paidKeys = useMemo(()=>new Set(payments.map(p=>`${p.member_id}:${p.business_date}`)),[payments]);
  const dailyDue = useMemo(()=>{
    const keys=new Set([...incomingHistory.map(x=>`${x.member}:${x.date}`),...returns.map(x=>`${x.member}:${x.date}`)]);
    return [...keys].map(k=>{
      const ix=k.lastIndexOf(':');const name=k.slice(0,ix),date=k.slice(ix+1);
      const memberId=dbMemberIds[name];
      const inc=incomingHistory.filter(x=>x.member===name&&x.date===date).reduce((a,x)=>a+x.qty,0);
      const ret=returns.filter(x=>x.member===name&&x.date===date).reduce((a,x)=>a+x.qty,0);
      const sold=Math.max(0,inc-ret);
      const special=Object.prototype.hasOwnProperty.call(specialTariffs,name);
      const amount=sold*(special?specialTariffs[name]:Number(unitRate)||0)+(special?0:Math.floor(sold/Math.max(1,Number(bonusEvery)||5))*(Number(bonusRate)||0));
      return {name,date,memberId,sold,amount,paid:paidKeys.has(`${memberId}:${date}`)};
    }).filter(x=>x.memberId&&x.amount>0);
  },[incomingHistory,returns,dbMemberIds,specialTariffs,unitRate,bonusRate,bonusEvery,paidKeys]);
  const outstanding=dailyDue.filter(x=>!x.paid);
  const outstandingTotal=outstanding.reduce((a,x)=>a+x.amount,0);
  const paidTodayMember=paidKeys.has(`${dbMemberIds[member]}:${todayKey}`);
  async function refreshPayments(){
    const {data,error}=await supabase!.from('member_payments').select('member_id,business_date,amount,paid_at');
    if(error){setNotice('Gagal memuat pembayaran: '+error.message);return;}
    setPayments((data||[]).map((x:any)=>({...x,amount:Number(x.amount)})));
  }
  async function payAll(){
    if(!paymentReady||paymentBusy||!outstanding.length)return;
    if(!window.confirm(`Tandai lunas ${outstanding.length} tagihan dari ${new Set(outstanding.map(x=>x.memberId)).size} member?\nPerkiraan total: ${idr(outstandingTotal)}\nPastikan uang benar-benar sudah ditransfer.`))return;
    setPaymentBusy(true);
    const {data,error}=await supabase!.rpc('pay_all_outstanding');
    if(error)setNotice('Gagal bayar semua: '+error.message);
    else {await refreshPayments();const result=Array.isArray(data)?data[0]:data;setNotice(`Berhasil mencatat ${result?.payment_count||0} tagihan lunas, total ${idr(Number(result?.total_amount||0))}.`);}
    setPaymentBusy(false);
  }
  async function loadEditRows(name=editMember,date=editDate){
    const memberId=dbMemberIds[name];if(!memberId)return setEditRows([]);
    setEditLoading(true);
    const [a,b]=await Promise.all([
      supabase!.from('daily_item_entries').select('id,menu_id,branch_id,channel,quantity').eq('member_id',memberId).eq('business_date',date),
      supabase!.from('daily_returns').select('id,menu_id,branch_id,quantity').eq('member_id',memberId).eq('business_date',date)
    ]);
    if(a.error||b.error)setNotice('Gagal membaca transaksi: '+(a.error||b.error)?.message);
    else setEditRows([...(a.data||[]).map((x:any)=>({id:x.id,kind:'daily_item_entries',product:dbMenus.find(m=>m.id===x.menu_id)?.name||'-',branch:x.channel==='online'?'Online':Object.keys(dbBranchIds).find(k=>dbBranchIds[k]===x.branch_id)||'-',quantity:x.quantity})),...(b.data||[]).map((x:any)=>({id:x.id,kind:'daily_returns',product:dbMenus.find(m=>m.id===x.menu_id)?.name||'-',branch:Object.keys(dbBranchIds).find(k=>dbBranchIds[k]===x.branch_id)||'-',quantity:x.quantity}))]);
    setEditLoading(false);
  }
  async function saveEdit(row:{id:string;kind:string;quantity:number}){
    if(!paymentReady||paidKeys.has(`${dbMemberIds[editMember]}:${editDate}`)){setNotice('Transaksi sudah lunas atau fitur pembayaran belum aktif.');return;}
    if(!Number.isInteger(row.quantity)||row.quantity<0){setNotice('Jumlah harus bilangan bulat >= 0.');return;}
    setEditLoading(true);
    const {error}=await supabase!.rpc('correct_member_transaction',{p_table:row.kind,p_id:row.id,p_quantity:row.quantity});
    if(error)setNotice('Gagal mengoreksi: '+error.message);
    else {
      const [a,b]=await Promise.all([supabase!.from('daily_item_entries').select('business_date,member_id,menu_id,branch_id,channel,quantity'),supabase!.from('daily_returns').select('id,business_date,member_id,menu_id,branch_id,quantity')]);
      if(a.error||b.error)setNotice('Perubahan tersimpan, tetapi gagal memuat ulang rekap. Segarkan halaman.');
      else {
        const names=Object.fromEntries(Object.entries(dbMemberIds).map(([n,id])=>[id,n]));
        const menus=Object.fromEntries(dbMenus.map(x=>[x.id,x.name]));
        const br=Object.fromEntries(Object.entries(dbBranchIds).map(([n,id])=>[id,n]));
        setIncomingHistory((a.data||[]).map((x:any)=>({date:x.business_date,member:names[x.member_id],product:menus[x.menu_id],branch:(x.channel==='online'?'Online':br[x.branch_id]) as Branch|'Online',qty:Number(x.quantity)})).filter((x:any)=>x.member&&x.product&&x.branch));
        setReturns((b.data||[]).map((x:any,i:number)=>({id:i+1,date:x.business_date,member:names[x.member_id],product:menus[x.menu_id],branch:br[x.branch_id] as Branch,qty:Number(x.quantity)})).filter((x:any)=>x.member&&x.product&&x.branch));
        setNotice('Koreksi berhasil disimpan. Rekap dan hak pembayaran diperbarui.');
      }
      await loadEditRows();
    }
    setEditLoading(false);
  }
  function submitReturns(){
    const inputBranches:Branch[] = role==='Staff'?[branch]:branches;
    const items = members.flatMap(m=>m.products.flatMap(p=>inputBranches.map(b=>({member:m.name,product:p,branch:b,qty:Number(returnQty[`${m.id}:${p}:${b}`]||0)})))).filter(x=>x.qty>0);
    const overages = members.map(m=>{
      const added=items.filter(x=>x.member===m.name).reduce((a,x)=>a+x.qty,0);
      const previous=returns.filter(r=>r.member===m.name && inputBranches.includes(r.branch) && (!r.date||r.date===todayKey)).reduce((a,r)=>a+r.qty,0);
      const brought=inputBranches.reduce((sum,b)=>sum+(Number(branchDelivery[`${m.id}:${b}`])||0),0);
      return {name:m.name,total:previous+added,brought,diff:previous+added-brought};
    }).filter(x=>x.diff>0);
    if(overages.length){setNotice(`Retur melebihi barang masuk ${role==='Staff'?`cabang ${branch}`:'cabang yang dipilih'}: ${overages.map(x=>`${x.name} (${x.total} retur / ${x.brought} bawaan, selisih ${x.diff})`).join('; ')}. Periksa atau konfirmasi jika data benar.`);setShowConfirm(true);return;}
    saveReturnItems(items);
  }
  async function saveReturnItems(items:{member:string;product:string;branch:Branch;qty:number}[]){
    if(!supabase){setNotice('Supabase belum terkonfigurasi.');return;}
    const menuByKey=new Map(dbMenus.map(m=>[`${m.member_id}:${m.name}`,m.id]));
    const rows=items.map(x=>({business_date:todayKey,member_id:dbMemberIds[x.member],menu_id:menuByKey.get(`${dbMemberIds[x.member]}:${x.product}`),branch_id:dbBranchIds[x.branch],quantity:x.qty})).filter(x=>x.menu_id&&x.branch_id);
    if(!rows.length){setNotice('Tidak ada data retur valid untuk disimpan.');return;}
    const {error}=await supabase!.from('daily_returns').insert(rows);if(error){setNotice('Gagal menyimpan retur: '+error.message);return;}
    setReturns(prev=>[...prev,...items.map((x,i)=>({id:Date.now()+i,date:todayKey,...x}))]);
    setReturnQty({});setShowConfirm(false);setNotice('Barang kembali berhasil disimpan ke Supabase.');
  }
  function confirmOverReturn(){
    const inputBranches:Branch[] = role==='Staff'?[branch]:branches;
    const items = members.flatMap(m=>m.products.flatMap(p=>inputBranches.map(b=>({member:m.name,product:p,branch:b,qty:Number(returnQty[`${m.id}:${p}:${b}`]||0)})))).filter(x=>x.qty>0);
    saveReturnItems(items);
  }


  const nav = [
    {name:'Dashboard',icon:Home,roles:['Owner','Admin','Staff','Member']},
    {name:'Input Barang Masuk',icon:ArrowDownToLine,roles:['Owner','Admin']},
    {name:'Input Barang Kembali',icon:ArrowUpRight,roles:['Owner','Admin','Staff']},
    {name:'Data Member & Menu',icon:Users,roles:['Owner','Admin']},
    {name:'Rekap Pembayaran',icon:Wallet,roles:['Owner','Admin','Member']},
    {name:'Monitoring Member',icon:Activity,roles:['Owner']},
    {name:'Edit Rekapan',icon:ClipboardList,roles:['Owner','Admin']},
    {name:'Laporan',icon:ClipboardList,roles:['Owner','Admin']},
    {name:'Pengaturan',icon:Settings,roles:['Owner']}
  ].filter(n=>n.roles.includes(role));

  if(!authReady)return <main className="login-page"><div className="login-card"><b>BEKAL PAGI MOBILE</b><p>Menghubungkan database...</p></div></main>;
  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><img className="brand-logo" src="/bekal-pagi-logo.jpg" alt="Logo Bekal Pagi"/><div><b>BEKAL PAGI MOBILE</b><small>Member · Operasional</small></div></div>
      <div className="side-label">MENU UTAMA</div>
      <nav>{nav.map(n=><button key={n.name} className={`nav-item ${page===n.name?'active':''}`} onClick={()=>{setPage(n.name);setNotice('')}}><n.icon size={18}/><span>{n.name}</span></button>)}</nav>
      <div className="sidebar-bottom"><div className="secure"><ShieldCheck size={17}/><span>Data operasional terlindungi</span></div><button className="nav-item" onClick={async()=>{await supabase?.auth.signOut();router.replace('/login')}}><LogOut size={18}/>Keluar</button></div>
    </aside>
    <section className="main-area">
      <header className="topbar"><div><div className="eyebrow">BEKAL PAGI MATARAM</div><h1>{page}</h1></div><div className="top-actions"><div className="role-switch"><span>Akses</span><b>{role}</b></div><button className="icon-btn" aria-label="Notifikasi"><Bell size={19}/><i/></button><div className="avatar">{role==='Owner'?'O':role==='Admin'?'A':role==='Staff'?'S':'W'}</div></div></header>
      {notice&&<div className="notice"><Check size={17}/><span>{notice}</span><button onClick={()=>setNotice('')}><X size={16}/></button></div>}
      {role==='Member'&&!memberLinked&&<div className="panel pending-link-notice"><h2>Akun menunggu dihubungkan</h2><p>Akun kamu sudah terdaftar, tetapi Owner belum memasangkannya dengan data member Bekal Pagi. Data transaksi belum ditampilkan agar tidak tertukar dengan member lain.</p><button className="outline-button" onClick={async()=>{await supabase?.auth.signOut();router.replace('/login')}}>Keluar</button></div>}
      {page==='Dashboard'&&role==='Owner'&&<>
        <div className="welcome-row"><div><h2>Selamat datang, Owner!</h2><p>Pantau seluruh operasional dan kewajiban pembayaran Bekal Pagi.</p></div><div className="date-pill">{formatLocalDateKey(todayKey)}</div></div>
        <div className="stats-grid">
          <Stat icon={<Users/>} label="Member terdaftar" value={`${members.length}`} sub="Seluruh member aktif"/>
          <Stat icon={<Package/>} label="Barang masuk" value={`${totalDelivery} porsi`} sub="Total input hari ini"/>
          <Stat icon={<ArrowUpRight/>} label="Barang kembali" value={`${totalReturns} porsi`} sub="Gabungan 4 cabang"/>
          <Stat icon={<Activity/>} label="Estimasi terjual" value={`${totalDelivery-totalReturns} porsi`} sub="Masuk dikurangi retur"/>
        </div>
        <div className="content-grid">
          <div className="panel"><div className="panel-head"><div><h3>Retur berdasarkan cabang</h3><p>Jumlah barang kembali hari ini</p></div><button className="text-button" onClick={()=>setPage('Input Barang Kembali')}>Input retur <ArrowUpRight size={15}/></button></div><div className="branch-list">{branches.map(b=><div className="branch-row" key={b}><div className="branch-icon"><Store size={18}/></div><div className="branch-name"><b>{b}</b><small>{returns.filter(r=>r.branch===b&&String(r.date).slice(0,10)===dashboardDate).length} catatan menu</small></div><strong>{returns.filter(r=>r.branch===b&&String(r.date).slice(0,10)===dashboardDate).reduce((a,r)=>a+r.qty,0)} <small>porsi</small></strong></div>)}</div></div>
          <div className="panel"><div className="panel-head"><div><h3>Ringkasan pembayaran</h3><p>Hak member dan kewajiban perusahaan</p></div><CircleDollarSign size={20} className="muted-icon"/></div><div className="money-total">{idr(memberStats.reduce((a,m)=>a+m.earned,0))}</div><div className="money-foot"><span>Total hak seluruh member</span><b>{idr(memberStats.reduce((a,m)=>a+m.earned,0))}</b></div><button className="outline-button full" onClick={()=>setPage('Rekap Pembayaran')}>Lihat rekap pembayaran</button></div>
        </div>
        <div className="panel table-panel"><div className="panel-head"><div><h3>Keputusan member atas barang kembali</h3><p>Satu keputusan untuk seluruh jumlah barang kembali milik masing-masing member. Reset otomatis setiap hari.</p></div></div><div className="decision-owner-list">{members.map(m=><div className="decision-owner-row" key={m.id}><div><b>{m.name}</b><small>{returns.filter(r=>r.member===m.name&&r.date===todayKey).reduce((sum,r)=>sum+r.qty,0)} porsi kembali · keputusan untuk seluruh menu</small></div><span className={`decision-status ${getMemberDecision(m.name)==='Sedekahkan'?'donate':getMemberDecision(m.name)==='Ambil Nanti'?'pickup':'pending'}`}>{getMemberDecision(m.name)}</span></div>)}</div></div>
        <div className="panel table-panel"><div className="panel-head"><div><h3>Aktivitas member</h3><p>Ringkasan barang masuk dan kembali</p></div><button className="text-button" onClick={()=>setPage('Laporan')}>Lihat laporan <ArrowUpRight size={15}/></button></div><MemberTable rows={memberStats.slice(0,5)} showMoney={false}/></div>
      </>}      {page==='Dashboard'&&role==='Admin'&&<>
        <div className="welcome-row"><div><h2>Dashboard Admin</h2><p>Kelola pencatatan barang dan data member hari ini.</p></div><div className="date-pill">{formatLocalDateKey(todayKey)}</div></div>
        <div className="stats-grid">
          <Stat icon={<Users/>} label="Member aktif" value={`${members.length}`} sub="Daftar member Bekal Pagi"/>
          <Stat icon={<Package/>} label="Barang masuk" value={`${totalDelivery} porsi`} sub="Total seluruh member"/>
          <Stat icon={<ArrowUpRight/>} label="Barang kembali" value={`${totalReturns} porsi`} sub="Dari 4 cabang"/>
          <Stat icon={<Activity/>} label="Estimasi terjual" value={`${totalDelivery-totalReturns} porsi`} sub="Masuk dikurangi retur"/>
        </div>
        <div className="content-grid"><div className="panel"><div className="panel-head"><div><h3>Input barang</h3><p>Pilih pekerjaan yang ingin dilakukan.</p></div></div><button className="primary-btn" onClick={()=>setPage('Input Barang Masuk')}>Input barang masuk</button><button className="outline-button full" onClick={()=>setPage('Input Barang Kembali')}>Input barang kembali</button></div><div className="panel"><div className="panel-head"><div><h3>Retur per cabang</h3><p>Ringkasan operasional, tanpa rincian keuangan.</p></div></div><div className="branch-list">{branches.map(b=><div className="branch-row" key={b}><div className="branch-icon"><Store size={18}/></div><div className="branch-name"><b>{b}</b><small>{returns.filter(r=>r.branch===b&&String(r.date).slice(0,10)===dashboardDate).length} catatan menu</small></div><strong>{returns.filter(r=>r.branch===b&&String(r.date).slice(0,10)===dashboardDate).reduce((a,r)=>a+r.qty,0)} <small>porsi</small></strong></div>)}</div></div></div>
      </>}
      {page==='Dashboard'&&role==='Staff'&&<>
        <div className="welcome-row"><div><h2>Dashboard Staff</h2><p>Fokus pada pencatatan barang kembali di cabang.</p></div><div className="date-pill">{formatLocalDateKey(todayKey)}</div></div>
        <div className="stats-grid">
          <Stat icon={<Store/>} label="Cabang" value="4" sub="Pilih cabang saat input retur"/>
          <Stat icon={<Boxes/>} label="Menu tersedia" value={`${members.reduce((a,m)=>a+m.products.length,0)}`} sub="Daftar menu seluruh member"/>
          <Stat icon={<ArrowUpRight/>} label="Barang kembali" value={`${totalReturns} porsi`} sub="Total retur hari ini"/>
          <Stat icon={<ClipboardList/>} label="Catatan retur" value={`${returns.length}`} sub="Detail menu yang tercatat"/>
        </div>
        <div className="panel"><div className="panel-head"><div><h3>Mulai input barang kembali</h3><p>Pilih cabang, isi jumlah retur setiap menu, lalu konfirmasi.</p></div></div><button className="primary-btn" onClick={()=>setPage('Input Barang Kembali')}>Input barang kembali</button></div>
        <div className="panel table-panel"><div className="panel-head"><div><h3>Retur per cabang</h3><p>Ringkasan jumlah barang kembali.</p></div></div><div className="branch-list">{branches.map(b=><div className="branch-row" key={b}><div className="branch-icon"><Store size={18}/></div><div className="branch-name"><b>{b}</b><small>{returns.filter(r=>r.branch===b&&String(r.date).slice(0,10)===dashboardDate).length} catatan menu</small></div><strong>{returns.filter(r=>r.branch===b&&String(r.date).slice(0,10)===dashboardDate).reduce((a,r)=>a+r.qty,0)} <small>porsi</small></strong></div>)}</div></div>
      </>}
      {page==='Dashboard'&&role==='Member'&&memberLinked&&<div className="member-home"><div className="member-greeting"><div><span>HALO, MEMBER BEKAL PAGI</span><h2>{member} 👋</h2><p>Ini ringkasan barang dan pembayaran kamu hari ini.</p></div><div className="member-date">{new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div></div><MemberPortal name={member} returns={returns.filter(r=>r.member===member)} stats={memberStats.find(m=>m.name===member)!} members={members} incomingHistory={incomingHistory.filter(r=>r.member===member)} allReturns={returns.filter(r=>r.member===member)} unitRate={unitRate} bonusRate={bonusRate} bonusEvery={bonusEvery} specialTariffs={specialTariffs} decision={getMemberDecision(member)} setDecision={(value:any)=>saveMemberDecision(member,value)}/></div>}

      {page==='Input Barang Masuk'&&<div className="panel"><div className="panel-head"><div><h3>Input barang masuk per member & cabang</h3><p>Catat total barang yang dibawa setiap member ke masing-masing cabang.</p></div><span className="tag">Owner / Admin</span></div><div className="search-box"><Search size={17}/><input placeholder="Cari nama member..." value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<button type="button" className="search-clear" onClick={()=>setSearch('')} aria-label="Hapus pencarian">×</button>}</div><div className="helper">Satu baris untuk satu member. Isi jumlah total per cabang, bukan per menu. Rincian menu tetap dicatat saat input barang kembali.</div><div className="menu-incoming-list"><div className="menu-incoming-head"><span>Nama member</span>{branches.map(b=><span key={b}>{b}</span>)}<span>Online</span><span>Total</span></div>{visibleIncomingMembers.map(m=><div className="menu-incoming-row" key={m.id}><b>{m.name}</b>{branches.map(b=><input key={b} aria-label={`${m.name} ${b}`} type="number" min="0" step="1" placeholder="0" value={branchDelivery[`${m.id}:${b}`]||''} onChange={e=>setBranchDelivery(d=>({...d,[`${m.id}:${b}`]:e.target.value}))}/>)}<input aria-label={`${m.name} Online`} type="number" min="0" step="1" placeholder="0" value={branchDelivery[`${m.id}:Online`]||''} onChange={e=>setBranchDelivery(d=>({...d,[`${m.id}:Online`]:e.target.value}))}/><strong>{branches.reduce((sum,b)=>sum+(Number(branchDelivery[`${m.id}:${b}`])||0),0)+(Number(branchDelivery[`${m.id}:Online`])||0)}</strong></div>)}</div><div className="helper">Total bawaan: <b>{members.reduce((sum,m)=>sum+branches.reduce((v,b)=>v+(Number(branchDelivery[`${m.id}:${b}`])||0),0)+(Number(branchDelivery[`${m.id}:Online`])||0),0)} porsi</b>.</div><button className="primary-btn" onClick={async()=>{
  const date=getLocalDateKey();
  if(!supabase){setNotice('Supabase belum terkonfigurasi.');return;}
  const memberIds=members.map(m=>dbMemberIds[m.name]).filter(Boolean);
  const branchRows=members.flatMap(m=>branches.map(b=>({business_date:date,member_id:dbMemberIds[m.name],branch_id:dbBranchIds[b],quantity:Number(branchDelivery[`${m.id}:${b}`])||0}))).filter(x=>x.member_id&&x.branch_id);
  const onlineRows=members.map(m=>({business_date:date,member_id:dbMemberIds[m.name],quantity:Number(branchDelivery[`${m.id}:Online`])||0})).filter(x=>x.member_id);
  if(!branchRows.some(x=>x.quantity>0)&&!onlineRows.some(x=>x.quantity>0)){setNotice('Isi minimal satu jumlah barang sebelum menyimpan.');return;}
  const [branchDelete,onlineDelete]=await Promise.all([
    supabase!.from('daily_member_deliveries').delete().eq('business_date',date).in('member_id',memberIds),
    supabase!.from('daily_member_online_orders').delete().eq('business_date',date).in('member_id',memberIds)
  ]);
  if(branchDelete.error||onlineDelete.error){setNotice('Gagal memperbarui bawaan: '+(branchDelete.error||onlineDelete.error)?.message);return;}
  const [branchInsert,onlineInsert]=await Promise.all([
    supabase!.from('daily_member_deliveries').insert(branchRows.filter(x=>x.quantity>0)),
    supabase!.from('daily_member_online_orders').insert(onlineRows.filter(x=>x.quantity>0))
  ]);
  if(branchInsert.error||onlineInsert.error){setNotice('Gagal menyimpan bawaan: '+(branchInsert.error||onlineInsert.error)?.message);return;}
  const [deliveryData,onlineData]=await Promise.all([
    supabase!.from('daily_member_deliveries').select('business_date,member_id,branch_id,quantity'),
    supabase!.from('daily_member_online_orders').select('business_date,member_id,quantity')
  ]);
  if(deliveryData.error||onlineData.error){setNotice('Bawaan tersimpan tetapi gagal memuat ulang: '+(deliveryData.error||onlineData.error)?.message);return;}
  const names=Object.fromEntries(Object.entries(dbMemberIds).map(([n,id])=>[id,n]));
  const br=Object.fromEntries(Object.entries(dbBranchIds).map(([n,id])=>[id,n]));
  const newRows=(deliveryData.data||[]).map((x:any)=>({date:x.business_date,member:names[x.member_id],product:'',branch:br[x.branch_id] as Branch,qty:Number(x.quantity)})).filter((x:any)=>x.member&&x.branch);
  const onlineHistory=(onlineData.data||[]).map((x:any)=>({date:x.business_date,member:names[x.member_id],product:'',branch:'Online' as const,qty:Number(x.quantity)})).filter((x:any)=>x.member);
  const oldRows=incomingHistory.filter(x=>x.product!==''&&!newRows.some(n=>n.member===x.member&&n.date===x.date));
  setIncomingHistory([...oldRows,...newRows,...onlineHistory]);
  setNotice('Barang masuk cabang dan Online berhasil disimpan.');
}}>Simpan / Perbarui barang masuk</button></div>}
      {page==='Input Barang Kembali'&&<div className="panel"><div className="panel-head"><div><h3>{role==='Staff'?'Input barang kembali':'Input barang kembali per member & menu'}</h3><p>{role==='Staff'?'Pilih cabang tempat kamu bertugas, lalu isi jumlah barang yang kembali.':'Isi jumlah retur untuk 4 cabang sekaligus, dikelompokkan berdasarkan pemilik menu.'}</p></div><span className="tag">{role==='Staff'?'Staff':'Owner / Admin'}</span></div>{role==='Staff'&&<div className="staff-branch-picker"><label htmlFor="staff-return-branch">PILIH CABANG</label><select id="staff-return-branch" value={branch} onChange={e=>{setBranch(e.target.value as Branch);setReturnQty({});setNotice('')}}>{branches.map(b=><option key={b} value={b}>{b}</option>)}</select><p>Pastikan cabang sudah benar sebelum memasukkan jumlah barang kembali.</p></div>}<div className="search-box"><Search size={17}/><input placeholder="Cari nama member atau menu..." value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="helper"><b>{role==='Staff'?`Daftar menu untuk retur cabang ${branch}`:'Daftar menu seluruh member'}</b><br/>{role==='Staff'?'Isi jumlah barang yang benar-benar kembali di cabang yang dipilih. Menu lain tidak perlu diisi jika tidak ada retur.':'Setiap menu terhubung dengan pemiliknya. Isi jumlah barang kembali di cabang terkait; kosongkan atau isi 0 jika tidak ada retur.'}</div><div className="return-branch-grid">{role==='Staff'?<><div className="return-branch-head staff-return-head"><span>Member & menu</span><span>{branch}</span></div>{visibleMembers.map(m=><section className="return-member-group" key={m.id}><div className="return-member-title">{m.name}</div>{m.products.map(p=><div className="return-branch-line staff-return-line" key={`${m.id}:${p}`}><div className="return-product-name"><b>{p}</b></div><input aria-label={`${m.name} ${p} ${branch}`} type="number" min="0" placeholder="0" value={returnQty[`${m.id}:${p}:${branch}`]||''} onChange={e=>setReturnQty(q=>({...q,[`${m.id}:${p}:${branch}`]:e.target.value}))}/></div>)}</section>)}</>:<><div className="return-branch-head"><span>Member & menu</span>{branches.map(b=><span key={b}>{b}</span>)}</div>{visibleMembers.map(m=><section className="return-member-group" key={m.id}><div className="return-member-title">{m.name}</div>{m.products.map(p=><div className="return-branch-line" key={`${m.id}:${p}`}><div className="return-product-name"><b>{p}</b></div>{branches.map(b=><input key={b} aria-label={`${m.name} ${p} ${b}`} type="number" min="0" placeholder="0" value={returnQty[`${m.id}:${p}:${b}`]||''} onChange={e=>setReturnQty(q=>({...q,[`${m.id}:${p}:${b}`]:e.target.value}))}/>)}</div>)}</section>)}</>}</div><div className="return-total"><span>{role==='Staff'?`Total barang kembali cabang ${branch}`:'Total barang kembali seluruh cabang'}</span><b>{members.reduce((a,m)=>a+m.products.reduce((sum,p)=>sum+(role==='Staff'?(Number(returnQty[`${m.id}:${p}:${branch}`])||0):branches.reduce((v,b)=>v+(Number(returnQty[`${m.id}:${p}:${b}`])||0),0)),0),0)} porsi</b></div><button className="primary-btn" onClick={submitReturns}>Konfirmasi barang kembali</button></div>}
      {page==='Monitoring Member'&&role==='Owner'&&(()=>{
        const selected=members.find(m=>m.id===monitorMemberId)||members[0];
        const selectedName=selected?.name||'';
        const rows=incomingHistory.filter(x=>x.member===selectedName);
        const returnRows=returns.filter(x=>x.member===selectedName);
        const dates=[...new Set([...rows.map(x=>x.date),...returnRows.map(x=>x.date)])].sort((a,b)=>b.localeCompare(a));
        const special=Object.prototype.hasOwnProperty.call(specialTariffs,selectedName);
        const rate=special?specialTariffs[selectedName]:(Number(unitRate)||0);
        const daily=dates.map(date=>{
          const incoming=rows.filter(x=>x.date===date);
          const returned=returnRows.filter(x=>x.date===date);
          const brought=incoming.reduce((a,x)=>a+x.qty,0);
          const back=returned.reduce((a,x)=>a+x.qty,0);
          const sold=Math.max(0,brought-back);
          const bonus=special?0:Math.floor(sold/Math.max(1,Number(bonusEvery)||5))*(Number(bonusRate)||0);
          return {date,brought,back,sold,earned:sold*rate+bonus,incoming,returned,bonus};
        });
        const today=daily.find(x=>x.date===todayKey)||{brought:0,back:0,sold:0,earned:0,bonus:0,incoming:[],returned:[]};
        return <><div className="panel"><div className="panel-head"><div><h3>Pantau penjualan member</h3><p>Pilih satu member untuk melihat barang masuk, retur, estimasi terjual, dan hak pembayaran. Hanya Owner yang dapat melihat halaman ini.</p></div><span className="tag">Khusus Owner</span></div><div className="monitor-picker"><label htmlFor="monitor-member">Pilih member</label><select id="monitor-member" value={selected?.id||''} onChange={e=>setMonitorMemberId(e.target.value)}><option value="">Pilih member</option>{members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></div>{selected&&<><div className="monitor-member-heading"><h2>{selectedName}</h2><p>{special?`Tarif khusus ${idr(rate)} per item · tanpa bonus`:`Tarif umum ${idr(rate)} per item · bonus ${idr(Number(bonusRate)||0)} setiap ${bonusEvery} item terjual per hari`}</p></div><div className="stats-grid"><Stat icon={<Package/>} label="Barang masuk hari ini" value={`${today.brought} porsi`} sub="Cabang + online"/><Stat icon={<ArrowUpRight/>} label="Barang kembali hari ini" value={`${today.back} porsi`} sub="Seluruh cabang"/><Stat icon={<Activity/>} label="Estimasi terjual hari ini" value={`${today.sold} porsi`} sub="Masuk dikurangi retur"/><Stat icon={<Wallet/>} label="Hak member hari ini" value={idr(today.earned)} sub={special?'Tanpa bonus':`Termasuk bonus ${idr(today.bonus)}`}/></div><div className="panel monitor-history"><div className="panel-head"><div><h3>Riwayat penjualan per hari</h3><p>Rincian barang masuk dan kembali berdasarkan tanggal.</p></div></div>{daily.length===0?<div className="empty monitor-empty">Belum ada transaksi untuk member ini.</div>:daily.map(day=><div className="monitor-day" key={day.date}><div className="monitor-day-head"><b>{new Date(`${day.date}T00:00:00`).toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</b><strong>{day.sold} terjual · {idr(day.earned)}</strong></div><div className="monitor-detail-row"><span>Barang masuk</span><b>{day.brought} porsi</b></div><div className="monitor-detail-row"><span>Barang kembali</span><b>{day.back} porsi</b></div><div className="monitor-detail-row"><span>Estimasi terjual</span><b>{day.sold} porsi</b></div>{day.incoming.length>0&&<div className="monitor-product-list"><b>Barang masuk per menu</b>{[...new Set(day.incoming.map(x=>x.product))].map(product=><div className="monitor-detail-row" key={product}><span>{product}</span><b>{day.incoming.filter(x=>x.product===product).reduce((a,x)=>a+x.qty,0)} porsi</b></div>)}</div>}{day.returned.length>0&&<div className="monitor-product-list"><b>Retur per menu</b>{[...new Set(day.returned.map(x=>x.product))].map(product=><div className="monitor-detail-row" key={product}><span>{product}</span><b>{day.returned.filter(x=>x.product===product).reduce((a,x)=>a+x.qty,0)} porsi</b></div>)}</div>}</div>)}</div></>}</div></>;
      })()}
      {page==='Data Member & Menu'&&<><div className="panel account-link-panel"><div className="panel-head"><div><h3>Akun member menunggu dihubungkan</h3><p>Hanya akun yang belum terhubung dan data member yang belum memiliki akun yang ditampilkan.</p></div><span className="tag">{pendingAccounts.length} menunggu</span></div>{pendingAccounts.length===0?<div className="empty">Belum ada akun member yang menunggu persetujuan.</div>:<div className="pending-account-list">{pendingAccounts.map(account=><div className="pending-account-row" key={account.user_id}><div className="pending-account-info"><b>{account.full_name||'Nama belum diisi'}</b><small>{account.email||'Email tidak tersedia'}</small><small>ID akun: {account.user_id.slice(0,8)}…</small></div><select aria-label={`Pilih data member untuk ${account.full_name}`} value={linkSelections[account.user_id]||''} onChange={e=>setLinkSelections(prev=>({...prev,[account.user_id]:e.target.value}))}><option value="">Pilih data member yang sesuai</option>{members.filter(m=>!Object.values(linkSelections).includes(m.id) || linkSelections[account.user_id]===m.id).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select><button className="primary-small" disabled={!linkSelections[account.user_id]||linkingUserId===account.user_id} onClick={async()=>{const memberId=linkSelections[account.user_id];if(!supabase||!memberId)return;setLinkingUserId(account.user_id);const {data,error}=await supabase!.from('profiles').update({member_id:memberId}).eq('user_id',account.user_id).is('member_id',null).select('user_id').maybeSingle();setLinkingUserId(null);if(error){setNotice('Gagal menghubungkan akun: '+error.message);return;}if(!data){setNotice('Akun ini sudah dihubungkan sebelumnya. Muat ulang halaman untuk melihat status terbaru.');return;}setPendingAccounts(prev=>prev.filter(x=>x.user_id!==account.user_id));setLinkSelections(prev=>{const next={...prev};delete next[account.user_id];return next;});setNotice(`Akun ${account.full_name} berhasil dihubungkan. Member sekarang dapat login untuk melihat data miliknya.`);}}>{linkingUserId===account.user_id?'Menghubungkan…':'Hubungkan akun'}</button></div>)}</div>}</div><div className="panel"><div className="panel-head"><div><h3>Data member & menu</h3><p>Owner/Admin dapat menambahkan menu langsung ke member. Jumlah menu fleksibel, tanpa batas per member.</p></div><button className="primary-small" onClick={async()=>{
  const name=newMemberName.trim();
  if(!name){setNotice('Masukkan nama member terlebih dahulu.');return;}
  if(members.some(m=>m.name.toLowerCase()===name.toLowerCase())){setNotice('Nama member sudah ada.');return;}
  const {data,error}=await supabase!.from('members').insert({name,active:true}).select('id,name').single();
  if(error){setNotice('Gagal menambah member: '+error.message);return;}
  setMembers(prev=>[...prev,{id:data.id,name:data.name,products:[]}].sort((a,b)=>a.name.localeCompare(b.name)));
  setDbMemberIds(prev=>({...prev,[data.name]:data.id}));
  setMember(data.name);setSpecialMember(data.name);setNewMemberName('');
  setNotice(`Member ${data.name} berhasil ditambahkan.`);
}}>+ Tambah member</button></div><div className="settings-custom-grid"><label>Nama member baru<input value={newMemberName} onChange={e=>setNewMemberName(e.target.value)} placeholder="Masukkan nama member"/></label></div><div className="owner-add-menu"><h3>Tambah menu baru untuk member</h3><div className="settings-custom-grid"><label>Pilih member<select value={member} onChange={e=>setMember(e.target.value)}>{members.map(m=><option key={m.id}>{m.name}</option>)}</select></label><label>Nama menu baru<input value={newMenuName} onChange={e=>setNewMenuName(e.target.value)} placeholder="Contoh: Risol Mayo"/></label></div><div className="helper">Menu langsung ditambahkan ke daftar member setelah Owner/Admin menekan tombol. Pastikan jumlah menu belum mencapai batas aktif.</div><button className="primary-btn" disabled={!newMenuName.trim()||!members.find(m=>m.name===member)||members.find(m=>m.name===member)!.products.some(p=>p.toLowerCase()===newMenuName.trim().toLowerCase())} onClick={async()=>{const mid=dbMemberIds[member];if(!supabase||!mid){setNotice('Member belum ditemukan di database.');return;}const menuName=newMenuName.trim();const {data,error}=await supabase!.from('menus').insert({member_id:mid,name:menuName}).select('id,member_id,name').single();if(error){setNotice('Gagal menambahkan menu: '+error.message);return;}setDbMenus(prev=>[...prev,data]);setMembers(prev=>prev.map(m=>m.name===member?{...m,products:[...m.products,menuName]}:m));setNotice(`Menu ${menuName} berhasil ditambahkan untuk ${member} di database.`);setNewMenuName('')}}>Tambah menu ke member</button></div><div className="search-box"><Search size={17}/><input placeholder="Cari nama member atau menu..." value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="member-cards">{visibleMembers.map(m=><div className="member-card" key={m.id}><div className="member-card-top"><div className="member-avatar">{m.name.slice(0,1)}</div><div><b>{m.name}</b><small>{m.products.length} menu aktif</small></div><button className="outline-button" onClick={()=>{setEditingMemberId(m.id);setEditingMemberName(m.name)}}>Edit member</button></div>{editingMemberId===m.id&&<div className="settings-custom-grid"><label>Nama member<input value={editingMemberName} onChange={e=>setEditingMemberName(e.target.value)}/></label><div className="settings-actions"><button className="primary-small" onClick={async()=>{
  const nextName=editingMemberName.trim();
  if(!nextName){setNotice('Nama member tidak boleh kosong.');return;}
  if(members.some(x=>x.id!==m.id&&x.name.toLowerCase()===nextName.toLowerCase())){setNotice('Nama tersebut sudah digunakan member lain.');return;}
  const {error}=await supabase!.from('members').update({name:nextName}).eq('id',m.id);
  if(error){setNotice('Gagal mengubah nama member: '+error.message);return;}
  setMembers(prev=>prev.map(x=>x.id===m.id?{...x,name:nextName}:x));
  setDbMemberIds(prev=>{const next={...prev};delete next[m.name];next[nextName]=m.id;return next;});
  setIncomingHistory(prev=>prev.map(x=>x.member===m.name?{...x,member:nextName}:x));
  setReturns(prev=>prev.map(x=>x.member===m.name?{...x,member:nextName}:x));
  if(member===m.name)setMember(nextName);if(specialMember===m.name)setSpecialMember(nextName);
  setSpecialTariffs(prev=>{if(!(m.name in prev))return prev;const next={...prev};next[nextName]=next[m.name];delete next[m.name];return next;});
  setEditingMemberId(null);setNotice(`Nama member berhasil diubah menjadi ${nextName}. Riwayat transaksi tetap terhubung ke ID member yang sama.`);
}}>Simpan perubahan</button><button className="outline-button" onClick={()=>setEditingMemberId(null)}>Batal</button></div></div>}<div className="chips">{m.products.map(p=>{const menuRow=dbMenus.find(x=>x.member_id===m.id&&x.name===p);return <span key={menuRow?.id||p} className="menu-chip-edit">{p}{menuRow&&<button type="button" className="menu-edit-button" onClick={()=>{setEditingMenuId(menuRow.id);setEditingMenuName(menuRow.name)}}>Edit</button>}</span>})}</div>{editingMenuId&&dbMenus.some(x=>x.id===editingMenuId&&x.member_id===m.id)&&<div className="menu-edit-panel"><label>Nama menu<input value={editingMenuName} onChange={e=>setEditingMenuName(e.target.value)}/></label><button className="primary-small" onClick={async()=>{const row=dbMenus.find(x=>x.id===editingMenuId);const name=editingMenuName.trim();if(!row||!name){setNotice('Nama menu wajib diisi.');return;}if(dbMenus.some(x=>x.id!==row.id&&x.member_id===m.id&&x.name.toLowerCase()===name.toLowerCase())){setNotice('Nama menu sudah ada untuk member ini.');return;}const {error}=await supabase!.from('menus').update({name}).eq('id',row.id);if(error){setNotice('Gagal mengubah menu: '+error.message);return;}setDbMenus(prev=>prev.map(x=>x.id===row.id?{...x,name}:x));setMembers(prev=>prev.map(x=>x.id===m.id?{...x,products:x.products.map(v=>v===row.name?name:v)}:x));setIncomingHistory(prev=>prev.map(x=>x.member===m.name&&x.product===row.name?{...x,product:name}:x));setReturns(prev=>prev.map(x=>x.member===m.name&&x.product===row.name?{...x,product:name}:x));setEditingMenuId(null);setNotice('Nama menu berhasil disimpan. Riwayat transaksi tetap terhubung ke ID menu yang sama.');}}>Simpan menu</button><button className="outline-button" onClick={()=>setEditingMenuId(null)}>Batal</button><button className="outline-button" onClick={async()=>{const row=dbMenus.find(x=>x.id===editingMenuId);if(!row)return;const a=await supabase!.from('daily_item_entries').select('id',{count:'exact',head:true}).eq('menu_id',row.id);if(a.error){setNotice(a.error.message);return;}const b=await supabase!.from('daily_returns').select('id',{count:'exact',head:true}).eq('menu_id',row.id);if(b.error){setNotice(b.error.message);return;}if((a.count||0)+(b.count||0)>0){const {error}=await supabase!.from('menus').update({active:false}).eq('id',row.id);if(error){setNotice(error.message);return;}setDbMenus(prev=>prev.filter(x=>x.id!==row.id));setMembers(prev=>prev.map(x=>x.id===m.id?{...x,products:x.products.filter(v=>v!==row.name)}:x));setEditingMenuId(null);setNotice('Menu dinonaktifkan. Riwayat transaksi tetap aman.');}else{setNotice('Menu belum memiliki transaksi. Penghapusan permanen tidak tersedia; gunakan nonaktifkan setelah menu ini pernah digunakan.');}}}>Nonaktifkan menu</button></div>}</div>)}</div></div>
      </>}{page==='Rekap Pembayaran'&&role==='Member'&&memberLinked&&<div className="member-home"><div className="member-greeting"><div><span>RINCIAN PEMBAYARAN</span><h2>{member}</h2><p>Berikut rincian uang yang menjadi hak kamu hari ini.</p></div></div>{paymentReady&&memberStats.find(m=>m.name===member)!.earned>0&&<p className="helper">Status hari ini: <b>{paidTodayMember?'Sudah Dibayar':'Belum Dibayar'}</b></p>}<PaymentBreakdown stats={memberStats.find(m=>m.name===member)!}/></div>}
      {page==='Rekap Pembayaran'&&role!=='Member'&&<div className="panel printable-report"><div className="panel-head"><div><h3>Rekap hak pembayaran seluruh member</h3><p>Tarif umum Rp8.000 per item + bonus Rp2.000 setiap kelipatan 5 per hari. Tarif khusus mengikuti pengaturan member dan tanpa bonus.</p></div><button className="primary-btn no-print" onClick={()=>window.print()}>Cetak / Simpan PDF</button></div>{memberStats.some(m=>m.terjual<0)&&<div className="helper" role="alert"><b>Perhatian: ada data retur melebihi bawaan.</b> Rekap menandai member dengan jumlah terjual negatif. Periksa transaksi hari ini sebelum melakukan pembayaran: {memberStats.filter(m=>m.terjual<0).map(m=>m.name).join(', ')}.</div>}<div className="report-summary"><div><small>Total member</small><b>{memberStats.length} member</b></div><div><small>Total barang terjual</small><b>{memberStats.reduce((a,m)=>a+m.terjual,0)} porsi</b></div><div><small>Total bonus</small><b>{idr(memberStats.reduce((a,m)=>a+m.bonus,0))}</b></div><div><small>Total hak dibayarkan</small><b>{idr(memberStats.reduce((a,m)=>a+m.earned,0))}</b></div></div><MemberTable rows={memberStats} showMoney/>{paymentReady&&<div className="bp-payall"><h3>Tagihan belum dibayar (semua tanggal)</h3><p>{outstanding.length} tagihan dari {new Set(outstanding.map(x=>x.memberId)).size} member · Total {idr(outstandingTotal)}</p>{outstanding.length>0?<><div className="bp-due-list">{outstanding.map(x=><div key={`${x.memberId}:${x.date}`}><span>{x.name} · {x.date}</span><b>{idr(x.amount)}</b></div>)}</div><button className="primary-btn" disabled={paymentBusy} onClick={payAll}>{paymentBusy?'Memproses…':'BAYAR SEMUA'}</button></>:<p className="helper">Tidak ada tagihan tertunggak.</p>}</div>}{!paymentReady&&<p className="helper">Fitur Bayar Semua memerlukan migrasi SQL yang disertakan dalam ZIP.</p>}<p className="footnote">Laporan ini adalah daftar nominal hak member yang perlu dibayarkan. Transfer dilakukan terpisah oleh admin melalui bank.</p></div>}
      {page==='Edit Rekapan'&&role!=='Member'&&<div className="panel"><div className="panel-head"><div><h3>Edit Rekapan Member</h3><p>Koreksi barang masuk atau kembali yang belum dibayar. Data lunas terkunci.</p></div></div><div className="settings-custom-grid"><label>Member<select value={editMember} onChange={e=>{setEditMember(e.target.value);setEditRows([])}}><option value="">Pilih member</option>{members.map(m=><option key={m.id} value={m.name}>{m.name}</option>)}</select></label><label>Tanggal<input type="date" value={editDate} onChange={e=>{setEditDate(e.target.value);setEditRows([])}}/></label></div><button className="primary-small" disabled={!editMember||!paymentReady||editLoading} onClick={()=>loadEditRows()}>Tampilkan Transaksi</button>{!paymentReady&&<p className="helper">Jalankan migrasi SQL pembayaran terlebih dahulu.</p>}{editMember&&paidKeys.has(`${dbMemberIds[editMember]}:${editDate}`)&&<p className="helper"><b>Sudah Dibayar — transaksi terkunci.</b></p>}{editRows.length===0?<p className="empty">Belum ada transaksi yang ditampilkan.</p>:<div className="bp-edit-list">{editRows.map(r=><div className="bp-edit-row" key={r.id}><div><b>{r.kind==='daily_item_entries'?'Barang Masuk':'Barang Kembali'}</b><small>{r.product} · {r.branch}</small></div><input type="number" min="0" step="1" aria-label={`Jumlah ${r.product}`} value={r.quantity} disabled={editLoading||paidKeys.has(`${dbMemberIds[editMember]}:${editDate}`)} onChange={e=>setEditRows(prev=>prev.map(x=>x.id===r.id?{...x,quantity:Number(e.target.value)}:x))}/><button className="primary-small" disabled={editLoading||!paymentReady||paidKeys.has(`${dbMemberIds[editMember]}:${editDate}`)} onClick={()=>saveEdit(r)}>Simpan</button></div>)}</div>}</div>}
      {page==='Laporan'&&<div className="panel"><div className="panel-head"><div><h3>Laporan harian</h3><p>Rekap bawaan, retur, terjual, dan hak member.</p></div></div><MemberTable rows={memberStats} showMoney/><div className="report-summary"><div><small>Total masuk</small><b>{totalDelivery} porsi</b></div><div><small>Total kembali</small><b>{totalReturns} porsi</b></div><div><small>Total terjual</small><b>{totalDelivery-totalReturns} porsi</b></div><div><small>Total hak member</small><b>{idr(memberStats.reduce((a,m)=>a+m.earned,0))}</b></div></div></div>}
      {page==='Pengaturan'&&role==='Owner'&&<div className="panel"><div className="panel-head"><div><h3>Pengaturan sistem</h3><p>Owner dapat menyesuaikan aturan operasional dan perhitungan hak member.</p></div><span className="tag">Bisa disesuaikan</span></div><div className="settings-custom-grid"><label>Tarif per item terjual (Rp)<input type="number" min="0" value={unitRate} onChange={e=>setUnitRate(e.target.value)}/></label><label>Nominal bonus (Rp)<input type="number" min="0" value={bonusRate} onChange={e=>setBonusRate(e.target.value)}/></label><label>Bonus setiap kelipatan<input type="number" min="1" value={bonusEvery} onChange={e=>setBonusEvery(e.target.value)}/></label><label>Batas menu aktif per member<input type="number" min="1" value={menuLimit} onChange={e=>setMenuLimit(e.target.value)}/></label></div><div className="special-tariff-box"><div className="panel-head"><div><h3>Tarif khusus member</h3><p>Tetapkan tarif per porsi untuk member tertentu. Member bertarif khusus otomatis tidak mendapat bonus kelipatan.</p></div></div><div className="settings-custom-grid"><label>Pilih member<select value={specialMember} onChange={e=>setSpecialMember(e.target.value)}>{members.map(m=><option key={m.id} value={m.name}>{m.name}</option>)}</select></label><label>Tarif khusus per item (Rp)<input type="number" min="0" value={specialRate} onChange={e=>setSpecialRate(e.target.value)}/></label></div><div className="settings-actions"><button className="primary-btn" onClick={async()=>{
  const rate=Math.max(0,Number(specialRate)||0);
  const memberId=dbMemberIds[specialMember];
  if(!memberId){setNotice(`Gagal: ID ${specialMember} tidak ditemukan.`);return;}
  const {error}=await supabase!.from('members').update({special_rate:rate}).eq('id',memberId);
  if(error){setNotice(`Gagal menyimpan tarif ${specialMember}: ${error.message}`);return;}
  setSpecialTariffs(prev=>({...prev,[specialMember]:rate}));
  setNotice(`Tarif khusus ${specialMember} tersimpan permanen: ${idr(rate)} per item, tanpa bonus.`);
}}>Terapkan tarif khusus</button><button className="outline-button" onClick={async()=>{
  const memberId=dbMemberIds[specialMember];
  if(!memberId){setNotice(`Gagal: ID ${specialMember} tidak ditemukan.`);return;}
  const {error}=await supabase!.from('members').update({special_rate:null}).eq('id',memberId);
  if(error){setNotice(`Gagal menghapus tarif ${specialMember}: ${error.message}`);return;}
  setSpecialTariffs(prev=>{const next={...prev};delete next[specialMember];return next});
  setNotice(`Tarif khusus ${specialMember} dihapus dari database. Member kembali menggunakan tarif umum dan bonus.`);
}}>Hapus tarif khusus</button></div><div className="special-tariff-list">{members.map(m=><div className="settings-row" key={m.id}><div><b>{m.name}</b><small>{Object.prototype.hasOwnProperty.call(specialTariffs,m.name)?`Tarif khusus ${idr(specialTariffs[m.name])} · Tanpa bonus`:'Mengikuti tarif umum + bonus'}</small></div><span className="tag">{Object.prototype.hasOwnProperty.call(specialTariffs,m.name)?'Khusus':'Umum'}</span></div>)}</div></div><div className="settings-row"><div><b>Cabang operasional</b><small>Pejanggik, Jempong, Ampenan, Abian Tubuh</small></div><span className="tag">4 cabang</span></div><button className="primary-btn" onClick={()=>setNotice('Pengaturan berhasil diterapkan pada perhitungan demo.')}>Simpan pengaturan</button><p className="helper">Perubahan pengaturan berlaku pada kalkulasi prototipe saat ini. Belum tersimpan permanen ke database.</p></div>}

      <footer>© 2026 Bekal Pagi Mataram <span>Versi prototipe · Data contoh</span></footer>
    </section>
    {showConfirm&&<div className="modal-backdrop"><div className="modal"><div className="warning-icon"><AlertTriangle/></div><h3>Retur melebihi barang masuk</h3><p>{notice}</p><div className="modal-actions"><button className="outline-button" onClick={()=>setShowConfirm(false)}>Periksa ulang</button><button className="primary-btn" onClick={confirmOverReturn}>Konfirmasi simpan</button></div></div></div>}
  </main>;
}
function Stat({icon,label,value,sub}:{icon:React.ReactNode;label:string;value:string;sub:string}){return <div className="stat-card"><div className="stat-top"><span>{label}</span><i>{icon}</i></div><strong>{value}</strong><small>{sub}</small></div>}
function idr(n:number){return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n)}
function MemberTable({rows,showMoney}:{rows:any[];showMoney:boolean}){return <div className="table-wrap"><table><thead><tr><th>Member</th><th>Masuk cabang</th><th>Order online</th><th>Kembali</th><th>Terjual</th>{showMoney&&<><th>Tarif</th><th>Bonus</th><th>Total hak dibayarkan</th></>}</tr></thead><tbody>{rows.map(m=><tr key={m.id}><td><b>{m.name}</b></td><td>{m.masukCabang}</td><td>{m.masukOnline}</td><td>{m.kembali}</td><td><b>{m.terjual}</b></td>{showMoney&&<><td>{idr(m.appliedRate)}{m.hasSpecial?' (khusus)':''}</td><td>{idr(m.bonus)}</td><td><b>{idr(m.earned)}</b></td></>}</tr>)}</tbody></table></div>}
function PaymentBreakdown({stats}:{stats:any}){const paidUnits=Math.max(0,stats.terjual);const base=paidUnits*stats.appliedRate;return <div className="payment-breakdown"><div className="payable-hero"><small>TOTAL YANG PERLU DIBAYARKAN KE KAMU</small><strong>{idr(stats.earned)}</strong><span>Ini adalah perkiraan hak pembayaran hari ini.</span></div><div className="payment-lines"><div><span>Barang terjual yang dibayar</span><b>{paidUnits} porsi</b></div><div><span>Tarif per porsi {stats.hasSpecial?'(tarif khusus)':'(tarif umum)'}</span><b>{idr(stats.appliedRate)}</b></div><div className="payment-calc"><span>Upah barang terjual ({paidUnits} × {idr(stats.appliedRate)})</span><b>{idr(base)}</b></div><div className="bonus-line"><span><strong>Bonus hari ini</strong><small>{stats.hasSpecial?'Tarif khusus: tidak mendapat bonus':'Bonus kelipatan penjualan hari ini'}</small></span><b>+ {idr(stats.bonus)}</b></div><div className="payment-final"><span>Total hak pembayaran</span><strong>{idr(stats.earned)}</strong></div></div><div className="payment-note"><b>Catatan:</b> Jumlah di atas adalah hak pembayaran yang perlu dibayarkan kepada kamu. Pembayaran/transfer dilakukan oleh admin secara terpisah.</div></div>}
function MemberPortal({name,returns,stats,members,incomingHistory,allReturns,unitRate,bonusRate,bonusEvery,specialTariffs,decision,setDecision}:{name:string;returns:any[];stats:any;members:any[];incomingHistory:any[];allReturns:any[];unitRate:string;bonusRate:string;bonusEvery:string;specialTariffs:Record<string,number>;decision:string;setDecision:(x:any)=>void}){const [period,setPeriod]=useState<'Hari'|'Minggu'|'Bulan'>('Hari');const now=new Date();const start=new Date(now);if(period==='Minggu')start.setDate(now.getDate()-6);if(period==='Bulan')start.setDate(1);const key=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;const periodIncoming=incomingHistory.filter(x=>x.date>=key(start)&&x.date<=key(now));const periodReturns=allReturns.filter(x=>(x.date||key(now))>=key(start)&&(x.date||key(now))<=key(now));const brought=periodIncoming.reduce((a,x)=>a+x.qty,0);const returned=periodReturns.reduce((a,x)=>a+x.qty,0);const sold=Math.max(0,brought-returned);const special=Object.prototype.hasOwnProperty.call(specialTariffs,name);const rate=special?specialTariffs[name]:(Number(unitRate)||0);const bonus=special?0:[...new Set(periodIncoming.map(x=>x.date))].reduce((sum,date)=>{const dayIn=periodIncoming.filter(x=>x.date===date).reduce((a,x)=>a+x.qty,0);const dayOut=periodReturns.filter(x=>(x.date||key(now))===date).reduce((a,x)=>a+x.qty,0);return sum+Math.floor(Math.max(0,dayIn-dayOut)/Math.max(1,Number(bonusEvery)||5))*(Number(bonusRate)||0)},0);const pay=sold*rate+bonus;const productTotals:any[]=[];const chartDays=Array.from({length:period==='Hari'?1:period==='Minggu'?7:Math.min(now.getDate(),31)},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);const k=key(d);const inc=periodIncoming.filter(x=>x.date===k).reduce((a,x)=>a+x.qty,0);const ret=periodReturns.filter(x=>(x.date||key(now))===k).reduce((a,x)=>a+x.qty,0);return {label:period==='Hari'?'Hari ini':String(d.getDate()),value:Math.max(0,inc-ret)}});const max=Math.max(1,...chartDays.map(x=>x.value));const chartCoords=chartDays.map((x,i)=>({x:chartDays.length===1?50: i/(chartDays.length-1)*100,y:88-(x.value/max)*72}));const mountainLine=chartCoords.map((p,i)=>`${i===0?'M':'L'} ${p.x} ${p.y}`).join(' ');const mountainArea=`${mountainLine} L 100 100 L 0 100 Z`;const grouped=branches.map(b=>({branch:b,items:returns.filter(r=>r.branch===b),qty:returns.filter(r=>r.branch===b).reduce((a,r)=>a+r.qty,0)})).filter(g=>g.qty>0);return <div className="member-portal"><div className="member-stat-grid"><div className="member-stat brought"><span>TOTAL BARANG DIBAWA</span><strong>{stats.masuk}</strong><small>porsi termasuk order online</small></div><div className="member-stat returned"><span>TOTAL SISA / BARANG KEMBALI</span><strong>{stats.kembali}</strong><small>porsi yang perlu diputuskan</small></div><div className="member-stat sold"><span>TOTAL BARANG LAKU</span><strong>{stats.terjual}</strong><small>porsi · dibawa dikurangi kembali</small></div><div className="member-stat online"><span>ORDER ONLINE</span><strong>{stats.masukOnline}</strong><small>porsi · dicatat terpisah</small></div></div><section className="decision-box"><div className="decision-heading"><span className="decision-icon"><HeartHandshake size={25}/></span><div><h3>Mau diapakan barang yang kembali?</h3><p>Pilih satu keputusan untuk <b>{stats.kembali} porsi</b> barang kembali hari ini.</p></div></div><div className="decision-actions"><button disabled={decision!=='Menunggu keputusan'} className={decision==='Ambil Nanti'?'chosen take-later':'take-later'} onClick={()=>setDecision('Ambil Nanti')}><Package size={26}/><strong>AMBIL NANTI</strong><small>Saya akan mengambil barangnya</small></button><button disabled={decision!=='Menunggu keputusan'} className={decision==='Sedekahkan'?'chosen donate':'donate'} onClick={()=>setDecision('Sedekahkan')}><HeartHandshake size={26}/><strong>SEDEKAHKAN</strong><small>Saya ingin menyedekahkan barangnya</small></button></div><div className={decision==='Menunggu keputusan'?'decision-status waiting':'decision-status selected'}>{decision==='Menunggu keputusan'?'BELUM MEMILIH — Silakan tekan salah satu tombol di atas.':`KEPUTUSAN TERSIMPAN: ${decision.toUpperCase()} · TOMBOL TERKUNCI HARI INI`}</div></section><section className="member-section"><div className="member-section-title"><div><h3>Barang yang kembali</h3><p>Periksa jumlah barang yang dikembalikan dari setiap cabang.</p></div><span className="big-count">{stats.kembali} <small>porsi</small></span></div>{grouped.length?grouped.map(g=><div className="portal-branch" key={g.branch}><div className="portal-branch-head"><b>{g.branch}</b><strong>{g.qty} porsi</strong></div>{g.items.map((r:any)=><div className="portal-product" key={r.id}><span>{r.product}</span><b>{r.qty} porsi</b></div>)}</div>):<p className="empty">Belum ada barang yang dikembalikan hari ini.</p>}</section><section className="member-payment-preview"><div><span>UANG YANG MENJADI HAK KAMU</span><small>Rincian pembayaran hari ini</small></div><strong>{idr(stats.earned)}</strong><div className="payment-preview-foot"><span>Upah barang: {idr(Math.max(0,stats.terjual)*stats.appliedRate)}</span><span>Bonus: {idr(stats.bonus)}</span></div></section><section className="member-section member-analytics"><div className="member-section-title"><div><h3>Catatan penjualan & pendapatan</h3><p>Pilih periode untuk melihat hasil penjualan kamu.</p></div></div><div className="period-tabs">{(['Hari','Minggu','Bulan'] as const).map(x=><button key={x} className={period===x?'active':''} onClick={()=>setPeriod(x)}>{x==='Hari'?'Hari ini':x==='Minggu'?'7 hari': 'Bulan ini'}</button>)}</div><div className="analytics-summary"><div><small>Barang laku</small><b>{sold} porsi</b></div><div><small>Hak pendapatan</small><b>{idr(pay)}</b></div><div><small>Bonus</small><b>{idr(bonus)}</b></div></div><div className="member-chart"><b>Grafik barang terjual</b><div className="mountain-chart"><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Grafik area jumlah barang terjual"><defs><linearGradient id="mountainFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#27834d" stopOpacity=".42"/><stop offset="100%" stopColor="#27834d" stopOpacity=".04"/></linearGradient></defs><path d={mountainArea} fill="url(#mountainFill)"/><path d={mountainLine} fill="none" stroke="#27834d" strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/>{chartCoords.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="1.7" fill="#176338" vectorEffect="non-scaling-stroke"/>)}</svg><div className="mountain-labels">{chartDays.map((x,i)=><span key={`${x.label}-${i}`}>{x.label}</span>)}</div></div><p className="helper">Grafik menunjukkan jumlah barang laku per hari pada periode yang dipilih.</p></div><div className="top-products"><b>Jumlah menu yang laku</b>{productTotals.length?productTotals.map(x=><div className="top-product-row" key={x.product}><span>{x.product}</span><strong>{x.qty} porsi</strong></div>):<p className="empty">Penjualan dihitung dari total barang masuk per cabang dikurangi seluruh barang kembali. Rincian terjual per menu tidak tersedia.</p>}</div><div className="analytics-note">Catatan: riwayat periode dihitung dari data yang dicatat sejak fitur ini digunakan. Data lama yang belum dicatat per menu tidak bisa dipisahkan secara akurat.</div></section></div>}