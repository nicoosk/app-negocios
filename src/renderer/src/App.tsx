import Login from './Login'
import { useState } from 'react'
import AppShell from './AppShell'

function App(): React.JSX.Element {
  // const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')
  const [loggedIn, setLoggedIn] = useState<boolean>(false)
  const [username, setUsername] = useState<string>('Indefinido')

  if (!loggedIn)
    return (
      <Login
        onSuccess={(username: string) => {
          setUsername(username)
          setLoggedIn(true)
        }}
      />
    )
  return (
    <AppShell
      username={username}
      isAdmin={username === 'admin'}
      onLogout={() => setLoggedIn(false)}
    />
  )
}

export default App
