import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:3000";
const TYPES = ["Major Exam", "Activity", "Quiz"];

function todayAsInputValue() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 10);
}

function emptyAssessmentForm() {
  return {
    name: "",
    type: "Quiz",
    date: todayAsInputValue(),
    total_items: "",
    subject_id: "",
  };
}

export default function AssessmentForm({
  embedded = false,
  assessmentId = null,
  onCancel,
  onSaved,
} = {}) {
  const [formData, setFormData] = useState(emptyAssessmentForm);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const params = useParams();

  const resolvedAssessmentId = assessmentId ?? params.id ?? null;
  const isEditing = Boolean(resolvedAssessmentId);

  const loadStudentsForSubject = async (subjectId, preserveScores = false) => {
    if (!subjectId) {
      setStudents([]);
      setScores({});
      return;
    }

    setLoadingStudents(true);
    setError("");

    try {
      const response = await axios.get(`${API_URL}/students`, {
        params: {
          subject_id: subjectId,
        },
      });

      const loadedStudents = response.data ?? [];
      setStudents(loadedStudents);

      setScores((currentScores) =>
        Object.fromEntries(
          loadedStudents.map((student) => [
            student.id,
            preserveScores ? (currentScores[student.id] ?? "") : "",
          ]),
        ),
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load students for the subject.",
      );
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem("user")) {
      navigate("/");
      return;
    }

    let cancelled = false;

    const loadPage = async () => {
      setLoading(true);
      setError("");
      setFormData(emptyAssessmentForm());
      setStudents([]);
      setScores({});

      try {
        const subjectResponse = await axios.get(`${API_URL}/subjects`);

        if (cancelled) {
          return;
        }

        const loadedSubjects = subjectResponse.data ?? [];
        setSubjects(loadedSubjects);

        if (isEditing) {
          const assessmentResponse = await axios.get(
            `${API_URL}/assessments/${resolvedAssessmentId}`,
          );

          if (cancelled) {
            return;
          }

          const assessment = assessmentResponse.data;
          const assessmentStudents = assessment.students ?? [];

          setFormData({
            name: assessment.name ?? "",
            type: assessment.type ?? "Quiz",
            date: assessment.date ?? todayAsInputValue(),
            total_items: String(assessment.total_items ?? ""),
            subject_id: String(assessment.subject_id ?? ""),
          });

          setStudents(assessmentStudents);

          setScores(
            Object.fromEntries(
              assessmentStudents.map((student) => [
                student.id,
                student.score ?? "",
              ]),
            ),
          );
        } else {
          const firstSubjectId = loadedSubjects[0]?.id;

          setFormData((current) => ({
            ...current,
            subject_id: firstSubjectId ? String(firstSubjectId) : "",
          }));

          if (firstSubjectId) {
            await loadStudentsForSubject(firstSubjectId);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Unable to load the assessment form.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPage();

    return () => {
      cancelled = true;
    };
  }, [resolvedAssessmentId, isEditing, navigate]);

  const handleSubjectChange = async (value) => {
    setFormData((current) => ({
      ...current,
      subject_id: value,
    }));

    await loadStudentsForSubject(value);
  };

  const totalItems = Number(formData.total_items);

  const enteredCount = useMemo(
    () => Object.values(scores).filter((score) => score !== "").length,
    [scores],
  );

  const handleScoreChange = (studentId, value) => {
    if (value !== "" && !/^\d+$/.test(value)) {
      return;
    }

    setScores((current) => ({
      ...current,
      [studentId]: value,
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

    if (!formData.subject_id) {
      setError("Select a subject for the assessment.");
      return;
    }

    if (!Number.isInteger(totalItems) || totalItems <= 0) {
      setError("Total assessment items must be a positive whole number.");
      return;
    }

    for (const [studentId, value] of Object.entries(scores)) {
      if (value === "") {
        continue;
      }

      const score = Number(value);

      if (!Number.isInteger(score) || score < 0 || score > totalItems) {
        const student = students.find(
          (item) => item.id === Number(studentId),
        );

        setError(
          `${student?.name || "A student"}'s score must be from 0 to ${totalItems}.`,
        );

        return;
      }
    }

    const payload = {
      ...formData,
      subject_id: Number(formData.subject_id),
      total_items: totalItems,
      scores: students.map((student) => ({
        student_id: student.id,
        score:
          scores[student.id] === "" || scores[student.id] === undefined
            ? null
            : Number(scores[student.id]),
      })),
    };

    setSaving(true);

    try {
      const response = isEditing
        ? await axios.put(
            `${API_URL}/assessments/${resolvedAssessmentId}`,
            payload,
          )
        : await axios.post(`${API_URL}/assessments`, payload);

      if (typeof onSaved === "function") {
        await onSaved(response.data, {
          isEditing,
          assessmentId: resolvedAssessmentId,
        });
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to save the assessment.",
      );
    } finally {
      setSaving(false);
    }
  };

  const formCard = (
    <section className="overflow-hidden rounded-[28px] border-2 border-[#1A2CA3] bg-white">
      <div className="flex flex-col gap-4 border-b border-[#dadce0] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#174ea6]">
            Assessment Management
          </p>

          <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#202124]">
            {isEditing ? "Edit Assessment" : "Add Assessment"}
          </h2>

          <p className="mt-1 text-sm text-[#5f6368]">
            {isEditing
              ? "Update the assessment information and recorded student scores."
              : "Create an assessment and record scores without leaving the dashboard."}
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
            Loading assessment form...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="rounded-[22px] border border-[#dadce0] bg-white p-5">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fbbc04] font-bold text-[#202124]">
                  1
                </span>

                <div>
                  <h3 className="font-bold text-[#202124]">
                    Assessment Details
                  </h3>

                  <p className="text-sm text-[#5f6368]">
                    Define the subject, type, date, and total items.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <FormLabel label="Assessment Name" required />

                  <input
                    type="text"
                    value={formData.name}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="e.g. First Quarter Examination"
                    className="w-full rounded-[14px] border border-[#dadce0] bg-white px-4 py-3 text-[#202124] placeholder-[#80868b] outline-none transition focus:border-[#4285f4] focus:ring-4 focus:ring-[#4285f4]/20"
                    required
                  />
                </div>

                <div>
                  <FormLabel label="Subject" required />

                  <select
                    value={formData.subject_id}
                    onChange={(event) =>
                      handleSubjectChange(event.target.value)
                    }
                    className="w-full rounded-[14px] border border-[#dadce0] bg-white px-4 py-3 text-[#202124] outline-none transition focus:border-[#4285f4] focus:ring-4 focus:ring-[#4285f4]/20"
                    required
                  >
                    <option value="">Select a subject</option>

                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <FormLabel label="Classification" required />

                  <select
                    value={formData.type}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        type: event.target.value,
                      }))
                    }
                    className="w-full rounded-[14px] border border-[#dadce0] bg-white px-4 py-3 text-[#202124] outline-none transition focus:border-[#4285f4] focus:ring-4 focus:ring-[#4285f4]/20"
                    required
                  >
                    {TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <FormLabel label="Date" required />

                  <input
                    type="date"
                    value={formData.date}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        date: event.target.value,
                      }))
                    }
                    className="w-full rounded-[14px] border border-[#dadce0] bg-white px-4 py-3 text-[#202124] outline-none transition focus:border-[#4285f4] focus:ring-4 focus:ring-[#4285f4]/20"
                    required
                  />
                </div>

                <div>
                  <FormLabel label="Total Assessment Items" required />

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formData.total_items}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        total_items: event.target.value,
                      }))
                    }
                    placeholder="e.g. 50"
                    className="w-full rounded-[14px] border border-[#dadce0] bg-white px-4 py-3 text-[#202124] placeholder-[#80868b] outline-none transition focus:border-[#4285f4] focus:ring-4 focus:ring-[#4285f4]/20"
                    required
                  />
                </div>
              </div>
            </section>

            <section className="rounded-[22px] border border-[#dadce0] bg-white p-5">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#34a853] font-bold text-white">
                    2
                  </span>

                  <div>
                    <h3 className="font-bold text-[#202124]">
                      Student Scores
                    </h3>

                    <p className="text-sm text-[#5f6368]">
                      Only students enrolled in the selected subject are shown.
                    </p>
                  </div>
                </div>

                <span className="w-fit rounded-full bg-[#1a73e8] px-3 py-1.5 text-sm font-semibold text-white">
                  {enteredCount} of {students.length} scores entered
                </span>
              </div>

              {loadingStudents ? (
                <div className="rounded-[18px] border border-[#dadce0] bg-[#f8f9fa] py-10 text-center text-[#5f6368]">
                  Loading enrolled students...
                </div>
              ) : (
                <div className="overflow-x-auto rounded-[18px] border border-[#dadce0]">
                  <table className="w-full min-w-[650px] text-left">
                    <thead className="border-b border-[#dadce0] bg-[#f8f9fa] text-xs uppercase tracking-wide text-[#5f6368]">
                      <tr>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Grade</th>
                        <th className="px-4 py-3">Section</th>
                        <th className="w-48 px-4 py-3">Score</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#e3e3e3]">
                      {students.map((student) => (
                        <tr key={student.id} className="hover:bg-[#f8f9fa]">
                          <td className="px-4 py-3 font-semibold text-[#202124]">
                            {student.name}
                          </td>

                          <td className="px-4 py-3 text-[#5f6368]">
                            {student.grade}
                          </td>

                          <td className="px-4 py-3 text-[#5f6368]">
                            {student.section}
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max={totalItems > 0 ? totalItems : undefined}
                                step="1"
                                value={scores[student.id] ?? ""}
                                onChange={(event) =>
                                  handleScoreChange(
                                    student.id,
                                    event.target.value,
                                  )
                                }
                                className="w-24 rounded-[12px] border border-[#dadce0] bg-white px-3 py-2 text-[#202124] outline-none transition focus:border-[#4285f4] focus:ring-4 focus:ring-[#4285f4]/20"
                                placeholder="—"
                              />

                              <span className="text-[#5f6368]">
                                / {totalItems > 0 ? totalItems : "?"}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {students.length === 0 && (
                        <tr>
                          <td
                            colSpan="4"
                            className="px-4 py-10 text-center text-[#5f6368]"
                          >
                            No students are enrolled in this subject yet. The
                            assessment can still be saved.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
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
                disabled={saving || subjects.length === 0}
                className="rounded-full bg-[#1a73e8] px-7 py-3 font-semibold text-white transition hover:bg-[#1765cc] disabled:cursor-not-allowed disabled:bg-[#dadce0] disabled:text-[#80868b]"
              >
                {saving
                  ? "Saving..."
                  : isEditing
                    ? "Update Assessment"
                    : "Save Assessment"}
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
      <div className="mx-auto max-w-6xl">{formCard}</div>
    </div>
  );
}

function FormLabel({ label, required = false }) {
  return (
    <label className="mb-2 block text-sm font-semibold text-[#3c4043]">
      {label} {required && <span className="text-[#ea4335]">*</span>}
    </label>
  );
}