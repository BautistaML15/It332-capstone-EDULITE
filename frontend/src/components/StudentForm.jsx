import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:3000";

export default function StudentForm() {
  // State is updated to handle the 4 specific name fields
  const [formData, setFormData] = useState({ 
    firstName: "", 
    middleName: "", 
    surname: "", 
    suffix: "", 
    score: "", 
    grade: "", 
    section: "" 
  });
  
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) {
      navigate("/");
      return;
    }

    if (id) {
      fetchStudentData();
    }
  }, [id, navigate]);

  const fetchStudentData = async () => {
    try {
      const response = await axios.get(`${API_URL}/students/${id}`);
      const data = response.data;

      // Logic to attempt splitting an existing single-string name into parts
      const nameParts = data.name ? data.name.split(" ") : [];
      let fName = nameParts[0] || "";
      let sName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
      let mName = nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : "";

      setFormData({
        firstName: fName,
        middleName: mName,
        surname: sName,
        suffix: "", // Hard to accurately guess a suffix from a single string, leaving blank for manual edit
        score: data.score,
        grade: data.grade,
        section: data.section,
      });
    } catch (error) {
      console.error("Error fetching student details:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Combine the 4 fields into a single string for your current database schema
    // The .filter(Boolean) prevents extra spaces if middleName or suffix are left blank
    const combinedName = [
      formData.firstName, 
      formData.middleName, 
      formData.surname, 
      formData.suffix
    ].filter(Boolean).join(" ");

    // Prepare the payload matching what the backend expects
    const payload = {
      name: combinedName,
      score: formData.score,
      grade: formData.grade,
      section: formData.section
    };

    try {
      if (id) {
        await axios.put(`${API_URL}/students/${id}`, payload);
      } else {
        await axios.post(`${API_URL}/students`, payload);
      }
      navigate("/dashboard");
    } catch (error) {
      console.error("Error saving student:", error);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: "url('/bg-image.png')" }}
    >
      <div className="w-full max-w-2xl bg-slate-950/40 backdrop-blur-xl border border-white/20 p-8 rounded-2xl shadow-2xl mt-8 mb-8">
        
        <h2 className="text-2xl font-semibold text-white mb-6 border-b border-white/10 pb-4 tracking-wider text-center">
          {id ? "Edit Student Details" : "Register New Student"}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* --- NEW NAME FIELDS GRID --- */}
          <div className="bg-white/5 border border-white/10 p-5 rounded-xl space-y-4">
            <h3 className="text-white/80 font-medium tracking-widest text-sm uppercase mb-2">Student Identity</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/90 text-sm font-medium mb-2 tracking-wider">First Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-400 focus:bg-white/20 transition-all tracking-wide"
                  required
                  placeholder="e.g. Juan"
                />
              </div>

              <div>
                <label className="block text-white/90 text-sm font-medium mb-2 tracking-wider">Middle Name</label>
                <input
                  type="text"
                  value={formData.middleName}
                  onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-400 focus:bg-white/20 transition-all tracking-wide"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-white/90 text-sm font-medium mb-2 tracking-wider">Surname <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={formData.surname}
                  onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-400 focus:bg-white/20 transition-all tracking-wide"
                  required
                  placeholder="e.g. Dela Cruz"
                />
              </div>

              <div>
                <label className="block text-white/90 text-sm font-medium mb-2 tracking-wider">Suffix</label>
                <input
                  type="text"
                  value={formData.suffix}
                  onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-400 focus:bg-white/20 transition-all tracking-wide"
                  placeholder="e.g. Jr., III (Optional)"
                />
              </div>
            </div>
          </div>
          {/* ---------------------------- */}

          <div className="bg-white/5 border border-white/10 p-5 rounded-xl space-y-4">
            <h3 className="text-white/80 font-medium tracking-widest text-sm uppercase mb-2">Academic Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-white/90 text-sm font-medium mb-2 tracking-wider">Score <span className="text-red-400">*</span></label>
                <input
                  type="number"
                  value={formData.score}
                  onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-400 focus:bg-white/20 transition-all tracking-wide"
                  required
                />
              </div>
              
              <div>
                <label className="block text-white/90 text-sm font-medium mb-2 tracking-wider">Grade <span className="text-red-400">*</span></label>
                <input
                  type="number"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-400 focus:bg-white/20 transition-all tracking-wide"
                  required
                />
              </div>

              <div>
                <label className="block text-white/90 text-sm font-medium mb-2 tracking-wider">Section <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-400 focus:bg-white/20 transition-all tracking-wide"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="submit" className="flex-1 bg-blue-600/90 hover:bg-blue-500 text-white font-semibold py-4 rounded-lg shadow-lg transition-all tracking-widest">
              {id ? "Update Record" : "Save Record"}
            </button>
            <button 
              type="button" 
              onClick={() => navigate("/dashboard")} 
              className="flex-1 bg-slate-600/90 hover:bg-slate-500 text-white font-semibold py-4 rounded-lg shadow-lg transition-all tracking-widest"
            >
              Cancel
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}