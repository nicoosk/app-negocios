import Login from './login/Login'
import { useState } from 'react'
import AppShell from './shell/AppShell'
import { Sesion } from './types'

function App(): React.JSX.Element {
  const [user, setUser] = useState<Sesion | null>(null)

  const cerrarSesion = (): void => {
    void window.api.logout()
    setUser(null)
  }

  if (!user) return <Login onSuccess={setUser} />
  return <AppShell user={user} onLogout={cerrarSesion} />
}

export default App
