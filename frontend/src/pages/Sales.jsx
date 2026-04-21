import { useEffect, useState, useCallback } from 'react'
import api from '../api'
import { useToast } from '../components/Toast'

export default function Sales() {
  const toast = useToast()
  const [sales,   setSales]   = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() =>
    api.get('/sales')
      .then(r => setSales(r.data))
      .catch(() => toast('Failed to load sales', 'error'))
      .finally(() => setLoading(false))
  , [])

  useEffect(() => { load() }, [load])

  const exportCSV = () => {
    if (!sales.length) { toast('No sales to export', 'error'); return }
    const rows = [
      ['Date', 'Item', 'Barcode', 'Price (Rs)', 'Qty', 'Total (Rs)', 'Sold By'],
      ...sales.map(s => [
        new Date(s.sold_at).toLocaleString(),
        s.item_name, s.barcode,
        s.price.toFixed(2), s.quantity,
        (s.price * s.quantity).toFixed(2),
        s.sold_by_name,
      ]),
    ]
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `sales-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    toast('CSV downloaded')
  }

  const totalRev = sales.reduce((s, x) => s + x.price * x.quantity, 0)

  if (loading) return <div className="page"><div className="spinner" style={{margin:'60px auto'}} /></div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Sales</div>
          <div className="page-sub">{sales.length} transactions · ₹{totalRev.toFixed(2)} total</div>
        </div>
        <button className="btn btn-secondary" onClick={exportCSV}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export CSV
        </button>
      </div>

      {sales.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></div>
          <div className="empty-title">No sales yet</div>
          <div className="empty-sub">Use Scan &amp; Sell to record your first sale</div>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {sales.map(s => (
            <div key={s.id} className="sale-item">
              <div style={{minWidth:0}}>
                <div className="sale-name">
                  {s.item_name}
                  <span className="badge badge-gray" style={{marginLeft:6}}>×{s.quantity}</span>
                </div>
                <div className="sale-meta">
                  <span style={{fontFamily:'var(--mono)',fontSize:11}}>{s.barcode}</span>
                  <span>by <strong>{s.sold_by_name}</strong></span>
                  <span>{new Date(s.sold_at).toLocaleString()}</span>
                </div>
              </div>
              <div>
                <div className="sale-total">₹{(s.price * s.quantity).toFixed(2)}</div>
                <div className="sale-unit">₹{s.price.toFixed(2)} each</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
