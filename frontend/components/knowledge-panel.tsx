'use client'

import { useCallback, useEffect, useState } from 'react'
import { X, Plus, BookOpen, Lightbulb, FileText, Palette, Trash2, ArrowLeft, KeyRound, Shield, Users } from 'lucide-react'
import type { AuthUser } from '@/hooks/use-auth'

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '')

interface KnowledgeItem {
  id: string
  title: string
  content: string
  category: 'juhis' | 'naidis' | 'fakt' | 'stiil'
  createdAt: string
}

interface UserListItem {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
  createdAt: string
}

interface PasswordResetRequest {
  id: string
  userId: string
  email: string
  name: string
  note: string
  createdAt: string
}

const CATEGORY_CONFIG = {
  juhis: { label: 'Juhis', icon: BookOpen, description: 'Käitumisjuhised ja reeglid' },
  naidis: { label: 'Näidis', icon: FileText, description: 'Näidistekstid ja -vastused' },
  fakt: { label: 'Fakt', icon: Lightbulb, description: 'Faktid ja teadmised' },
  stiil: { label: 'Stiil', icon: Palette, description: 'Kirjutamise stiil ja toon' },
} as const

interface KnowledgePanelProps {
  authStatus: 'loading' | 'authenticated' | 'anonymous'
  currentUser: AuthUser | null
  isOpen: boolean
  onClose: () => void
  sessionToken: string | null
}

async function getErrorMessage(res: Response, fallback: string) {
  try {
    const data = await res.json()
    return data?.error || fallback
  } catch {
    return fallback
  }
}

