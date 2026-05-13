import Dashboard from './Dashboard'
import Login from './Login'
import { useState } from 'react'

function App(): React.JSX.Element {
  // const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')
  const [loggedIn, setLoggedIn] = useState<boolean>(false)

  if (!loggedIn) return <Login onSuccess={() => setLoggedIn(true)} />
  return <Dashboard />
}

export default App
