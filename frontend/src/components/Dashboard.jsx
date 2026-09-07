import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import StudentForm from "./StudentForm";
import AssessmentForm from "./AssessmentForm";

const API_URL = "http://localhost:3000";
const PASSING_PERCENTAGE = 75;
const HIGH_POTENTIAL_PERCENTAGE = 90;

const PAGE_DETAILS = {
  dashboard: {
    title: "Dashboard",
    description:
      "Student performance analytics, learning insights, and subject assessments.",
  },
  records: {
    title: "Student Assessment Records",
    description:
      "Review, edit, and manage student scores for every enrolled subject.",
  },
  sections: {
    title: "Sections",
    description:
      "Create and manage the sections used when registering students.",
  },
  subjects: {
    title: "Subjects",
    description:
      "Create subjects and select the students enrolled in each subject.",
  },
  students: {
    title: "Students",
    description:
      "Register students, manage enrollment, and open individual records.",
  },
  studentForm: {
    title: "Register Student",
    description: "Add or update a student without leaving the dashboard.",
  },
  assessments: {
    title: "Assessments",
    description:
      "Create, review, edit, and manage subject assessments and scores.",
  },
  assessmentForm: {
    title: "Create Assessment",
    description:
      "Create or update an assessment and record scores inside the dashboard.",
  },
  aiInsights: {
    title: "AI Insights",
    description:
      "Generate evidence-based interventions and enrichment activities.",
  },
};

