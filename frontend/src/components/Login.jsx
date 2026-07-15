import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:3000"; 

export default function Login() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setError(""); 

    const endpoint = isLoginMode ? "/login" : "/register";

    try {
      const response = await axios.post(`${API_URL}${endpoint}`, {
        name,
        password,
      });

      if (response.data) {
        localStorage.setItem("user", JSON.stringify(isLoginMode ? response.data.user : { name }));
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred connecting to the server.");
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/bg-image.png')" }}
    >
      <div className="w-full max-w-md bg-slate-950/40 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
        
        <div className="flex justify-center mb-8">
          <img 
            src="/logo.png" 
            alt="School Logo" 
            className="h-20 object-contain drop-shadow-lg" 
          />
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 p-3 rounded mb-4 text-sm text-center font-medium tracking-wide">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            {/* Added tracking-wider for the labels */}
            <label className="block text-white/90 text-sm font-medium mb-2 tracking-wider">Username</label>
            <input
              type="text"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-blue-400 focus:bg-white/20 transition-all tracking-wide"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            {/* Added tracking-wider for the labels */}
            <label className="block text-white/90 text-sm font-medium mb-2 tracking-wider">Password</label>
            <input
              type="password"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-blue-400 focus:bg-white/20 transition-all tracking-wide"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Added tracking-widest to the submit button to make it pop */}
          <button
            type="submit"
            className="w-full bg-blue-600/90 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-blue-500/30 transition-all duration-300 tracking-widest"
          >
            {isLoginMode ? "Sign In" : "Register"}
          </button>
        </form>

        {/* Added tracking-wide to the footer text */}
        <p className="mt-6 text-center text-white/70 text-sm tracking-wide">
          {isLoginMode ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setIsLoginMode(!isLoginMode)}
            className="text-blue-400 hover:text-blue-300 font-semibold transition tracking-wider"
          >
            {isLoginMode ? "Sign Up" : "Log In"}
          </button>
        </p>

      </div>
    </div>
  );
}