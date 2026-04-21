import { useEffect, useState } from 'react'
import api from '../api'
import { useToast } from '../components/Toast'

function StatCard({ icon, label, value, sub, iconStyle }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={iconStyle}>{icon}</div>
      <div className="stat-val">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

function MiniBar({ data }) {
  const max = Math.max(...data.map(d => d.rev), 1)
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:3,height:90,paddingTop:8}}>
      {data.map((d, i) => (
        <div key={i} style={{flex:1,display:'flex',alignItems:'flex-end'}}>
          <div title={`₹${d.rev.toFixed(0)}`} style={{width:'100%',height:`${Math.max(4,Math.round(d.rev/max*100))}%`,background:'var(--primary)',opacity:d.isToday?1:.2,borderRadius:'3px 3px 0 0',minHeight:4,transition:'height .3s'}} />
        </div>
      ))}
    </div>
  )
}

function MiniBars({ items, keyRev, keyName, color }) {
  if (!items.length) return <div style={{fontSize:12,color:'var(--text3)',textAlign:'center',padding:'16px 0'}}>No data yet</div>
  const max = Math.max(...items.map(i => i[keyRev]), 1)
  return items.map((item, i) => (
    <div key={i} style={{marginBottom:8}}>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}>
        <span style={{fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'60%'}}>{item[keyName]}</span>
        <span style={{color:'var(--text2)'}}>₹{item[keyRev].toLocaleString('en-IN',{maximumFractionDigits:0})}</span>
      </div>
      <div style={{height:5,background:'var(--surface2)',borderRadius:3}}>
        <div style={{height:'100%',width:`${Math.round(item[keyRev]/max*100)}%`,background:color,borderRadius:3}} />
      </div>
    </div>
  ))
}

export default function Dashboard() {
  const toast = useToast()
  const [inv,   setInv]   = useState([])
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.get('/inventory'), api.get('/sales')])
      .then(([r1, r2]) => { setInv(r1.data); setSales(r2.data) })
      .catch(() => toast('Failed to load dashboard', 'error'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page"><div className="spinner" style={{margin:'60px auto'}} /></div>

  const today      = new Date().toDateString()
  const todaySales = sales.filter(s => new Date(s.sold_at).toDateString() === today)
  const todayRev   = todaySales.reduce((s, x) => s + x.price * x.quantity, 0)
  const totalRev   = sales.reduce((s, x) => s + x.price * x.quantity, 0)
  const totalVal   = inv.reduce((s, i) => s + i.price * i.quantity, 0)

  const dayData = Array.from({length:14}, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i))
    const ds = d.toDateString()
    return { rev: sales.filter(s => new Date(s.sold_at).toDateString() === ds).reduce((a,s) => a+s.price*s.quantity,0), isToday: i===13 }
  })

  const prodMap = {}
  sales.forEach(s => { if (!prodMap[s.item_name]) prodMap[s.item_name]={name:s.item_name,rev:0}; prodMap[s.item_name].rev+=s.price*s.quantity })
  const topProds = Object.values(prodMap).sort((a,b)=>b.rev-a.rev).slice(0,5)

  const empMap = {}
  sales.forEach(s => { if (!empMap[s.sold_by_name]) empMap[s.sold_by_name]={name:s.sold_by_name,rev:0}; empMap[s.sold_by_name].rev+=s.price*s.quantity })
  const empData = Object.values(empMap).sort((a,b)=>b.rev-a.rev)

  const lowStock = inv.filter(i => i.quantity > 0 && i.quantity <= 5).sort((a,b)=>a.quantity-b.quantity)
  const recent   = sales.slice(0, 8)

  const fmt = n => `₹${n.toLocaleString('en-IN',{maximumFractionDigits:0})}`

  return (
    <div className="page">
      <div style={{marginBottom:20}}>
        <div className="page-title">Dashboard</div>
        <div className="page-sub">Your inventory overview at a glance</div>
      </div>

      <div className="stats-grid">
        <StatCard label="Total Items"     value={inv.length}    sub="SKUs in stock"        iconStyle={{background:'#dbeafe',color:'#1e40af'}} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>}/>
        <StatCard label="Stock Value"     value={fmt(totalVal)} sub="Inventory worth"       iconStyle={{background:'#ede9fe',color:'#6d28d9'}} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}/>
        <StatCard label="Today's Revenue" value={fmt(todayRev)} sub={`${todaySales.length} sales today`} iconStyle={{background:'#d1fae5',color:'#065f46'}} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>}/>
        <StatCard label="Total Revenue"   value={fmt(totalRev)} sub={`${sales.length} total sales`}    iconStyle={{background:'#fef3c7',color:'#92400e'}} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>}/>
      </div>

      <div className="card">
        <div className="card-header"><div><div className="card-title">Revenue — Last 14 Days</div><div className="card-sub">Daily sales trend</div></div></div>
        <MiniBar data={dayData} />
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
        <div className="card card-sm" style={{marginBottom:0}}>
          <div className="card-title" style={{marginBottom:10}}>Top Products</div>
          <MiniBars items={topProds} keyRev="rev" keyName="name" color="var(--primary)" />
        </div>
        <div className="card card-sm" style={{marginBottom:0}}>
          <div className="card-title" style={{marginBottom:10}}>By Employee</div>
          <MiniBars items={empData} keyRev="rev" keyName="name" color="var(--accent)" />
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="card" style={{borderColor:'#fcd34d'}}>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10}}>
            <svg viewBox="0 0 24 24" style={{width:15,height:15,flexShrink:0,color:'var(--amber-text)'}} fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span style={{fontSize:13,fontWeight:600,color:'var(--amber-text)'}}>Low Stock ({lowStock.length})</span>
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {lowStock.map(i => <div key={i.id} style={{display:'flex',alignItems:'center',gap:6,background:'var(--amber-bg)',borderRadius:8,padding:'5px 10px'}}><span style={{fontSize:12,fontWeight:500,color:'var(--amber-text)'}}>{i.name}</span><span className={`badge ${i.quantity<=2?'badge-red':'badge-amber'}`}>{i.quantity} left</span></div>)}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><div className="card-title">Recent Sales</div></div>
        {recent.length === 0
          ? <div style={{fontSize:13,color:'var(--text3)',textAlign:'center',padding:'20px 0'}}>No sales yet</div>
          : recent.map(s => (
            <div key={s.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid var(--border)'}}>
              <div>
                <div style={{fontSize:13,fontWeight:500}}>{s.item_name}</div>
                <div style={{fontSize:11,color:'var(--text3)',marginTop:1}}>by {s.sold_by_name} · qty {s.quantity} · {new Date(s.sold_at).toLocaleString()}</div>
              </div>
              <div style={{fontSize:14,fontWeight:600,color:'var(--primary)',marginLeft:12,whiteSpace:'nowrap'}}>₹{(s.price*s.quantity).toFixed(2)}</div>
            </div>
          ))
        }
      </div>
    </div>
  )
}
