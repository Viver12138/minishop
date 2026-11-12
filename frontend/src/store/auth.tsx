import React, { createContext, useContext, useMemo, useState, useEffect } from 'react'
import type { User } from '../types'
import { authApi } from '../api'
import { dataOf } from '../api/client'

interface AuthCtx {
  user: User | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  register: (data: any) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
}

const Ctx = createContext<AuthCtx>(null as any)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      return JSON.parse(localStorage.getItem('minishop_user') || 'null')
    } catch {
      return null
    }
  })
  const [token, setToken] = useState<string | null>(localStorage.getItem('minishop_token'))

  // 尝试用现有 token 拉取用户信息
  useEffect(() => {
    if (token && !user) {
      authApi.me().then((r) => {
        const u = dataOf<User>(r)
        setUser(u)
        localStorage.setItem('minishop_user', JSON.stringify(u))
      }).catch(() => {
        setToken(null)
        localStorage.removeItem('minishop_token')
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = async (username: string, password: string) => {
    const r = await authApi.login(username, password)
    const d = r.data.data
    localStorage.setItem('minishop_token', d.token)
    localStorage.setItem('minishop_user', JSON.stringify(d.user))
    setToken(d.token)
    setUser(d.user)
  }

  const register = async (data: any) => {
    await authApi.register(data)
    // 注册后自动登录
    await login(data.username, data.password)
  }

  const logout = () => {
    localStorage.removeItem('minishop_token')
    localStorage.removeItem('minishop_user')
    setToken(null)
    setUser(null)
  }

  const refresh = async () => {
    const r = await authApi.me()
    const u = dataOf<User>(r)
    setUser(u)
    localStorage.setItem('minishop_user', JSON.stringify(u))
  }

  const value = useMemo(
    () => ({ user, token, login, register, logout, refresh }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, token],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  return useContext(Ctx)
}