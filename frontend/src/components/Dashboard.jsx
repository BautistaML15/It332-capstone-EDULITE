import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:3000";

export default function Dashboard() {
  // --- STATE MANAGEMENT ---
  const [students, setStudents] = useState([]);
  const [formData, setFormData] = useState({ name: "", score: "", grade: "", section: "" });
  const [editingId, setEditingId] = useState(null); // Tracks if we are editing an existing student
  const navigate = useNavigate();

  // --- LIFECYCLE HOOK ---
  // This runs exactly once when the dashboard loads.
  useEffect(() => {
    // 1. Check if user is logged in
    const user = localStorage.getItem("user");
    if (!user) {
      navigate("/"); // Kick them back to login if no session exists
      return;
    }
    // 2. Fetch the data from SQLite
    fetchStudents();
  }, [navigate]);

  // --- CRUD OPERATIONS ---

  // READ: Hits router.get("/students")
  const fetchStudents = async () => {
    try {
      const response = await axios.get(`${API_URL}/students`);
      setStudents(response.data); // Populates the table
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  // CREATE & UPDATE: Hits router.post("/students") OR router.put("/students/:id")
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        // If we have an editingId, we update
        await axios.put(`${API_URL}/students/${editingId}`, formData);
        setEditingId(null); // Reset edit mode
      } else {
        // Otherwise, we create a new record
        await axios.post(`${API_URL}/students`, formData);
      }
      // Clear the form and refresh the table data
      setFormData({ name: "", score: "", grade: "", section: "" });
      fetchStudents();
    } catch (error) {
      console.error("Error saving student:", error);
    }
  };

  // DELETE: Hits router.delete("/students/:id")
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to remove this student?")) {
      try {
        await axios.delete(`${API_URL}/students/${id}`);
        fetchStudents(); // Refresh the table after deletion
      } catch (error) {
        console.error("Error deleting student:", error);
      }
    }
  };

  // UTILITY: Pre-fills the form for editing
  const handleEdit = (student) => {
    setEditingId(student.id);
    setFormData({ 
      name: student.name, 
      score: student.score, 
      grade: student.grade, 
      section: student.section 
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("user"); // Destroy session
    navigate("/");
  };

  // --- UI RENDER ---
  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Navigation / Header */}
        <div className="flex justify-between items-center bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-lg">
          <h1 className="text-2xl font-bold text-white tracking-wide">EDULite Dashboard</h1>
          <button 
            onClick={handleLogout} 
            className="bg-red-500/80 hover:bg-red-500 text-white px-6 py-2 rounded-lg transition"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: Data Entry Form */}
          <div className="lg:col-span-1 bg-white/10 backdrop-blur-lg border border-white/20 p-6 rounded-2xl shadow-xl h-fit">
            <h2 className="text-xl font-semibold text-white mb-6 border-b border-white/10 pb-4">
              {editingId ? "Edit Student Details" : "Register New Student"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                required
              />
              <input
                type="number"
                placeholder="Assessment Score"
                value={formData.score}
                onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                required
              />
              <input
                type="number"
                placeholder="Grade Level"
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                required
              />
              <input
                type="text"
                placeholder="Section Name"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                required
              />
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-lg transition">
                  {editingId ? "Update Record" : "Save Record"}
                </button>
                {editingId && (
                  <button 
                    type="button" 
                    onClick={() => { 
                      setEditingId(null); 
                      setFormData({ name: "", score: "", grade: "", section: "" }); 
                    }} 
                    className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-medium py-3 rounded-lg transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* RIGHT COLUMN: Data Table */}
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-lg border border-white/20 p-6 rounded-2xl shadow-xl overflow-hidden">
            <h2 className="text-xl font-semibold text-white mb-6 border-b border-white/10 pb-4">Student Database</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-white/90">
                <thead>
                  <tr className="border-b border-white/10 text-white/60 text-sm uppercase tracking-wider">
                    <th className="pb-4 font-medium px-2">Name</th>
                    <th className="pb-4 font-medium px-2">Score</th>
                    <th className="pb-4 font-medium px-2">Grade</th>
                    <th className="pb-4 font-medium px-2">Section</th>
                    <th className="pb-4 font-medium text-right px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b border-white/5 hover:bg-white/5 transition duration-150">
                      <td className="py-4 px-2 font-medium">{student.name}</td>
                      <td className="py-4 px-2">{student.score}</td>
                      <td className="py-4 px-2">{student.grade}</td>
                      <td className="py-4 px-2">{student.section}</td>
                      <td className="py-4 px-2 text-right space-x-4">
                        <button onClick={() => handleEdit(student)} className="text-blue-400 hover:text-blue-300 font-medium">Edit</button>
                        <button onClick={() => handleDelete(student.id)} className="text-red-400 hover:text-red-300 font-medium">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-white/50">
                        No student records found. Add one to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}