import Login from './login/Login'
import { useState } from 'react'
import AppShell from './shell/AppShell'
import { Sesion } from './types'

function App(): React.JSX.Element {
  const [loggedIn, setLoggedIn] = useState<boolean>(false)
  const [user, setUser] = useState<Sesion>({
    id: 0,
    username: 'Indefinido',
    is_admin: false
  })

  const cerrarSesion = (): void => {
    void window.api.logout()
    setLoggedIn(false)
  }

  if (!loggedIn)
    return (
      <Login
        onSuccess={(user: Sesion) => {
          setUser(user)
          setLoggedIn(true)
        }}
      />
    )
  return <AppShell user={user} onLogout={cerrarSesion} />
}

export default App
