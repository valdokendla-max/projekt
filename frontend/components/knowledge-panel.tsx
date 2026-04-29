'use client'

import { useCallback, useEffect, useState } from 'react'
import { X, Plus, BookOpen, Lightbulb, FileText, Palette, Trash2, ArrowLeft, KeyRound, Shield, Users } from 'lucide-react'
import { getClientBackendUrl } from '@/lib/backend-url'
import type { AuthUser } from '@/hooks/use-auth'

type UiLanguage = 'et' | 'en'

const BACKEND_URL = getClientBackendUrl()

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
  juhis: { icon: BookOpen },
  naidis: { icon: FileText },
  fakt: { icon: Lightbulb },
  stiil: { icon: Palette },
} as const

interface KnowledgePanelProps {
  authStatus: 'loading' | 'authenticated' | 'anonymous'
  currentUser: AuthUser | null
  isOpen: boolean
  language?: UiLanguage
  onClose: () => void
  sessionToken: string | null
}

const KNOWLEDGE_COPY = {
  et: {
    categoryLabels: {
      juhis: 'Juhis',
      naidis: 'Näidis',
      fakt: 'Fakt',
      stiil: 'Stiil',
    },
    accessAdmin: 'Admin-režiim: saad lisada ja kustutada kirjeid.',
    accessViewer: 'Vaaterežiim: teadmistebaasi saavad muuta ainult admin-kasutajad.',
    accessPublic: 'Avalik vaaterežiim: muutmiseks logi sisse admin-kontoga.',
    knowledgeLoadFailed: 'Teadmiste laadimine ebaõnnestus',
    usersLoadFailed: 'Kasutajate laadimine ebaõnnestus',
    resetRequestsLoadFailed: 'Parooli taastamise staatuse laadimine ebaõnnestus',
    adminLoginRequired: 'Teadmistebaasi muutmiseks logi sisse admin-kontoga.',
    adminOnly: 'Teadmistebaasi saavad muuta ainult admin-kasutajad.',
    saveEntryFailed: 'Kirje salvestamine ebaõnnestus',
    deleteEntryFailed: 'Kirje kustutamine ebaõnnestus',
    changeRoleFailed: 'Kasutaja rolli muutmine ebaõnnestus',
    issueTempFailed: 'Parooli taastamise info laadimine ebaõnnestus',
    title: 'Teadmistebaas',
    entries: 'kirjet',
    add: 'Lisa',
    viewOnly: 'Ainult vaatamine',
    rolesTitle: 'Kasutajarollid',
    rolesHint: 'valdokendla@gmail.com on selles projektis püsiv admin.',
    usersLoading: 'Kasutajate nimekiri laadib...',
    usersEmpty: 'Kasutajaid ei ole veel registreeritud.',
    user: 'Kasutaja',
    primaryAdmin: 'Põhiadmin',
    activeAccount: 'Sinu aktiivne konto',
    updating: 'Uuendan...',
    passwordResetTitle: 'Parooli taastamine',
    passwordResetHint: 'Kasutaja saab taastamislingi otse e-postile. Admin ei pea enam käsitsi ajutist parooli looma.',
    tempCreated: 'E-posti saatmine:',
    tempShare: 'Selle voo toimimiseks lisa backendile SMTP seaded. Siis saadetakse nii registreerimise teavitus kui ka parooli taastamise link automaatselt.',
    resetLoading: 'Kontrollin e-posti seadistust...',
    resetEmpty: 'Admini käsitsi parooli reseti järjekord on asendatud automaatse e-posti taastamisega.',
    requestCreated: 'Seis',
    creating: 'Kontrollin...',
    createTemp: 'Vaata seisu',
    titlePlaceholder: 'Pealkiri...',
    contentPlaceholder: 'Sisu... (nt juhised, näidistekst või faktid)',
    cancel: 'Tühista',
    saving: 'Salvestamine...',
    save: 'Salvesta',
    emptyTitle: 'Teadmistebaas on tühi',
    emptyDescription: 'Lisa juhiseid, näidiseid ja fakte, et assistent oskaks paremini vastata.',
    dateLocale: 'et-EE',
  },
  en: {
    categoryLabels: {
      juhis: 'Guide',
      naidis: 'Example',
      fakt: 'Fact',
      stiil: 'Style',
    },
    accessAdmin: 'Admin mode: you can add and delete entries.',
    accessViewer: 'View mode: only admin users can modify the knowledge base.',
    accessPublic: 'Public view mode: sign in with an admin account to make changes.',
    knowledgeLoadFailed: 'Failed to load knowledge entries',
    usersLoadFailed: 'Failed to load users',
    resetRequestsLoadFailed: 'Failed to load password reset status',
    adminLoginRequired: 'Sign in with an admin account to modify the knowledge base.',
    adminOnly: 'Only admin users can modify the knowledge base.',
    saveEntryFailed: 'Failed to save entry',
    deleteEntryFailed: 'Failed to delete entry',
    changeRoleFailed: 'Failed to change user role',
    issueTempFailed: 'Failed to load password reset information',
    title: 'Knowledge base',
    entries: 'entries',
    add: 'Add',
    viewOnly: 'View only',
    rolesTitle: 'User roles',
    rolesHint: 'valdokendla@gmail.com is a permanent admin in this project.',
    usersLoading: 'Loading users...',
    usersEmpty: 'No users have registered yet.',
    user: 'User',
    primaryAdmin: 'Primary admin',
    activeAccount: 'Your active account',
    updating: 'Updating...',
    passwordResetTitle: 'Password recovery',
    passwordResetHint: 'Users now receive the reset link directly by email. Admin no longer needs to create temporary passwords manually.',
    tempCreated: 'Email delivery:',
    tempShare: 'To make this flow work, add SMTP settings to the backend. Registration notifications and password reset links will then be sent automatically.',
    resetLoading: 'Checking email configuration...',
    resetEmpty: 'The manual admin reset queue has been replaced with automatic email-based recovery.',
    requestCreated: 'Status',
    creating: 'Checking...',
    createTemp: 'View status',
    titlePlaceholder: 'Title...',
    contentPlaceholder: 'Content... (for example guides, sample text, or facts)',
    cancel: 'Cancel',
    saving: 'Saving...',
    save: 'Save',
    emptyTitle: 'The knowledge base is empty',
    emptyDescription: 'Add guides, examples, and facts so the assistant can respond better.',
    dateLocale: 'en-GB',
  },
} satisfies Record<UiLanguage, {
  categoryLabels: Record<KnowledgeItem['category'], string>
  accessAdmin: string
  accessViewer: string
  accessPublic: string
  knowledgeLoadFailed: string
  usersLoadFailed: string
  resetRequestsLoadFailed: string
  adminLoginRequired: string
  adminOnly: string
  saveEntryFailed: string
  deleteEntryFailed: string
  changeRoleFailed: string
  issueTempFailed: string
  title: string
  entries: string
  add: string
  viewOnly: string
  rolesTitle: string
  rolesHint: string
  usersLoading: string
  usersEmpty: string
  user: string
  primaryAdmin: string
  activeAccount: string
  updating: string
  passwordResetTitle: string
  passwordResetHint: string
  tempCreated: string
  tempShare: string
  resetLoading: string
  resetEmpty: string
  requestCreated: string
  creating: string
  createTemp: string
  titlePlaceholder: string
  contentPlaceholder: string
  cancel: string
  saving: string
  save: string
  emptyTitle: string
  emptyDescription: string
  dateLocale: string
}>

