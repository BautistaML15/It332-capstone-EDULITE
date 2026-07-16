import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:3000";

const SUFFIXES = new Set(["Jr.", "Sr.", "II", "III", "IV", "V"]);

const EMPTY_FORM = {
  firstName: "",
  middleName: "",
  surname: "",
  suffix: "",
  grade: "",
  section: "",
  subject_ids: [],
};

function splitStoredName(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  let suffix = "";

  if (parts.length && SUFFIXES.has(parts[parts.length - 1])) {
    suffix = parts.pop();
  }

  return {
    firstName: parts.shift() || "",
    surname: parts.pop() || "",
    middleName: parts.join(" "),
    suffix,
  };
}

export default function StudentForm({
  embedded = false,
  studentId = null,
  onCancel,
  onSaved,
} = {}) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();
  const params = useParams();

  const resolvedStudentId = studentId ?? params.id ?? null;
  const isEditing = Boolean(resolvedStudentId);

  useEffect(() => {
    if (!localStorage.getItem("user")) {
      navigate("/");
      return;
    }

    let cancelled = false;

    const loadForm = async () => {
      setLoading(true);
      setError("");
      setFormData(EMPTY_FORM);

      try {
        const requests = [
          axios.get(`${API_URL}/sections`),
          axios.get(`${API_URL}/subjects`),
        ];

        if (resolvedStudentId) {
          requests.push(
            axios.get(`${API_URL}/students/${resolvedStudentId}`),
          );
        }

        const [sectionResponse, subjectResponse, studentResponse] =
          await Promise.all(requests);

        if (cancelled) {
          return;
        }

        const loadedSections = sectionResponse.data ?? [];
        const loadedSubjects = subjectResponse.data ?? [];

        setSections(loadedSections);
        setSubjects(loadedSubjects);

        if (studentResponse) {
          setFormData({
            ...splitStoredName(studentResponse.data.name),
            grade: String(studentResponse.data.grade ?? ""),
            section: studentResponse.data.section ?? "",
            subject_ids: studentResponse.data.subject_ids ?? [],
          });
        } else {
          setFormData({
            ...EMPTY_FORM,
            section: loadedSections[0]?.name ?? "",
            subject_ids: loadedSubjects[0]?.id
              ? [loadedSubjects[0].id]
              : [],
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Unable to load the student form.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadForm();

    return () => {
      cancelled = true;
    };
  }, [resolvedStudentId, navigate]);

  const updateField = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const toggleSubject = (subjectId) => {
    setFormData((current) => ({
      ...current,
      subject_ids: current.subject_ids.includes(subjectId)
        ? current.subject_ids.filter((idValue) => idValue !== subjectId)
        : [...current.subject_ids, subjectId],
    }));
  };

  const closeForm = () => {
    if (saving) {
      return;
    }

    if (typeof onCancel === "function") {
      onCancel();
      return;
    }

    navigate("/dashboard");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (formData.subject_ids.length === 0) {
      setError("Select at least one subject for the student.");
      return;
    }

    const grade = Number(formData.grade);

    if (!Number.isInteger(grade) || grade <= 0) {
      setError("Grade must be a positive whole number.");
      return;
    }

    if (!formData.section.trim()) {
      setError("Select a section for the student.");
      return;
    }

    const combinedName = [
      formData.firstName.trim(),
      formData.middleName.trim(),
      formData.surname.trim(),
      formData.suffix.trim(),
    ]
      .filter(Boolean)
      .join(" ");

    const payload = {
      name: combinedName,
      grade,
      section: formData.section.trim(),
      subject_ids: formData.subject_ids,
    };

    setSaving(true);

    try {
      const response = isEditing
        ? await axios.put(
            `${API_URL}/students/${resolvedStudentId}`,
            payload,
          )
        : await axios.post(`${API_URL}/students`, payload);

      if (typeof onSaved === "function") {
        await onSaved(response.data, {
          isEditing,
          studentId: resolvedStudentId,
        });
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to save the student.",
      );
    } finally {
      setSaving(false);
    }
  };

  const formCard = (
    <section className="overflow-hidden rounded-[28px] border-2 border-[#1A2CA3] bg-white">
      <div className="flex flex-col gap-4 border-b border-[#dadce0] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#137333]">
            Student Management
          </p>

          <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#202124]">
            {isEditing ? "Edit Student Details" : "Register Student"}
          </h2>

          <p className="mt-1 text-sm text-[#5f6368]">
            {isEditing
              ? "Update the student's identity, grade, section, and enrolled subjects."
              : "Add a student without leaving the dashboard."}
          </p>
        </div>

        <button
          type="button"
          onClick={closeForm}
          disabled={saving}
          className="rounded-full border border-[#dadce0] bg-white px-5 py-2.5 text-sm font-semibold text-[#3c4043] transition hover:border-[#4285f4] hover:bg-[#4285f4] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Back to Dashboard
        </button>
      </div>

      <div className="p-5 sm:p-6">
        {error && (
          <div className="mb-6 rounded-[18px] border border-l-8 border-[#ea4335] bg-white p-4 text-[#c5221f]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-[22px] border border-[#dadce0] bg-[#f8f9fa] py-16 text-center text-[#5f6368]">
            Loading student form...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="rounded-[22px] border border-[#dadce0] bg-white p-5">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4285f4] font-bold text-white">
                  1
                </span>

                <div>
                  <h3 className="font-bold text-[#202124]">
                    Student Identity
                  </h3>

                  <p className="text-sm text-[#5f6368]">
                    Enter the student's complete name.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <TextField
                  label="First Name"
                  value={formData.firstName}
                  onChange={(value) => updateField("firstName", value)}
                  required
                  placeholder="e.g. Juan"
                />

                <TextField
                  label="Middle Name"
                  value={formData.middleName}
                  onChange={(value) => updateField("middleName", value)}
                  placeholder="Optional"
                />

                <TextField
                  label="Surname"
                  value={formData.surname}
                  onChange={(value) => updateField("surname", value)}
                  required
                  placeholder="e.g. Dela Cruz"
                />

                <TextField
                  label="Suffix"
                  value={formData.suffix}
                  onChange={(value) => updateField("suffix", value)}
                  placeholder="e.g. Jr., III"
                />
              </div>
            </section>

            <section className="rounded-[22px] border border-[#dadce0] bg-white p-5">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#34a853] font-bold text-white">
                  2
                </span>

                <div>
                  <h3 className="font-bold text-[#202124]">
                    Academic Information
                  </h3>

                  <p className="text-sm text-[#5f6368]">
                    Choose the grade, section, and enrolled subjects.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#3c4043]">
                    Grade <span className="text-[#ea4335]">*</span>
                  </label>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formData.grade}
                    onChange={(event) =>
                      updateField("grade", event.target.value)
                    }
                    className="w-full rounded-[14px] border border-[#dadce0] bg-white px-4 py-3 text-[#202124] outline-none transition focus:border-[#4285f4] focus:ring-4 focus:ring-[#4285f4]/20"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#3c4043]">
                    Section <span className="text-[#ea4335]">*</span>
                  </label>

                  <select
                    value={formData.section}
                    onChange={(event) =>
                      updateField("section", event.target.value)
                    }
                    className="w-full rounded-[14px] border border-[#dadce0] bg-white px-4 py-3 text-[#202124] outline-none transition focus:border-[#4285f4] focus:ring-4 focus:ring-[#4285f4]/20"
                    required
                  >
                    <option value="">Select a section</option>

                    {sections.map((section) => (
                      <option key={section.id} value={section.name}>
                        {section.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-5">
                <label className="mb-3 block text-sm font-semibold text-[#3c4043]">
                  Subjects <span className="text-[#ea4335]">*</span>
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {subjects.map((subject) => {
                    const selected = formData.subject_ids.includes(subject.id);

                    return (
                      <label
                        key={subject.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-[16px] border-2 px-4 py-3 transition ${
                          selected
                            ? "border-[#34a853] bg-white text-[#137333]"
                            : "border-[#dadce0] bg-white text-[#3c4043] hover:border-[#34a853]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSubject(subject.id)}
                          className="h-4 w-4 accent-[#34a853]"
                        />

                        <span className="font-medium">{subject.name}</span>
                      </label>
                    );
                  })}
                </div>

                {subjects.length === 0 && (
                  <p className="rounded-[16px] border border-[#fbbc04] bg-white p-4 text-sm text-[#7a5b00]">
                    No subjects exist yet. Add a subject from the dashboard
                    first.
                  </p>
                )}
              </div>
            </section>

            <div className="flex flex-col gap-3 border-t border-[#dadce0] pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-full border border-[#dadce0] bg-white px-6 py-3 font-semibold text-[#3c4043] transition hover:bg-[#f1f3f4] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  saving || sections.length === 0 || subjects.length === 0
                }
                className="rounded-full bg-[#1a73e8] px-7 py-3 font-semibold text-white transition hover:bg-[#1765cc] disabled:cursor-not-allowed disabled:bg-[#dadce0] disabled:text-[#80868b]"
              >
                {saving
                  ? "Saving..."
                  : isEditing
                    ? "Update Student"
                    : "Save Student"}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );

  if (embedded) {
    return formCard;
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">{formCard}</div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  required = false,
  placeholder = "",
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-[#3c4043]">
        {label} {required && <span className="text-[#ea4335]">*</span>}
      </label>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[14px] border border-[#dadce0] bg-white px-4 py-3 text-[#202124] placeholder-[#80868b] outline-none transition focus:border-[#4285f4] focus:ring-4 focus:ring-[#4285f4]/20"
        required={required}
      />
    </div>
  );
}