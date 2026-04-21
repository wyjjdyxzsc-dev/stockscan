import { useEffect, useState, useCallback } from 'react'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'

function CreateEmpModal({ onClose, onCreated }) {
  const toast = useToast()
  const [name,     setName]     = useState('')
  const [pin,      setPin]      = useState('')
  const [role,     setRole]     = useState('employee')
  const [adminPin, setAdminPin] = useState('')
  const [saving,   setSaving]   = useState(false)

  const create = async () => {
    if (!name.trim() || !pin.trim()) { toast('Name and PIN required', 'error'); return }
    setSaving(true)
    try {
      await api.post('/employees', { name: name.trim(), pin, role, admin_pin: adminPin })
      toast('Employee created')
      onCreated()
    } catch (e) { toast(e.response?.data?.detail || 'Failed', 'error') }
    finally { setSaving(false) }
  }

  return (
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:380}}>
        <div className="modal-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Add Employee
        </div>
        <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" autoFocus /></div>
        <div className="form-group"><label className="form-label">PIN *</label><input className="form-input" type="password" value={pin} onChange={e=>setPin(e.target.value)} placeholder="4-digit PIN" inputMode="numeric" maxLength={8} /></div>
        <div className="form-group">
          <label className="form-label">Role</label>
          <select className="form-input" value={role} onChange={e=>setRole(e.target.value)}>
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="form-group"><label className="form-label">Your Admin PIN *</label><input className="form-input" type="password" value={adminPin} onChange={e=>setAdminPin(e.target.value)} placeholder="Your PIN to confirm" inputMode="numeric" /></div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={create} disabled={saving}>{saving?'Creating…':'Create'}</button>
        </div>
      </div>
    </div>
  )
}

function EditPinModal({ emp, onClose, onSaved }) {
  const toast = useToast()
  const [newPin,   setNewPin]   = useState('')
  const [adminPin, setAdminPin] = useState('')
  const [saving,   setSaving]   = useState(false)

  const save = async () => {
    if (!newPin || !adminPin) { toast('Fill all fields', 'error'); return }
    setSaving(true)
    try {
      await api.put(`/employees/${emp.id}`, { pin: newPin, admin_pin: adminPin })
      toast('PIN updated')
      onSaved()
    } catch (e) { toast(e.response?.data?.detail || 'Failed', 'error') }
    finally { setSaving(false) }
  }

  return (
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:360}}>
        <div className="modal-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Reset PIN for {emp.name}
        </div>
        <div className="form-group"><label className="form-label">New PIN</label><input className="form-input" type="password" value={newPin} onChange={e=>setNewPin(e.target.value)} placeholder="New PIN" inputMode="numeric" autoFocus /></div>
        <div className="form-group"><label className="form-label">Your Admin PIN</label><input className="form-input" type="password" value={adminPin} onChange={e=>setAdminPin(e.target.value)} placeholder="Your PIN to confirm" inputMode="numeric" /></div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Saving…':'Update PIN'}</button>
        </div>
      </div>
    </div>
  )
}

function DeleteEmpModal({ emp, onClose, onDeleted }) {
  const toast = useToast()
  const [adminPin, setAdminPin] = useState('')
  const [deleting, setDeleting] = useState(false)

  const doDelete = async () => {
    if (!adminPin) { toast('Enter admin PIN', 'error'); return }
    setDeleting(true)
    try {
      await api.delete(`/employees/${emp.id}?admin_pin=${encodeURIComponent(adminPin)}`)
      toast('Employee removed')
      onDeleted()
    } catch (e) { toast(e.response?.data?.detail || 'Failed', 'error') }
    finally { setDeleting(false) }
  }

  return (
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:360}}>
        <div className="modal-title" style={{color:'var(--red)'}}>Remove Employee?</div>
        <p style={{fontSize:13,color:'var(--text2)',marginBottom:14}}>This permanently removes <strong>{emp.name}</strong>. Their sales history is preserved.</p>
        <div className="form-group"><label className="form-label">Your Admin PIN</label><input className="form-input" type="password" value={adminPin} onChange={e=>setAdminPin(e.target.value)} placeholder="Your PIN to confirm" inputMode="numeric" autoFocus onKeyDown={e=>e.key==='Enter'&&doDelete()} /></div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn" style={{background:'var(--red)',color:'#fff'}} onClick={doDelete} disabled={deleting}>{deleting?'Removing…':'Remove'}</button>
        </div>
      </div>
    </div>
  )
}

function ResetModal({ onClose, onReset }) {
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [resetting, setResetting] = useState(false)

  const doReset = async () => {
    if (!password) { toast('Enter reset password', 'error'); return }
    setResetting(true)
    try {
      await api.post('/reset', { password })
      toast('All inventory & sales data has been reset. Users preserved.')
      onReset()
    } catch (e) { toast(e.response?.data?.detail || 'Invalid password', 'error') }
    finally { setResetting(false) }
  }

  return (
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:380}}>
        <div className="modal-title" style={{color:'var(--red)'}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Confirm Full Reset
        </div>
        <p style={{fontSize:13,color:'var(--text2)',marginBottom:14}}>
          This will permanently delete <strong>ALL inventory and sales records</strong>. 
          Users will <strong>NOT</strong> be removed. Enter the master reset password to confirm.
        </p>
        <div className="form-group">
          <label className="form-label">Reset Password</label>
          <input className="form-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter reset password" autoFocus onKeyDown={e=>e.key==='Enter'&&doReset()} />
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn" style={{background:'var(--red)',color:'#fff'}} onClick={doReset} disabled={resetting}>{resetting?'Resetting…':'Reset Everything'}</button>
        </div>
      </div>
    </div>
  )
}

