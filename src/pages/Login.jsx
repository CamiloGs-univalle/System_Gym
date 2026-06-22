import HeroPanel from "../components/auth/HeroPanel";
import LoginPanel from "../components/auth/LoginPanel";
import "../styles/login.css";

export default function Login() {
  return (
    <div className="login-page">
      <HeroPanel />
      <LoginPanel />
    </div>
  );
}