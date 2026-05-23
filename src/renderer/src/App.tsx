import Dashboard from './Dashboard'
import Login from './Login'
import { useState } from 'react'

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
  return <Dashboard username={username} />
}

export default App
