import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:3000";

export default function Login() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSubmitting(true);

    const endpoint = isLoginMode
      ? "/login"
      : "/register";

    try {
      const response = await axios.post(
        `${API_URL}${endpoint}`,
        {
          name,
          password
        }
      );

      const user = response.data.user || {
        name
      };

      localStorage.setItem(
        "user",
        JSON.stringify(user)
      );

      navigate("/dashboard");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to connect to the server."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = () => {
    setIsLoginMode((currentMode) => !currentMode);
    setError("");
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-xl">
        <div className="flex justify-center mb-6">
          <img
            src="/logo.png"
            alt="School Logo"
            className="h-20 object-contain"
          />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            {isLoginMode
              ? "Welcome to EduLITE"
              : "Create an Account"}
          </h1>

          <p className="text-slate-500 text-sm mt-2">
            {isLoginMode
              ? "Sign in to manage student learning records."
              : "Register an account to begin using EduLITE."}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-5 text-sm text-center">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div>
            <label className="block text-slate-700 text-sm font-medium mb-2">
              Username
            </label>

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Enter your username"
              className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              required
            />
          </div>

          <div>
            <label className="block text-slate-700 text-sm font-medium mb-2">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter your password"
              className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg shadow-sm transition"
          >
            {submitting
              ? "Please wait..."
              : isLoginMode
                ? "Sign In"
                : "Register"}
          </button>
        </form>

        <p className="mt-6 text-center text-slate-500 text-sm">
          {isLoginMode
            ? "Don't have an account? "
            : "Already have an account? "}

          <button
            type="button"
            onClick={switchMode}
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            {isLoginMode
              ? "Sign Up"
              : "Log In"}
          </button>
        </p>
      </div>
    </div>
  );
}