export default function Admin() {
  const { employee } = useAuth()
  const toast        = useToast()

  const [employees,    setEmployees]    = useState([])
  const [invCount,     setInvCount]     = useState(0)
  const [salesCount,   setSalesCount]   = useState(0)
  const [salesRev,     setSalesRev]     = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [showCreate,   setShowCreate]   = useState(false)
  const [editPinEmp,   setEditPinEmp]   = useState(null)
  const [deleteEmp,    setDeleteEmp]    = useState(null)
  const [showReset,    setShowReset]    = useState(false)

  const load = useCallback(async () => {
    try {
      const [re, ri, rs] = await Promise.all([api.get('/employees'), api.get('/inventory'), api.get('/sales')])
      setEmployees(re.data)
      setInvCount(ri.data.length)
      setSalesCount(rs.data.length)
      setSalesRev(rs.data.reduce((s, x) => s + x.price * x.quantity, 0))
    } catch { toast('Failed to load data', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const exportCSV = async () => {
    try {
      const [ri, rs] = await Promise.all([api.get('/inventory'), api.get('/sales')])
      const rows = [
        ['=== SALES ==='],
        ['Date','Item','Barcode','Price','Qty','Total','Sold By'],
        ...rs.data.map(s => [new Date(s.sold_at).toLocaleString(),s.item_name,s.barcode,s.price.toFixed(2),s.quantity,(s.price*s.quantity).toFixed(2),s.sold_by_name]),
        [],
        ['=== INVENTORY ==='],
        ['Name','Barcode','Category','Price','Quantity','Last Updated'],
        ...ri.data.map(i => [i.name,i.barcode,i.category||'',i.price.toFixed(2),i.quantity,new Date(i.updated_at).toLocaleString()]),
      ]
      const csv = rows.map(r => Array.isArray(r) ? r.map(c=>`"${c}"`).join(',') : r).join('\n')
      const a   = document.createElement('a')
      a.href    = URL.createObjectURL(new Blob([csv], { type:'text/csv' }))
      a.download= `stockscan-${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      toast('CSV exported')
    } catch { toast('Export failed', 'error') }
  }

  if (loading) return <div className="page"><div className="spinner" style={{margin:'60px auto'}} /></div>

  return (
    <div className="page">
      <div style={{marginBottom:20}}>
        <div className="page-title">Admin Panel</div>
        <div className="page-sub">Manage team, data &amp; exports</div>
      </div>

      {/* Team */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Team Members</div>
            <div className="card-sub">Manage employee profiles &amp; PINs</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>
            Add
          </button>
        </div>
        {employees.map(emp => (
          <div key={emp.id} className="emp-row">
            <div className="user-avatar" style={{width:36,height:36,fontSize:13}}>{emp.name.charAt(0)}</div>
            <div className="emp-row-info">
              <div className="emp-row-name">{emp.name}</div>
              <span className={`badge ${emp.role==='admin'?'badge-primary':'badge-gray'}`}>{emp.role}</span>
            </div>
            {emp.id !== employee?.id ? (
              <div className="emp-row-actions">
                <button className="btn btn-ghost btn-icon btn-sm" title="Reset PIN" onClick={() => setEditPinEmp(emp)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:14,height:14}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </button>
                <button className="btn btn-ghost btn-icon btn-sm" style={{color:'var(--red)'}} title="Remove" onClick={() => setDeleteEmp(emp)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:14,height:14}}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
              </div>
            ) : (
              <span style={{fontSize:11,color:'var(--text3)',padding:'0 8px'}}>You</span>
            )}
          </div>
        ))}
      </div>

      {/* Stats + Export */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Export Data</div>
            <div className="card-sub">Download all data as CSV</div>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:14}}>
          {[
            { label:'Sales',    val: salesCount },
            { label:'Revenue',  val:`₹${salesRev.toLocaleString('en-IN',{maximumFractionDigits:0})}` },
            { label:'Items',    val: invCount },
          ].map(s => (
            <div key={s.label} style={{background:'var(--surface2)',borderRadius:8,padding:10}}>
              <div style={{fontSize:18,fontWeight:600}}>{s.val}</div>
              <div style={{fontSize:11,color:'var(--text2)'}}>{s.label}</div>
            </div>
          ))}
        </div>
        <button className="btn btn-secondary" onClick={exportCSV}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export to CSV
        </button>
      </div>

      {/* Danger zone */}
      <div className="danger-zone">
        <div className="danger-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Full Data Reset
        </div>
        <div style={{fontSize:13,color:'var(--red-text)',marginBottom:12}}>
          Permanently deletes ALL inventory &amp; sales. Users are NOT removed.
        </div>
        <button className="btn btn-danger" onClick={() => setShowReset(true)}>Reset All Data</button>
      </div>

      {showCreate  && <CreateEmpModal  onClose={() => setShowCreate(false)}    onCreated={() => { setShowCreate(false);  load() }} />}
      {editPinEmp  && <EditPinModal    emp={editPinEmp} onClose={() => setEditPinEmp(null)}   onSaved={() => { setEditPinEmp(null);  load() }} />}
      {deleteEmp   && <DeleteEmpModal  emp={deleteEmp}  onClose={() => setDeleteEmp(null)}    onDeleted={() => { setDeleteEmp(null); load() }} />}
      {showReset   && <ResetModal      onClose={() => setShowReset(false)}     onReset={() => { setShowReset(false);    load() }} />}
    </div>
  )
}
