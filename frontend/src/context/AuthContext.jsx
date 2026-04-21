import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [employee, setEmployee] = useState(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('ss_token')
    const saved = localStorage.getItem('ss_employee')
    if (token && saved) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      setEmployee(JSON.parse(saved))
    }
    setLoading(false)
  }, [])

  const login = (emp, token) => {
    setEmployee(emp)
    localStorage.setItem('ss_token', token)
    localStorage.setItem('ss_employee', JSON.stringify(emp))
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  const logout = () => {
    setEmployee(null)
    localStorage.removeItem('ss_token')
    localStorage.removeItem('ss_employee')
    delete axios.defaults.headers.common['Authorization']
  }

  return <Ctx.Provider value={{ employee, loading, login, logout }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
