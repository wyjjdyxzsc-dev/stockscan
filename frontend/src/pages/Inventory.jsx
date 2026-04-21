import { useEffect, useState, useRef, useCallback } from 'react'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import JsBarcode from 'jsbarcode'

function BarcodeImg({ value }) {
  const ref = useRef()
  useEffect(() => {
    if (ref.current && value) {
      try { JsBarcode(ref.current, value, { width:1.2, height:35, fontSize:8, margin:2, displayValue:true }) } catch {}
    }
  }, [value])
  return <svg ref={ref} />
}

function ItemModal({ item, onClose, onSaved }) {
  const toast   = useToast()
  const { employee } = useAuth()
  const fileRef = useRef()

  const [barcode,  setBarcode]  = useState(item?.barcode  || '')
  const [name,     setName]     = useState(item?.name     || '')
  const [price,    setPrice]    = useState(item?.price    || '')
  const [qty,      setQty]      = useState(item?.quantity || '')
  const [category, setCategory] = useState(item?.category || '')
  const [imgFile,  setImgFile]  = useState(null)
  const [imgSrc,   setImgSrc]   = useState(item?.image_url || null)
  const [saving,   setSaving]   = useState(false)

  const genBarcode = () => {
    const d = Array.from({length:11}, () => Math.floor(Math.random()*10)).join('')
    const sum = d.split('').map(Number).reduce((a,v,i)=>a+v*(i%2===0?1:3),0)
    setBarcode(d + ((10-(sum%10))%10))
  }

  const handleFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return
    setImgFile(f)
    const reader = new FileReader()
    reader.onloadend = () => setImgSrc(reader.result)
    reader.readAsDataURL(f)
  }

  const save = async () => {
    if (!barcode || !name || !price || !qty) { toast('Fill all required fields', 'error'); return }
    setSaving(true)
    try {
      let image_path = item?.image_path || null
      if (imgFile) {
        const fd = new FormData(); fd.append('image', imgFile)
        const r  = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        image_path = r.data.filename
      }
      await api.post('/inventory', { barcode, name, price: parseFloat(price), quantity: parseInt(qty), category: category || null, image_path })
      toast(item ? 'Item updated' : 'Item added')
      onSaved()
    } catch (e) { toast(e.response?.data?.detail || 'Failed to save', 'error') }
    finally { setSaving(false) }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          {item ? 'Edit Item' : 'Add Item'}
        </div>

        <div className="form-group">
          <label className="form-label">Product Photo</label>
          <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleFile} />
          <div className="img-upload" onClick={() => fileRef.current.click()}>
            {imgSrc
              ? <><img src={imgSrc} className="img-preview" alt="preview" /><button className="img-clear" onClick={e=>{e.stopPropagation();setImgSrc(null);setImgFile(null);if(fileRef.current)fileRef.current.value=''}}>×</button></>
              : <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>Click to upload photo</span></>
            }
          </div>
          <div className="img-note">📷 On mobile, you can use your camera</div>
        </div>

        <div className="form-row">
          <div className="form-group" style={{marginBottom:0}}>
            <label className="form-label">Barcode *</label>
            <div style={{display:'flex',gap:6}}>
              <input className="form-input" style={{fontFamily:'var(--mono)',flex:1}} value={barcode} onChange={e=>setBarcode(e.target.value)} placeholder="123456789" />
              <button className="btn btn-secondary btn-icon" onClick={genBarcode} title="Generate random barcode">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:15,height:15}}><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>
              </button>
            </div>
          </div>
          <div className="form-group" style={{marginBottom:0}}>
            <label className="form-label">Category</label>
            <input className="form-input" value={category} onChange={e=>setCategory(e.target.value)} placeholder="e.g. Electronics" />
          </div>
        </div>
        <div style={{height:10}} />
        <div className="form-group">
          <label className="form-label">Name *</label>
          <input className="form-input" value={name} onChange={e=>setName(e.target.value)} placeholder="Item name" />
        </div>
        <div className="form-row">
          <div className="form-group" style={{marginBottom:0}}>
            <label className="form-label">Price (₹) *</label>
            <input className="form-input" type="number" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} placeholder="0.00" />
          </div>
          <div className="form-group" style={{marginBottom:0}}>
            <label className="form-label">Quantity *</label>
            <input className="form-input" type="number" value={qty} onChange={e=>setQty(e.target.value)} placeholder="0" />
          </div>
        </div>
        {barcode && (
          <div style={{marginTop:12}}>
            <div className="barcode-wrap"><BarcodeImg value={barcode} /></div>
          </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Item'}</button>
        </div>
      </div>
    </div>
  )
}