export default function Dashboard() {
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [assessmentRecords, setAssessmentRecords] = useState([]);
  const [gradeSummaries, setGradeSummaries] = useState([]);
  const [selectedSection, setSelectedSection] = useState("ALL");
  const [selectedTerm, setSelectedTerm] = useState("1");
  const [selectedSubject, setSelectedSubject] = useState("ALL");
  const [newSection, setNewSection] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [loading, setLoading] = useState(true);
  const [addingSection, setAddingSection] = useState(false);
  const [addingSubject, setAddingSubject] = useState(false);
  const [showSubjectStudentPrompt, setShowSubjectStudentPrompt] =
    useState(false);
  const [selectedSubjectStudentIds, setSelectedSubjectStudentIds] = useState(
    [],
  );
  const [subjectStudentSearch, setSubjectStudentSearch] = useState("");
  const [toasts, setToasts] = useState([]);
  const toastCounterRef = useRef(0);
  const toastTimersRef = useRef(new Map());
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [editedScores, setEditedScores] = useState({});
  const [savingScores, setSavingScores] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");
  const [studentFormId, setStudentFormId] = useState(null);
  const [assessmentFormId, setAssessmentFormId] = useState(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const savedPreference = localStorage.getItem("eduliteSidebarCollapsed");

    if (savedPreference !== null) {
      return savedPreference === "true";
    }

    return typeof window !== "undefined"
      ? window.matchMedia("(max-width: 1023px)").matches
      : true;
  });

  const [aiRecommendation, setAiRecommendation] = useState(null);
  const [aiRecommendationError, setAiRecommendationError] = useState("");
  const [generatingRecommendationKey, setGeneratingRecommendationKey] =
    useState("");
  const [expandedStudentId, setExpandedStudentId] = useState(null);
  const [studentInsightsById, setStudentInsightsById] = useState({});
  const [loadingStudentInsightsId, setLoadingStudentInsightsId] =
    useState(null);
  const [studentInsightErrors, setStudentInsightErrors] = useState({});

  const navigate = useNavigate();

  const dismissToast = (toastId) => {
    const existingTimer = toastTimersRef.current.get(toastId);

    if (existingTimer) {
      window.clearTimeout(existingTimer);
      toastTimersRef.current.delete(toastId);
    }

    setToasts((currentToasts) =>
      currentToasts.map((toast) =>
        toast.id === toastId
          ? {
              ...toast,
              closing: true,
            }
          : toast,
      ),
    );

    window.setTimeout(() => {
      setToasts((currentToasts) =>
        currentToasts.filter((toast) => toast.id !== toastId),
      );
    }, 280);
  };

  const showToast = (type, message, options = {}) => {
    const normalizedMessage = String(message ?? "").trim();

    if (!normalizedMessage) {
      return;
    }

    toastCounterRef.current += 1;

    const toastId = `edulite-toast-${Date.now()}-${toastCounterRef.current}`;

    const toast = {
      id: toastId,
      type,
      title:
        options.title ||
        (type === "success"
          ? "EduLITE"
          : type === "error"
            ? "EduLITE"
            : "EduLITE"),
      message: normalizedMessage,
      closing: false,
    };

    setToasts((currentToasts) => [...currentToasts.slice(-2), toast]);

    const duration = Number(options.duration ?? (type === "error" ? 5200 : 4000));

    const timer = window.setTimeout(() => {
      dismissToast(toastId);
    }, duration);

    toastTimersRef.current.set(toastId, timer);
  };

  // Compatibility helpers used throughout the existing Dashboard handlers.
  // Empty strings simply clear the old inline-banner behavior and do not
  // create a notification.
  const setError = (message) => {
    if (message) {
      showToast("error", message);
    }
  };

  const setSuccess = (message) => {
    if (message) {
      showToast("success", message);
    }
  };

  const pageDetails =
    activeView === "studentForm" && studentFormId
      ? {
          title: "Edit Student",
          description:
            "Update the student's information without leaving the dashboard.",
        }
      : activeView === "assessmentForm" && assessmentFormId
        ? {
            title: "Edit Assessment",
            description:
              "Update the assessment and student scores without leaving the dashboard.",
          }
        : (PAGE_DETAILS[activeView] ?? PAGE_DETAILS.dashboard);

  useEffect(() => {
    localStorage.setItem("eduliteSidebarCollapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    return () => {
      toastTimersRef.current.forEach((timer) => {
        window.clearTimeout(timer);
      });

      toastTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const stylesheets = [
      {
        id: "edulite-material-symbols",
        href: "https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:FILL@0..1&icon_names=assignment,auto_awesome,category,dashboard,groups,logout,menu_book,table_view&display=block",
      },
    ];

    stylesheets.forEach(({ id, href }) => {
      if (document.getElementById(id)) {
        return;
      }

      const stylesheet = document.createElement("link");
      stylesheet.id = id;
      stylesheet.rel = "stylesheet";
      stylesheet.href = href;
      document.head.appendChild(stylesheet);
    });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("eduliteToken");

    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser) {
      navigate("/");
      return;
    }

    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const [
        studentResponse,
        sectionResponse,
        subjectResponse,
        assessmentResponse,
        recordResponse,
        gradeSummaryResponse,
      ] = await Promise.all([
        axios.get(`${API_URL}/students`),
        axios.get(`${API_URL}/sections`),
        axios.get(`${API_URL}/subjects`),
        axios.get(`${API_URL}/assessments`),
        axios.get(`${API_URL}/assessment-records`),
        axios.get(`${API_URL}/grade-summaries`),
      ]);

      setStudents(studentResponse.data);
      setSections(sectionResponse.data);
      setSubjects(subjectResponse.data);
      setAssessments(assessmentResponse.data);
      setAssessmentRecords(recordResponse.data);
      setGradeSummaries(gradeSummaryResponse.data ?? []);

      if (
        selectedSection !== "ALL" &&
        !sectionResponse.data.some(
          (section) => section.name === selectedSection,
        )
      ) {
        setSelectedSection("ALL");
      }

      if (
        selectedSubject !== "ALL" &&
        !subjectResponse.data.some(
          (subject) => String(subject.id) === String(selectedSubject),
        )
      ) {
        setSelectedSubject("ALL");
      }
    } catch (err) {
      console.error("Error loading dashboard:", err);

      setError(err.response?.data?.message || "Unable to load the dashboard.");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const openView = (view) => {
    if (view !== "studentForm") {
      setStudentFormId(null);
    }

    if (view !== "assessmentForm") {
      setAssessmentFormId(null);
    }

    setActiveView(view);
    setError("");
    setSuccess("");

    if (window.matchMedia("(max-width: 1023px)").matches) {
      setSidebarCollapsed(true);
    }

    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  const handleAddSection = async (event) => {
    event.preventDefault();

    const sectionName = newSection.trim();

    if (!sectionName) {
      return;
    }

    setAddingSection(true);
    setError("");
    setSuccess("");

    try {
      await axios.post(`${API_URL}/sections`, {
        name: sectionName,
      });

      setNewSection("");

      await fetchDashboardData({ silent: true });

      setSuccess("Section added successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to add the section.");
    } finally {
      setAddingSection(false);
    }
  };

  const handleRemoveSection = async (section) => {
    if (!window.confirm(`Remove section "${section.name}"?`)) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await axios.delete(`${API_URL}/sections/${section.id}`);

      if (selectedSection === section.name) {
        setSelectedSection("ALL");
      }

      await fetchDashboardData({ silent: true });

      setSuccess("Section removed successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to remove the section.");
    }
  };

  const openSubjectStudentPrompt = (event) => {
    event.preventDefault();

    if (!newSubject.trim()) {
      return;
    }

    setSelectedSubjectStudentIds([]);
    setSubjectStudentSearch("");
    setError("");
    setSuccess("");
    setShowSubjectStudentPrompt(true);
  };

  const closeSubjectStudentPrompt = () => {
    if (addingSubject) {
      return;
    }

    setShowSubjectStudentPrompt(false);
    setSelectedSubjectStudentIds([]);
    setSubjectStudentSearch("");
  };

  const toggleNewSubjectStudent = (studentId) => {
    setSelectedSubjectStudentIds((currentIds) =>
      currentIds.includes(studentId)
        ? currentIds.filter((id) => id !== studentId)
        : [...currentIds, studentId],
    );
  };

  const handleAddSubject = async () => {
    const subjectName = newSubject.trim();

    if (!subjectName) {
      return;
    }

    setAddingSubject(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.post(`${API_URL}/subjects`, {
        name: subjectName,
        student_ids: selectedSubjectStudentIds,
      });

      const enrolledCount =
        response.data?.student_count ?? selectedSubjectStudentIds.length;

      setNewSubject("");
      setShowSubjectStudentPrompt(false);
      setSelectedSubjectStudentIds([]);
      setSubjectStudentSearch("");

      await fetchDashboardData({ silent: true });

      setSuccess(
        `${
          response.data?.message || "Subject added successfully."
        } ${enrolledCount} student${enrolledCount === 1 ? "" : "s"} enrolled.`,
      );
    } catch (err) {
      setError(err.response?.data?.message || "Unable to add the subject.");
    } finally {
      setAddingSubject(false);
    }
  };

  const handleRenameSubject = async (subject) => {
    const nextName = window
      .prompt("Enter the new subject name:", subject.name)
      ?.trim();

    if (!nextName || nextName === subject.name) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await axios.put(`${API_URL}/subjects/${subject.id}`, {
        name: nextName,
      });

      await fetchDashboardData({ silent: true });

      setSuccess("Subject updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update the subject.");
    }
  };

  const handleRemoveSubject = async (subject) => {
    if (!window.confirm(`Remove subject "${subject.name}"?`)) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await axios.delete(`${API_URL}/subjects/${subject.id}`);

      if (String(selectedSubject) === String(subject.id)) {
        setSelectedSubject("ALL");
      }

      await fetchDashboardData({ silent: true });

      setSuccess("Subject removed successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to remove the subject.");
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (
      !window.confirm(
        "Remove this student, their subject enrollments, and assessment scores?",
      )
    ) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await axios.delete(`${API_URL}/students/${studentId}`);

      await fetchDashboardData({ silent: true });

      setSuccess("Student deleted successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete the student.");
    }
  };

  const handleDeleteAssessment = async (assessmentId) => {
    if (!window.confirm("Delete this assessment and all recorded scores?")) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await axios.delete(`${API_URL}/assessments/${assessmentId}`);

      await fetchDashboardData({ silent: true });

      setSuccess("Assessment deleted successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to delete the assessment.",
      );
    }
  };

  const handleRegisterStudent = () => {
    if (sections.length === 0) {
      setError("Add at least one section before registering a student.");
      setActiveView("sections");
      return;
    }

    if (subjects.length === 0) {
      setError("Add at least one subject before registering a student.");
      setActiveView("subjects");
      return;
    }

    setStudentFormId(null);
    openView("studentForm");
  };

  const handleEditStudent = (studentId) => {
    setStudentFormId(studentId);
    setActiveView("studentForm");
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStudentFormCancel = () => {
    const returnView = "students";
    setStudentFormId(null);
    openView(returnView);
  };

  const handleStudentFormSaved = async (_result, details) => {
    await fetchDashboardData({ silent: true });
    setStudentFormId(null);
    setActiveView("students");
    setError("");
    setSuccess(
      details?.isEditing
        ? "Student updated successfully."
        : "Student registered successfully.",
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAddAssessment = () => {
    if (subjects.length === 0) {
      setError("Add at least one subject before creating an assessment.");
      setActiveView("subjects");
      return;
    }

    setAssessmentFormId(null);
    openView("assessmentForm");
  };

  const handleEditAssessment = (assessmentId) => {
    setAssessmentFormId(assessmentId);
    setActiveView("assessmentForm");
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAssessmentFormCancel = () => {
    setAssessmentFormId(null);
    openView("assessments");
  };

  const handleAssessmentFormSaved = async (_result, details) => {
    await fetchDashboardData({ silent: true });
    setAssessmentFormId(null);
    setActiveView("assessments");
    setError("");
    setSuccess(
      details?.isEditing
        ? "Assessment updated successfully."
        : "Assessment added successfully.",
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLogout = () => {
    localStorage.removeItem("eduliteToken");

    localStorage.removeItem("user");

    navigate("/");
  };

  const selectedSubjectId =
    selectedSubject === "ALL" ? null : String(selectedSubject);

  const generateStudentRecommendation = async (student, supportType) => {
    const requestKey = `${supportType}-${student.id}`;

    if (generatingRecommendationKey) {
      return;
    }

    setGeneratingRecommendationKey(requestKey);
    setAiRecommendationError("");
    setAiRecommendation(null);

    try {
      const response = await axios.post(
        `${API_URL}/api/gemini/student-support/${student.id}`,
        {
          support_type: supportType,
          focus_subject_id: selectedSubjectId,
          term: Number(selectedTerm),
        },
      );

      const { savedInsight, ...result } = response.data;

      setAiRecommendation({
        ...result,
        savedInsight,
      });

      if (savedInsight) {
        setStudentInsightsById((current) => {
          if (!Object.prototype.hasOwnProperty.call(current, student.id)) {
            return current;
          }

          return {
            ...current,
            [student.id]: [
              {
                ...savedInsight,
                result,
              },
              ...current[student.id].filter(
                (insight) => insight.id !== savedInsight.id,
              ),
            ],
          };
        });
      }
    } catch (err) {
      console.error("Unable to generate Gemini recommendation:", err);

      setAiRecommendationError(
        err.response?.data?.message ||
          "Unable to generate the learning-support recommendation.",
      );
    } finally {
      setGeneratingRecommendationKey("");
    }
  };

  const closeAiRecommendation = () => {
    if (generatingRecommendationKey) {
      return;
    }

    setAiRecommendation(null);
    setAiRecommendationError("");
  };

  const openSavedInsight = (insight) => {
    if (!insight?.result) {
      setAiRecommendation(null);
      setAiRecommendationError("The saved insight data could not be opened.");
      return;
    }

    setAiRecommendationError("");

    setAiRecommendation({
      ...insight.result,
      savedInsight: {
        id: insight.id,
        studentId: insight.studentId,
        supportType: insight.supportType,
        classification: insight.classification,
        focusSubjectId: insight.focusSubjectId,
        focusLabel: insight.focusLabel,
        model: insight.model,
        title: insight.title,
        createdAt: insight.createdAt,
        pdfUrl: insight.pdfUrl,
      },
    });
  };

  const loadStudentInsights = async (studentId, force = false) => {
    if (
      !force &&
      Object.prototype.hasOwnProperty.call(studentInsightsById, studentId)
    ) {
      return;
    }

    setLoadingStudentInsightsId(studentId);

    setStudentInsightErrors((current) => ({
      ...current,
      [studentId]: "",
    }));

    try {
      const response = await axios.get(
        `${API_URL}/api/students/${studentId}/insights`,
      );

      setStudentInsightsById((current) => ({
        ...current,
        [studentId]: response.data,
      }));
    } catch (err) {
      setStudentInsightErrors((current) => ({
        ...current,
        [studentId]:
          err.response?.data?.message ||
          "Unable to load the student's saved learning insights.",
      }));
    } finally {
      setLoadingStudentInsightsId((currentId) =>
        currentId === studentId ? null : currentId,
      );
    }
  };

  const toggleStudentProfile = async (student) => {
    setExpandedStudentId(student.id);
    await loadStudentInsights(student.id);
  };

  const subjectPromptStudents = useMemo(() => {
    const searchValue = subjectStudentSearch.trim().toLowerCase();

    if (!searchValue) {
      return students;
    }

    return students.filter((student) =>
      `${student.name} ${student.grade} ${student.section}`
        .toLowerCase()
        .includes(searchValue),
    );
  }, [students, subjectStudentSearch]);

  const displayedAssessments = useMemo(() => {
    const subjectFiltered =
      selectedSubjectId === null
        ? assessments
        : assessments.filter(
            (assessment) =>
              assessment.subject_id === selectedSubjectId,
          );

    // Keep legacy assessments visible in the Assessment Library so they
    // can be opened and classified. Official grade views use one term.
    if (activeView === "assessments") {
      return subjectFiltered.filter(
        (assessment) =>
          !assessment.is_structured ||
          Number(assessment.term) === Number(selectedTerm),
      );
    }

    return subjectFiltered.filter(
      (assessment) =>
        Number(assessment.term) === Number(selectedTerm),
    );
  }, [
    assessments,
    selectedSubjectId,
    selectedTerm,
    activeView,
  ]);

  const displayedStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSection =
        selectedSection === "ALL" || student.section === selectedSection;

      const matchesSubject =
        selectedSubjectId === null ||
        student.subject_ids?.includes(selectedSubjectId);

      return matchesSection && matchesSubject;
    });
  }, [students, selectedSection, selectedSubjectId]);

  const scoreMap = useMemo(() => {
    const map = {};

    for (const record of assessmentRecords) {
      if (!map[record.student_id]) {
        map[record.student_id] = {};
      }

      map[record.student_id][record.assessment_id] = record.score;
    }

    return map;
  }, [assessmentRecords]);

  const getStudentAssessments = (student) =>
    displayedAssessments.filter((assessment) =>
      student.subject_ids?.includes(assessment.subject_id),
    );

  const startEditingScores = (student) => {
    const currentScores = {};

    for (const assessment of getStudentAssessments(student)) {
      const currentScore = scoreMap[student.id]?.[assessment.id];

      currentScores[assessment.id] =
        currentScore === undefined || currentScore === null
          ? ""
          : String(currentScore);
    }

    setEditedScores(currentScores);
    setEditingStudentId(student.id);
    setError("");
    setSuccess("");
  };

  const cancelEditingScores = () => {
    if (savingScores) {
      return;
    }

    setEditingStudentId(null);
    setEditedScores({});
    setError("");
  };

  const handleEditedScoreChange = (assessmentId, value) => {
    if (value !== "" && !/^\d+$/.test(value)) {
      return;
    }

    setEditedScores((currentScores) => ({
      ...currentScores,
      [assessmentId]: value,
    }));
  };

  const saveStudentScores = async (student) => {
    if (savingScores) {
      return;
    }

    setError("");
    setSuccess("");

    const scoreList = [];

    for (const assessment of getStudentAssessments(student)) {
      const enteredValue = editedScores[assessment.id];

      const isBlank =
        enteredValue === "" ||
        enteredValue === null ||
        enteredValue === undefined;

      if (!isBlank) {
        const numericScore = Number(enteredValue);

        if (
          !Number.isInteger(numericScore) ||
          numericScore < 0 ||
          numericScore > Number(assessment.total_items)
        ) {
          setError(
            `${student.name}'s score for "${assessment.name}" must be between 0 and ${assessment.total_items}.`,
          );
          return;
        }
      }

      scoreList.push({
        assessment_id: assessment.id,
        score: isBlank ? null : Number(enteredValue),
      });
    }

    setSavingScores(true);

    try {
      const response = await axios.put(
        `${API_URL}/students/${student.id}/assessment-scores`,
        {
          scores: scoreList,
        },
      );

      setEditingStudentId(null);
      setEditedScores({});

      await fetchDashboardData({ silent: true });

      setSuccess(response.data?.message || "Scores updated successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to update the student scores.",
      );
    } finally {
      setSavingScores(false);
    }
  };

  const relevantAssessmentIds = useMemo(
    () =>
      new Set(
        displayedAssessments.map(
          (assessment) => assessment.id,
        ),
      ),
    [displayedAssessments],
  );

  const selectedTermKey = `term${selectedTerm}`;
  const currentTermLabel = `Term ${selectedTerm}`;

  const studentAnalytics = useMemo(() => {
    return displayedStudents.map((student) => {
      const matchingSummaries = gradeSummaries.filter(
        (summary) =>
          summary.student_id === student.id &&
          (selectedSubjectId === null ||
            summary.subject_id === selectedSubjectId),
      );

      const officialTermGrades = matchingSummaries
        .map(
          (summary) =>
            summary[selectedTermKey]?.termGrade,
        )
        .filter(
          (grade) =>
            grade !== null &&
            grade !== undefined &&
            grade !== "" &&
            Number.isFinite(Number(grade)),
        )
        .map(Number);

      const averagePercentage =
        officialTermGrades.length > 0
          ? officialTermGrades.reduce(
              (total, grade) => total + grade,
              0,
            ) / officialTermGrades.length
          : null;

      const assessmentCount = assessmentRecords.filter(
        (record) =>
          record.student_id === student.id &&
          relevantAssessmentIds.has(record.assessment_id),
      ).length;

      return {
        ...student,
        averagePercentage,
        assessmentCount,
        officialTermGrades,
      };
    });
  }, [
    displayedStudents,
    gradeSummaries,
    selectedSubjectId,
    selectedTermKey,
    assessmentRecords,
    relevantAssessmentIds,
  ]);

  const assessedStudents = studentAnalytics.filter(
    (student) => student.averagePercentage !== null,
  );

  const classAverage =
    assessedStudents.length > 0
      ? assessedStudents.reduce(
          (total, student) =>
            total + student.averagePercentage,
          0,
        ) / assessedStudents.length
      : 0;

  const excellentStudents = assessedStudents.filter(
    (student) => student.averagePercentage >= 90,
  );

  const verySatisfactoryStudents = assessedStudents.filter(
    (student) =>
      student.averagePercentage >= 80 &&
      student.averagePercentage < 90,
  );

  const satisfactoryStudents = assessedStudents.filter(
    (student) =>
      student.averagePercentage >= 75 &&
      student.averagePercentage < 80,
  );

  const atRiskStudents = assessedStudents
    .filter(
      (student) =>
        student.averagePercentage < PASSING_PERCENTAGE,
    )
    .sort(
      (firstStudent, secondStudent) =>
        firstStudent.averagePercentage -
        secondStudent.averagePercentage,
    );

  const highPotentialStudents = assessedStudents
    .filter(
      (student) =>
        student.averagePercentage >=
        HIGH_POTENTIAL_PERCENTAGE,
    )
    .sort(
      (firstStudent, secondStudent) =>
        secondStudent.averagePercentage -
        firstStudent.averagePercentage,
    );

  const passingStudents = assessedStudents.filter(
    (student) =>
      student.averagePercentage >= PASSING_PERCENTAGE,
  );

  const passingRate =
    assessedStudents.length > 0
      ? (passingStudents.length / assessedStudents.length) * 100
      : 0;

  const currentSectionLabel =
    selectedSection === "ALL"
      ? "All Sections"
      : selectedSection;

  const currentSubject = subjects.find(
    (subject) =>
      String(subject.id) === String(selectedSubject),
  );

  const currentSubjectLabel =
    selectedSubject === "ALL"
      ? "All Subjects"
      : currentSubject?.name || "Selected Subject";

  const getPercentage = (count) =>
    assessedStudents.length === 0
      ? 0
      : (count / assessedStudents.length) * 100;

  const getPerformanceStatus = (grade) => {
    if (grade === null || grade === undefined) {
      return {
        label: "Incomplete",
        className:
          "border-[#8E8E93] bg-[#8E8E93] text-white",
      };
    }

    if (grade >= 90) {
      return {
        label: "Advancing",
        className:
          "border-[#34C759] bg-[#34C759] text-white",
      };
    }

    if (grade >= 80) {
      return {
        label: "Benchmarking",
        className:
          "border-[#007AFF] bg-[#007AFF] text-white",
      };
    }

    if (grade >= 75) {
      return {
        label: "Connecting",
        className:
          "border-[#FFCC00] bg-[#FFCC00] text-[#1C1C1E]",
      };
    }

    if (grade >= 65) {
      return {
        label: "Developing",
        className:
          "border-[#FF9500] bg-[#FF9500] text-white",
      };
    }

    return {
      label: "Emerging",
      className:
        "border-[#FF3B30] bg-[#FF3B30] text-white",
    };
  };

  return (
    <div
      className="edulite-shell min-h-screen bg-[#F4F7FA] text-[#25313C]"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
      }}
    >
      <style>{`
        :root {
          --ed-blue: #36a9e1;
          --ed-blue-dark: #168cc8;
          --ed-ink: #25313c;
          --ed-muted: #71808d;
          --ed-line: #e3e9ee;
          --ed-soft: #f4f7fa;
        }

        .edulite-shell * {
          box-sizing: border-box;
        }

        .edulite-shell button,
        .edulite-shell input,
        .edulite-shell select,
        .edulite-shell textarea {
          font: inherit;
        }

        .edulite-shell button,
        .edulite-shell [role="button"] {
          transition:
            background-color 160ms ease,
            border-color 160ms ease,
            color 160ms ease,
            transform 160ms ease,
            box-shadow 160ms ease;
        }

        .edulite-shell button:not(:disabled):active,
        .edulite-shell [role="button"]:active {
          transform: scale(0.98);
        }

        .edulite-shell :where(button, input, select, textarea, a):focus-visible {
          outline: 3px solid rgba(54, 169, 225, 0.28);
          outline-offset: 2px;
        }

        .edulite-shell input,
        .edulite-shell select,
        .edulite-shell textarea {
          min-height: 44px;
        }

        .edulite-shell select option {
          color: #25313c;
          background: white;
        }

        .minimal-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #c9d4dc transparent;
        }

        .minimal-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .minimal-scrollbar::-webkit-scrollbar-thumb {
          background: #c9d4dc;
          border-radius: 999px;
        }

        @keyframes mac-notification-in {
          from {
            opacity: 0;
            transform: translate3d(28px, -8px, 0) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }

        @keyframes mac-notification-out {
          from {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
          to {
            opacity: 0;
            transform: translate3d(24px, -4px, 0) scale(0.98);
          }
        }

        .mac-notification-card {
          animation: mac-notification-in 320ms cubic-bezier(0.16, 1, 0.3, 1) both;
          -webkit-backdrop-filter: blur(28px) saturate(170%);
          backdrop-filter: blur(28px) saturate(170%);
        }

        .mac-notification-card[data-closing="true"] {
          animation: mac-notification-out 260ms ease both;
          pointer-events: none;
        }

        @media (prefers-reduced-motion: reduce) {
          .edulite-shell *,
          .edulite-shell *::before,
          .edulite-shell *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>

      <aside
        aria-label="EduLITE navigation"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[#E3E9EE] bg-white transition-[width] duration-200 ${
          sidebarCollapsed ? "w-[68px]" : "w-[220px]"
        }`}
      >
        <div className="flex h-[76px] items-center border-b border-[#EEF2F5] px-3">
          <button
            type="button"
            onClick={() => setSidebarCollapsed((current) => !current)}
            className={`flex w-full items-center rounded-[14px] px-2 py-2 text-left hover:bg-[#F4F7FA] ${
              sidebarCollapsed ? "justify-center" : "gap-3"
            }`}
            aria-label={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#36A9E1] text-lg font-black text-white">
              EL
            </div>

            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="truncate text-[16px] font-bold text-[#25313C]">
                  EduLITE
                </p>
                <p className="truncate text-[11px] text-[#8A98A5]">
                  Teacher Suite
                </p>
              </div>
            )}
          </button>
        </div>

        <nav className="minimal-scrollbar flex-1 overflow-y-auto px-2 py-4">
          <div className="space-y-1.5">
            <SidebarButton
              active={activeView === "dashboard"}
              label="Dashboard"
              icon="dashboard"
              collapsed={sidebarCollapsed}
              onClick={() => openView("dashboard")}
            />
            <SidebarButton
              active={activeView === "sections"}
              label="Sections"
              icon="category"
              collapsed={sidebarCollapsed}
              onClick={() => openView("sections")}
            />
            <SidebarButton
              active={activeView === "subjects"}
              label="Subjects"
              icon="menu_book"
              collapsed={sidebarCollapsed}
              onClick={() => openView("subjects")}
            />
            <SidebarButton
              active={activeView === "students" || activeView === "studentForm"}
              label="Students"
              icon="groups"
              collapsed={sidebarCollapsed}
              onClick={() => openView("students")}
            />
            <SidebarButton
              active={activeView === "assessments" || activeView === "assessmentForm"}
              label="Assessments"
              icon="assignment"
              collapsed={sidebarCollapsed}
              onClick={() => openView("assessments")}
            />
            <SidebarButton
              active={activeView === "records"}
              label="Records"
              icon="table_view"
              collapsed={sidebarCollapsed}
              onClick={() => openView("records")}
            />
            <SidebarButton
              active={activeView === "aiInsights"}
              label="AI Insights"
              icon="auto_awesome"
              collapsed={sidebarCollapsed}
              onClick={() => openView("aiInsights")}
            />
          </div>
        </nav>

        <div className="border-t border-[#EEF2F5] p-2">
          <SidebarButton
            label="Logout"
            icon="logout"
            collapsed={sidebarCollapsed}
            danger
            onClick={handleLogout}
          />
        </div>
      </aside>

      <div
        className={`min-h-screen transition-[padding] duration-200 ${
          sidebarCollapsed ? "pl-[68px]" : "pl-[68px] lg:pl-[220px]"
        }`}
      >
        <header className="px-5 pt-8 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-[1500px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#36A9E1]">
              EduLITE
            </p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.04em] text-[#36A9E1] sm:text-5xl">
              {pageDetails.title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#71808D] sm:text-base">
              {pageDetails.description}
            </p>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1560px] px-5 pb-12 pt-7 sm:px-8 lg:px-10">
          {loading ? (
            <div className="rounded-[24px] border border-[#E3E9EE] bg-white px-8 py-16 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-[3px] border-[#DCEAF2] border-t-[#36A9E1]" />
              <p className="mt-4 text-sm text-[#71808D]">Loading EduLITE...</p>
            </div>
          ) : (
            <>
              {activeView === "dashboard" && (
                <DashboardView
                  students={students}
                  sections={sections}
                  subjects={subjects}
                  assessments={assessments}
                  displayedAssessments={displayedAssessments}
                  selectedSection={selectedSection}
                  selectedSubject={selectedSubject}
                  selectedTerm={selectedTerm}
                  setSelectedSection={setSelectedSection}
                  setSelectedSubject={setSelectedSubject}
                  setSelectedTerm={setSelectedTerm}
                  currentSectionLabel={currentSectionLabel}
                  currentSubjectLabel={currentSubjectLabel}
                  classAverage={classAverage}
                  assessedStudents={assessedStudents}
                  displayedStudents={displayedStudents}
                  passingRate={passingRate}
                  passingStudents={passingStudents}
                  atRiskStudents={atRiskStudents}
                  excellentStudents={excellentStudents}
                  verySatisfactoryStudents={verySatisfactoryStudents}
                  satisfactoryStudents={satisfactoryStudents}
                  highPotentialStudents={highPotentialStudents}
                  getPercentage={getPercentage}
                  onEditAssessment={handleEditAssessment}
                  handleDeleteAssessment={handleDeleteAssessment}
                  generateStudentRecommendation={generateStudentRecommendation}
                  generatingRecommendationKey={generatingRecommendationKey}
                  openView={openView}
                  handleRegisterStudent={handleRegisterStudent}
                  handleAddAssessment={handleAddAssessment}
                />
              )}

              {activeView === "students" && (
                <StudentsView
                  students={students}
                  sections={sections}
                  subjects={subjects}
                  onAddStudent={handleRegisterStudent}
                  onEditStudent={handleEditStudent}
                  onDeleteStudent={handleDeleteStudent}
                  onOpenRecords={(student) => {
                    setSelectedSection(student.section);
                    setSelectedSubject("ALL");
                    openView("records");
                  }}
                />
              )}

              {activeView === "records" && (
                <RecordsView
                  students={students}
                  sections={sections}
                  subjects={subjects}
                  assessments={assessments}
                  displayedAssessments={displayedAssessments}
                  studentAnalytics={studentAnalytics}
                  selectedSection={selectedSection}
                  selectedSubject={selectedSubject}
                  selectedTerm={selectedTerm}
                  setSelectedSection={setSelectedSection}
                  setSelectedSubject={setSelectedSubject}
                  setSelectedTerm={setSelectedTerm}
                  currentSectionLabel={currentSectionLabel}
                  currentSubjectLabel={currentSubjectLabel}
                  currentTermLabel={currentTermLabel}
                  scoreMap={scoreMap}
                  editingStudentId={editingStudentId}
                  editedScores={editedScores}
                  savingScores={savingScores}
                  getPerformanceStatus={getPerformanceStatus}
                  handleEditedScoreChange={handleEditedScoreChange}
                  startEditingScores={startEditingScores}
                  cancelEditingScores={cancelEditingScores}
                  saveStudentScores={saveStudentScores}
                  getStudentAssessments={getStudentAssessments}
                  onEditStudent={handleEditStudent}
                  handleDeleteStudent={handleDeleteStudent}
                  assessmentRecords={assessmentRecords}
                  gradeSummaries={gradeSummaries}
                  expandedStudentId={expandedStudentId}
                  toggleStudentProfile={toggleStudentProfile}
                  studentInsightsById={studentInsightsById}
                  loadingStudentInsightsId={loadingStudentInsightsId}
                  studentInsightErrors={studentInsightErrors}
                  openSavedInsight={openSavedInsight}
                  reloadStudentInsights={loadStudentInsights}
                />
              )}

              {activeView === "sections" && (
                <SectionManagementView
                  sections={sections}
                  newSection={newSection}
                  setNewSection={setNewSection}
                  addingSection={addingSection}
                  handleAddSection={handleAddSection}
                  handleRemoveSection={handleRemoveSection}
                  openDashboardForSection={(sectionName) => {
                    setSelectedSection(sectionName);
                    openView("dashboard");
                  }}
                />
              )}

              {activeView === "subjects" && (
                <SubjectManagementView
                  subjects={subjects}
                  newSubject={newSubject}
                  setNewSubject={setNewSubject}
                  addingSubject={addingSubject}
                  openSubjectStudentPrompt={openSubjectStudentPrompt}
                  handleRenameSubject={handleRenameSubject}
                  handleRemoveSubject={handleRemoveSubject}
                  openDashboardForSubject={(subjectId) => {
                    setSelectedSubject(String(subjectId));
                    openView("dashboard");
                  }}
                />
              )}

              {activeView === "assessments" && (
                <AssessmentsView
                  students={students}
                  sections={sections}
                  subjects={subjects}
                  assessments={assessments}
                  displayedAssessments={displayedAssessments}
                  selectedSection={selectedSection}
                  selectedSubject={selectedSubject}
                  selectedTerm={selectedTerm}
                  setSelectedSection={setSelectedSection}
                  setSelectedSubject={setSelectedSubject}
                  setSelectedTerm={setSelectedTerm}
                  currentSubjectLabel={currentSubjectLabel}
                  onAddAssessment={handleAddAssessment}
                  onEditAssessment={handleEditAssessment}
                  onDeleteAssessment={handleDeleteAssessment}
                />
              )}

              {activeView === "aiInsights" && (
                <AiInsightsView
                  students={students}
                  sections={sections}
                  subjects={subjects}
                  assessments={assessments}
                  selectedSection={selectedSection}
                  selectedSubject={selectedSubject}
                  selectedTerm={selectedTerm}
                  setSelectedSection={setSelectedSection}
                  setSelectedSubject={setSelectedSubject}
                  setSelectedTerm={setSelectedTerm}
                  currentSectionLabel={currentSectionLabel}
                  currentSubjectLabel={currentSubjectLabel}
                  currentTermLabel={currentTermLabel}
                  atRiskStudents={atRiskStudents}
                  highPotentialStudents={highPotentialStudents}
                  generateStudentRecommendation={generateStudentRecommendation}
                  generatingRecommendationKey={generatingRecommendationKey}
                />
              )}

              {activeView === "studentForm" && (
                <StudentForm
                  embedded
                  studentId={studentFormId}
                  onCancel={handleStudentFormCancel}
                  onSaved={handleStudentFormSaved}
                />
              )}

              {activeView === "assessmentForm" && (
                <AssessmentForm
                  embedded
                  assessmentId={assessmentFormId}
                  onCancel={handleAssessmentFormCancel}
                  onSaved={handleAssessmentFormSaved}
                />
              )}
            </>
          )}
        </main>
      </div>

      {showSubjectStudentPrompt && (
        <SubjectEnrollmentModal
          subjectName={newSubject.trim()}
          students={students}
          filteredStudents={subjectPromptStudents}
          searchValue={subjectStudentSearch}
          setSearchValue={setSubjectStudentSearch}
          selectedIds={selectedSubjectStudentIds}
          setSelectedIds={setSelectedSubjectStudentIds}
          toggleStudent={toggleNewSubjectStudent}
          addingSubject={addingSubject}
          closeModal={closeSubjectStudentPrompt}
          createSubject={handleAddSubject}
        />
      )}

      {(aiRecommendation || aiRecommendationError) && (
        <AiRecommendationModal
          recommendation={aiRecommendation}
          error={aiRecommendationError}
          closeModal={closeAiRecommendation}
        />
      )}

      <MacNotificationCenter toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

function MacNotificationCenter({ toasts, onDismiss }) {
  if (!toasts.length) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[120] flex w-[min(390px,calc(100vw-32px))] flex-col gap-2.5 sm:right-6 sm:top-6">
      {toasts.map((toast) => {
        const isError = toast.type === "error";

        return (
          <div
            key={toast.id}
            data-closing={toast.closing ? "true" : "false"}
            className="mac-notification-card pointer-events-auto overflow-hidden rounded-[20px] border border-white/70 bg-white/82 shadow-[0_18px_48px_rgba(30,46,58,0.18)]"
          >
            <div className="flex gap-3 p-4">
              <div
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-sm font-bold text-white ${
                  isError ? "bg-[#FF4D4F]" : "bg-[#36A9E1]"
                }`}
              >
                {isError ? "!" : "EL"}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#25313C]">
                      {toast.title || "EduLITE"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#8A98A5]">
                      {isError ? "Action needs attention" : "Update completed"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDismiss(toast.id)}
                    className="flex h-7 w-7 !min-h-0 items-center justify-center rounded-full text-lg leading-none text-[#8A98A5] hover:bg-[#EEF2F5] hover:text-[#25313C]"
                    aria-label="Dismiss notification"
                  >
                    ×
                  </button>
                </div>

                <p className="mt-2 text-sm leading-5 text-[#52616D]">
                  {toast.message}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DashboardView({
  students,
  sections,
  subjects,
  assessments,
  displayedAssessments,
  selectedSection,
  selectedSubject,
  selectedTerm,
  setSelectedSection,
  setSelectedSubject,
  setSelectedTerm,
  currentSectionLabel,
  currentSubjectLabel,
  classAverage,
  assessedStudents,
  displayedStudents,
  passingRate,
  passingStudents,
  atRiskStudents,
  excellentStudents,
  verySatisfactoryStudents,
  satisfactoryStudents,
  highPotentialStudents,
  getPercentage,
  onEditAssessment,
  handleDeleteAssessment,
  generateStudentRecommendation,
  generatingRecommendationKey,
  openView,
  handleRegisterStudent,
  handleAddAssessment,
}) {
  const distribution = [
    {
      label: "Advancing",
      count: excellentStudents.length,
      percentage: getPercentage(excellentStudents.length),
    },
    {
      label: "Benchmarking",
      count: verySatisfactoryStudents.length,
      percentage: getPercentage(verySatisfactoryStudents.length),
    },
    {
      label: "Connecting",
      count: satisfactoryStudents.length,
      percentage: getPercentage(satisfactoryStudents.length),
    },
    {
      label: "Developing / Emerging",
      count: atRiskStudents.length,
      percentage: getPercentage(atRiskStudents.length),
    },
  ];

  const recentAssessments = [...displayedAssessments]
    .sort((first, second) => String(second.date).localeCompare(String(first.date)))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <DashboardFilters
        students={students}
        sections={sections}
        subjects={subjects}
        assessments={assessments}
        selectedSection={selectedSection}
        selectedSubject={selectedSubject}
        selectedTerm={selectedTerm}
        setSelectedSection={setSelectedSection}
        setSelectedSubject={setSelectedSubject}
        setSelectedTerm={setSelectedTerm}
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MinimalMetric
          label="Class Average"
          value={classAverage.toFixed(1)}
          detail={`${currentSectionLabel} · ${currentSubjectLabel} · Term ${selectedTerm}`}
        />
        <MinimalMetric
          label="Passing Rate"
          value={`${passingRate.toFixed(1)}%`}
          detail={`${passingStudents.length} of ${assessedStudents.length} assessed learners`}
        />
        <MinimalMetric
          label="Students Assessed"
          value={assessedStudents.length}
          detail={`${displayedStudents.length} students match the filters`}
        />
        <MinimalMetric
          label="Needs Support"
          value={atRiskStudents.length}
          detail={`Below 75 in Term ${selectedTerm}`}
          attention={atRiskStudents.length > 0}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <section className="rounded-[24px] border border-[#E3E9EE] bg-white p-6 sm:p-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#36A9E1]">
                Performance
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[#25313C]">
                Student Distribution
              </h2>
            </div>
            <span className="text-sm text-[#8A98A5]">
              {assessedStudents.length} assessed
            </span>
          </div>

          <div className="mt-6 space-y-5">
            {distribution.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-[#52616D]">{item.label}</span>
                  <span className="text-[#8A98A5]">
                    {item.count} · {item.percentage.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#EDF2F5]">
                  <div
                    className="h-full rounded-full bg-[#36A9E1]"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[24px] border border-[#E3E9EE] bg-white p-6 sm:p-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#36A9E1]">
                Priorities
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[#25313C]">
                Learning Support
              </h2>
            </div>
            <button
              type="button"
              onClick={() => openView("aiInsights")}
              className="text-sm font-semibold text-[#168CC8] hover:text-[#0F77AA]"
            >
              View all
            </button>
          </div>

          <div className="mt-6 space-y-3">
            <PriorityStudent
              label="Needs intervention"
              student={atRiskStudents[0]}
              term={selectedTerm}
              supportType="intervention"
              onGenerate={generateStudentRecommendation}
              generatingKey={generatingRecommendationKey}
            />
            <PriorityStudent
              label="Ready for enrichment"
              student={highPotentialStudents[0]}
              term={selectedTerm}
              supportType="enrichment"
              onGenerate={generateStudentRecommendation}
              generatingKey={generatingRecommendationKey}
            />
          </div>
        </section>
      </div>

      <section className="rounded-[24px] border border-[#E3E9EE] bg-white p-6 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#36A9E1]">
              Recent Activity
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#25313C]">
              Assessments
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => openView("assessments")}
              className="rounded-[12px] border border-[#D8E1E7] bg-white px-4 py-2.5 text-sm font-semibold text-[#52616D] hover:border-[#36A9E1] hover:text-[#168CC8]"
            >
              View library
            </button>
            <button
              type="button"
              onClick={handleAddAssessment}
              className="rounded-[12px] bg-[#36A9E1] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#168CC8]"
            >
              New assessment
            </button>
          </div>
        </div>

        <div className="mt-5 divide-y divide-[#EEF2F5]">
          {recentAssessments.map((assessment) => (
            <div
              key={assessment.id}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-[#25313C]">
                  {assessment.name}
                </p>
                <p className="mt-1 text-sm text-[#8A98A5]">
                  {assessment.subject_name} · {assessment.slot_label ?? assessment.category_label ?? assessment.type} · {assessment.date}
                </p>
              </div>
              <div className="flex shrink-0 gap-3 text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => onEditAssessment(assessment.id)}
                  className="text-[#168CC8] hover:text-[#0F77AA]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteAssessment(assessment.id)}
                  className="text-[#D94141] hover:text-[#B82E2E]"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {recentAssessments.length === 0 && (
            <EmptyState
              title="No assessments yet"
              description="Create an assessment to begin recording student performance."
              actionLabel="Create assessment"
              onAction={handleAddAssessment}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function MinimalMetric({ label, value, detail, attention = false }) {
  return (
    <div className="rounded-[22px] border border-[#E3E9EE] bg-white p-5 sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A98A5]">
        {label}
      </p>
      <p
        className={`mt-4 text-4xl font-extrabold tracking-[-0.04em] ${
          attention ? "text-[#D94141]" : "text-[#36A9E1]"
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-sm leading-5 text-[#71808D]">{detail}</p>
    </div>
  );
}

function PriorityStudent({
  label,
  student,
  term,
  supportType,
  onGenerate,
  generatingKey,
}) {
  const requestKey = student ? `${supportType}-${student.id}` : "";
  const isGenerating = generatingKey === requestKey;

  return (
    <div className="rounded-[18px] border border-[#E7EDF1] bg-[#F8FAFB] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A98A5]">
        {label}
      </p>
      {student ? (
        <div className="mt-2 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate font-semibold text-[#25313C]">{student.name}</p>
            <p className="mt-1 text-sm text-[#71808D]">
              Term {term}: {student.averagePercentage.toFixed(1)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onGenerate(student, supportType)}
            disabled={Boolean(generatingKey)}
            className="shrink-0 rounded-[11px] bg-[#36A9E1] px-3 py-2 text-xs font-semibold text-white hover:bg-[#168CC8] disabled:opacity-50"
          >
            {isGenerating ? "Generating..." : "Generate"}
          </button>
        </div>
      ) : (
        <p className="mt-2 text-sm text-[#8A98A5]">No student identified.</p>
      )}
    </div>
  );
}

function StudentsView({
  students,
  sections,
  subjects,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onOpenRecords,
}) {
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("ALL");

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return students.filter((student) => {
      const matchesSection =
        sectionFilter === "ALL" || student.section === sectionFilter;
      const matchesSearch =
        !query ||
        `${student.name} ${student.grade} ${student.section} ${
          student.subjects?.map((subject) => subject.name).join(" ") || ""
        }`
          .toLowerCase()
          .includes(query);

      return matchesSection && matchesSearch;
    });
  }, [students, search, sectionFilter]);

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] border border-[#E3E9EE] bg-white p-6 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#36A9E1]">
              Student Directory
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#25313C]">
              {students.length} registered student{students.length === 1 ? "" : "s"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onAddStudent}
            className="rounded-[12px] bg-[#36A9E1] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#168CC8]"
          >
            Register student
          </button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_240px]">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, grade, section, or subject"
            className="rounded-[13px] border border-[#D8E1E7] bg-white px-4 py-3 text-sm text-[#25313C] outline-none focus:border-[#36A9E1]"
          />
          <select
            value={sectionFilter}
            onChange={(event) => setSectionFilter(event.target.value)}
            className="rounded-[13px] border border-[#D8E1E7] bg-white px-4 py-3 text-sm text-[#25313C] outline-none focus:border-[#36A9E1]"
          >
            <option value="ALL">All Sections</option>
            {sections.map((section) => (
              <option key={section.id} value={section.name}>
                {section.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-[#E3E9EE] bg-white">
        <div className="minimal-scrollbar overflow-x-auto">
          <table className="w-full min-w-[880px]">
            <thead className="bg-[#F8FAFB]">
              <tr className="border-b border-[#E3E9EE]">
                <TableHeading>Student</TableHeading>
                <TableHeading align="center">Grade</TableHeading>
                <TableHeading align="center">Section</TableHeading>
                <TableHeading>Subjects</TableHeading>
                <TableHeading align="right">Actions</TableHeading>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2F5]">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-[#FBFCFD]">
                  <td className="px-5 py-4 font-semibold text-[#25313C]">
                    {student.name}
                  </td>
                  <td className="px-5 py-4 text-center text-sm text-[#71808D]">
                    {student.grade}
                  </td>
                  <td className="px-5 py-4 text-center text-sm text-[#71808D]">
                    {student.section}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {student.subjects?.map((subject) => (
                        <span
                          key={subject.id}
                          className="rounded-full bg-[#EAF6FC] px-2.5 py-1 text-xs font-medium text-[#168CC8]"
                        >
                          {subject.name}
                        </span>
                      ))}
                      {!student.subjects?.length && (
                        <span className="text-sm text-[#A0ABB4]">No subjects</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-3 text-sm font-semibold">
                      <button
                        type="button"
                        onClick={() => onOpenRecords(student)}
                        className="text-[#168CC8] hover:text-[#0F77AA]"
                      >
                        Records
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditStudent(student.id)}
                        className="text-[#52616D] hover:text-[#25313C]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteStudent(student.id)}
                        className="text-[#D94141] hover:text-[#B82E2E]"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center text-sm text-[#8A98A5]">
                    {students.length === 0
                      ? "No students registered yet."
                      : "No students match the current filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {subjects.length === 0 && students.length > 0 && (
        <p className="rounded-[16px] border border-[#F1D58B] bg-[#FFF9E8] p-4 text-sm text-[#8A6A12]">
          Create at least one subject to complete student enrollment.
        </p>
      )}
    </div>
  );
}

function AssessmentsView({
  students,
  sections,
  subjects,
  assessments,
  displayedAssessments,
  selectedSection,
  selectedSubject,
  selectedTerm,
  setSelectedSection,
  setSelectedSubject,
  setSelectedTerm,
  currentSubjectLabel,
  onAddAssessment,
  onEditAssessment,
  onDeleteAssessment,
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-[24px] border border-[#E3E9EE] bg-white p-6 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#36A9E1]">
              Assessment Library
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#25313C]">
              {displayedAssessments.length} assessment{displayedAssessments.length === 1 ? "" : "s"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onAddAssessment}
            className="rounded-[12px] bg-[#36A9E1] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#168CC8]"
          >
            Create assessment
          </button>
        </div>
      </section>

      <DashboardFilters
        students={students}
        sections={sections}
        subjects={subjects}
        assessments={assessments}
        selectedSection={selectedSection}
        selectedSubject={selectedSubject}
        selectedTerm={selectedTerm}
        setSelectedSection={setSelectedSection}
        setSelectedSubject={setSelectedSubject}
        setSelectedTerm={setSelectedTerm}
      />

      <AssessmentList
        displayedAssessments={displayedAssessments}
        currentSubjectLabel={currentSubjectLabel}
        onEditAssessment={onEditAssessment}
        handleDeleteAssessment={onDeleteAssessment}
      />
    </div>
  );
}

function AiInsightsView({
  students,
  sections,
  subjects,
  assessments,
  selectedSection,
  selectedSubject,
  selectedTerm,
  setSelectedSection,
  setSelectedSubject,
  setSelectedTerm,
  currentSectionLabel,
  currentSubjectLabel,
  currentTermLabel,
  atRiskStudents,
  highPotentialStudents,
  generateStudentRecommendation,
  generatingRecommendationKey,
}) {
  return (
    <div className="space-y-6">
      <DashboardFilters
        students={students}
        sections={sections}
        subjects={subjects}
        assessments={assessments}
        selectedSection={selectedSection}
        selectedSubject={selectedSubject}
        selectedTerm={selectedTerm}
        setSelectedSection={setSelectedSection}
        setSelectedSubject={setSelectedSubject}
        setSelectedTerm={setSelectedTerm}
      />

      <section className="rounded-[24px] border border-[#E3E9EE] bg-white p-6 sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#36A9E1]">
          Current Evidence Set
        </p>
        <h2 className="mt-2 text-2xl font-bold text-[#25313C]">
          {currentSubjectLabel} · {currentSectionLabel} · {currentTermLabel}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#71808D]">
          Generate teacher-reviewed interventions for learners below 75 and enrichment recommendations for learners at 90 or above.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <InsightList
          title="Needs Intervention"
          description="Students currently below the expected range."
          students={atRiskStudents}
          type="risk"
          onGenerateRecommendation={generateStudentRecommendation}
          generatingRecommendationKey={generatingRecommendationKey}
        />
        <InsightList
          title="Ready for Enrichment"
          description="Students currently performing at 90 or above."
          students={highPotentialStudents}
          type="potential"
          onGenerateRecommendation={generateStudentRecommendation}
          generatingRecommendationKey={generatingRecommendationKey}
        />
      </div>
    </div>
  );
}

function RecordsView({
  students,
  sections,
  subjects,
  assessments,
  displayedAssessments,
  studentAnalytics,
  selectedSection,
  selectedSubject,
  selectedTerm,
  setSelectedSection,
  setSelectedSubject,
  setSelectedTerm,
  currentSectionLabel,
  currentSubjectLabel,
  currentTermLabel,
  scoreMap,
  editingStudentId,
  editedScores,
  savingScores,
  getPerformanceStatus,
  handleEditedScoreChange,
  startEditingScores,
  cancelEditingScores,
  saveStudentScores,
  getStudentAssessments,
  onEditStudent,
  handleDeleteStudent,
  assessmentRecords,
  gradeSummaries,
  expandedStudentId,
  toggleStudentProfile,
  studentInsightsById,
  loadingStudentInsightsId,
  studentInsightErrors,
  openSavedInsight,
  reloadStudentInsights,
}) {
  const [studentSearch, setStudentSearch] = useState("");
  const [detailTab, setDetailTab] = useState("current");

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();

    if (!query) {
      return studentAnalytics;
    }

    return studentAnalytics.filter((student) =>
      `${student.name} ${student.grade} ${student.section} ${student.subject_names?.join(" ") ?? ""}`
        .toLowerCase()
        .includes(query),
    );
  }, [studentAnalytics, studentSearch]);

  useEffect(() => {
    if (studentAnalytics.length === 0) {
      return;
    }

    const selectedStudentStillExists = studentAnalytics.some(
      (student) => student.id === expandedStudentId,
    );

    if (!selectedStudentStillExists) {
      toggleStudentProfile(studentAnalytics[0]);
    }
  }, [studentAnalytics, expandedStudentId]);

  const selectedStudent =
    studentAnalytics.find((student) => student.id === expandedStudentId) ??
    studentAnalytics[0] ??
    null;

  const selectedStatus = selectedStudent
    ? getPerformanceStatus(selectedStudent.averagePercentage)
    : getPerformanceStatus(null);

  const selectedStudentAssessments = selectedStudent
    ? getStudentAssessments(selectedStudent)
    : [];

  const selectedStudentRecords = selectedStudent
    ? assessments
        .filter((assessment) =>
          selectedStudent.subject_ids?.includes(assessment.subject_id),
        )
        .map((assessment) => {
          const record = assessmentRecords.find(
            (item) =>
              item.student_id === selectedStudent.id &&
              item.assessment_id === assessment.id,
          );

          return {
            id: record?.id ?? `missing-${selectedStudent.id}-${assessment.id}`,
            student_id: selectedStudent.id,
            assessment_id: assessment.id,
            assessment_name: assessment.name,
            subject_id: assessment.subject_id,
            subject_name: assessment.subject_name,
            type: assessment.category_label ?? assessment.type,
            term: assessment.term,
            term_label: assessment.term_label,
            category: assessment.category,
            category_label: assessment.category_label,
            sequence: assessment.sequence,
            slot_label: assessment.slot_label,
            date: assessment.date,
            total_items: assessment.total_items,
            score: record?.score ?? null,
          };
        })
        .sort((first, second) => {
          const termComparison = Number(first.term ?? 99) - Number(second.term ?? 99);
          if (termComparison !== 0) return termComparison;
          return String(second.date).localeCompare(String(first.date));
        })
    : [];

  const selectedGradeSummaries = selectedStudent
    ? gradeSummaries.filter((summary) => summary.student_id === selectedStudent.id)
    : [];

  const selectedInsights = selectedStudent
    ? studentInsightsById[selectedStudent.id] ?? []
    : [];

  const selectedInsightsLoading = selectedStudent
    ? loadingStudentInsightsId === selectedStudent.id
    : false;

  const selectedInsightError = selectedStudent
    ? studentInsightErrors[selectedStudent.id] || ""
    : "";

  const selectedIsEditing = selectedStudent
    ? editingStudentId === selectedStudent.id
    : false;

  const handleSelectStudent = async (student) => {
    if (expandedStudentId === student.id) return;
    if (editingStudentId && editingStudentId !== student.id) {
      cancelEditingScores();
    }
    setDetailTab("current");
    await toggleStudentProfile(student);
  };

  return (
    <div className="grid min-h-[calc(100vh-210px)] grid-cols-1 gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="xl:sticky xl:top-6 xl:self-start">
        <section className="overflow-hidden rounded-[24px] border border-[#E3E9EE] bg-white">
          <div className="border-b border-[#EEF2F5] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#36A9E1]">
              Learners
            </p>
            <h2 className="mt-2 text-xl font-bold text-[#25313C]">Student List</h2>

            <div className="mt-5 space-y-2.5">
              <select
                value={selectedSection}
                onChange={(event) => setSelectedSection(event.target.value)}
                className="w-full rounded-[12px] border border-[#D8E1E7] bg-white px-3 py-2.5 text-sm text-[#25313C] outline-none focus:border-[#36A9E1]"
              >
                <option value="ALL">All Sections</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.name}>{section.name}</option>
                ))}
              </select>
              <select
                value={selectedSubject}
                onChange={(event) => setSelectedSubject(event.target.value)}
                className="w-full rounded-[12px] border border-[#D8E1E7] bg-white px-3 py-2.5 text-sm text-[#25313C] outline-none focus:border-[#36A9E1]"
              >
                <option value="ALL">All Subjects</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={String(subject.id)}>{subject.name}</option>
                ))}
              </select>
              <select
                value={selectedTerm}
                onChange={(event) => setSelectedTerm(event.target.value)}
                className="w-full rounded-[12px] border border-[#D8E1E7] bg-white px-3 py-2.5 text-sm text-[#25313C] outline-none focus:border-[#36A9E1]"
              >
                <option value="1">Term 1</option>
                <option value="2">Term 2</option>
                <option value="3">Term 3</option>
              </select>
              <input
                type="search"
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                placeholder="Search students"
                className="w-full rounded-[12px] border border-[#D8E1E7] bg-white px-3 py-2.5 text-sm text-[#25313C] outline-none focus:border-[#36A9E1]"
              />
            </div>
          </div>

          <div className="minimal-scrollbar max-h-[calc(100vh-520px)] min-h-[300px] space-y-1 overflow-y-auto p-2.5">
            {filteredStudents.map((student) => {
              const isSelected = selectedStudent?.id === student.id;
              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => handleSelectStudent(student)}
                  className={`w-full rounded-[16px] px-3.5 py-3.5 text-left ${
                    isSelected
                      ? "bg-[#36A9E1] text-white"
                      : "text-[#25313C] hover:bg-[#F4F7FA]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{student.name}</p>
                      <p className={`mt-1 text-[11px] ${isSelected ? "text-white/80" : "text-[#8A98A5]"}`}>
                        Grade {student.grade} · {student.section}
                      </p>
                    </div>
                    <span className={`text-sm font-bold ${isSelected ? "text-white" : "text-[#36A9E1]"}`}>
                      {student.averagePercentage === null ? "—" : student.averagePercentage.toFixed(0)}
                    </span>
                  </div>
                </button>
              );
            })}

            {filteredStudents.length === 0 && (
              <div className="px-4 py-12 text-center text-sm text-[#8A98A5]">
                No students match the current filters.
              </div>
            )}
          </div>
        </section>
      </aside>

      <section className="min-w-0 overflow-hidden rounded-[24px] border border-[#E3E9EE] bg-white">
        {!selectedStudent ? (
          <EmptyState
            title="Select a student"
            description="Choose a learner from the list to open their assessment record."
          />
        ) : (
          <div>
            <div className="border-b border-[#EEF2F5] p-6 sm:p-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#36A9E1]">
                    Selected Student
                  </p>
                  <h2 className="mt-2 truncate text-4xl font-extrabold tracking-[-0.04em] text-[#36A9E1] sm:text-5xl">
                    {selectedStudent.name}
                  </h2>
                  <p className="mt-2 text-sm text-[#71808D]">
                    Grade {selectedStudent.grade} · {selectedStudent.section} · {currentSubjectLabel} · {currentTermLabel}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedIsEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => saveStudentScores(selectedStudent)}
                        disabled={savingScores}
                        className="rounded-[12px] bg-[#36A9E1] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#168CC8] disabled:opacity-50"
                      >
                        {savingScores ? "Saving..." : "Save scores"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditingScores}
                        disabled={savingScores}
                        className="rounded-[12px] border border-[#D8E1E7] bg-white px-4 py-2.5 text-sm font-semibold text-[#52616D] hover:bg-[#F4F7FA]"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startEditingScores(selectedStudent)}
                        disabled={selectedStudentAssessments.length === 0}
                        className="rounded-[12px] bg-[#36A9E1] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#168CC8] disabled:bg-[#C8D1D8]"
                      >
                        Edit scores
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditStudent(selectedStudent.id)}
                        className="rounded-[12px] border border-[#D8E1E7] bg-white px-4 py-2.5 text-sm font-semibold text-[#52616D] hover:border-[#36A9E1] hover:text-[#168CC8]"
                      >
                        Edit info
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <MinimalMetric
                  label={selectedSubject === "ALL" ? `${currentTermLabel} Average` : `${currentTermLabel} Grade`}
                  value={selectedStudent.averagePercentage === null ? "—" : selectedStudent.averagePercentage.toFixed(1)}
                  detail={`${currentSubjectLabel} · current result`}
                />
                <MinimalMetric
                  label="Performance"
                  value={selectedStatus.label}
                  detail="Based on the current official term result"
                  attention={selectedStudent.averagePercentage !== null && selectedStudent.averagePercentage < 75}
                />
              </div>

              <div className="mt-7 flex flex-wrap gap-2">
                <DetailTabButton active={detailTab === "current"} onClick={() => setDetailTab("current")}>
                  Current Term
                </DetailTabButton>
                <DetailTabButton active={detailTab === "grades"} onClick={() => setDetailTab("grades")}>
                  Term Grades
                </DetailTabButton>
                <DetailTabButton active={detailTab === "history"} onClick={() => setDetailTab("history")}>
                  Assessment History
                </DetailTabButton>
                <DetailTabButton active={detailTab === "insights"} onClick={() => setDetailTab("insights")}>
                  AI Insights
                </DetailTabButton>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              {detailTab === "current" && (
                <CurrentTermScores
                  student={selectedStudent}
                  assessments={selectedStudentAssessments}
                  scoreMap={scoreMap}
                  editing={selectedIsEditing}
                  editedScores={editedScores}
                  savingScores={savingScores}
                  handleEditedScoreChange={handleEditedScoreChange}
                />
              )}

              {detailTab === "grades" && (
                <OfficialGradesTable gradeSummaries={selectedGradeSummaries} />
              )}

              {detailTab === "history" && (
                <AssessmentHistoryTable records={selectedStudentRecords} />
              )}

              {detailTab === "insights" && (
                <SavedInsightsPanel
                  student={selectedStudent}
                  insights={selectedInsights}
                  loading={selectedInsightsLoading}
                  error={selectedInsightError}
                  openSavedInsight={openSavedInsight}
                  reload={() => reloadStudentInsights(selectedStudent.id, true)}
                />
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function DetailTabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold ${
        active
          ? "bg-[#36A9E1] text-white"
          : "bg-[#F1F5F7] text-[#71808D] hover:bg-[#E8EFF3] hover:text-[#25313C]"
      }`}
    >
      {children}
    </button>
  );
}

function CurrentTermScores({
  student,
  assessments,
  scoreMap,
  editing,
  editedScores,
  savingScores,
  handleEditedScoreChange,
}) {
  return (
    <div>
      <SectionTitle
        eyebrow="Assessment Scores"
        title="Current Term"
        description="Scores for assessments that match the current subject and term filters."
      />

      <div className="mt-5 minimal-scrollbar overflow-x-auto rounded-[18px] border border-[#E3E9EE]">
        <table className="w-full min-w-[760px]">
          <thead className="bg-[#F8FAFB]">
            <tr className="border-b border-[#E3E9EE]">
              <TableHeading>Assessment</TableHeading>
              <TableHeading align="center">Component</TableHeading>
              <TableHeading align="center">HPS</TableHeading>
              <TableHeading align="center">Score</TableHeading>
              <TableHeading align="center">Percentage</TableHeading>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF2F5]">
            {assessments.map((assessment) => {
              const score = scoreMap[student.id]?.[assessment.id];
              const hasScore = score !== undefined && score !== null;
              const percentage =
                hasScore && Number(assessment.total_items) > 0
                  ? (Number(score) / Number(assessment.total_items)) * 100
                  : null;

              return (
                <tr key={assessment.id} className="hover:bg-[#FBFCFD]">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-[#25313C]">{assessment.name}</p>
                    <p className="mt-1 text-xs text-[#8A98A5]">
                      {assessment.subject_name} · {assessment.date}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="rounded-full bg-[#EAF6FC] px-2.5 py-1 text-xs font-semibold text-[#168CC8]">
                      {assessment.slot_label ?? assessment.category_label ?? assessment.type}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center font-semibold text-[#52616D]">
                    {assessment.total_items}
                  </td>
                  <td className="px-5 py-4 text-center">
                    {editing ? (
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max={assessment.total_items}
                          step="1"
                          value={editedScores[assessment.id] ?? ""}
                          onChange={(event) => handleEditedScoreChange(assessment.id, event.target.value)}
                          disabled={savingScores}
                          className="w-20 rounded-[10px] border border-[#D8E1E7] bg-white px-2 py-2 text-center font-semibold text-[#25313C] outline-none focus:border-[#36A9E1]"
                        />
                        <span className="text-xs text-[#8A98A5]">/ {assessment.total_items}</span>
                      </div>
                    ) : hasScore ? (
                      <span className="font-semibold text-[#25313C]">{score} / {assessment.total_items}</span>
                    ) : (
                      <span className="text-[#A0ABB4]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center font-semibold text-[#52616D]">
                    {percentage === null ? "—" : `${percentage.toFixed(1)}%`}
                  </td>
                </tr>
              );
            })}

            {assessments.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-14 text-center text-sm text-[#8A98A5]">
                  No assessments match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OfficialGradesTable({ gradeSummaries }) {
  return (
    <div>
      <SectionTitle
        eyebrow="Official Grades"
        title="Three-Term Summary"
        description="Term Grades are transmuted individually before the final subject grade is calculated."
      />
      <div className="mt-5 minimal-scrollbar overflow-x-auto rounded-[18px] border border-[#E3E9EE]">
        <table className="w-full min-w-[760px]">
          <thead className="bg-[#F8FAFB]">
            <tr className="border-b border-[#E3E9EE]">
              <TableHeading>Subject</TableHeading>
              <TableHeading align="center">Term 1</TableHeading>
              <TableHeading align="center">Term 2</TableHeading>
              <TableHeading align="center">Term 3</TableHeading>
              <TableHeading align="center">Final</TableHeading>
              <TableHeading align="center">Descriptor</TableHeading>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF2F5]">
            {gradeSummaries.map((summary) => (
              <tr key={summary.subject_id}>
                <td className="px-5 py-4 font-semibold text-[#25313C]">{summary.subject_name}</td>
                <GradeCell value={summary.term1?.termGrade} />
                <GradeCell value={summary.term2?.termGrade} />
                <GradeCell value={summary.term3?.termGrade} />
                <GradeCell value={summary.final?.finalGrade} accent />
                <td className="px-5 py-4 text-center text-sm text-[#71808D]">
                  {summary.final?.descriptor ?? "—"}
                </td>
              </tr>
            ))}
            {gradeSummaries.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-14 text-center text-sm text-[#8A98A5]">
                  No official grade summaries are available yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GradeCell({ value, accent = false }) {
  return (
    <td className={`px-5 py-4 text-center font-bold ${accent ? "text-[#36A9E1]" : "text-[#52616D]"}`}>
      {value ?? "—"}
    </td>
  );
}

function AssessmentHistoryTable({ records }) {
  return (
    <div>
      <SectionTitle
        eyebrow="Assessment History"
        title="Complete Record"
        description="All created assessments for the selected learner across subjects and terms."
      />
      <div className="mt-5 minimal-scrollbar overflow-x-auto rounded-[18px] border border-[#E3E9EE]">
        <table className="w-full min-w-[900px]">
          <thead className="bg-[#F8FAFB]">
            <tr className="border-b border-[#E3E9EE]">
              <TableHeading>Assessment</TableHeading>
              <TableHeading>Subject</TableHeading>
              <TableHeading align="center">Term</TableHeading>
              <TableHeading align="center">Component</TableHeading>
              <TableHeading align="center">Score</TableHeading>
              <TableHeading align="center">%</TableHeading>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF2F5]">
            {records.map((record) => {
              const hasScore =
                record.score !== null &&
                record.score !== undefined &&
                Number(record.total_items) > 0;
              const percentage = hasScore
                ? (Number(record.score) / Number(record.total_items)) * 100
                : null;

              return (
                <tr key={record.id}>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-[#25313C]">{record.assessment_name}</p>
                    <p className="mt-1 text-xs text-[#8A98A5]">{record.date}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-[#71808D]">{record.subject_name}</td>
                  <td className="px-5 py-4 text-center text-sm text-[#71808D]">{record.term_label ?? `Term ${record.term}`}</td>
                  <td className="px-5 py-4 text-center text-sm font-medium text-[#168CC8]">{record.slot_label ?? record.category_label ?? record.type}</td>
                  <td className="px-5 py-4 text-center font-semibold text-[#52616D]">{hasScore ? `${record.score}/${record.total_items}` : "—"}</td>
                  <td className="px-5 py-4 text-center font-semibold text-[#52616D]">{percentage === null ? "—" : `${percentage.toFixed(1)}%`}</td>
                </tr>
              );
            })}
            {records.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-14 text-center text-sm text-[#8A98A5]">
                  No assessment history is available yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SavedInsightsPanel({ student, insights, loading, error, openSavedInsight, reload }) {
  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SectionTitle
          eyebrow="AI Insights"
          title="Saved Recommendations"
          description={`Intervention and enrichment recommendations saved for ${student.name}.`}
        />
        <button
          type="button"
          onClick={reload}
          className="rounded-[11px] border border-[#D8E1E7] bg-white px-4 py-2.5 text-sm font-semibold text-[#52616D] hover:border-[#36A9E1] hover:text-[#168CC8]"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="mt-6 rounded-[16px] bg-[#F8FAFB] p-8 text-center text-sm text-[#8A98A5]">Loading insights...</p>
      ) : error ? (
        <p className="mt-6 rounded-[16px] bg-[#FFF1F1] p-5 text-sm text-[#C53939]">{error}</p>
      ) : insights.length === 0 ? (
        <p className="mt-6 rounded-[16px] bg-[#F8FAFB] p-8 text-center text-sm text-[#8A98A5]">No saved AI insights yet.</p>
      ) : (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {insights.map((insight) => (
            <button
              key={insight.id}
              type="button"
              onClick={() => openSavedInsight(insight)}
              className="rounded-[18px] border border-[#E3E9EE] bg-white p-5 text-left hover:border-[#B8DDEC] hover:bg-[#FBFDFF]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#36A9E1]">
                {insight.supportType === "intervention" ? "Intervention" : "Enrichment"}
              </p>
              <h4 className="mt-2 text-lg font-bold text-[#25313C]">{insight.title || "Saved Recommendation"}</h4>
              <p className="mt-2 text-sm text-[#71808D]">{insight.focusLabel || "General learning support"}</p>
              <p className="mt-4 text-xs text-[#A0ABB4]">{formatSavedDate(insight.createdAt)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionManagementView({
  sections,
  newSection,
  setNewSection,
  addingSection,
  handleAddSection,
  handleRemoveSection,
  openDashboardForSection,
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
      <section className="rounded-[24px] border border-[#E3E9EE] bg-white p-6 sm:p-8">
        <SectionTitle
          eyebrow="New Section"
          title="Add a Section"
          description="Create a section that can be assigned when registering students."
        />
        <form onSubmit={handleAddSection} className="mt-7 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#52616D]">Section name</span>
            <input
              type="text"
              value={newSection}
              onChange={(event) => setNewSection(event.target.value)}
              placeholder="e.g. Section 1"
              className="w-full rounded-[13px] border border-[#D8E1E7] bg-white px-4 py-3 text-[#25313C] outline-none focus:border-[#36A9E1]"
            />
          </label>
          <button
            type="submit"
            disabled={addingSection || !newSection.trim()}
            className="w-full rounded-[12px] bg-[#36A9E1] px-4 py-3 text-sm font-semibold text-white hover:bg-[#168CC8] disabled:bg-[#C8D1D8]"
          >
            {addingSection ? "Adding..." : "Add section"}
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-[#E3E9EE] bg-white">
        <div className="flex items-end justify-between gap-4 border-b border-[#EEF2F5] p-6 sm:p-8">
          <SectionTitle
            eyebrow="Existing Sections"
            title="Section List"
            description="Open a section on the dashboard or remove it when it is no longer needed."
          />
          <span className="text-3xl font-bold text-[#36A9E1]">{sections.length}</span>
        </div>
        <div className="minimal-scrollbar max-h-[600px] divide-y divide-[#EEF2F5] overflow-y-auto">
          {sections.map((section) => (
            <div key={section.id} className="flex items-center justify-between gap-4 px-6 py-4 sm:px-8">
              <button
                type="button"
                onClick={() => openDashboardForSection(section.name)}
                className="min-w-0 text-left"
              >
                <p className="truncate font-semibold text-[#25313C] hover:text-[#168CC8]">{section.name}</p>
                <p className="mt-1 text-sm text-[#8A98A5]">{section.student_count} students</p>
              </button>
              <button
                type="button"
                onClick={() => handleRemoveSection(section)}
                className="text-sm font-semibold text-[#D94141] hover:text-[#B82E2E]"
              >
                Remove
              </button>
            </div>
          ))}
          {sections.length === 0 && (
            <EmptyState title="No sections yet" description="Add your first section using the form." />
          )}
        </div>
      </section>
    </div>
  );
}

function SubjectManagementView({
  subjects,
  newSubject,
  setNewSubject,
  addingSubject,
  openSubjectStudentPrompt,
  handleRenameSubject,
  handleRemoveSubject,
  openDashboardForSubject,
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
      <section className="rounded-[24px] border border-[#E3E9EE] bg-white p-6 sm:p-8">
        <SectionTitle
          eyebrow="New Subject"
          title="Add a Subject"
          description="Create a subject, then choose the students who should be enrolled."
        />
        <form onSubmit={openSubjectStudentPrompt} className="mt-7 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#52616D]">Subject name</span>
            <input
              type="text"
              value={newSubject}
              onChange={(event) => setNewSubject(event.target.value)}
              placeholder="e.g. Mathematics"
              className="w-full rounded-[13px] border border-[#D8E1E7] bg-white px-4 py-3 text-[#25313C] outline-none focus:border-[#36A9E1]"
            />
          </label>
          <button
            type="submit"
            disabled={addingSubject || !newSubject.trim()}
            className="w-full rounded-[12px] bg-[#36A9E1] px-4 py-3 text-sm font-semibold text-white hover:bg-[#168CC8] disabled:bg-[#C8D1D8]"
          >
            {addingSubject ? "Adding..." : "Choose students"}
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-[#E3E9EE] bg-white">
        <div className="flex items-end justify-between gap-4 border-b border-[#EEF2F5] p-6 sm:p-8">
          <SectionTitle
            eyebrow="Existing Subjects"
            title="Subject List"
            description="Open, rename, or remove subjects from the workspace."
          />
          <span className="text-3xl font-bold text-[#36A9E1]">{subjects.length}</span>
        </div>
        <div className="minimal-scrollbar max-h-[600px] divide-y divide-[#EEF2F5] overflow-y-auto">
          {subjects.map((subject) => (
            <div key={subject.id} className="flex items-center justify-between gap-4 px-6 py-4 sm:px-8">
              <button
                type="button"
                onClick={() => openDashboardForSubject(subject.id)}
                className="min-w-0 text-left"
              >
                <p className="truncate font-semibold text-[#25313C] hover:text-[#168CC8]">{subject.name}</p>
                <p className="mt-1 text-sm text-[#8A98A5]">
                  {subject.student_count} students · {subject.assessment_count} assessments
                </p>
              </button>
              <div className="flex shrink-0 gap-3 text-sm font-semibold">
                <button type="button" onClick={() => handleRenameSubject(subject)} className="text-[#168CC8] hover:text-[#0F77AA]">Rename</button>
                <button type="button" onClick={() => handleRemoveSubject(subject)} className="text-[#D94141] hover:text-[#B82E2E]">Delete</button>
              </div>
            </div>
          ))}
          {subjects.length === 0 && (
            <EmptyState title="No subjects yet" description="Add your first subject using the form." />
          )}
        </div>
      </section>
    </div>
  );
}

function DashboardFilters({
  sections,
  subjects,
  selectedSection,
  selectedSubject,
  selectedTerm,
  setSelectedSection,
  setSelectedSubject,
  setSelectedTerm,
}) {
  return (
    <section className="rounded-[20px] border border-[#E3E9EE] bg-white p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <FilterSelect
          label="Section"
          value={selectedSection}
          onChange={setSelectedSection}
          options={[
            { value: "ALL", label: "All Sections" },
            ...sections.map((section) => ({ value: section.name, label: section.name })),
          ]}
        />
        <FilterSelect
          label="Subject"
          value={selectedSubject}
          onChange={setSelectedSubject}
          options={[
            { value: "ALL", label: "All Subjects" },
            ...subjects.map((subject) => ({ value: String(subject.id), label: subject.name })),
          ]}
        />
        <FilterSelect
          label="Term"
          value={selectedTerm}
          onChange={setSelectedTerm}
          options={[
            { value: "1", label: "Term 1" },
            { value: "2", label: "Term 2" },
            { value: "3", label: "Term 3" },
          ]}
        />
      </div>
    </section>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8A98A5]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[12px] border border-[#D8E1E7] bg-white px-3 py-2.5 text-sm text-[#25313C] outline-none focus:border-[#36A9E1]"
      >
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function AssessmentList({
  displayedAssessments,
  currentSubjectLabel,
  onEditAssessment,
  handleDeleteAssessment,
}) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-[#E3E9EE] bg-white">
      <div className="border-b border-[#EEF2F5] p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#36A9E1]">Assessments</p>
        <h2 className="mt-2 text-2xl font-bold text-[#25313C]">{currentSubjectLabel}</h2>
      </div>
      <div className="minimal-scrollbar overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead className="bg-[#F8FAFB]">
            <tr className="border-b border-[#E3E9EE]">
              <TableHeading>Assessment</TableHeading>
              <TableHeading>Subject</TableHeading>
              <TableHeading align="center">Term</TableHeading>
              <TableHeading align="center">Slot</TableHeading>
              <TableHeading align="center">HPS</TableHeading>
              <TableHeading align="right">Actions</TableHeading>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF2F5]">
            {displayedAssessments.map((assessment) => (
              <tr key={assessment.id} className="hover:bg-[#FBFCFD]">
                <td className="px-5 py-4">
                  <p className="font-semibold text-[#25313C]">{assessment.name}</p>
                  <p className="mt-1 text-xs text-[#8A98A5]">{assessment.date}</p>
                </td>
                <td className="px-5 py-4 text-sm text-[#71808D]">{assessment.subject_name}</td>
                <td className="px-5 py-4 text-center text-sm text-[#71808D]">{assessment.term_label ?? `Term ${assessment.term}`}</td>
                <td className="px-5 py-4 text-center text-sm font-semibold text-[#168CC8]">{assessment.slot_label ?? assessment.category_label ?? assessment.type}</td>
                <td className="px-5 py-4 text-center font-semibold text-[#52616D]">{assessment.total_items}</td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-3 text-sm font-semibold">
                    <button type="button" onClick={() => onEditAssessment(assessment.id)} className="text-[#168CC8] hover:text-[#0F77AA]">Edit</button>
                    <button type="button" onClick={() => handleDeleteAssessment(assessment.id)} className="text-[#D94141] hover:text-[#B82E2E]">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {displayedAssessments.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-16 text-center text-sm text-[#8A98A5]">No assessments match the current filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SubjectEnrollmentModal({
  subjectName,
  students,
  filteredStudents,
  searchValue,
  setSearchValue,
  selectedIds,
  setSelectedIds,
  toggleStudent,
  addingSubject,
  closeModal,
  createSubject,
}) {
  const allSelected = students.length > 0 && selectedIds.length === students.length;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#25313C]/35 p-4 backdrop-blur-[4px]">
      <div className="w-full max-w-3xl overflow-hidden rounded-[26px] border border-white bg-white shadow-[0_24px_70px_rgba(37,49,60,0.24)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#EEF2F5] p-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#36A9E1]">Subject Enrollment</p>
            <h2 className="mt-2 text-2xl font-bold text-[#25313C]">{subjectName}</h2>
            <p className="mt-1 text-sm text-[#71808D]">Choose the students who should be enrolled.</p>
          </div>
          <button type="button" onClick={closeModal} className="flex h-9 w-9 !min-h-0 items-center justify-center rounded-full text-xl text-[#8A98A5] hover:bg-[#F4F7FA]">×</button>
        </div>

        <div className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search students"
              className="flex-1 rounded-[12px] border border-[#D8E1E7] px-4 py-2.5 text-sm outline-none focus:border-[#36A9E1]"
            />
            <button
              type="button"
              onClick={() => setSelectedIds(allSelected ? [] : students.map((student) => student.id))}
              className="rounded-[12px] border border-[#D8E1E7] px-4 py-2.5 text-sm font-semibold text-[#52616D] hover:border-[#36A9E1] hover:text-[#168CC8]"
            >
              {allSelected ? "Clear all" : "Select all"}
            </button>
          </div>

          <div className="minimal-scrollbar mt-4 max-h-[440px] divide-y divide-[#EEF2F5] overflow-y-auto rounded-[16px] border border-[#E3E9EE]">
            {filteredStudents.map((student) => {
              const selected = selectedIds.includes(student.id);
              return (
                <label key={student.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-[#FBFCFD]">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleStudent(student.id)}
                    className="h-4 w-4 accent-[#36A9E1]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#25313C]">{student.name}</p>
                    <p className="mt-0.5 text-xs text-[#8A98A5]">Grade {student.grade} · {student.section}</p>
                  </div>
                </label>
              );
            })}
            {filteredStudents.length === 0 && (
              <p className="px-4 py-12 text-center text-sm text-[#8A98A5]">No students found.</p>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between gap-4">
            <p className="text-sm text-[#71808D]">{selectedIds.length} selected</p>
            <div className="flex gap-2">
              <button type="button" onClick={closeModal} disabled={addingSubject} className="rounded-[12px] border border-[#D8E1E7] px-4 py-2.5 text-sm font-semibold text-[#52616D]">Cancel</button>
              <button type="button" onClick={createSubject} disabled={addingSubject} className="rounded-[12px] bg-[#36A9E1] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#168CC8] disabled:opacity-50">
                {addingSubject ? "Creating..." : "Create subject"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarButton({ active = false, label, icon, collapsed, danger = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`flex w-full items-center rounded-[12px] px-3 py-2.5 text-sm font-semibold ${
        collapsed ? "justify-center" : "gap-3"
      } ${
        active
          ? "bg-[#EAF6FC] text-[#168CC8]"
          : danger
            ? "text-[#D94141] hover:bg-[#FFF1F1]"
            : "text-[#71808D] hover:bg-[#F4F7FA] hover:text-[#25313C]"
      }`}
    >
      <span className="material-symbols-rounded shrink-0 text-[21px]" aria-hidden="true">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

function InsightList({
  title,
  description,
  students,
  type,
  onGenerateRecommendation,
  generatingRecommendationKey,
}) {
  const supportType = type === "risk" ? "intervention" : "enrichment";

  return (
    <section className="overflow-hidden rounded-[24px] border border-[#E3E9EE] bg-white">
      <div className="border-b border-[#EEF2F5] p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#36A9E1]">Learning Support</p>
        <h2 className="mt-2 text-2xl font-bold text-[#25313C]">{title}</h2>
        {description && <p className="mt-2 text-sm text-[#71808D]">{description}</p>}
      </div>
      <div className="divide-y divide-[#EEF2F5]">
        {students.map((student) => {
          const requestKey = `${supportType}-${student.id}`;
          const isGenerating = generatingRecommendationKey === requestKey;
          return (
            <div key={student.id} className="flex items-center justify-between gap-4 px-6 py-4">
              <div className="min-w-0">
                <p className="truncate font-semibold text-[#25313C]">{student.name}</p>
                <p className="mt-1 text-sm text-[#71808D]">{student.section} · {student.averagePercentage.toFixed(1)}</p>
              </div>
              <button
                type="button"
                onClick={() => onGenerateRecommendation(student, supportType)}
                disabled={Boolean(generatingRecommendationKey)}
                className="shrink-0 rounded-[11px] bg-[#36A9E1] px-3 py-2 text-xs font-semibold text-white hover:bg-[#168CC8] disabled:opacity-50"
              >
                {isGenerating ? "Generating..." : "Generate"}
              </button>
            </div>
          );
        })}
        {students.length === 0 && (
          <EmptyState title="No students in this group" description="Adjust the filters or wait for more assessment data." />
        )}
      </div>
    </section>
  );
}

function AiRecommendationModal({ recommendation, error, closeModal }) {
  const plan = recommendation?.plan;
  const isIntervention = recommendation?.supportType === "intervention";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#25313C]/40 p-4 backdrop-blur-[4px]">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[26px] bg-white shadow-[0_24px_80px_rgba(37,49,60,0.28)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#EEF2F5] p-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#36A9E1]">Gemini Learning Support</p>
            <h2 className="mt-2 text-2xl font-bold text-[#25313C]">{plan?.title || "Learning-Support Recommendation"}</h2>
            {recommendation?.student && (
              <p className="mt-2 text-sm text-[#71808D]">
                {recommendation.student.name} · Grade {recommendation.student.grade} · {recommendation.student.section} · {recommendation.focusLabel}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {recommendation?.savedInsight?.pdfUrl && (
              <a
                href={`${API_URL}${recommendation.savedInsight.pdfUrl}`}
                className="inline-flex min-h-11 items-center rounded-[12px] bg-[#36A9E1] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#168CC8]"
              >
                Download PDF
              </a>
            )}
            <button type="button" onClick={closeModal} className="flex h-10 w-10 !min-h-0 items-center justify-center rounded-full text-2xl text-[#8A98A5] hover:bg-[#F4F7FA]">×</button>
          </div>
        </div>

        <div className="minimal-scrollbar max-h-[calc(92vh-105px)] overflow-y-auto p-6 sm:p-8">
          {error ? (
            <div className="rounded-[18px] bg-[#FFF1F1] p-5 text-sm text-[#C53939]">{error}</div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MinimalInfo label="Classification" value={recommendation?.classification || "—"} />
                <MinimalInfo label="Focus Average" value={formatPercentage(recommendation?.analytics?.focusAveragePercentage)} />
                <MinimalInfo label="Section Average" value={formatPercentage(recommendation?.analytics?.sectionComparison?.sectionAveragePercentage)} />
                <MinimalInfo label="Recent Trend" value={recommendation?.analytics?.recentTrend?.label || "—"} />
              </div>

              {plan?.overview && (
                <RecommendationSection title="Overview">
                  <p className="max-w-4xl leading-7 text-[#52616D]">{plan.overview}</p>
                </RecommendationSection>
              )}

              {plan?.evidence?.length > 0 && (
                <RecommendationSection title="Evidence Used">
                  <div className="grid gap-3 md:grid-cols-2">
                    {plan.evidence.map((item, index) => (
                      <div key={`${item.observation}-${index}`} className="rounded-[16px] border border-[#E3E9EE] p-4">
                        <p className="font-semibold text-[#25313C]">{item.observation}</p>
                        <p className="mt-2 text-sm text-[#71808D]">{item.dataPoint}</p>
                      </div>
                    ))}
                  </div>
                </RecommendationSection>
              )}

              {plan?.targetedInterventions?.length > 0 && (
                <RecommendationSection title="Targeted Interventions">
                  <div className="space-y-4">
                    {plan.targetedInterventions.map((item, index) => (
                      <RecommendationCard key={`${item.title}-${index}`} index={index + 1} title={item.title} description={item.rationale}>
                        {item.actions?.length > 0 && (
                          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#52616D]">
                            {item.actions.map((action, actionIndex) => <li key={`${action}-${actionIndex}`}>{action}</li>)}
                          </ul>
                        )}
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <PlanDetail label="Schedule" value={item.schedule} />
                          <PlanDetail label="Success indicator" value={item.successIndicator} />
                        </div>
                      </RecommendationCard>
                    ))}
                  </div>
                </RecommendationSection>
              )}

              {plan?.enrichmentActivities?.length > 0 && (
                <RecommendationSection title="Enrichment Activities">
                  <div className="grid gap-4 lg:grid-cols-2">
                    {plan.enrichmentActivities.map((item, index) => (
                      <RecommendationCard key={`${item.title}-${index}`} index={index + 1} title={item.title} description={item.description}>
                        <div className="mt-4 space-y-3">
                          <PlanDetail label="Implementation" value={item.implementation} />
                          <PlanDetail label="Expected outcome" value={item.expectedOutcome} />
                        </div>
                      </RecommendationCard>
                    ))}
                  </div>
                </RecommendationSection>
              )}

              {plan?.monitoringPlan?.length > 0 && (
                <RecommendationSection title="Progress Monitoring">
                  <div className="minimal-scrollbar overflow-x-auto rounded-[16px] border border-[#E3E9EE]">
                    <table className="w-full min-w-[650px]">
                      <thead className="bg-[#F8FAFB]">
                        <tr><TableHeading>Metric</TableHeading><TableHeading>Frequency</TableHeading><TableHeading>Target</TableHeading></tr>
                      </thead>
                      <tbody className="divide-y divide-[#EEF2F5]">
                        {plan.monitoringPlan.map((item, index) => (
                          <tr key={`${item.metric}-${index}`}>
                            <td className="px-5 py-4 text-sm text-[#52616D]">{item.metric}</td>
                            <td className="px-5 py-4 text-sm text-[#52616D]">{item.frequency}</td>
                            <td className="px-5 py-4 text-sm text-[#52616D]">{item.target}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </RecommendationSection>
              )}

              {plan?.teacherNotes?.length > 0 && (
                <RecommendationSection title="Teacher Notes">
                  <ul className="list-disc space-y-2 pl-5 text-[#52616D]">
                    {plan.teacherNotes.map((note, index) => <li key={`${note}-${index}`}>{note}</li>)}
                  </ul>
                </RecommendationSection>
              )}

              <p className="border-t border-[#EEF2F5] pt-5 text-sm leading-6 text-[#8A98A5]">
                Review AI recommendations using professional judgment and your knowledge of the learner before applying them.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MinimalInfo({ label, value }) {
  return (
    <div className="rounded-[16px] bg-[#F4F7FA] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A98A5]">{label}</p>
      <p className="mt-2 font-bold text-[#25313C]">{value}</p>
    </div>
  );
}

function RecommendationSection({ title, children }) {
  return (
    <section>
      <h3 className="mb-4 text-xl font-bold text-[#25313C]">{title}</h3>
      {children}
    </section>
  );
}

function RecommendationCard({ index, title, description, children }) {
  return (
    <div className="rounded-[18px] border border-[#E3E9EE] p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#36A9E1] text-sm font-bold text-white">{index}</span>
        <div className="min-w-0">
          <h4 className="font-bold text-[#25313C]">{title}</h4>
          {description && <p className="mt-2 text-sm leading-6 text-[#52616D]">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function PlanDetail({ label, value }) {
  return (
    <div className="rounded-[14px] bg-[#F8FAFB] p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8A98A5]">{label}</p>
      <p className="mt-1.5 text-sm leading-5 text-[#52616D]">{value || "—"}</p>
    </div>
  );
}

function SectionTitle({ eyebrow, title, description }) {
  return (
    <div>
      {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#36A9E1]">{eyebrow}</p>}
      <h2 className="mt-2 text-2xl font-bold tracking-[-0.02em] text-[#25313C]">{title}</h2>
      {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-[#71808D]">{description}</p>}
    </div>
  );
}

function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <div className="px-6 py-14 text-center">
      <h3 className="text-lg font-semibold text-[#52616D]">{title}</h3>
      {description && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#8A98A5]">{description}</p>}
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="mt-4 rounded-[11px] bg-[#36A9E1] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#168CC8]">{actionLabel}</button>
      )}
    </div>
  );
}

function formatPercentage(value) {
  return value === null || value === undefined ? "—" : `${Number(value).toFixed(1)}%`;
}

function formatSavedDate(value) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function TableHeading({ children, align = "left" }) {
  return (
    <th
      scope="col"
      className={`px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A98A5] ${
        align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}
