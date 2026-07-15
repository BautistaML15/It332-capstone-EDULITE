import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

// This points to your Node.js backend port
const API_URL = "http://localhost:3000"; 

export default function Login() {
  // State variables to hold user input and UI status
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  
  // React Router hook to redirect the user after a successful login
  const navigate = useNavigate();

  // Core function to handle the form submission
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevents the page from refreshing on submit
    setError(""); // Clear any previous errors

    // Dynamically choose the route based on which mode the user is in
    const endpoint = isLoginMode ? "/login" : "/register";

    try {
      // Send a POST request to your Express backend with the username and password
      const response = await axios.post(`${API_URL}${endpoint}`, {
        name,
        password,
      });

      if (response.data) {
        // If successful, save the user data to the browser's local storage
        // This keeps them logged in even if they refresh the page
        localStorage.setItem("user", JSON.stringify(isLoginMode ? response.data.user : { name }));
        
        // Push the user to the student dashboard
        navigate("/dashboard");
      }
    } catch (err) {
      // If the backend sends a 400 or 500 error, grab the message and display it
      setError(err.response?.data?.message || "An error occurred connecting to the server.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      {/* Glassmorphism Card UI */}
      <div className="w-full max-w-md bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 shadow-2xl">
        
        <h2 className="text-3xl font-bold text-white text-center mb-8">
          {isLoginMode ? "EDULite Login" : "Create EDULite Account"}
        </h2>

        {/* Error Message Display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 p-3 rounded mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">Username</label>
            <input
              type="text"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition duration-200"
          >
            {isLoginMode ? "Sign In" : "Register"}
          </button>
        </form>

        {/* Toggle between Login and Register modes */}
        <p className="mt-6 text-center text-white/60 text-sm">
          {isLoginMode ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setIsLoginMode(!isLoginMode)}
            className="text-blue-400 hover:text-blue-300 font-medium transition"
          >
            {isLoginMode ? "Sign Up" : "Log In"}
          </button>
        </p>

      </div>
    </div>
  );
}