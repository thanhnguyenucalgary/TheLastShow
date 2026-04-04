import React, { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { decodeJwt } from "./jwt";
import "./App.css";

function Login({ user, setUser }) {
  if (user) {
    return (
      <div className="login">
        <span className="username">
          Welcome, {user.name || user.given_name}!
        </span>
        <button className="logoutbutton" onClick={() => setUser(null)}>
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="login">
      <GoogleLogin
        onSuccess={(credentialResponse) => {
          if (credentialResponse.credential) {
            const decoded = decodeJwt(credentialResponse.credential);
            setUser(decoded);
            console.log("Decoded JWT:", decoded);
          } else {
            setUser({ name: "Unknown", email: "" });
          }
        }}
        onError={() => {
          console.log("Login Failed");
        }}
        render={(renderProps) => (
          <button
            className="login-button"
            onClick={renderProps.onClick}
            disabled={renderProps.disabled}
            style={{
              background: "#4285F4",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "12px 24px",
              fontWeight: "bold",
              fontSize: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {/* Google icon SVG */}
            <svg width="18" height="18" viewBox="0 0 48 48">
              <g>
                <path
                  fill="#4285F4"
                  d="M44.5 20H24v8.5h11.7C34.7 33.1 29.8 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.5 5.1 29.5 3 24 3 12.9 3 4 11.9 4 23s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.2-4z"
                />
                <path
                  fill="#34A853"
                  d="M6.3 14.7l7 5.1C15.5 16.1 19.4 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.5 5.1 29.5 3 24 3c-7.2 0-13.3 4.1-16.7 10.1z"
                />
                <path
                  fill="#FBBC05"
                  d="M24 43c5.5 0 10.5-1.8 14.3-4.9l-6.6-5.4C29.8 36 24 36 24 36c-5.8 0-10.7-2.9-13.7-7.1l-7 5.4C10.7 40.9 17.1 43 24 43z"
                />
                <path
                  fill="#EA4335"
                  d="M44.5 20H24v8.5h11.7c-1.6 4.1-6.1 7.5-11.7 7.5-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.5 5.1 29.5 3 24 3c-7.2 0-13.3 4.1-16.7 10.1z"
                />
              </g>
            </svg>
            Sign in with Google
          </button>
        )}
      />
    </div>
  );
}

export default Login;
