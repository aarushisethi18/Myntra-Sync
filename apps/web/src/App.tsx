import { AuthProvider } from "./auth/AuthProvider";
import AppRouter from "./router/AppRouter";
import "./styles/auth.css";

function App() {
  return <AuthProvider><AppRouter /></AuthProvider>;
}

export default App;
