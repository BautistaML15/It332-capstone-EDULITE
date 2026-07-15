import {
  useEffect,
  useState
} from "react";

import {
  useNavigate,
  useParams
} from "react-router-dom";

import axios from "axios";

const API_URL = "http://localhost:3000";

export default function StudentForm() {
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    surname: "",
    suffix: "",
    grade: "",
    section: ""
  });

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    const user = localStorage.getItem("user");

    if (!user) {
      navigate("/");
      return;
    }

    loadStudentForm();
  }, [id, navigate]);

  const loadStudentForm = async () => {
    setLoading(true);
    setError("");

    try {
      const sectionResponse = await axios.get(
        `${API_URL}/sections`
      );

      setSections(sectionResponse.data);

      if (id) {
        const studentResponse = await axios.get(
          `${API_URL}/students/${id}`
        );

        const student = studentResponse.data;

        const nameParts = student.name
          ? student.name.trim().split(/\s+/)
          : [];

        const firstName =
          nameParts.length > 0
            ? nameParts[0]
            : "";

        const surname =
          nameParts.length > 1
            ? nameParts[nameParts.length - 1]
            : "";

        const middleName =
          nameParts.length > 2
            ? nameParts.slice(1, -1).join(" ")
            : "";

        setFormData({
          firstName,
          middleName,
          surname,
          suffix: "",
          grade: student.grade ?? "",
          section: student.section ?? ""
        });
      }
    } catch (error) {
      console.error(
        "Error loading student form:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to load the student form."
      );
    } finally {
      setLoading(false);
    }
  };

  const updateField = (
    field,
    value
  ) => {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value
    }));
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");

    const fullName = [
      formData.firstName.trim(),
      formData.middleName.trim(),
      formData.surname.trim(),
      formData.suffix.trim()
    ]
      .filter(Boolean)
      .join(" ");

    if (!fullName) {
      setError(
        "Please enter the student's name."
      );

      return;
    }

    if (!formData.grade) {
      setError(
        "Please enter the student's grade."
      );

      return;
    }

    if (!formData.section) {
      setError(
        "Please select a section."
      );

      return;
    }

    const payload = {
      name: fullName,
      grade: formData.grade,
      section: formData.section
    };

    setSaving(true);

    try {
      if (id) {
        await axios.put(
          `${API_URL}/students/${id}`,
          payload
        );
      } else {
        await axios.post(
          `${API_URL}/students`,
          payload
        );
      }

      navigate("/dashboard");
    } catch (error) {
      console.error(
        "Error saving student:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to save the student."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-slate-500">
          Loading student form...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <button
            type="button"
            onClick={() =>
              navigate("/dashboard")
            }
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-5 md:px-8">
            <h1 className="text-2xl font-bold text-slate-900">
              {id
                ? "Edit Student Details"
                : "Register New Student"}
            </h1>

            <p className="text-slate-500 text-sm mt-1">
              Enter the student information and select a section.
            </p>
          </div>

          <div className="p-6 md:p-8">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                {error}
              </div>
            )}

            {sections.length === 0 && (
              <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg">
                No sections are available. Add a section from the dashboard first.
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="space-y-8"
            >
              <section>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                  Student Identity
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <TextInput
                    label="First Name"
                    value={formData.firstName}
                    onChange={(value) =>
                      updateField(
                        "firstName",
                        value
                      )
                    }
                    placeholder="e.g. Juan"
                    required
                  />

                  <TextInput
                    label="Middle Name"
                    value={formData.middleName}
                    onChange={(value) =>
                      updateField(
                        "middleName",
                        value
                      )
                    }
                    placeholder="Optional"
                  />

                  <TextInput
                    label="Surname"
                    value={formData.surname}
                    onChange={(value) =>
                      updateField(
                        "surname",
                        value
                      )
                    }
                    placeholder="e.g. Dela Cruz"
                    required
                  />

                  <TextInput
                    label="Suffix"
                    value={formData.suffix}
                    onChange={(value) =>
                      updateField(
                        "suffix",
                        value
                      )
                    }
                    placeholder="e.g. Jr., III"
                  />
                </div>
              </section>

              <hr className="border-slate-200" />

              <section>
                <h2 className="text-lg font-semibold text-slate-900">
                  Academic Information
                </h2>

                <p className="text-slate-500 text-sm mt-1 mb-4">
                  Student scores are recorded from the assessment page.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-slate-700 text-sm font-medium mb-2">
                      Grade
                      <span className="text-red-500">
                        {" "}*
                      </span>
                    </label>

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={formData.grade}
                      onChange={(event) =>
                        updateField(
                          "grade",
                          event.target.value
                        )
                      }
                      className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 text-sm font-medium mb-2">
                      Section
                      <span className="text-red-500">
                        {" "}*
                      </span>
                    </label>

                    <select
                      value={formData.section}
                      onChange={(event) =>
                        updateField(
                          "section",
                          event.target.value
                        )
                      }
                      className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">
                        Select section
                      </option>

                      {sections.map((section) => (
                        <option
                          key={section.id}
                          value={section.name}
                        >
                          {section.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  disabled={
                    saving ||
                    sections.length === 0
                  }
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg shadow-sm transition"
                >
                  {saving
                    ? "Saving..."
                    : id
                      ? "Update Student"
                      : "Register Student"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate("/dashboard")
                  }
                  className="flex-1 bg-slate-600 hover:bg-slate-700 text-white font-semibold py-3 rounded-lg shadow-sm transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  required = false,
  placeholder = ""
}) {
  return (
    <div>
      <label className="block text-slate-700 text-sm font-medium mb-2">
        {label}

        {required && (
          <span className="text-red-500">
            {" "}*
          </span>
        )}
      </label>

      <input
        type="text"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        required={required}
        className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
}