export function KnowledgePanel({ authStatus, currentUser, isOpen, onClose, sessionToken }: KnowledgePanelProps) {
  const [items, setItems] = useState<KnowledgeItem[]>([])
  const [users, setUsers] = useState<UserListItem[]>([])
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<KnowledgeItem['category']>('juhis')
  const [isLoading, setIsLoading] = useState(false)
  const [isUsersLoading, setIsUsersLoading] = useState(false)
  const [isResetRequestsLoading, setIsResetRequestsLoading] = useState(false)
  const [roleMutationUserId, setRoleMutationUserId] = useState<string | null>(null)
  const [resetMutationRequestId, setResetMutationRequestId] = useState<string | null>(null)
  const [issuedTemporaryPassword, setIssuedTemporaryPassword] = useState<{ email: string; password: string } | null>(null)
  const [error, setError] = useState('')
  const canManageKnowledge = currentUser?.role === 'admin'

  const accessHint = canManageKnowledge
    ? 'Admin-režiim: saad lisada ja kustutada kirjeid.'
    : authStatus === 'authenticated'
      ? 'Vaaterežiim: teadmistebaasi saavad muuta ainult admin-kasutajad.'
      : 'Avalik vaaterežiim: muutmiseks logi sisse admin-kontoga.'

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/knowledge')
      if (!res.ok) {
        throw new Error(await getErrorMessage(res, 'Teadmiste laadimine ebaõnnestus'))
      }
      const data = await res.json()
      setItems(data)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Teadmiste laadimine ebaõnnestus')
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    if (!sessionToken || !canManageKnowledge) {
      setUsers([])
      return
    }

    setIsUsersLoading(true)

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/users`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      })

      if (!res.ok) {
        throw new Error(await getErrorMessage(res, 'Kasutajate laadimine ebaõnnestus'))
      }

      const data = (await res.json()) as { users?: UserListItem[] }
      setUsers(Array.isArray(data.users) ? data.users : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kasutajate laadimine ebaõnnestus')
    } finally {
      setIsUsersLoading(false)
    }
  }, [canManageKnowledge, sessionToken])

  const fetchResetRequests = useCallback(async () => {
    if (!sessionToken || !canManageKnowledge) {
      setResetRequests([])
      return
    }

    setIsResetRequestsLoading(true)

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/password-reset-requests`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      })

      if (!res.ok) {
        throw new Error(await getErrorMessage(res, 'Parooli reseti taotluste laadimine ebaõnnestus'))
      }

      const data = (await res.json()) as { requests?: PasswordResetRequest[] }
      setResetRequests(Array.isArray(data.requests) ? data.requests : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Parooli reseti taotluste laadimine ebaõnnestus')
    } finally {
      setIsResetRequestsLoading(false)
    }
  }, [canManageKnowledge, sessionToken])

  useEffect(() => {
    if (isOpen && items.length === 0) {
      void fetchItems()
    }
  }, [fetchItems, isOpen, items.length])

  useEffect(() => {
    if (isOpen && canManageKnowledge) {
      void fetchUsers()
      void fetchResetRequests()
    }
  }, [canManageKnowledge, fetchResetRequests, fetchUsers, isOpen])

  useEffect(() => {
    if (!canManageKnowledge) {
      setIsAdding(false)
      setIssuedTemporaryPassword(null)
      setResetRequests([])
      setUsers([])
    }
  }, [canManageKnowledge])

  useEffect(() => {
    if (!isOpen) {
      setIssuedTemporaryPassword(null)
      setError('')
    }
  }, [isOpen])

  const requireAdminSession = () => {
    if (authStatus !== 'authenticated' || !sessionToken) {
      setError('Teadmistebaasi muutmiseks logi sisse admin-kontoga.')
      return false
    }

    if (!canManageKnowledge) {
      setError('Teadmistebaasi saavad muuta ainult admin-kasutajad.')
      return false
    }

    return true
  }

  const handleAdd = async () => {
    if (!title.trim() || !content.trim() || !requireAdminSession()) return

    setError('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, content, category }),
      })

      if (!res.ok) {
        throw new Error(await getErrorMessage(res, 'Kirje salvestamine ebaõnnestus'))
      }

      setTitle('')
      setContent('')
      setIsAdding(false)
      await fetchItems()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kirje salvestamine ebaõnnestus')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!requireAdminSession()) return

    setError('')

    try {
      const res = await fetch(`/api/knowledge?id=${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      })
      if (!res.ok) {
        throw new Error(await getErrorMessage(res, 'Kirje kustutamine ebaõnnestus'))
      }
      await fetchItems()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kirje kustutamine ebaõnnestus')
    }
  }

  const handleRoleChange = async (userId: string, nextRole: UserListItem['role']) => {
    if (!requireAdminSession()) return

    setError('')
    setRoleMutationUserId(userId)

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/users/${userId}/role`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: nextRole }),
      })

      if (!res.ok) {
        throw new Error(await getErrorMessage(res, 'Kasutaja rolli muutmine ebaõnnestus'))
      }

      const data = (await res.json()) as { user?: UserListItem }
      if (!data.user) {
        throw new Error('Kasutaja rolli muutmine ebaõnnestus')
      }

      setUsers((currentUsers) => currentUsers.map((user) => (user.id === data.user?.id ? data.user : user)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kasutaja rolli muutmine ebaõnnestus')
    } finally {
      setRoleMutationUserId(null)
    }
  }

  const handleIssueTemporaryPassword = async (request: PasswordResetRequest) => {
    if (!requireAdminSession()) return

    setError('')
    setIssuedTemporaryPassword(null)
    setResetMutationRequestId(request.id)

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/password-reset-requests/${request.id}/issue-temp-password`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      })

      if (!res.ok) {
        throw new Error(await getErrorMessage(res, 'Ajutise parooli loomine ebaõnnestus'))
      }

      const data = (await res.json()) as { temporaryPassword?: string }
      if (!data.temporaryPassword) {
        throw new Error('Ajutise parooli loomine ebaõnnestus')
      }

      setIssuedTemporaryPassword({ email: request.email, password: data.temporaryPassword })
      setResetRequests((currentRequests) => currentRequests.filter((current) => current.id !== request.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ajutise parooli loomine ebaõnnestus')
    } finally {
      setResetMutationRequestId(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto flex h-full w-full max-w-lg flex-col bg-card border-l border-border shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Teadmistebaas</h2>
              <p className="text-xs text-muted-foreground">{items.length} kirjet</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{accessHint}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canManageKnowledge ? (
              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus className="h-3 w-3" />
                Lisa
              </button>
            ) : (
              <div className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-[11px] text-muted-foreground">
                Ainult vaatamine
              </div>
            )}
            <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="border-b border-destructive/20 bg-destructive/10 px-5 py-3 text-xs text-destructive">
            {error}
          </div>
        )}

        {canManageKnowledge && (
          <div className="border-b border-border px-5 py-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Kasutajarollid</h3>
                <p className="text-[11px] text-muted-foreground">valdokendla@gmail.com on selles projektis püsiv admin.</p>
              </div>
            </div>

            {isUsersLoading ? (
              <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-xs text-muted-foreground">
                Kasutajate nimekiri laadib...
              </div>
            ) : users.length === 0 ? (
              <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-xs text-muted-foreground">
                Kasutajaid ei ole veel registreeritud.
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((user) => {
                  const isCurrentUser = currentUser?.id === user.id
                  const isLockedAdmin = user.email === 'valdokendla@gmail.com'
                  const isBusy = roleMutationUserId === user.id

                  return (
                    <div key={user.id} className="rounded-xl border border-border bg-secondary/35 px-3 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{user.name}</span>
                            <span className={user.role === 'admin' ? 'inline-flex items-center rounded-full border border-cyan-200/18 bg-cyan-300/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-50' : 'inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground'}>
                              {user.role === 'admin' ? 'Admin' : 'Kasutaja'}
                            </span>
                            {isLockedAdmin ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                                <Shield className="h-3 w-3" />
                                Põhiadmin
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{user.email}</p>
                          {isCurrentUser ? (
                            <p className="mt-1 text-[11px] text-muted-foreground">Sinu aktiivne konto</p>
                          ) : null}
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            onClick={() => handleRoleChange(user.id, 'user')}
                            disabled={isBusy || user.role === 'user' || isCurrentUser || isLockedAdmin}
                            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            Kasutaja
                          </button>
                          <button
                            onClick={() => handleRoleChange(user.id, 'admin')}
                            disabled={isBusy || user.role === 'admin'}
                            className="rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            {isBusy ? 'Uuendan...' : 'Admin'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {canManageKnowledge && (
          <div className="border-b border-border px-5 py-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <KeyRound className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Parooli reseti taotlused</h3>
                <p className="text-[11px] text-muted-foreground">Admin loob siit ajutise parooli ja jagab selle kasutajale turvalise kanali kaudu.</p>
              </div>
            </div>

            {issuedTemporaryPassword ? (
              <div className="mb-3 rounded-xl border border-emerald-400/20 bg-emerald-400/8 px-4 py-3 text-sm text-emerald-100">
                <p className="font-medium">Ajutine parool loodud: {issuedTemporaryPassword.email}</p>
                <p className="mt-1 break-all font-mono text-emerald-50">{issuedTemporaryPassword.password}</p>
                <p className="mt-2 text-xs text-emerald-100/80">Jaga see kasutajale eraldi kanali kaudu. Pärast sisselogimist peaks ta kohe kasutama “Muuda parooli”.</p>
              </div>
            ) : null}

            {isResetRequestsLoading ? (
              <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-xs text-muted-foreground">
                Parooli reseti taotlused laadivad...
              </div>
            ) : resetRequests.length === 0 ? (
              <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-xs text-muted-foreground">
                Ootel parooli reseti taotlusi ei ole.
              </div>
            ) : (
              <div className="space-y-2">
                {resetRequests.map((request) => {
                  const isBusy = resetMutationRequestId === request.id

                  return (
                    <div key={request.id} className="rounded-xl border border-border bg-secondary/35 px-3 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{request.name}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{request.email}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">Taotlus loodud: {new Date(request.createdAt).toLocaleString('et-EE')}</p>
                          {request.note ? (
                            <p className="mt-2 rounded-lg border border-border bg-background/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                              {request.note}
                            </p>
                          ) : null}
                        </div>

                        <button
                          onClick={() => handleIssueTemporaryPassword(request)}
                          disabled={isBusy}
                          className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {isBusy ? 'Loon...' : 'Loo ajutine parool'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Add Form */}
        {isAdding && canManageKnowledge && (
          <div className="border-b border-border p-5">
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Pealkiri..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="flex flex-wrap gap-2">
                {(Object.keys(CATEGORY_CONFIG) as Array<keyof typeof CATEGORY_CONFIG>).map((key) => {
                  const config = CATEGORY_CONFIG[key]
                  const Icon = config.icon
                  return (
                    <button
                      key={key}
                      onClick={() => setCategory(key)}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                        category === key
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </button>
                  )
                })}
              </div>
              <textarea
                placeholder="Sisu... (nt juhised, näidistekst või faktid)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                className="w-full resize-none rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setIsAdding(false); setTitle(''); setContent('') }}
                  className="rounded-lg bg-secondary px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Tühista
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!title.trim() || !content.trim() || isLoading}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {isLoading ? 'Salvestamine...' : 'Salvesta'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Teadmistebaas on tühi</p>
              <p className="mt-1 text-xs text-muted-foreground">Lisa juhiseid, näidiseid ja fakte, et assistent oskaks paremini vastata.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map((item) => {
                const config = CATEGORY_CONFIG[item.category]
                const Icon = config.icon
                return (
                  <div key={item.id} className="group rounded-xl border border-border bg-secondary/40 p-4 transition-colors hover:bg-secondary/60">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Icon className="h-3 w-3" />
                        </div>
                        <div>
                          <span className="text-xs font-medium text-foreground">{item.title}</span>
                          <span className="ml-2 text-[10px] text-muted-foreground">{config.label}</span>
                        </div>
                      </div>
                      {canManageKnowledge ? (
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="rounded-md p-1 text-muted-foreground opacity-0 transition-all hover:text-destructive group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-3">{item.content}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
