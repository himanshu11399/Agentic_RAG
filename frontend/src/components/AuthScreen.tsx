import { SignIn, SignUp } from "@clerk/react";
import { useState } from "react";

export default function AuthScreen() {
  const [showSignUp, setShowSignUp] = useState(false);

  return (
    <main className="auth-screen">
      <div className="auth-brand">
        <h1>Powerful AI</h1>
        <p>Your personal AI assistant, powered by LangGraph.</p>
      </div>

      {showSignUp ? (
        <>
          <SignUp />
          <p className="auth-switch">
            Already have an account?{" "}
            <button onClick={() => setShowSignUp(false)}>Sign in</button>
          </p>
        </>
      ) : (
        <>
          <SignIn />
          <p className="auth-switch">
            Don't have an account?{" "}
            <button onClick={() => setShowSignUp(true)}>Sign up</button>
          </p>
        </>
      )}
    </main>
  );
}
