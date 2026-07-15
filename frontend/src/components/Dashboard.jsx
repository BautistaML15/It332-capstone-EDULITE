import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:3000";

export default function Dashboard() {
  const [students, setStudents] = useState([]);
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

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div 
      className="min-h-screen p-8 bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: "url('/bg-image.png')" }}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header - Now includes the Register button */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-950/40 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-2xl gap-4">
          <h1 className="text-2xl font-bold text-white tracking-wider">EDULite Dashboard</h1>
          <div className="flex gap-4">
            <button 
              onClick={() => navigate("/student-form")} 
              className="bg-blue-600/90 hover:bg-blue-500 text-white px-6 py-2 rounded-lg transition tracking-widest font-medium shadow-lg"
            >
              + Register Student
            </button>
            <button 
              onClick={handleLogout} 
              className="bg-red-500/80 hover:bg-red-500 text-white px-6 py-2 rounded-lg transition tracking-widest font-medium"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Full-width Data Table */}
        <div className="bg-slate-950/40 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-2xl overflow-hidden">
          <h2 className="text-xl font-semibold text-white mb-6 border-b border-white/10 pb-4 tracking-wider">Student Database</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-white/90">
              <thead>
                <tr className="border-b border-white/10 text-white/70 text-sm uppercase tracking-wider">
                  <th className="pb-4 font-medium px-4">Name</th>
                  <th className="pb-4 font-medium px-4">Score</th>
                  <th className="pb-4 font-medium px-4">Grade</th>
                  <th className="pb-4 font-medium px-4">Section</th>
                  <th className="pb-4 font-medium text-right px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-b border-white/5 hover:bg-white/10 transition duration-200">
                    <td className="py-4 px-4 font-medium tracking-wide">{student.name}</td>
                    <td className="py-4 px-4 tracking-wide">{student.score}</td>
                    <td className="py-4 px-4 tracking-wide">{student.grade}</td>
                    <td className="py-4 px-4 tracking-wide">{student.section}</td>
                    <td className="py-4 px-4 text-right space-x-4">
                      {/* Edit button routes to the form with the student's ID */}
                      <button 
                        onClick={() => navigate(`/student-form/${student.id}`)} 
                        className="text-blue-400 hover:text-blue-300 font-medium tracking-wide"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(student.id)} 
                        className="text-red-400 hover:text-red-300 font-medium tracking-wide"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-white/60 tracking-wide">
                      No student records found. Click "Register Student" to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}