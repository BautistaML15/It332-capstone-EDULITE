import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import axios from "axios";

const API_URL =
  "http://localhost:3000";

const TYPES = [
  "Major Exam",
  "Activity",
  "Quiz",
];

function todayAsInputValue() {
  const now = new Date();

  const timezoneOffset =
    now.getTimezoneOffset() *
    60_000;

  return new Date(
    now.getTime() -
      timezoneOffset,
  )
    .toISOString()
    .slice(0, 10);
}

export default function AssessmentForm() {
  const [
    formData,
    setFormData,
  ] = useState({
    name: "",
    type: "Quiz",
    date: todayAsInputValue(),
    total_items: "",
    subject_id: "",
  });

  const [
    subjects,
    setSubjects,
  ] = useState([]);

  const [
    students,
    setStudents,
  ] = useState([]);

  const [
    scores,
    setScores,
  ] = useState({});

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadingStudents,
    setLoadingStudents,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const navigate =
    useNavigate();

  const { id } =
    useParams();

  const isEditing =
    Boolean(id);

  useEffect(() => {
    if (
      !localStorage.getItem(
        "user",
      )
    ) {
      navigate("/");
      return;
    }

    const loadPage = async () => {
      setLoading(true);
      setError("");

      try {
        const subjectResponse =
          await axios.get(
            `${API_URL}/subjects`,
          );

        setSubjects(
          subjectResponse.data,
        );

        if (isEditing) {
          const assessmentResponse =
            await axios.get(
              `${API_URL}/assessments/${id}`,
            );

          const assessment =
            assessmentResponse.data;

          setFormData({
            name:
              assessment.name,

            type:
              assessment.type,

            date:
              assessment.date,

            total_items:
              String(
                assessment.total_items,
              ),

            subject_id:
              String(
                assessment.subject_id,
              ),
          });

          setStudents(
            assessment.students,
          );

          setScores(
            Object.fromEntries(
              assessment.students.map(
                (student) => [
                  student.id,
                  student.score ??
                    "",
                ],
              ),
            ),
          );
        } else {
          const firstSubjectId =
            subjectResponse.data[0]
              ?.id;

          setFormData(
            (current) => ({
              ...current,

              subject_id:
                firstSubjectId
                  ? String(
                      firstSubjectId,
                    )
                  : "",
            }),
          );

          if (firstSubjectId) {
            await loadStudentsForSubject(
              firstSubjectId,
            );
          }
        }
      } catch (err) {
        setError(
          err.response?.data
            ?.message ||
            "Unable to load the assessment form.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [
    id,
    isEditing,
    navigate,
  ]);

  const loadStudentsForSubject =
    async (subjectId) => {
      if (!subjectId) {
        setStudents([]);
        setScores({});
        return;
      }

      setLoadingStudents(true);

      try {
        const response =
          await axios.get(
            `${API_URL}/students`,
            {
              params: {
                subject_id:
                  subjectId,
              },
            },
          );

        setStudents(
          response.data,
        );

        setScores(
          Object.fromEntries(
            response.data.map(
              (student) => [
                student.id,
                "",
              ],
            ),
          ),
        );
      } catch (err) {
        setError(
          err.response?.data
            ?.message ||
            "Unable to load students for the subject.",
        );
      } finally {
        setLoadingStudents(
          false,
        );
      }
    };

  const handleSubjectChange =
    async (value) => {
      setFormData(
        (current) => ({
          ...current,
          subject_id: value,
        }),
      );

      await loadStudentsForSubject(
        value,
      );
    };

  const totalItems = Number(
    formData.total_items,
  );

  const enteredCount = useMemo(
    () =>
      Object.values(scores).filter(
        (score) => score !== "",
      ).length,

    [scores],
  );

  const handleScoreChange = (
    studentId,
    value,
  ) => {
    if (
      value !== "" &&
      !/^\d+$/.test(value)
    ) {
      return;
    }

    setScores(
      (current) => ({
        ...current,
        [studentId]: value,
      }),
    );
  };

  const handleSubmit = async (
    event,
  ) => {
    event.preventDefault();
    setError("");

    if (!formData.subject_id) {
      setError(
        "Select a subject for the assessment.",
      );

      return;
    }

    if (
      !Number.isInteger(
        totalItems,
      ) ||
      totalItems <= 0
    ) {
      setError(
        "Total assessment items must be a positive whole number.",
      );

      return;
    }

    for (
      const [
        studentId,
        value,
      ]
      of Object.entries(scores)
    ) {
      if (value === "") {
        continue;
      }

      const score = Number(value);

      if (
        !Number.isInteger(score) ||
        score < 0 ||
        score > totalItems
      ) {
        const student =
          students.find(
            (item) =>
              item.id ===
              Number(studentId),
          );

        setError(
          `${student?.name || "A student"}'s score must be from 0 to ${totalItems}.`,
        );

        return;
      }
    }

    const payload = {
      ...formData,

      subject_id: Number(
        formData.subject_id,
      ),

      total_items:
        totalItems,

      scores: students.map(
        (student) => ({
          student_id:
            student.id,

          score:
            scores[student.id] ===
            ""
              ? null
              : Number(
                  scores[
                    student.id
                  ],
                ),
        }),
      ),
    };

    setSaving(true);

    try {
      if (isEditing) {
        await axios.put(
          `${API_URL}/assessments/${id}`,
          payload,
        );
      } else {
        await axios.post(
          `${API_URL}/assessments`,
          payload,
        );
      }

      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data
          ?.message ||
          "Unable to save the assessment.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden p-4 md:p-8">
      <video className="fixed inset-0 h-full w-full object-cover" autoPlay loop muted playsInline aria-hidden="true">
        <source
          src="/background.mp4"
          type="video/mp4"
        />
      </video>

      <div className="fixed inset-0 bg-black/55" />

      <div className="relative z-10 max-w-5xl mx-auto bg-slate-950/45 backdrop-blur-xl border border-white/20 p-6 md:p-8 rounded-2xl shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5 mb-6">
          <div>
            <p className="text-blue-300 text-sm uppercase tracking-widest font-semibold">
              Assessment Management
            </p>

            <h1 className="text-2xl font-bold text-white tracking-wider mt-1">
              {isEditing
                ? "Edit Assessment"
                : "Add New Assessment"}
            </h1>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/dashboard",
              )
            }
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-5 py-2.5 rounded-lg transition tracking-wider"
          >
            Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-400/60 text-red-100 p-4 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-white/70">
            Loading assessment
            form...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="bg-white/5 border border-white/10 p-5 rounded-xl">
              <h2 className="text-white/80 font-medium tracking-widest text-sm uppercase mb-5">
                Assessment Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-white/90 text-sm font-medium mb-2 tracking-wider">
                    Assessment Name{" "}
                    <span className="text-red-400">
                      *
                    </span>
                  </label>

                  <input
                    type="text"
                    value={
                      formData.name
                    }
                    onChange={(
                      event,
                    ) =>
                      setFormData({
                        ...formData,

                        name:
                          event.target
                            .value,
                      })
                    }
                    placeholder="e.g. First Quarter Examination"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-400 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white/90 text-sm font-medium mb-2 tracking-wider">
                    Subject{" "}
                    <span className="text-red-400">
                      *
                    </span>
                  </label>

                  <select
                    value={
                      formData.subject_id
                    }
                    onChange={(
                      event,
                    ) =>
                      handleSubjectChange(
                        event.target
                          .value,
                      )
                    }
                    className="w-full bg-slate-900 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-400 transition"
                    required
                  >
                    <option value="">
                      Select a subject
                    </option>

                    {subjects.map(
                      (subject) => (
                        <option
                          key={
                            subject.id
                          }
                          value={
                            subject.id
                          }
                        >
                          {
                            subject.name
                          }
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-white/90 text-sm font-medium mb-2 tracking-wider">
                    Classification{" "}
                    <span className="text-red-400">
                      *
                    </span>
                  </label>

                  <select
                    value={
                      formData.type
                    }
                    onChange={(
                      event,
                    ) =>
                      setFormData({
                        ...formData,

                        type:
                          event.target
                            .value,
                      })
                    }
                    className="w-full bg-slate-900 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-400 transition"
                    required
                  >
                    {TYPES.map(
                      (type) => (
                        <option
                          key={type}
                          value={type}
                        >
                          {type}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-white/90 text-sm font-medium mb-2 tracking-wider">
                    Date{" "}
                    <span className="text-red-400">
                      *
                    </span>
                  </label>

                  <input
                    type="date"
                    value={
                      formData.date
                    }
                    onChange={(
                      event,
                    ) =>
                      setFormData({
                        ...formData,

                        date:
                          event.target
                            .value,
                      })
                    }
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-400 transition [color-scheme:dark]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white/90 text-sm font-medium mb-2 tracking-wider">
                    Total Assessment
                    Items{" "}
                    <span className="text-red-400">
                      *
                    </span>
                  </label>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={
                      formData.total_items
                    }
                    onChange={(
                      event,
                    ) =>
                      setFormData({
                        ...formData,

                        total_items:
                          event.target
                            .value,
                      })
                    }
                    placeholder="e.g. 50"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-400 transition"
                    required
                  />
                </div>
              </div>
            </section>

            <section className="bg-white/5 border border-white/10 p-5 rounded-xl">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-white/80 font-medium tracking-widest text-sm uppercase">
                    Student Scores
                  </h2>

                  <p className="text-white/50 text-sm mt-1">
                    Only students
                    enrolled in the
                    selected subject
                    are shown.
                  </p>
                </div>

                <span className="text-blue-200 text-sm">
                  {enteredCount} of{" "}
                  {students.length}{" "}
                  scores entered
                </span>
              </div>

              {loadingStudents ? (
                <div className="py-10 text-center text-white/60">
                  Loading enrolled
                  students...
                </div>
              ) : (
                <div className="overflow-x-auto border border-white/10 rounded-xl">
                  <table className="w-full text-left text-white/90 min-w-[650px]">
                    <thead className="bg-black/20 text-white/60 uppercase text-xs tracking-wider">
                      <tr>
                        <th className="px-4 py-3">
                          Student
                        </th>

                        <th className="px-4 py-3">
                          Grade
                        </th>

                        <th className="px-4 py-3">
                          Section
                        </th>

                        <th className="px-4 py-3 w-48">
                          Score
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {students.map(
                        (student) => (
                          <tr
                            key={
                              student.id
                            }
                            className="border-t border-white/10"
                          >
                            <td className="px-4 py-3 font-medium">
                              {
                                student.name
                              }
                            </td>

                            <td className="px-4 py-3">
                              {
                                student.grade
                              }
                            </td>

                            <td className="px-4 py-3">
                              {
                                student.section
                              }
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  max={
                                    totalItems >
                                    0
                                      ? totalItems
                                      : undefined
                                  }
                                  step="1"
                                  value={
                                    scores[
                                      student
                                        .id
                                    ] ?? ""
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    handleScoreChange(
                                      student.id,
                                      event
                                        .target
                                        .value,
                                    )
                                  }
                                  className="w-24 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                                  placeholder="—"
                                />

                                <span className="text-white/50">
                                  /{" "}
                                  {totalItems >
                                  0
                                    ? totalItems
                                    : "?"}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ),
                      )}

                      {students.length ===
                        0 && (
                        <tr>
                          <td
                            colSpan="4"
                            className="px-4 py-10 text-center text-white/50"
                          >
                            No students
                            are enrolled
                            in this
                            subject yet.
                            The
                            assessment
                            can still be
                            saved.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button
                type="submit"
                disabled={
                  saving ||
                  subjects.length ===
                    0
                }
                className="flex-1 bg-blue-600/90 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold py-4 rounded-lg shadow-lg transition tracking-widest"
              >
                {saving
                  ? "Saving..."
                  : isEditing
                    ? "Update Assessment"
                    : "Save Assessment"}
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/dashboard",
                  )
                }
                className="flex-1 bg-slate-600/90 hover:bg-slate-500 text-white font-semibold py-4 rounded-lg shadow-lg transition tracking-widest"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}