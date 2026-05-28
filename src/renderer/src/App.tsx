import Login from './Login'
import { useState } from 'react'
import AppShell from './AppShell'
import { Usuario } from './PanelUsuarios'

function App(): React.JSX.Element {
  // const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')
  const [loggedIn, setLoggedIn] = useState<boolean>(false)
  const [user, setUser] = useState<Usuario>({
    id: 0,
    username: 'Indefinido',
    creado_en: '0000-00-00',
    is_admin: false
  })

  console.log({ user })

  if (!loggedIn)
    return (
      <Login
        onSuccess={(user: Usuario) => {
          setUser(user)
          setLoggedIn(true)
        }}
      />
    )
  return <AppShell user={user} onLogout={() => setLoggedIn(false)} />
}

export default App
