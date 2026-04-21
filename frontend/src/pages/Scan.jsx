import { useState, useRef, useEffect, useCallback } from 'react'
import api from '../api'
import { useToast } from '../components/Toast'

export default function Scan() {
  const toast     = useToast()
  const videoRef  = useRef(null)
  const streamRef = useRef(null)
  const readerRef = useRef(null)

  const [scanning,   setScanning]   = useState(false)
  const [camError,   setCamError]   = useState(null)
  const [manualBc,   setManualBc]   = useState('')
  const [foundItem,  setFoundItem]  = useState(null)
  const [qty,        setQty]        = useState(1)
  const [inventory,  setInventory]  = useState([])
  const [selling,    setSelling]    = useState(false)

  useEffect(() => {
    api.get('/inventory').then(r => setInventory(r.data)).catch(() => {})
    return () => stopCamera()
  }, [])

  const lookup = useCallback((code) => {
    const item = inventory.find(i => i.barcode === code)
    if (item) { setFoundItem(item); setQty(1); stopCamera() }
    else toast(`No item found for barcode: ${code}`, 'error')
  }, [inventory])

  const stopCamera = () => {
    try { readerRef.current?.reset?.() } catch {}
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    if (videoRef.current) videoRef.current.srcObject = null
    setScanning(false)
    readerRef.current = null
  }

  const startCamera = async () => {
    setCamError(null)
    if (!navigator.mediaDevices?.getUserMedia) { setCamError('Camera not supported on this browser. Use manual entry below.'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
      setScanning(true)

      // Try ZXing scanner
      try {
        const { BrowserMultiFormatReader, NotFoundException } = await import('@zxing/browser')
        const reader = new BrowserMultiFormatReader()
        readerRef.current = reader
        reader.decodeFromVideoElement(videoRef.current, (result, err) => {
          if (result) { const code = result.getText(); lookup(code) }
        })
      } catch (zxingErr) {
        // ZXing failed — camera stream still works, user can type manually
        console.warn('ZXing not available:', zxingErr)
      }
    } catch (e) {
      let msg = 'Could not start camera. '
      if (e.name === 'NotAllowedError') msg = 'Camera permission denied. Allow access in your browser settings.'
      else if (e.name === 'NotFoundError') msg = 'No camera found on this device.'
      else msg += e.message
      setCamError(msg)
      stopCamera()
    }
  }

  const manualSearch = () => {
    const code = manualBc.trim()
    if (!code) return
    lookup(code)
    setManualBc('')
  }

  const recordSale = async () => {
    if (!foundItem) return
    setSelling(true)
    try {
      await api.post('/sales', { item_id: foundItem.id, quantity: qty })
      toast(`Sold ${qty}× ${foundItem.name}`)
      // Refresh inventory
      const r = await api.get('/inventory')
      setInventory(r.data)
      setFoundItem(null)
    } catch (e) { toast(e.response?.data?.detail || 'Failed to record sale', 'error') }
    finally { setSelling(false) }
  }

  return (
    <div className="page" style={{maxWidth:560,margin:'0 auto'}}>
      <div style={{marginBottom:16}}>
        <div className="page-title">Scan & Sell</div>
        <div className="page-sub">Scan a barcode or enter it manually</div>
      </div>

      {/* Found item */}
      {foundItem && (
        <div className="found-card">
          {foundItem.image_url && <img src={foundItem.image_url} className="found-img" alt={foundItem.name} />}
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,marginBottom:12}}>
            <div>
              <div className="found-name">{foundItem.name}</div>
              {foundItem.category && <span style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>{foundItem.category}</span>}
            </div>
            <div style={{textAlign:'right'}}>
              <div className="found-price">₹{foundItem.price.toFixed(2)}</div>
              <div style={{fontSize:12,color:'rgba(255,255,255,.45)'}}>Stock: {foundItem.quantity}</div>
            </div>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,color:'rgba(255,255,255,.5)',marginBottom:6,fontWeight:500,textTransform:'uppercase',letterSpacing:'.5px'}}>Quantity</div>
            <div className="qty-ctrl">
              <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q-1))}>−</button>
              <div className="qty-num">{qty}</div>
              <button className="qty-btn" onClick={() => setQty(q => Math.min(foundItem.quantity, q+1))}>+</button>
            </div>
          </div>
          <div className="found-total">
            <span style={{fontSize:13,color:'rgba(255,255,255,.6)'}}>Total</span>
            <span style={{fontSize:22,fontWeight:700}}>₹{(foundItem.price * qty).toFixed(2)}</span>
          </div>
          <div style={{display:'flex',gap:8,marginTop:14}}>
            <button className="btn" style={{flex:1,background:'rgba(255,255,255,.1)',color:'#fff',border:'1px solid rgba(255,255,255,.15)'}} onClick={() => setFoundItem(null)}>Cancel</button>
            <button className="btn btn-accent" style={{flex:2}} onClick={recordSale} disabled={selling}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              {selling ? 'Recording…' : 'Record Sale'}
            </button>
          </div>
        </div>
      )}

      {/* Camera scanner */}
      <div className="card" style={{marginBottom:12}}>
        <div className="card-title" style={{marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:15,height:15}}><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          Camera Scanner
        </div>
        <div className="scanner-box">
          <video ref={videoRef} autoPlay playsInline muted />
          {scanning
            ? <div className="scan-overlay"><div className="scan-frame" /><div className="scan-hint">Point at barcode</div></div>
            : <div className="scan-overlay"><svg viewBox="0 0 24 24" style={{width:40,height:40,color:'rgba(255,255,255,.2)'}} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></svg><span style={{color:'rgba(255,255,255,.25)',fontSize:12}}>Camera off</span></div>
          }
        </div>
        {camError && <div className="cam-error">{camError}</div>}
        <button className="btn btn-primary" style={{width:'100%'}} onClick={scanning ? stopCamera : startCamera}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          {scanning ? 'Stop Camera' : 'Start Camera'}
        </button>
      </div>

      {/* Manual entry */}
      <div className="card">
        <div className="card-title" style={{marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:15,height:15}}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><circle cx="17.5" cy="17.5" r="3.5"/></svg>
          Manual Entry
        </div>
        <div style={{display:'flex',gap:8}}>
          <input className="form-input" style={{flex:1}} inputMode="numeric" placeholder="Enter barcode…" value={manualBc} onChange={e=>setManualBc(e.target.value)} onKeyDown={e=>e.key==='Enter'&&manualSearch()} />
          <button className="btn btn-primary" onClick={manualSearch}>Search</button>
        </div>
      </div>
    </div>
  )
}
