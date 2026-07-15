import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:3000";

export default function Dashboard() {
  const [students, setStudents] = useState([]);
  const [formData, setFormData] = useState({ name: "", score: "", grade: "", section: "" });
  const [editingId, setEditingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) {
      navigate("/");
      return;
    }
    fetchStudents();
  }, [navigate]);

  const fetchStudents = async () => {
    try {
      const response = await axios.get(`${API_URL}/students`);
      setStudents(response.data);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${API_URL}/students/${editingId}`, formData);
        setEditingId(null);
      } else {
        await axios.post(`${API_URL}/students`, formData);
      }
      setFormData({ name: "", score: "", grade: "", section: "" });
      fetchStudents();
    } catch (error) {
      console.error("Error saving student:", error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to remove this student?")) {
      try {
        await axios.delete(`${API_URL}/students/${id}`);
        fetchStudents();
      } catch (error) {
        console.error("Error deleting student:", error);
      }
    }
  };

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
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    /* Background Image applied to the main wrapper with bg-fixed so it doesn't move when scrolling */
    <div 
      className="min-h-screen p-8 bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: "url('/bg-image.png')" }}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header - Upgraded Glassmorphism */}
        <div className="flex justify-between items-center bg-slate-950/40 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-2xl">
          <h1 className="text-2xl font-bold text-white tracking-wider">EDULite Dashboard</h1>
          <button 
            onClick={handleLogout} 
            className="bg-red-500/80 hover:bg-red-500 text-white px-6 py-2 rounded-lg transition tracking-widest font-medium"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: Data Entry Form */}
          <div className="lg:col-span-1 bg-slate-950/40 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-2xl h-fit">
            <h2 className="text-xl font-semibold text-white mb-6 border-b border-white/10 pb-4 tracking-wider">
              {editingId ? "Edit Student Details" : "Register New Student"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-blue-400 focus:bg-white/20 transition-all tracking-wide"
                required
              />
              <input
                type="number"
                placeholder="Assessment Score"
                value={formData.score}
                onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-blue-400 focus:bg-white/20 transition-all tracking-wide"
                required
              />
              <input
                type="number"
                placeholder="Grade Level"
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-blue-400 focus:bg-white/20 transition-all tracking-wide"
                required
              />
              <input
                type="text"
                placeholder="Section Name"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-blue-400 focus:bg-white/20 transition-all tracking-wide"
                required
              />
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-blue-600/90 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg shadow-lg transition-all tracking-widest">
                  {editingId ? "Update" : "Save"}
                </button>
                {editingId && (
                  <button 
                    type="button" 
                    onClick={() => { 
                      setEditingId(null); 
                      setFormData({ name: "", score: "", grade: "", section: "" }); 
                    }} 
                    className="flex-1 bg-slate-600/90 hover:bg-slate-500 text-white font-semibold py-3 rounded-lg shadow-lg transition-all tracking-widest"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* RIGHT COLUMN: Data Table */}
          <div className="lg:col-span-2 bg-slate-950/40 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-2xl overflow-hidden">
            <h2 className="text-xl font-semibold text-white mb-6 border-b border-white/10 pb-4 tracking-wider">Student Database</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-white/90">
                <thead>
                  <tr className="border-b border-white/10 text-white/70 text-sm uppercase tracking-wider">
                    <th className="pb-4 font-medium px-2">Name</th>
                    <th className="pb-4 font-medium px-2">Score</th>
                    <th className="pb-4 font-medium px-2">Grade</th>
                    <th className="pb-4 font-medium px-2">Section</th>
                    <th className="pb-4 font-medium text-right px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b border-white/5 hover:bg-white/10 transition duration-200">
                      <td className="py-4 px-2 font-medium tracking-wide">{student.name}</td>
                      <td className="py-4 px-2 tracking-wide">{student.score}</td>
                      <td className="py-4 px-2 tracking-wide">{student.grade}</td>
                      <td className="py-4 px-2 tracking-wide">{student.section}</td>
                      <td className="py-4 px-2 text-right space-x-4">
                        <button onClick={() => handleEdit(student)} className="text-blue-400 hover:text-blue-300 font-medium tracking-wide">Edit</button>
                        <button onClick={() => handleDelete(student.id)} className="text-red-400 hover:text-red-300 font-medium tracking-wide">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-white/60 tracking-wide">
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