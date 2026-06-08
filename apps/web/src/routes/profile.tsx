import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { queryClient } from '@/utils/orpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

export const Route = createFileRoute('/profile')({
  head: () => ({
    meta: [
      { title: 'Profil — MyApp' },
      { name: 'description', content: 'Gérez votre profil' },
    ],
  }),
  component: ProfilePage,
})

function ProfilePage() {
  const navigate = useNavigate()
  const { data: session, isPending } = authClient.useSession()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!session?.user) return
    setName(session.user.name ?? '')
    setEmail(session.user.email ?? '')
    setImage(session.user.image ?? null)
  }, [session?.user?.id])

  const hasSession = !!session?.user
  const initial = useMemo(() => {
    const n = (name || session?.user?.name || '').trim()
    return n ? n[0]!.toUpperCase() : '?'
  }, [name, session?.user?.name])

  function handlePickPhoto() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImage(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!hasSession) return
    setError(null)
    setIsSaving(true)

    const call = (fn: (resolve: () => void, reject: (msg: string) => void) => void) =>
      new Promise<void>((resolve, reject) => {
        fn(resolve, (msg) => reject(new Error(msg)))
      })

    try {
      const nameChanged = name.trim() && name.trim() !== (session?.user?.name ?? '')
      const imageChanged = (image ?? null) !== (session?.user?.image ?? null)
      if (nameChanged || imageChanged) {
        await call((resolve, reject) => {
          authClient.updateUser(
            { name: name.trim(), image },
            {
              onError: (e: any) => reject(e.error?.message || 'Failed to update user'),
              onSuccess: () => resolve(),
            },
          )
        })
      }

      const emailChanged = email.trim() && email.trim() !== (session?.user?.email ?? '')
      if (emailChanged) {
        await call((resolve, reject) => {
          authClient.changeEmail(
            { newEmail: email.trim() },
            {
              onError: (e: any) => reject(e.error?.message || 'Failed to change email'),
              onSuccess: () => resolve(),
            },
          )
        })
      }

      const wantsPasswordChange = currentPassword.trim() || newPassword.trim()
      if (wantsPasswordChange) {
        if (!currentPassword.trim() || !newPassword.trim()) {
          throw new Error('Please fill both current and new password.')
        }
        await call((resolve, reject) => {
          authClient.changePassword(
            { currentPassword, newPassword },
            {
              onError: (e: any) => reject(e.error?.message || 'Failed to change password'),
              onSuccess: () => resolve(),
            },
          )
        })
        setCurrentPassword('')
        setNewPassword('')
      }

      await queryClient.invalidateQueries()
      setIsSaving(false)
      setIsEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
      setIsSaving(false)
    }
  }

  async function handleLogout() {
    await authClient.signOut()
    queryClient.clear()
    navigate({ to: '/login' })
  }

  function handleDeleteAccount() {
    if (!hasSession || isDeleting) return
    const ok = window.confirm('Delete account\n\nCette action est irréversible. Continuer ?')
    if (!ok) return
    setIsDeleting(true)
    setError(null)
    authClient.deleteUser(
      { password: currentPassword.trim() ? currentPassword : undefined },
      {
        onError: (e: any) => {
          setError(e.error?.message || 'Failed to delete user')
          setIsDeleting(false)
        },
        onSuccess: () => {
          queryClient.clear()
          navigate({ to: '/login' })
        },
      },
    )
  }

  return (
    <div className="container mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Profil</h1>

      {!hasSession ? (
        <Card className="p-4">
          <p className="text-muted-foreground">Connecte-toi pour modifier ton profil.</p>
        </Card>
      ) : !isEditing ? (
        <div className="space-y-4">
          <Card className="p-6">
            <div className="flex flex-col items-center gap-3">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {image ? (
                  <img src={image} alt="avatar" className="w-24 h-24 object-cover" />
                ) : (
                  <span className="text-3xl font-bold">{initial}</span>
                )}
              </div>
              <p className="font-medium">{session?.user?.name ?? ''}</p>
              <p className="text-muted-foreground text-sm">{session?.user?.email ?? ''}</p>
            </div>
          </Card>

          <Card className="p-4 cursor-pointer hover:bg-accent" onClick={() => setIsEditing(true)}>
            <p className="font-medium">Modifier mon profil</p>
            <p className="text-muted-foreground text-sm">Nom, email, photo, mot de passe</p>
          </Card>

          <Card className="p-4 cursor-pointer hover:bg-accent" onClick={handleLogout}>
            <p className="font-medium">Log out</p>
          </Card>

          <Card className="p-4 cursor-pointer hover:bg-accent" onClick={handleDeleteAccount}>
            <p className="font-medium text-red-500">Delete my account</p>
            <p className="text-muted-foreground text-sm">
              {isDeleting ? 'Suppression…' : 'Cette action est irréversible'}
            </p>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="p-4 cursor-pointer hover:bg-accent" onClick={() => setIsEditing(false)}>
            <p className="font-medium">← Retour</p>
          </Card>

          <Card className="p-6">
            <div className="flex flex-col items-center gap-3">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {image ? (
                  <img src={image} alt="avatar" className="w-24 h-24 object-cover" />
                ) : (
                  <span className="text-3xl font-bold">{initial}</span>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <button onClick={handlePickPhoto} className="text-sm underline">Edit photo</button>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="font-medium">Edit Info</h2>
            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" type="email" />
            </div>

            <div className="space-y-2">
              <Label>Current password</Label>
              <Input value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" type="password" />
            </div>

            <div className="space-y-2">
              <Label>New password</Label>
              <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" type="password" />
            </div>

            <Button onClick={handleSave} disabled={isSaving || isPending} className="w-full">
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </Card>

          <Card className="p-4 cursor-pointer hover:bg-accent" onClick={handleLogout}>
            <p className="font-medium">Log out</p>
          </Card>

          <Card className="p-4 cursor-pointer hover:bg-accent" onClick={handleDeleteAccount}>
            <p className="font-medium text-red-500">Delete my account</p>
            <p className="text-muted-foreground text-sm">
              {isDeleting ? 'Suppression…' : 'Cette action est irréversible'}
            </p>
          </Card>
        </div>
      )}
    </div>
  )
}