async function getErrorMessage(res: Response, fallback: string) {
  try {
    const data = await res.json()
    return data?.error || fallback
  } catch {
    return fallback
  }
}

export function KnowledgePanel({ authStatus, currentUser, isOpen, language = 'et', onClose, sessionToken }: KnowledgePanelProps) {
  const copy = KNOWLEDGE_COPY[language]
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
    ? copy.accessAdmin
    : authStatus === 'authenticated'
      ? copy.accessViewer
      : copy.accessPublic

  const fetchItems = useCallback(async () => {
    if (!sessionToken || !canManageKnowledge) {
      setItems([])
      return
    }

    try {
      const res = await fetch('/api/knowledge', {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      })
      if (!res.ok) {
        throw new Error(await getErrorMessage(res, copy.knowledgeLoadFailed))
      }
      const data = await res.json()
      setItems(data)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.knowledgeLoadFailed)
    }
  }, [canManageKnowledge, copy.knowledgeLoadFailed, sessionToken])

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
        throw new Error(await getErrorMessage(res, copy.usersLoadFailed))
      }

      const data = (await res.json()) as { users?: UserListItem[] }
      setUsers(Array.isArray(data.users) ? data.users : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.usersLoadFailed)
    } finally {
      setIsUsersLoading(false)
    }
  }, [canManageKnowledge, copy.usersLoadFailed, sessionToken])

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
        throw new Error(await getErrorMessage(res, copy.resetRequestsLoadFailed))
      }

      const data = (await res.json()) as { requests?: PasswordResetRequest[] }
      setResetRequests(Array.isArray(data.requests) ? data.requests : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.resetRequestsLoadFailed)
    } finally {
      setIsResetRequestsLoading(false)
    }
  }, [canManageKnowledge, copy.resetRequestsLoadFailed, sessionToken])

  useEffect(() => {
    if (isOpen && items.length === 0) {
      void fetchItems()
    }
  }, [fetchItems, isOpen, items.length])

  useEffect(() => {
    if (isOpen && canManageKnowledge) {
      void fetchUsers()
    }
  }, [canManageKnowledge, fetchUsers, isOpen])

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
      setError(copy.adminLoginRequired)
      return false
    }

    if (!canManageKnowledge) {
      setError(copy.adminOnly)
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
        throw new Error(await getErrorMessage(res, copy.saveEntryFailed))
      }

      setTitle('')
      setContent('')
      setIsAdding(false)
      await fetchItems()
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.saveEntryFailed)
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
        throw new Error(await getErrorMessage(res, copy.deleteEntryFailed))
      }
      await fetchItems()
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.deleteEntryFailed)
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
        throw new Error(await getErrorMessage(res, copy.changeRoleFailed))
      }

      const data = (await res.json()) as { user?: UserListItem }
      if (!data.user) {
        throw new Error(copy.changeRoleFailed)
      }

      setUsers((currentUsers) => currentUsers.map((user) => (user.id === data.user?.id ? data.user : user)))
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.changeRoleFailed)
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
        throw new Error(await getErrorMessage(res, copy.issueTempFailed))
      }

      const data = (await res.json()) as { temporaryPassword?: string }
      if (!data.temporaryPassword) {
        throw new Error(copy.issueTempFailed)
      }

      setIssuedTemporaryPassword({ email: request.email, password: data.temporaryPassword })
      setResetRequests((currentRequests) => currentRequests.filter((current) => current.id !== request.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.issueTempFailed)
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
              <h2 className="text-sm font-semibold text-foreground">{copy.title}</h2>
              <p className="text-xs text-muted-foreground">{items.length} {copy.entries}</p>
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
                {copy.add}
              </button>
            ) : (
              <div className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-[11px] text-muted-foreground">
                {copy.viewOnly}
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
                <h3 className="text-sm font-semibold text-foreground">{copy.rolesTitle}</h3>
                <p className="text-[11px] text-muted-foreground">{copy.rolesHint}</p>
              </div>
            </div>

            {isUsersLoading ? (
              <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-xs text-muted-foreground">
                {copy.usersLoading}
              </div>
            ) : users.length === 0 ? (
              <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-xs text-muted-foreground">
                {copy.usersEmpty}
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
                              {user.role === 'admin' ? 'Admin' : copy.user}
                            </span>
                            {isLockedAdmin ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                                <Shield className="h-3 w-3" />
                                {copy.primaryAdmin}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{user.email}</p>
                          {isCurrentUser ? (
                            <p className="mt-1 text-[11px] text-muted-foreground">{copy.activeAccount}</p>
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
                            {isBusy ? copy.updating : 'Admin'}
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
                <h3 className="text-sm font-semibold text-foreground">{copy.passwordResetTitle}</h3>
                <p className="text-[11px] text-muted-foreground">{copy.passwordResetHint}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-xs text-muted-foreground">
              <p>{copy.resetEmpty}</p>
              <p className="mt-2">{copy.tempShare}</p>
            </div>
          </div>
        )}

        {/* Add Form */}
        {isAdding && canManageKnowledge && (
          <div className="border-b border-border p-5">
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder={copy.titlePlaceholder}
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
                      {copy.categoryLabels[key]}
                    </button>
                  )
                })}
              </div>
              <textarea
                placeholder={copy.contentPlaceholder}
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
                  {copy.cancel}
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!title.trim() || !content.trim() || isLoading}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {isLoading ? copy.saving : copy.save}
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
              <p className="text-sm text-muted-foreground">{copy.emptyTitle}</p>
              <p className="mt-1 text-xs text-muted-foreground">{copy.emptyDescription}</p>
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
                          <span className="ml-2 text-[10px] text-muted-foreground">{copy.categoryLabels[item.category]}</span>
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
