import { AuthProvider } from "./auth/AuthProvider";
import AppRouter from "./router/AppRouter";
import { AnalyticsSessionTracker } from "./components/AnalyticsSessionTracker";
import "./styles/auth.css";

function App() {
  return <AuthProvider><AnalyticsSessionTracker /><AppRouter /></AuthProvider>;
}

export default App;
