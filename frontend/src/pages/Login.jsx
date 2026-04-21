import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import axios from 'axios'

const PAD = ['1','2','3','4','5','6','7','8','9','','0','⌫']

function PinDots({ val, error }) {
  return (
    <div className="pin-dots">
      {[0,1,2,3].map(i => (
        <div key={i} className={`pin-dot${val.length > i && !error ? ' filled' : ''}${error ? ' error' : ''}`} />
      ))}
    </div>
  )
}

function PinNumpad({ onKey, disabled }) {
  return (
    <div className="pin-numpad">
      {PAD.map((k, i) =>
        k === '' ? <div key={i} className="pin-key empty" /> :
        <button key={i} className={`pin-key${k === '⌫' ? ' del' : ''}`}
          onClick={() => !disabled && onKey(k)} disabled={disabled}>
          {k}
        </button>
      )}
    </div>
  )
}

// ── SETUP FLOW ────────────────────────────────────────────────
function FirstSetup({ onDone }) {
  const toast = useToast()
  const [step, setStep]   = useState('name')
  const [name, setName]   = useState('')
  const [pin,  setPin]    = useState('')
  const [conf, setConf]   = useState('')
  const [loading, setLoading] = useState(false)

  const handlePinKey = (k, current, setter, onFull) => {
    if (k === '⌫') { setter(current.slice(0, -1)); return }
    if (current.length >= 4) return
    const next = current + k
    setter(next)
    if (next.length === 4) setTimeout(() => onFull(next), 80)
  }

  const doCreate = async (confirmedPin) => {
    if (confirmedPin !== pin) { toast("PINs don't match", 'error'); setStep('pin'); setPin(''); setConf(''); return }
    setLoading(true)
    try {
      await axios.post('/api/employees', { name: name.trim(), pin, role: 'admin', admin_pin: '' })
      toast('Admin account created! Please log in.')
      onDone()
    } catch (e) {
      toast(e.response?.data?.detail || 'Error creating account', 'error')
    } finally { setLoading(false) }
  }

  return (
    <div className="login-screen">
      <div className="login-logo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><circle cx="17.5" cy="17.5" r="3.5"/></svg></div>
      <div className="login-title">Welcome to StockScan</div>
      <div className="login-sub" style={{marginBottom:28}}>Create your admin account to get started</div>

      {step === 'name' && (
        <div className="setup-wrap">
          <input className="setup-input" placeholder="Your name" value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && setStep('pin')} autoFocus />
          <button className="setup-btn" disabled={!name.trim()} onClick={() => setStep('pin')}>Continue →</button>
        </div>
      )}

      {step === 'pin' && (
        <div className="pin-wrap">
          <p style={{color:'rgba(255,255,255,.6)',fontSize:14,textAlign:'center'}}>Hi {name}, choose a 4-digit admin PIN</p>
          <PinDots val={pin} />
          <PinNumpad onKey={k => handlePinKey(k, pin, setPin, () => setStep('confirm'))} />
        </div>
      )}

      {step === 'confirm' && (
        <div className="pin-wrap">
          <p style={{color:'rgba(255,255,255,.6)',fontSize:14,textAlign:'center'}}>Confirm your PIN</p>
          <PinDots val={conf} />
          <div className="pin-error">&nbsp;</div>
          <PinNumpad disabled={loading} onKey={k => handlePinKey(k, conf, setConf, doCreate)} />
          <button className="pin-back" onClick={() => { setStep('pin'); setPin(''); setConf('') }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>Re-enter PIN
          </button>
        </div>
      )}
    </div>
  )
}

// ── MAIN LOGIN ────────────────────────────────────────────────
export default function Login() {
  const { login } = useAuth()
  const navigate   = useNavigate()
  const toast      = useToast()
  const [employees, setEmployees] = useState(null)
  const [selected,  setSelected]  = useState(null)
  const [pin,       setPin]       = useState('')
  const [error,     setError]     = useState(false)
  const [checking,  setChecking]  = useState(false)

  const loadEmps = async () => {
    try { const r = await axios.get('/api/employees/public'); setEmployees(r.data) }
    catch { toast('Cannot reach server. Make sure the backend is running.', 'error'); setEmployees([]) }
  }

  useEffect(() => { loadEmps() }, [])

  const handlePinKey = (k) => {
    if (checking) return
    if (k === '⌫') { setPin(p => p.slice(0, -1)); setError(false); return }
    if (pin.length >= 4) return
    const next = pin + k
    setPin(next)
    setError(false)
    if (next.length === 4) setTimeout(() => doLogin(next), 80)
  }

  const doLogin = async (p) => {
    setChecking(true)
    try {
      const r = await axios.post('/api/auth/login', { name: selected.name, pin: p })
      login(r.data.employee, r.data.token)
      navigate('/')
    } catch {
      setError(true)
      setTimeout(() => { setPin(''); setError(false) }, 700)
    } finally { setChecking(false) }
  }

  if (employees === null) return <div className="loading-screen"><div className="spinner" /></div>
  if (employees.length === 0) return <FirstSetup onDone={loadEmps} />

  if (!selected) return (
    <div className="login-screen">
      <div className="login-logo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><circle cx="17.5" cy="17.5" r="3.5"/></svg></div>
      <div className="login-title">StockScan</div>
      <div className="login-sub">Select your profile</div>
      <div className="emp-grid">
        {employees.map(e => (
          <button key={e.id} className="emp-card" onClick={() => { setSelected(e); setPin(''); setError(false) }}>
            <div className="emp-avatar">{e.name.charAt(0)}</div>
            <div className="emp-card-name">{e.name}</div>
            {e.role === 'admin' && <div className="emp-card-role">Admin</div>}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="login-screen">
      <div className="pin-wrap">
        <button className="pin-back" onClick={() => { setSelected(null); setPin(''); setError(false) }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <div className="pin-who">
          <div className="pin-who-avatar">{selected.name.charAt(0)}</div>
          <div className="pin-who-name">{selected.name}</div>
          <div className="pin-who-hint">Enter your 4-digit PIN</div>
        </div>
        <PinDots val={pin} error={error} />
        <div className="pin-error">{error ? 'Incorrect PIN, try again' : '\u00A0'}</div>
        <PinNumpad onKey={handlePinKey} disabled={checking} />
      </div>
    </div>
  )
}
