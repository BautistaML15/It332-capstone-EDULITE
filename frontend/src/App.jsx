import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";

function App() {
  return (
    <Router>
      <Routes>
        {/* Default route loads the Login component */}
        <Route path="/" element={<Login />} />
        
        {/* Dashboard route loads the Dashboard component */}
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Catch-all: If user types a random URL, send them to login */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;