function DeleteModal({ item, onClose, onDeleted }) {
  const toast = useToast()
  const [adminPin, setAdminPin] = useState('')
  const [deleting, setDeleting] = useState(false)

  const doDelete = async () => {
    if (!adminPin) { toast('Enter admin PIN', 'error'); return }
    setDeleting(true)
    try {
      await api.delete(`/inventory/${item.id}?admin_pin=${encodeURIComponent(adminPin)}`)
      toast('Item removed')
      onDeleted()
    } catch (e) { toast(e.response?.data?.detail || 'Failed', 'error') }
    finally { setDeleting(false) }
  }

  return (
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:360}}>
        <div className="modal-title" style={{color:'var(--red)'}}>Delete Item?</div>
        <p style={{fontSize:13,color:'var(--text2)',marginBottom:14}}>Enter admin PIN to confirm deletion of <strong>{item.name}</strong>.</p>
        <input className="form-input" type="password" placeholder="Admin PIN" inputMode="numeric" value={adminPin} onChange={e=>setAdminPin(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doDelete()} autoFocus />
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn" style={{background:'var(--red)',color:'#fff'}} onClick={doDelete} disabled={deleting}>{deleting?'Deleting…':'Delete'}</button>
        </div>
      </div>
    </div>
  )
}

function BarcodeModal({ item, onClose }) {
  const svgRef = useRef()
  useEffect(() => {
    if (svgRef.current && item) {
      try { JsBarcode(svgRef.current, item.barcode, { width:2, height:60, fontSize:12, margin:6 }) } catch {}
    }
  }, [item])
  if (!item) return null
  return (
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:360}}>
        <div className="modal-title">{item.name}</div>
        {item.image_url && <div style={{marginBottom:12,borderRadius:8,overflow:'hidden',maxHeight:180}}><img src={item.image_url} style={{width:'100%',objectFit:'contain',maxHeight:180}} alt={item.name}/></div>}
        <div className="barcode-wrap" style={{marginBottom:12}}><svg ref={svgRef} style={{maxWidth:'100%'}} /></div>
        <p style={{textAlign:'center',fontSize:13,color:'var(--text2)'}}>₹{item.price.toFixed(2)} · Stock: {item.quantity}</p>
        <div className="modal-footer"><button className="btn btn-primary" style={{width:'100%'}} onClick={onClose}>Close</button></div>
      </div>
    </div>
  )
}

export default function Inventory() {
  const { employee } = useAuth()
  const toast        = useToast()
  const [items,  setItems]  = useState([])
  const [search, setSearch] = useState('')
  const [itemModal,  setItemModal]  = useState(null)  // null | 'new' | item
  const [deleteItem, setDeleteItem] = useState(null)
  const [bcItem,     setBcItem]     = useState(null)

  const load = useCallback(() =>
    api.get('/inventory').then(r => setItems(r.data)).catch(() => toast('Failed to load inventory', 'error'))
  , [])

  useEffect(() => { load() }, [load])

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.barcode.includes(search) ||
    (i.category||'').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Inventory</div>
          <div className="page-sub">{items.length} items in stock</div>
        </div>
        <button className="btn btn-primary" onClick={() => setItemModal('new')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Item
        </button>
      </div>

      <div className="search-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input className="search-input" placeholder="Search name, barcode, category…" value={search} onChange={e=>setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div>
          <div className="empty-title">{search ? 'No items found' : 'No inventory yet'}</div>
          <div className="empty-sub">{search ? 'Try a different search' : 'Add your first item to get started'}</div>
        </div>
      ) : (
        <div className="inv-list">
          {filtered.map(item => (
            <div key={item.id} className="inv-item">
              <div className="inv-thumb">
                {item.image_url
                  ? <img src={item.image_url} alt={item.name} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                  : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                }
              </div>
              <div className="inv-body">
                <div className="inv-name">{item.name}</div>
                <div className="inv-meta">
                  <span className="inv-price">₹{item.price.toFixed(2)}</span>
                  <span className={`inv-qty${item.quantity < 5 ? ' low' : ''}`}>Qty: {item.quantity}{item.quantity<5?' ⚠':''}</span>
                  {item.category && <span className="badge badge-gray">{item.category}</span>}
                </div>
                <div className="inv-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => setItemModal(item)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Edit
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setBcItem(item)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><circle cx="17.5" cy="17.5" r="3.5"/></svg>
                    Barcode
                  </button>
                  {employee?.role === 'admin' && (
                    <button className="btn btn-ghost btn-sm" style={{color:'var(--red)'}} onClick={() => setDeleteItem(item)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      Delete
                    </button>
                  )}
                </div>
              </div>
              <div className="inv-bc"><BarcodeImg value={item.barcode} /></div>
            </div>
          ))}
        </div>
      )}

      {itemModal && (
        <ItemModal
          item={itemModal === 'new' ? null : itemModal}
          onClose={() => setItemModal(null)}
          onSaved={() => { setItemModal(null); load() }}
        />
      )}
      {deleteItem && <DeleteModal item={deleteItem} onClose={() => setDeleteItem(null)} onDeleted={() => { setDeleteItem(null); load() }} />}
      {bcItem     && <BarcodeModal item={bcItem} onClose={() => setBcItem(null)} />}
    </div>
  )
}
