import { Fragment, useEffect, useMemo, useState } from "react";
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
    title: "Add Section",
    description:
      "Create and manage the sections used when registering students.",
  },
  subjects: {
    title: "Subject Management",
    description:
      "Create subjects and select the students enrolled in each subject.",
  },
  registerStudent: {
    title: "Register Student",
    description: "Add or update a student without leaving the dashboard.",
  },
  addAssessment: {
    title: "Add Assessment",
    description:
      "Create or update an assessment and record scores inside the dashboard.",
  },
};

export default function Dashboard() {
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [assessmentRecords, setAssessmentRecords] = useState([]);
  const [selectedSection, setSelectedSection] = useState("ALL");
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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [editedScores, setEditedScores] = useState({});
  const [savingScores, setSavingScores] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");
  const [addMenuOpen, setAddMenuOpen] = useState(true);
  const [studentFormId, setStudentFormId] = useState(null);
  const [assessmentFormId, setAssessmentFormId] = useState(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("eduliteSidebarCollapsed") === "true";
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

  const pageDetails =
    activeView === "registerStudent" && studentFormId
      ? {
          title: "Edit Student",
          description:
            "Update the student's information without leaving the dashboard.",
        }
      : activeView === "addAssessment" && assessmentFormId
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
    if (!localStorage.getItem("user")) {
      navigate("/");
      return;
    }

    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError("");

    try {
      const [
        studentResponse,
        sectionResponse,
        subjectResponse,
        assessmentResponse,
        recordResponse,
      ] = await Promise.all([
        axios.get(`${API_URL}/students`),
        axios.get(`${API_URL}/sections`),
        axios.get(`${API_URL}/subjects`),
        axios.get(`${API_URL}/assessments`),
        axios.get(`${API_URL}/assessment-records`),
      ]);

      setStudents(studentResponse.data);
      setSections(sectionResponse.data);
      setSubjects(subjectResponse.data);
      setAssessments(assessmentResponse.data);
      setAssessmentRecords(recordResponse.data);

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
      setLoading(false);
    }
  };

  const openView = (view) => {
    if (view !== "registerStudent") {
      setStudentFormId(null);
    }

    if (view !== "addAssessment") {
      setAssessmentFormId(null);
    }

    setActiveView(view);
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
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

      await fetchDashboardData();

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

      await fetchDashboardData();

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

      await fetchDashboardData();

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

      await fetchDashboardData();

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

      await fetchDashboardData();

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

      await fetchDashboardData();

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

      await fetchDashboardData();

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
    openView("registerStudent");
  };

  const handleEditStudent = (studentId) => {
    setStudentFormId(studentId);
    setActiveView("registerStudent");
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStudentFormCancel = () => {
    const returnView = studentFormId ? "records" : "dashboard";
    setStudentFormId(null);
    openView(returnView);
  };

  const handleStudentFormSaved = async (_result, details) => {
    await fetchDashboardData();
    setStudentFormId(null);
    setActiveView("records");
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
    openView("addAssessment");
  };

  const handleEditAssessment = (assessmentId) => {
    setAssessmentFormId(assessmentId);
    setActiveView("addAssessment");
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAssessmentFormCancel = () => {
    setAssessmentFormId(null);
    openView("dashboard");
  };

  const handleAssessmentFormSaved = async (_result, details) => {
    await fetchDashboardData();
    setAssessmentFormId(null);
    setActiveView("dashboard");
    setError("");
    setSuccess(
      details?.isEditing
        ? "Assessment updated successfully."
        : "Assessment added successfully.",
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const selectedSubjectId =
    selectedSubject === "ALL" ? null : Number(selectedSubject);

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
    if (expandedStudentId === student.id) {
      setExpandedStudentId(null);
      return;
    }

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
    if (selectedSubjectId === null) {
      return assessments;
    }

    return assessments.filter(
      (assessment) => assessment.subject_id === selectedSubjectId,
    );
  }, [assessments, selectedSubjectId]);

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

      await fetchDashboardData();

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
    () => new Set(displayedAssessments.map((assessment) => assessment.id)),
    [displayedAssessments],
  );

  const studentAnalytics = useMemo(() => {
    return displayedStudents.map((student) => {
      const enrolledAssessmentIds = new Set(
        displayedAssessments
          .filter((assessment) =>
            student.subject_ids?.includes(assessment.subject_id),
          )
          .map((assessment) => assessment.id),
      );

      const percentages = assessmentRecords
        .filter(
          (record) =>
            record.student_id === student.id &&
            relevantAssessmentIds.has(record.assessment_id) &&
            enrolledAssessmentIds.has(record.assessment_id) &&
            Number(record.total_items) > 0,
        )
        .map(
          (record) => (Number(record.score) / Number(record.total_items)) * 100,
        );

      const averagePercentage =
        percentages.length > 0
          ? percentages.reduce((total, percentage) => total + percentage, 0) /
            percentages.length
          : null;

      return {
        ...student,
        averagePercentage,
        assessmentCount: percentages.length,
      };
    });
  }, [
    displayedStudents,
    displayedAssessments,
    assessmentRecords,
    relevantAssessmentIds,
  ]);

  const assessedStudents = studentAnalytics.filter(
    (student) => student.averagePercentage !== null,
  );

  const classAverage =
    assessedStudents.length > 0
      ? assessedStudents.reduce(
          (total, student) => total + student.averagePercentage,
          0,
        ) / assessedStudents.length
      : 0;

  const excellentStudents = assessedStudents.filter(
    (student) => student.averagePercentage >= 90,
  );

  const verySatisfactoryStudents = assessedStudents.filter(
    (student) =>
      student.averagePercentage >= 85 && student.averagePercentage < 90,
  );

  const satisfactoryStudents = assessedStudents.filter(
    (student) =>
      student.averagePercentage >= 75 && student.averagePercentage < 85,
  );

  const atRiskStudents = assessedStudents
    .filter((student) => student.averagePercentage < PASSING_PERCENTAGE)
    .sort(
      (firstStudent, secondStudent) =>
        firstStudent.averagePercentage - secondStudent.averagePercentage,
    );

  const highPotentialStudents = assessedStudents
    .filter((student) => student.averagePercentage >= HIGH_POTENTIAL_PERCENTAGE)
    .sort(
      (firstStudent, secondStudent) =>
        secondStudent.averagePercentage - firstStudent.averagePercentage,
    );

  const passingStudents = assessedStudents.filter(
    (student) => student.averagePercentage >= PASSING_PERCENTAGE,
  );

  const passingRate =
    assessedStudents.length > 0
      ? (passingStudents.length / assessedStudents.length) * 100
      : 0;

  const currentSectionLabel =
    selectedSection === "ALL" ? "All Sections" : selectedSection;

  const currentSubject = subjects.find(
    (subject) => String(subject.id) === String(selectedSubject),
  );

  const currentSubjectLabel =
    selectedSubject === "ALL"
      ? "All Subjects"
      : currentSubject?.name || "Selected Subject";

  const getPercentage = (count) =>
    assessedStudents.length === 0 ? 0 : (count / assessedStudents.length) * 100;

  const getPerformanceStatus = (averagePercentage) => {
    if (averagePercentage === null) {
      return {
        label: "Not Assessed",
        className: "border-[#80868b] bg-[#80868b] text-white",
      };
    }

    if (averagePercentage >= 90) {
      return {
        label: "Excellent",
        className: "border-[#34a853] bg-[#34a853] text-white",
      };
    }

    if (averagePercentage >= 85) {
      return {
        label: "Very Satisfactory",
        className: "border-[#4285f4] bg-[#4285f4] text-white",
      };
    }

    if (averagePercentage >= 75) {
      return {
        label: "Satisfactory",
        className: "border-[#fbbc04] bg-[#fbbc04] text-[#202124]",
      };
    }

    return {
      label: "At Risk",
      className: "border-[#ea4335] bg-[#ea4335] text-white",
    };
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans text-[#202124]">
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[#dadce0] bg-white transition-[width] duration-300 ${
          sidebarCollapsed ? "w-16" : "w-64"
        }`}
      >
        <div
          className={`relative flex h-20 items-center border-b border-[#e3e3e3] ${
            sidebarCollapsed ? "justify-center px-2" : "px-4"
          }`}
        >
          <button
            type="button"
            onClick={() => setSidebarCollapsed((current) => !current)}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`flex min-w-0 items-center ${
              sidebarCollapsed ? "justify-center" : "gap-3"
            }`}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[16px] border border-[#dadce0] bg-white">
              <img
                src="/logo.png"
                alt="EduLITE logo"
                className="h-9 w-9 object-contain"
              />
            </div>

            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="truncate text-lg font-bold tracking-tight text-[#202124]">
                  EduLITE
                </p>

                <p className="truncate text-xs text-[#5f6368]">
                  Teacher Workspace
                </p>
              </div>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSidebarCollapsed((current) => !current)}
            aria-label={
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="absolute -right-3 top-7 flex h-7 w-7 items-center justify-center rounded-full border border-[#dadce0] bg-white text-sm font-bold text-[#5f6368] transition hover:border-[#4285f4] hover:bg-[#4285f4] hover:text-white"
          >
            {sidebarCollapsed ? "›" : "‹"}
          </button>
        </div>

        {sidebarCollapsed ? (
          <div className="flex-1" />
        ) : (
          <nav className="flex-1 overflow-y-auto px-3 py-5">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#80868b]">
              Menu
            </p>

            <div className="mt-3 space-y-1.5">
              <SidebarButton
                active={activeView === "dashboard"}
                label="Dashboard"
                badge="D"
                tone="yellow"
                onClick={() => openView("dashboard")}
              />

              <SidebarButton
                active={activeView === "records"}
                label="Records"
                badge="R"
                tone="green"
                onClick={() => openView("records")}
              />

              <button
                type="button"
                onClick={() => setAddMenuOpen((current) => !current)}
                className={`flex w-full items-center gap-3 rounded-[18px] px-3 py-2.5 text-left text-sm font-semibold transition ${
                  activeView === "sections" ||
                  activeView === "subjects" ||
                  activeView === "registerStudent" ||
                  activeView === "addAssessment"
                    ? "bg-[#ea4335] text-white"
                    : "text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#202124]"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base font-bold ${
                    activeView === "sections" ||
                    activeView === "subjects" ||
                    activeView === "registerStudent" ||
                    activeView === "addAssessment"
                      ? "bg-white/15 text-white"
                      : "bg-[#ea4335] text-white"
                  }`}
                >
                  +
                </span>

                <span className="flex-1">Add and Manage</span>

                <span
                  className={`text-xs transition-transform ${
                    addMenuOpen ? "rotate-180" : ""
                  }`}
                >
                  ⌄
                </span>
              </button>

              {addMenuOpen && (
                <div className="ml-5 space-y-1 border-l border-[#dadce0] pl-4 pt-1">
                  <SubmenuButton
                    label="Add Section"
                    active={activeView === "sections"}
                    onClick={() => openView("sections")}
                  />

                  <SubmenuButton
                    label="Register Student"
                    active={activeView === "registerStudent"}
                    onClick={handleRegisterStudent}
                  />

                  <SubmenuButton
                    label="Subject Management"
                    active={activeView === "subjects"}
                    onClick={() => openView("subjects")}
                  />

                  <SubmenuButton
                    label="Add Assessment"
                    active={activeView === "addAssessment"}
                    onClick={handleAddAssessment}
                  />
                </div>
              )}
            </div>
          </nav>
        )}

        {!sidebarCollapsed && (
          <div className="border-t border-[#e3e3e3] px-3 py-4">
            <SidebarButton
              label="Logout"
              badge="↪"
              tone="red"
              onClick={handleLogout}
            />
          </div>
        )}
      </aside>

      <div
        className={`min-h-screen transition-[padding] duration-300 ${
          sidebarCollapsed ? "pl-16" : "pl-64"
        }`}
      >
        <header className="sticky top-0 z-30 bg-[#f8f9fa] px-4 pt-4 sm:px-6 lg:px-8">
          <div className="flex min-h-20 items-center justify-between gap-4 rounded-[28px] border border-[#dadce0] bg-white px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight text-[#202124]">
                {pageDetails.title}
              </h1>

              <p className="mt-1 truncate text-sm text-[#5f6368]">
                {pageDetails.description}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSidebarCollapsed((current) => !current)}
              className="hidden rounded-full border border-[#dadce0] bg-[#f8f9fa] px-4 py-2 text-sm font-medium text-[#3c4043] transition hover:bg-[#4285f4] hover:text-white sm:inline-flex"
            >
              {sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            </button>
          </div>
        </header>

        <main className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
          {error && (
            <div className="rounded-[20px] border border-l-8 border-[#ea4335] bg-white p-4 text-[#c5221f]">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-[20px] border border-l-8 border-[#34a853] bg-white p-4 text-[#137333]">
              {success}
            </div>
          )}

          {loading ? (
            <div className="rounded-[28px] border border-[#dadce0] bg-white p-12 text-center text-[#5f6368]">
              Loading EduLITE data...
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
                  setSelectedSection={setSelectedSection}
                  setSelectedSubject={setSelectedSubject}
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
                  setSelectedSection={setSelectedSection}
                  setSelectedSubject={setSelectedSubject}
                  currentSectionLabel={currentSectionLabel}
                  currentSubjectLabel={currentSubjectLabel}
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

              {activeView === "registerStudent" && (
                <StudentForm
                  embedded
                  studentId={studentFormId}
                  onCancel={handleStudentFormCancel}
                  onSaved={handleStudentFormSaved}
                />
              )}

              {activeView === "addAssessment" && (
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
  setSelectedSection,
  setSelectedSubject,
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
}) {
  return (
    <>
      <DashboardFilters
        title="Dashboard Filters"
        description="All analytics and assessments update using the selected section and subject."
        students={students}
        sections={sections}
        subjects={subjects}
        assessments={assessments}
        selectedSection={selectedSection}
        selectedSubject={selectedSubject}
        setSelectedSection={setSelectedSection}
        setSelectedSubject={setSelectedSubject}
      />

      <section>
        <div className="mb-5">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#5f6368]">
            Performance Analytics
          </p>

          <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#202124]">
            {currentSubjectLabel} · {currentSectionLabel}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <AnalyticsCard
            title="Class Average"
            value={`${classAverage.toFixed(1)}%`}
            description="Average from relevant recorded assessments"
            tone="yellow"
          />

          <AnalyticsCard
            title="Students Assessed"
            value={assessedStudents.length}
            description={`${displayedStudents.length} students match the filters`}
            tone="blue"
          />

          <AnalyticsCard
            title="Passing Rate"
            value={`${passingRate.toFixed(1)}%`}
            description={`${passingStudents.length} students have passing averages`}
            tone="green"
          />

          <AnalyticsCard
            title="Students at Risk"
            value={atRiskStudents.length}
            description="Average percentage below 75"
            tone="red"
          />
        </div>
      </section>

      <section className="rounded-[28px] border-2 border-[#1A2CA3] bg-white p-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-[#202124]">
            Class Performance Summary
          </h3>

          <p className="mt-1 text-sm text-[#5f6368]">
            Distribution of assessed students across performance levels.
          </p>
        </div>

        <div className="space-y-5">
          <PerformanceBar
            label="Excellent"
            range="90–100%"
            count={excellentStudents.length}
            percentage={getPercentage(excellentStudents.length)}
            barClass="bg-[#34a853]"
          />

          <PerformanceBar
            label="Very Satisfactory"
            range="85–89%"
            count={verySatisfactoryStudents.length}
            percentage={getPercentage(verySatisfactoryStudents.length)}
            barClass="bg-[#4285f4]"
          />

          <PerformanceBar
            label="Satisfactory"
            range="75–84%"
            count={satisfactoryStudents.length}
            percentage={getPercentage(satisfactoryStudents.length)}
            barClass="bg-[#fbbc04]"
          />

          <PerformanceBar
            label="Needs Support"
            range="Below 75%"
            count={atRiskStudents.length}
            percentage={getPercentage(atRiskStudents.length)}
            barClass="bg-[#ea4335]"
          />
        </div>
      </section>

      <section className="rounded-[28px] border-2 border-[#1A2CA3] bg-white p-6">
        <div className="mb-5">
          <h3 className="text-xl font-bold text-[#202124]">
            Learning Insights
          </h3>

          <p className="mt-1 text-sm text-[#5f6368]">
            Students who may need support and students demonstrating high
            potential.
          </p>
        </div>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <InsightList
            title="Students at Risk"
            students={atRiskStudents}
            type="risk"
            onGenerateRecommendation={generateStudentRecommendation}
            generatingRecommendationKey={generatingRecommendationKey}
          />

          <InsightList
            title="High Potential"
            students={highPotentialStudents}
            type="potential"
            onGenerateRecommendation={generateStudentRecommendation}
            generatingRecommendationKey={generatingRecommendationKey}
          />
        </div>
      </section>

      <AssessmentList
        displayedAssessments={displayedAssessments}
        currentSubjectLabel={currentSubjectLabel}
        onEditAssessment={onEditAssessment}
        handleDeleteAssessment={handleDeleteAssessment}
      />
    </>
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
  setSelectedSection,
  setSelectedSubject,
  currentSectionLabel,
  currentSubjectLabel,
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
  expandedStudentId,
  toggleStudentProfile,
  studentInsightsById,
  loadingStudentInsightsId,
  studentInsightErrors,
  openSavedInsight,
  reloadStudentInsights,
}) {
  const totalColumns = displayedAssessments.length + 7;

  return (
    <>
      <DashboardFilters
        title="Record Filters"
        description="Choose a section and subject to narrow the student assessment records."
        students={students}
        sections={sections}
        subjects={subjects}
        assessments={assessments}
        selectedSection={selectedSection}
        selectedSubject={selectedSubject}
        setSelectedSection={setSelectedSection}
        setSelectedSubject={setSelectedSubject}
      />

      <section className="overflow-hidden rounded-[28px] border-2 border-[#1A2CA3] bg-white">
        <div className="border-b border-[#e3e3e3] px-6 py-5">
          <h2 className="text-xl font-bold text-[#202124]">
            Student Assessment Records - {currentSubjectLabel} -{" "}
            {currentSectionLabel}
          </h2>

          <p className="mt-1 text-sm text-[#5f6368]">
            Click a student's name to expand their complete profile, assessment
            history, and saved Gemini learning insights.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            <thead className="border-b border-[#e3e3e3] bg-[#f8f9fa]">
              <tr>
                <TableHeading>Student</TableHeading>
                <TableHeading>Grade</TableHeading>
                <TableHeading>Section</TableHeading>
                <TableHeading>Subjects</TableHeading>

                {displayedAssessments.map((assessment) => (
                  <th
                    key={assessment.id}
                    className="min-w-[175px] px-5 py-4 text-center text-xs font-semibold uppercase tracking-wide text-[#5f6368]"
                  >
                    <div>{assessment.name}</div>

                    <div className="mt-1 font-normal normal-case text-[#80868b]">
                      {assessment.subject_name} - {assessment.type} -{" "}
                      {assessment.total_items} items
                    </div>
                  </th>
                ))}

                <TableHeading>Average</TableHeading>
                <TableHeading>Performance</TableHeading>
                <TableHeading align="right">Actions</TableHeading>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#e3e3e3]">
              {studentAnalytics.map((student) => {
                const status = getPerformanceStatus(student.averagePercentage);
                const isEditing = editingStudentId === student.id;
                const isExpanded = expandedStudentId === student.id;

                const studentRecords = assessments
                  .filter((assessment) =>
                    student.subject_ids?.includes(assessment.subject_id),
                  )
                  .map((assessment) => {
                    const record = assessmentRecords.find(
                      (item) =>
                        item.student_id === student.id &&
                        item.assessment_id === assessment.id,
                    );

                    return {
                      id:
                        record?.id ?? `missing-${student.id}-${assessment.id}`,
                      student_id: student.id,
                      assessment_id: assessment.id,
                      assessment_name: assessment.name,
                      subject_id: assessment.subject_id,
                      subject_name: assessment.subject_name,
                      type: assessment.type,
                      date: assessment.date,
                      total_items: assessment.total_items,
                      score: record?.score ?? null,
                    };
                  })
                  .sort((first, second) => {
                    const dateComparison = String(second.date).localeCompare(
                      String(first.date),
                    );

                    return (
                      dateComparison ||
                      String(first.assessment_name).localeCompare(
                        String(second.assessment_name),
                      )
                    );
                  });

                const savedInsights = studentInsightsById[student.id] ?? [];
                const isLoadingInsights =
                  loadingStudentInsightsId === student.id;
                const insightError = studentInsightErrors[student.id] || "";

                return (
                  <Fragment key={student.id}>
                    <tr
                      className={
                        isEditing
                          ? "bg-[#f8f9fa]"
                          : isExpanded
                            ? "bg-[#f8f9fa]"
                            : "hover:bg-[#f8f9fa]"
                      }
                    >
                      <td className="px-5 py-4 font-medium text-[#202124]">
                        <button
                          type="button"
                          onClick={() => toggleStudentProfile(student)}
                          className="group text-left"
                          aria-expanded={isExpanded}
                        >
                          <span className="block font-semibold text-[#174ea6] group-hover:text-[#1a73e8] group-hover:underline">
                            {student.name}
                          </span>

                          <span className="mt-1 block text-xs font-normal text-[#5f6368]">
                            {isExpanded
                              ? "Hide profile"
                              : "View profile and saved insights"}
                          </span>
                        </button>
                      </td>

                      <td className="px-5 py-4 text-[#5f6368]">
                        {student.grade}
                      </td>

                      <td className="px-5 py-4 text-[#5f6368]">
                        {student.section}
                      </td>

                      <td className="min-w-[220px] px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {student.subjects?.map((subject) => (
                            <span
                              key={subject.id}
                              className="rounded-full border border-[#4285f4] bg-white px-2.5 py-1 text-xs font-medium text-[#174ea6]"
                            >
                              {subject.name}
                            </span>
                          ))}
                        </div>
                      </td>

                      {displayedAssessments.map((assessment) => {
                        const isEnrolled = student.subject_ids?.includes(
                          assessment.subject_id,
                        );

                        const score = scoreMap[student.id]?.[assessment.id];
                        const hasScore = score !== undefined && score !== null;

                        const percentage =
                          hasScore && Number(assessment.total_items) > 0
                            ? (Number(score) / Number(assessment.total_items)) *
                              100
                            : null;

                        return (
                          <td
                            key={assessment.id}
                            className="px-5 py-4 text-center"
                          >
                            {!isEnrolled ? (
                              <span className="text-xs text-[#80868b]">
                                Not enrolled
                              </span>
                            ) : isEditing ? (
                              <div className="flex items-center justify-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  max={assessment.total_items}
                                  step="1"
                                  value={editedScores[assessment.id] ?? ""}
                                  onChange={(event) =>
                                    handleEditedScoreChange(
                                      assessment.id,
                                      event.target.value,
                                    )
                                  }
                                  placeholder="-"
                                  disabled={savingScores}
                                  className="w-20 rounded-[12px] border border-[#dadce0] bg-white px-2 py-2 text-center text-[#202124] focus:border-[#1a73e8] focus:outline-none focus:ring-2 focus:ring-[#4285f4]/20 disabled:bg-[#f1f3f4]"
                                />

                                <span className="text-sm text-[#5f6368]">
                                  / {assessment.total_items}
                                </span>
                              </div>
                            ) : hasScore ? (
                              <>
                                <div className="font-semibold text-[#202124]">
                                  {score} / {assessment.total_items}
                                </div>

                                <div className="mt-1 text-xs text-[#5f6368]">
                                  {percentage.toFixed(1)}%
                                </div>
                              </>
                            ) : (
                              <span className="text-[#80868b]">-</span>
                            )}
                          </td>
                        );
                      })}

                      <td className="px-5 py-4 font-bold text-[#202124]">
                        {student.averagePercentage === null
                          ? "-"
                          : `${student.averagePercentage.toFixed(1)}%`}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => saveStudentScores(student)}
                              disabled={savingScores}
                              className="mr-2 rounded-full bg-[#1a73e8] px-3.5 py-2 font-medium text-white hover:bg-[#1765cc] disabled:cursor-not-allowed disabled:bg-[#dadce0] disabled:text-[#80868b]"
                            >
                              {savingScores ? "Saving..." : "Save Scores"}
                            </button>

                            <button
                              type="button"
                              onClick={cancelEditingScores}
                              disabled={savingScores}
                              className="rounded-full bg-[#f1f3f4] px-3.5 py-2 font-medium text-[#3c4043] hover:bg-[#e8eaed] disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => onEditStudent(student.id)}
                              className="mr-2 rounded-full bg-white px-3.5 py-2 font-medium text-[#174ea6] hover:bg-[#4285f4] hover:text-white"
                            >
                              Edit Info
                            </button>

                            <button
                              type="button"
                              onClick={() => startEditingScores(student)}
                              disabled={
                                getStudentAssessments(student).length === 0
                              }
                              className="mr-2 rounded-full bg-white px-3.5 py-2 font-medium text-[#7a5b00] hover:bg-[#fbbc04] hover:text-[#202124] disabled:cursor-not-allowed disabled:bg-[#f1f3f4] disabled:text-[#80868b]"
                            >
                              Edit Scores
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteStudent(student.id)}
                              className="rounded-full bg-white px-3.5 py-2 font-medium text-[#c5221f] hover:bg-[#ea4335] hover:text-white"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td
                          colSpan={totalColumns}
                          className="bg-[#f1f3f4]/70 px-4 py-5 sm:px-6"
                        >
                          <StudentExpandedProfile
                            student={student}
                            status={status}
                            assessmentRecords={studentRecords}
                            savedInsights={savedInsights}
                            loadingInsights={isLoadingInsights}
                            insightError={insightError}
                            openSavedInsight={openSavedInsight}
                            reloadInsights={() =>
                              reloadStudentInsights(student.id, true)
                            }
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}

              {studentAnalytics.length === 0 && (
                <tr>
                  <td
                    colSpan={totalColumns}
                    className="px-6 py-12 text-center text-[#5f6368]"
                  >
                    No students found for {currentSubjectLabel} and{" "}
                    {currentSectionLabel}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function StudentExpandedProfile({
  student,
  status,
  assessmentRecords,
  savedInsights,
  loadingInsights,
  insightError,
  openSavedInsight,
  reloadInsights,
}) {
  const scoredRecords = assessmentRecords.filter(
    (record) =>
      record.score !== null &&
      record.score !== undefined &&
      Number(record.total_items) > 0,
  );

  const overallAverage =
    scoredRecords.length > 0
      ? scoredRecords.reduce(
          (total, record) =>
            total + (Number(record.score) / Number(record.total_items)) * 100,
          0,
        ) / scoredRecords.length
      : null;

  return (
    <div className="rounded-[28px] border border-[#dadce0] bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3c4043]">
            Student Profile
          </p>

          <h3 className="mt-1 text-2xl font-bold tracking-tight text-[#202124]">
            {student.name}
          </h3>

          <p className="mt-1 text-sm text-[#5f6368]">
            Grade {student.grade} - {student.section}
          </p>
        </div>

        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-sm font-semibold ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ProfileMetric
          label="Subjects"
          value={student.subject_names?.length ?? 0}
          tone="yellow"
        />

        <ProfileMetric
          label="Recorded assessments"
          value={scoredRecords.length}
          tone="blue"
        />

        <ProfileMetric
          label="Overall average"
          value={
            overallAverage === null
              ? "Not assessed"
              : `${overallAverage.toFixed(1)}%`
          }
          tone="green"
        />

        <ProfileMetric
          label="Saved AI insights"
          value={savedInsights.length}
          tone="red"
        />
      </div>

      <div className="mt-6">
        <h4 className="text-base font-bold text-[#202124]">
          Enrolled Subjects
        </h4>

        <div className="mt-3 flex flex-wrap gap-2">
          {student.subject_names?.map((subjectName) => (
            <span
              key={subjectName}
              className="rounded-full border border-[#4285f4] bg-white px-3 py-1 text-sm font-medium text-[#174ea6]"
            >
              {subjectName}
            </span>
          ))}

          {!student.subject_names?.length && (
            <span className="text-sm text-[#5f6368]">
              No enrolled subjects found.
            </span>
          )}
        </div>
      </div>

      <div className="mt-7">
        <div className="mb-3">
          <h4 className="text-base font-bold text-[#202124]">
            Complete Assessment History
          </h4>

          <p className="mt-1 text-sm text-[#5f6368]">
            All saved scores for this student, regardless of the current record
            filters.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#e3e3e3]">
          <table className="w-full min-w-[760px]">
            <thead className="bg-[#f8f9fa]">
              <tr>
                <TableHeading>Assessment</TableHeading>
                <TableHeading>Subject</TableHeading>
                <TableHeading>Type</TableHeading>
                <TableHeading>Date</TableHeading>
                <TableHeading>Score</TableHeading>
                <TableHeading>Percentage</TableHeading>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#e3e3e3]">
              {assessmentRecords.map((record) => {
                const hasScore =
                  record.score !== null && record.score !== undefined;

                const percentage =
                  hasScore && Number(record.total_items) > 0
                    ? (Number(record.score) / Number(record.total_items)) * 100
                    : null;

                return (
                  <tr key={`${record.assessment_id}-${record.id}`}>
                    <td className="px-6 py-4 font-medium text-[#202124]">
                      {record.assessment_name}
                    </td>

                    <td className="px-6 py-4 text-[#5f6368]">
                      {record.subject_name}
                    </td>

                    <td className="px-6 py-4 text-[#5f6368]">
                      {record.type}
                    </td>

                    <td className="px-6 py-4 text-[#5f6368]">
                      {record.date}
                    </td>

                    <td className="px-6 py-4 text-[#3c4043]">
                      {hasScore
                        ? `${record.score} / ${record.total_items}`
                        : "Missing"}
                    </td>

                    <td className="px-6 py-4 font-semibold text-[#202124]">
                      {percentage === null ? "-" : `${percentage.toFixed(1)}%`}
                    </td>
                  </tr>
                );
              })}

              {assessmentRecords.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-10 text-center text-[#5f6368]"
                  >
                    No assessment records have been saved for this student.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-base font-bold text-[#202124]">
              Saved Gemini Learning Insights
            </h4>

            <p className="mt-1 text-sm text-[#5f6368]">
              Every generated intervention or enrichment plan is stored in the
              database with a downloadable PDF.
            </p>
          </div>

          <button
            type="button"
            onClick={reloadInsights}
            disabled={loadingInsights}
            className="rounded-full border border-[#dadce0] bg-white px-4 py-2 text-sm font-medium text-[#3c4043] hover:bg-[#4285f4] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingInsights ? "Refreshing..." : "Refresh insights"}
          </button>
        </div>

        {insightError && (
          <div className="mt-4 rounded-[18px] border border-[#ea4335] bg-white p-4 text-sm text-[#c5221f]">
            {insightError}
          </div>
        )}

        {loadingInsights && savedInsights.length === 0 ? (
          <div className="mt-4 rounded-[18px] border border-[#e3e3e3] bg-white p-6 text-center text-[#5f6368]">
            Loading saved insights...
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            {savedInsights.map((insight) => (
              <article
                key={insight.id}
                className="rounded-[20px] border border-[#e3e3e3] bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        insight.supportType === "intervention"
                          ? "bg-[#ea4335] text-white"
                          : "bg-[#34a853] text-white"
                      }`}
                    >
                      {insight.supportType === "intervention"
                        ? "Intervention"
                        : "Enrichment"}
                    </span>

                    <h5 className="mt-2 font-bold text-[#202124]">
                      {insight.title}
                    </h5>
                  </div>

                  <span className="text-xs text-[#80868b]">#{insight.id}</span>
                </div>

                <dl className="mt-3 space-y-1 text-sm text-[#5f6368]">
                  <div>
                    <dt className="inline font-semibold text-[#3c4043]">
                      Focus:{" "}
                    </dt>
                    <dd className="inline">{insight.focusLabel}</dd>
                  </div>

                  <div>
                    <dt className="inline font-semibold text-[#3c4043]">
                      Classification:{" "}
                    </dt>
                    <dd className="inline">{insight.classification}</dd>
                  </div>

                  <div>
                    <dt className="inline font-semibold text-[#3c4043]">
                      Saved:{" "}
                    </dt>
                    <dd className="inline">
                      {formatSavedDate(insight.createdAt)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openSavedInsight(insight)}
                    className="rounded-full bg-[#1a73e8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1765cc]"
                  >
                    View insight
                  </button>

                  <a
                    href={`${API_URL}${insight.pdfUrl}`}
                    className="rounded-full border border-[#dadce0] bg-white px-4 py-2 text-sm font-semibold text-[#3c4043] hover:bg-[#f8f9fa]"
                  >
                    Download PDF
                  </a>
                </div>
              </article>
            ))}

            {savedInsights.length === 0 && !insightError && (
              <div className="rounded-[20px] border border-dashed border-[#dadce0] bg-[#f8f9fa] p-8 text-center text-[#5f6368] xl:col-span-2">
                No Gemini insights have been generated for this student yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileMetric({ label, value, tone = "blue" }) {
  const tones = {
    blue: "border-[#4285f4] bg-[#4285f4] text-white",
    red: "border-[#ea4335] bg-[#ea4335] text-white",
    green: "border-[#34a853] bg-[#34a853] text-white",
    yellow: "border-[#fbbc04] bg-[#fbbc04] text-[#202124]",
  };

  const selectedTone = tones[tone] ?? tones.blue;

  return (
    <div className={`rounded-[20px] border p-4 ${selectedTone}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold tracking-tight">{value}</p>
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
    <section className="overflow-hidden rounded-[28px] border-2 border-[#1A2CA3] bg-white">
      <div className="flex flex-col gap-4 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a5b00]">
            Classroom Setup
          </p>

          <h2 className="mt-1 text-xl font-bold text-[#202124]">
            Section Management
          </h2>

          <p className="mt-1 text-sm text-[#5f6368]">
            Add sections before registering students, then manage existing
            section records below.
          </p>
        </div>

        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#fbbc04] text-xl font-bold text-[#202124]">
          S
        </span>
      </div>

      <div className="p-6">
        <form
          onSubmit={handleAddSection}
          className="flex flex-col gap-3 rounded-[40px] border border-[#dadce0] bg-[#f8f9fa] p-4 sm:flex-row"
        >
          <input
            type="text"
            value={newSection}
            onChange={(event) => setNewSection(event.target.value)}
            placeholder="Enter section name"
            className="flex-1 rounded-full border border-[#dadce0] bg-white px-5 py-3 text-[#202124] placeholder-[#80868b] focus:border-[#34a853] focus:outline-none focus:ring-4 focus:ring-[#34a853]/20"
          />

          <button
            type="submit"
            disabled={addingSection || !newSection.trim()}
            className="rounded-full bg-[#34a853] px-6 py-3 font-medium text-white transition hover:bg-[#188038] disabled:cursor-not-allowed disabled:bg-[#dadce0] disabled:text-[#80868b]"
          >
            {addingSection ? "Adding..." : "+ Add Section"}
          </button>
        </form>

        <div className="mt-6 overflow-hidden rounded-[22px] border border-[#e3e3e3]">
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-[#e3e3e3] bg-[#f8f9fa] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#5f6368]">
            <span>Section</span>
            <span>Students</span>
            <span>Action</span>
          </div>

          <div className="divide-y divide-[#e3e3e3]">
            {sections.map((section) => (
              <div
                key={section.id}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-4 transition hover:bg-[#f8f9fa]"
              >
                <button
                  type="button"
                  onClick={() => openDashboardForSection(section.name)}
                  className="text-left font-semibold text-[#202124] hover:text-[#7a5b00]"
                >
                  {section.name}
                </button>

                <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-[#7a5b00]">
                  {section.student_count}
                </span>

                <button
                  type="button"
                  onClick={() => handleRemoveSection(section)}
                  className="rounded-full bg-white px-3.5 py-2 text-sm font-medium text-[#c5221f] hover:bg-[#ea4335] hover:text-white"
                >
                  Remove
                </button>
              </div>
            ))}

            {sections.length === 0 && (
              <div className="px-6 py-12 text-center text-[#5f6368]">
                No sections have been added.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
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
    <section className="overflow-hidden rounded-[28px] border-2 border-[#1A2CA3] bg-white">
      <div className="flex flex-col gap-4 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#137333]">
            Learning Areas
          </p>

          <h2 className="mt-1 text-xl font-bold text-[#202124]">
            Subject Management
          </h2>

          <p className="mt-1 text-sm text-[#5f6368]">
            Create a subject, choose its enrolled students, and manage existing
            subjects.
          </p>
        </div>

        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#34a853] text-xl font-bold text-white">
          B
        </span>
      </div>

      <div className="p-6">
        <form
          onSubmit={openSubjectStudentPrompt}
          className="flex flex-col gap-3 rounded-[40px] border border-[#dadce0] bg-[#f8f9fa] p-4 sm:flex-row"
        >
          <input
            type="text"
            value={newSubject}
            onChange={(event) => setNewSubject(event.target.value)}
            placeholder="Enter subject name"
            className="flex-1 rounded-full border border-[#dadce0] bg-white px-5 py-3 text-[#202124] placeholder-[#80868b] focus:border-[#1a73e8] focus:outline-none focus:ring-4 focus:ring-[#4285f4]/20"
          />

          <button
            type="submit"
            disabled={addingSubject || !newSubject.trim()}
            className="rounded-full bg-[#1a73e8] px-6 py-3 font-medium text-white transition hover:bg-[#1765cc] disabled:cursor-not-allowed disabled:bg-[#dadce0] disabled:text-[#80868b]"
          >
            Choose Students
          </button>
        </form>

        <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {subjects.map((subject, index) => {
            const tone =
              index % 3 === 0
                ? "border-[#fbbc04] bg-white"
                : index % 3 === 1
                  ? "border-[#34a853] bg-white"
                  : "border-[#ea4335] bg-white";

            return (
              <div
                key={subject.id}
                className={`flex flex-col gap-4 rounded-[22px] border px-5 py-5 sm:flex-row sm:items-center sm:justify-between ${tone}`}
              >
                <button
                  type="button"
                  onClick={() => openDashboardForSubject(subject.id)}
                  className="text-left"
                >
                  <span className="block font-semibold text-[#202124] hover:underline">
                    {subject.name}
                  </span>

                  <span className="mt-1 block text-sm text-[#5f6368]">
                    {subject.student_count} students ·{" "}
                    {subject.assessment_count} assessments
                  </span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleRenameSubject(subject)}
                    className="rounded-full border border-[#4285f4] bg-white px-3.5 py-2 font-medium text-[#174ea6] hover:bg-[#4285f4] hover:text-white"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveSubject(subject)}
                    className="rounded-full bg-[#ea4335] px-3.5 py-2 font-medium text-white hover:bg-[#d93025]"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}

          {subjects.length === 0 && (
            <div className="rounded-[22px] border border-dashed border-[#dadce0] bg-[#f8f9fa] px-6 py-12 text-center text-[#5f6368] lg:col-span-2">
              No subjects have been added.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function DashboardFilters({
  title,
  description,
  students,
  sections,
  subjects,
  assessments,
  selectedSection,
  selectedSubject,
  setSelectedSection,
  setSelectedSubject,
}) {
  return (
    <section className="rounded-[28px] border-2 border-[#1A2CA3] bg-white px-5 py-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-[15px] bg-[#4285f4] font-bold text-white">
          F
        </span>

        <div>
          <h2 className="text-sm font-semibold text-[#202124]">{title}</h2>

          <p className="text-xs text-[#5f6368]">
            Choose a section and subject to update the view.
          </p>

          <p className="sr-only">{description}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="min-w-0 rounded-[20px] border border-[#dadce0] bg-[#f1f3f4] p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a5b00]">
            Section
          </p>

          <div className="flex flex-wrap gap-2">
            <FilterPill
              active={selectedSection === "ALL"}
              label="All"
              title={`${students.length} students`}
              onClick={() => setSelectedSection("ALL")}
              tone="yellow"
            />

            {sections.map((section) => (
              <FilterPill
                key={section.id}
                active={selectedSection === section.name}
                label={section.name}
                title={`${section.student_count} students`}
                onClick={() => setSelectedSection(section.name)}
                tone="yellow"
              />
            ))}
          </div>
        </div>

        <div className="min-w-0 rounded-[20px] border border-[#dadce0] bg-[#f1f3f4] p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#137333]">
            Subject
          </p>

          <div className="flex flex-wrap gap-2">
            <FilterPill
              active={selectedSubject === "ALL"}
              label="All"
              title={`${assessments.length} assessments`}
              onClick={() => setSelectedSubject("ALL")}
              tone="green"
            />

            {subjects.map((subject) => (
              <FilterPill
                key={subject.id}
                active={String(selectedSubject) === String(subject.id)}
                label={subject.name}
                title={`${subject.student_count} students, ${subject.assessment_count} assessments`}
                onClick={() => setSelectedSubject(String(subject.id))}
                tone="green"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FilterPill({ active, label, title, tone = "blue", onClick }) {
  const tones = {
    blue: {
      active: "border-[#4285f4] bg-[#1a73e8] text-white",
      inactive:
        "border-[#dadce0] bg-white text-[#174ea6] hover:border-[#4285f4]",
      check: "bg-[#4285f4] text-white",
    },
    green: {
      active: "border-[#34a853] bg-[#34a853] text-white",
      inactive:
        "border-[#dadce0] bg-white text-[#137333] hover:border-[#34a853]",
      check: "bg-[#34a853] text-white",
    },
    yellow: {
      active: "border-[#f9ab00] bg-[#fbbc04] text-[#3c4043]",
      inactive:
        "border-[#dadce0] bg-white text-[#7a5b00] hover:border-[#fbbc04]",
      check: "bg-[#fbbc04] text-[#202124]",
    },
  };

  const selectedTone = tones[tone] ?? tones.blue;

  return (
    <button
      type="button"
      aria-pressed={active}
      title={title}
      onClick={onClick}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-4 focus:ring-[#4285f4]/20 ${
        active ? selectedTone.active : selectedTone.inactive
      }`}
    >
      {active && (
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${selectedTone.check}`}
        >
          ✓
        </span>
      )}

      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function AssessmentList({
  displayedAssessments,
  currentSubjectLabel,
  onEditAssessment,
  handleDeleteAssessment,
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border-2 border-[#1A2CA3] bg-white">
      <div className="flex flex-col gap-3 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#174ea6]">
            Assessment Library
          </p>

          <h2 className="mt-1 text-xl font-bold text-[#202124]">
            Assessments — {currentSubjectLabel}
          </h2>

          <p className="mt-1 text-sm text-[#5f6368]">
            {displayedAssessments.length} assessment
            {displayedAssessments.length === 1 ? "" : "s"}
          </p>
        </div>

        <span className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#4285f4] text-xl font-bold text-white">
          A
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px]">
          <thead className="border-b border-[#e3e3e3] bg-[#f8f9fa]">
            <tr>
              <TableHeading>Assessment</TableHeading>
              <TableHeading>Subject</TableHeading>
              <TableHeading>Type</TableHeading>
              <TableHeading>Date</TableHeading>
              <TableHeading>Total Items</TableHeading>
              <TableHeading align="right">Actions</TableHeading>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#e3e3e3]">
            {displayedAssessments.map((assessment) => (
              <tr key={assessment.id} className="transition hover:bg-[#f8f9fa]">
                <td className="px-6 py-4 font-medium text-[#202124]">
                  {assessment.name}
                </td>

                <td className="px-6 py-4 text-[#5f6368]">
                  <span className="rounded-full border border-[#34a853] bg-white px-3 py-1 text-sm font-medium text-[#137333]">
                    {assessment.subject_name}
                  </span>
                </td>

                <td className="px-6 py-4 text-[#5f6368]">
                  {assessment.type}
                </td>

                <td className="px-6 py-4 text-[#5f6368]">
                  {assessment.date}
                </td>

                <td className="px-6 py-4 text-[#5f6368]">
                  {assessment.total_items}
                </td>

                <td className="whitespace-nowrap px-6 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => onEditAssessment(assessment.id)}
                    className="mr-2 rounded-full bg-white px-3.5 py-2 font-medium text-[#174ea6] hover:bg-[#4285f4] hover:text-white"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteAssessment(assessment.id)}
                    className="rounded-full bg-white px-3.5 py-2 font-medium text-[#c5221f] hover:bg-[#ea4335] hover:text-white"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {displayedAssessments.length === 0 && (
              <tr>
                <td
                  colSpan="6"
                  className="px-6 py-12 text-center text-[#5f6368]"
                >
                  No assessments have been added for this subject.
                </td>
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
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#202124]/55 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-[30px] border border-[#e3e3e3] bg-white">
        <div className="flex items-start justify-between gap-4 border-b border-t-8 border-[#dadce0] border-t-[#fbbc04] bg-white px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7a5b00]">
              New Subject Enrollment
            </p>

            <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#202124]">
              {subjectName}
            </h2>

            <p className="mt-1 text-sm text-[#5f6368]">
              Select every student who is enrolled in this subject.
            </p>
          </div>

          <button
            type="button"
            onClick={closeModal}
            disabled={addingSubject}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-2xl leading-none text-[#5f6368] hover:bg-[#f8f9fa] hover:text-[#202124] disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <div className="space-y-3 border-b border-[#e3e3e3] px-6 py-4">
          <input
            type="text"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search students by name, grade, or section"
            className="w-full rounded-full border border-[#dadce0] bg-[#f8f9fa] px-5 py-3 text-[#202124] placeholder-[#80868b] focus:border-[#1a73e8] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#4285f4]/20"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#5f6368]">
              {selectedIds.length} of {students.length} students selected
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setSelectedIds(students.map((student) => student.id))
                }
                disabled={students.length === 0 || addingSubject}
                className="rounded-full bg-white px-3.5 py-2 text-sm font-medium text-[#137333] hover:bg-[#34a853] hover:text-white disabled:opacity-50"
              >
                Select All
              </button>

              <button
                type="button"
                onClick={() => setSelectedIds([])}
                disabled={selectedIds.length === 0 || addingSubject}
                className="rounded-full bg-white px-3.5 py-2 text-sm font-medium text-[#c5221f] hover:bg-[#ea4335] hover:text-white disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="max-h-[45vh] overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {filteredStudents.map((student) => (
              <label
                key={student.id}
                className={`flex cursor-pointer items-start gap-3 rounded-[20px] border px-4 py-3 transition ${
                  selectedIds.includes(student.id)
                    ? "border-2 border-[#4285f4] bg-white"
                    : "border-[#e3e3e3] bg-white hover:bg-[#f8f9fa]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(student.id)}
                  onChange={() => toggleStudent(student.id)}
                  disabled={addingSubject}
                  className="mt-1 h-4 w-4 accent-[#4285f4]"
                />

                <span className="min-w-0">
                  <span className="block font-semibold text-[#202124]">
                    {student.name}
                  </span>

                  <span className="mt-0.5 block text-sm text-[#5f6368]">
                    Grade {student.grade} · {student.section}
                  </span>

                  {student.subject_names?.length > 0 && (
                    <span className="mt-1 block text-xs text-[#80868b]">
                      Current subjects: {student.subject_names.join(", ")}
                    </span>
                  )}
                </span>
              </label>
            ))}

            {filteredStudents.length === 0 && (
              <div className="rounded-[20px] border border-dashed border-[#dadce0] bg-[#f8f9fa] px-4 py-10 text-center text-[#5f6368] sm:col-span-2">
                {students.length === 0
                  ? "No students are registered yet. You can still create the subject with no enrolled students."
                  : "No students match the search."}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-[#e3e3e3] bg-[#f8f9fa] px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={closeModal}
            disabled={addingSubject}
            className="rounded-full border border-[#dadce0] bg-white px-5 py-2.5 font-medium text-[#3c4043] hover:bg-[#f1f3f4] disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={createSubject}
            disabled={addingSubject}
            className="rounded-full bg-[#1a73e8] px-5 py-2.5 font-medium text-white hover:bg-[#1765cc] disabled:cursor-not-allowed disabled:bg-[#dadce0] disabled:text-[#80868b]"
          >
            {addingSubject
              ? "Creating Subject..."
              : `Create Subject (${selectedIds.length} Students)`}
          </button>
        </div>
      </div>
    </div>
  );
}

function SidebarButton({
  active = false,
  label,
  badge,
  collapsed = false,
  tone = "blue",
  onClick,
}) {
  const tones = {
    blue: {
      active: "bg-[#4285f4] text-white",
      icon: "bg-[#4285f4] text-white",
      hover: "hover:bg-[#4285f4] hover:text-white",
    },
    red: {
      active: "bg-[#ea4335] text-white",
      icon: "bg-[#ea4335] text-white",
      hover: "hover:bg-[#f1f3f4] hover:text-[#c5221f]",
    },
    green: {
      active: "bg-[#34a853] text-white",
      icon: "bg-[#34a853] text-white",
      hover: "hover:bg-[#f1f3f4] hover:text-[#137333]",
    },
    yellow: {
      active: "bg-[#fbbc04] text-[#202124]",
      icon: "bg-[#fbbc04] text-[#202124]",
      hover: "hover:bg-[#f1f3f4] hover:text-[#7a5b00]",
    },
  };

  const selectedTone = tones[tone] ?? tones.blue;

  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      aria-label={label}
      className={`group flex w-full items-center rounded-[18px] py-2.5 text-sm font-semibold transition ${
        collapsed ? "justify-center px-2" : "gap-3 px-3 text-left"
      } ${
        active
          ? selectedTone.active
          : `text-[#5f6368] hover:bg-[#f1f3f4] ${selectedTone.hover}`
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] text-sm font-bold transition ${
          active
            ? selectedTone.icon
            : `${selectedTone.icon} group-hover:scale-105`
        }`}
      >
        {badge}
      </span>

      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

function SubmenuButton({ label, active = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-[14px] px-3 py-2.5 text-left text-sm transition ${
        active
          ? "bg-[#fbbc04] font-semibold text-[#202124]"
          : "text-[#5f6368] hover:bg-white hover:text-[#202124]"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full border ${
          active ? "bg-[#fbbc04]" : "bg-[#dadce0]"
        }`}
      />

      {label}
    </button>
  );
}

function AnalyticsCard({ title, value, description, tone = "blue" }) {
  const tones = {
    blue: {
      surface: "border-[#4285f4] border-2 bg-white",
      icon: "bg-[#4285f4] text-white",
      text: "text-[#174ea6]",
      symbol: "●",
    },
    red: {
      surface: "border-[#ea4335] border-2 bg-white",
      icon: "bg-[#ea4335] text-white",
      text: "text-[#c5221f]",
      symbol: "◆",
    },
    green: {
      surface: "border-[#34a853] border-2 bg-white",
      icon: "bg-[#34a853] text-white",
      text: "text-[#137333]",
      symbol: "▲",
    },
    yellow: {
      surface: "border-[#fbbc04] border-2 bg-white",
      icon: "bg-[#fbbc04] text-[#202124]",
      text: "text-[#7a5b00]",
      symbol: "■",
    },
  };

  const selectedTone = tones[tone] ?? tones.blue;

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border p-5 ${selectedTone.surface}`}
    >
      <div className="absolute -right-7 -top-7 h-24 w-24 rounded-full bg-[#f1f3f4]" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#5f6368]">{title}</p>

          <p
            className={`mt-3 text-3xl font-bold tracking-tight ${selectedTone.text}`}
          >
            {value}
          </p>
        </div>

        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg ${selectedTone.icon}`}
          aria-hidden="true"
        >
          {selectedTone.symbol}
        </span>
      </div>

      <p className="relative mt-3 text-sm leading-6 text-[#5f6368]">
        {description}
      </p>
    </div>
  );
}

function PerformanceBar({ label, range, count, percentage, barClass }) {
  return (
    <div className="rounded-[18px] border border-[#dadce0] bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <span className="font-medium text-[#3c4043]">{label}</span>
          <span className="ml-2 text-sm text-[#80868b]">{range}</span>
        </div>

        <span className="rounded-full bg-white px-3 py-1 text-sm text-[#5f6368]">
          {count} student
          {count === 1 ? "" : "s"} · {percentage.toFixed(1)}%
        </span>
      </div>

      <div className="h-3.5 w-full overflow-hidden rounded-full bg-[#f1f3f4]">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${barClass}`}
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}

function InsightList({
  title,
  students,
  type,
  onGenerateRecommendation,
  generatingRecommendationKey,
}) {
  const isRisk = type === "risk";
  const supportType = isRisk ? "intervention" : "enrichment";

  return (
    <div
      className={`rounded-[24px] border-2 bg-white p-4 ${
        isRisk ? "border-[#ea4335]" : "border-[#34a853]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-bold text-[#202124]">{title}</h4>

          <p className="mt-1 text-sm text-[#5f6368]">
            {students.length} student
            {students.length === 1 ? "" : "s"}
          </p>
        </div>

        <span
          className={`flex h-10 w-10 items-center justify-center rounded-[15px] text-lg text-white ${
            isRisk ? "bg-[#ea4335]" : "bg-[#34a853]"
          }`}
          aria-hidden="true"
        >
          {isRisk ? "!" : "★"}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {students.map((student) => {
          const requestKey = `${supportType}-${student.id}`;
          const isGenerating = generatingRecommendationKey === requestKey;
          const anotherRequestIsRunning =
            Boolean(generatingRecommendationKey) && !isGenerating;

          return (
            <div
              key={student.id}
              className="rounded-[18px] border border-[#dadce0] bg-white p-4"
            >
              <div className="flex justify-between gap-3">
                <span className="font-medium text-[#202124]">
                  {student.name}
                </span>

                <span
                  className={
                    isRisk
                      ? "font-bold text-[#c5221f]"
                      : "font-bold text-[#137333]"
                  }
                >
                  {student.averagePercentage.toFixed(1)}%
                </span>
              </div>

              <p className="mt-1 text-xs text-[#5f6368]">
                {student.section} · {student.assessmentCount} assessment
                {student.assessmentCount === 1 ? "" : "s"}
              </p>

              <button
                type="button"
                onClick={() => onGenerateRecommendation(student, supportType)}
                disabled={Boolean(generatingRecommendationKey)}
                className={`mt-3 w-full rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isRisk
                    ? "bg-[#ea4335] text-white hover:bg-[#d93025]"
                    : "bg-[#34a853] text-white hover:bg-[#188038]"
                }`}
              >
                {isGenerating
                  ? "Generating with Gemini..."
                  : anotherRequestIsRunning
                    ? "Gemini is processing another student..."
                    : isRisk
                      ? "Generate Targeted Intervention"
                      : "Generate Enrichment Activities"}
              </button>
            </div>
          );
        })}

        {students.length === 0 && (
          <div className="rounded-[18px] border border-dashed border-[#dadce0] bg-white p-5 text-center text-sm text-[#5f6368]">
            No students identified.
          </div>
        )}
      </div>
    </div>
  );
}

function AiRecommendationModal({ recommendation, error, closeModal }) {
  const plan = recommendation?.plan;
  const isIntervention = recommendation?.supportType === "intervention";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#202124]/55 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[32px] border border-[#e3e3e3] bg-white">
        <div
          className={`flex items-start justify-between gap-4 border-b border-t-8 border-[#dadce0] bg-white px-6 py-5 ${
            isIntervention ? "border-t-[#ea4335]" : "border-t-[#34a853]"
          }`}
        >
          <div>
            <div className="flex items-center gap-3">
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-[16px] text-xl font-bold text-white ${
                  isIntervention ? "bg-[#ea4335]" : "bg-[#34a853]"
                }`}
                aria-hidden="true"
              >
                {isIntervention ? "!" : "★"}
              </span>

              <div>
                <p
                  className={`text-sm font-semibold uppercase tracking-[0.16em] ${
                    isIntervention ? "text-[#c5221f]" : "text-[#137333]"
                  }`}
                >
                  Gemini Learning Support
                </p>

                <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#202124]">
                  {plan?.title || "Learning-Support Recommendation"}
                </h2>
              </div>
            </div>

            {recommendation?.student && (
              <p className="mt-3 text-sm text-[#5f6368]">
                {recommendation.student.name} · Grade{" "}
                {recommendation.student.grade} ·{" "}
                {recommendation.student.section} · {recommendation.focusLabel}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {recommendation?.savedInsight?.pdfUrl && (
              <a
                href={`${API_URL}${recommendation.savedInsight.pdfUrl}`}
                className="rounded-full bg-[#1a73e8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1765cc]"
              >
                Download PDF
              </a>
            )}

            <button
              type="button"
              onClick={closeModal}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-2xl leading-none text-[#5f6368] transition hover:bg-[#f8f9fa] hover:text-[#202124]"
              aria-label="Close recommendation"
            >
              ×
            </button>
          </div>
        </div>

        <div className="max-h-[calc(92vh-112px)] overflow-y-auto px-6 py-6">
          {error ? (
            <div className="rounded-[22px] border border-[#ea4335] bg-white p-5 text-[#c5221f]">
              <h3 className="font-bold">
                Recommendation could not be generated
              </h3>

              <p className="mt-2 text-sm">{error}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {recommendation?.savedInsight && (
                <div className="rounded-[20px] border border-l-8 border-[#fbbc04] bg-white p-4 text-sm text-[#7a5b00]">
                  This insight was saved automatically on{" "}
                  {formatSavedDate(recommendation.savedInsight.createdAt)}. Use
                  the Download PDF button to save a copy outside EduLITE.
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <RecommendationMetric
                  label="Classification"
                  value={recommendation?.classification || "—"}
                  tone={isIntervention ? "red" : "green"}
                />

                <RecommendationMetric
                  label="Focus Average"
                  value={formatPercentage(
                    recommendation?.analytics?.focusAveragePercentage,
                  )}
                  tone="yellow"
                />

                <RecommendationMetric
                  label="Section Average"
                  value={formatPercentage(
                    recommendation?.analytics?.sectionComparison
                      ?.sectionAveragePercentage,
                  )}
                  tone="blue"
                />

                <RecommendationMetric
                  label="Recent Trend"
                  value={recommendation?.analytics?.recentTrend?.label || "—"}
                  tone="green"
                />
              </div>

              {plan?.overview && (
                <RecommendationSection title="Overview">
                  <div className="rounded-[22px] border border-[#e3e3e3] bg-[#f8f9fa] p-5">
                    <p className="leading-7 text-[#3c4043]">{plan.overview}</p>
                  </div>
                </RecommendationSection>
              )}

              {plan?.evidence?.length > 0 && (
                <RecommendationSection title="Evidence Used">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {plan.evidence.map((item, index) => (
                      <div
                        key={`${item.observation}-${index}`}
                        className="rounded-[22px] border border-l-4 border-[#4285f4] bg-white p-4"
                      >
                        <p className="font-semibold text-[#174ea6]">
                          {item.observation}
                        </p>

                        <p className="mt-2 text-sm text-[#5f6368]">
                          {item.dataPoint}
                        </p>
                      </div>
                    ))}
                  </div>
                </RecommendationSection>
              )}

              {plan?.targetedInterventions?.length > 0 && (
                <RecommendationSection title="Suggested Targeted Interventions">
                  <div className="space-y-4">
                    {plan.targetedInterventions.map((intervention, index) => (
                      <div
                        key={`${intervention.title}-${index}`}
                        className="rounded-[24px] border border-l-4 border-[#ea4335] bg-white p-5"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ea4335] font-bold text-white">
                            {index + 1}
                          </span>

                          <div>
                            <h4 className="text-lg font-bold text-[#202124]">
                              {intervention.title}
                            </h4>

                            <p className="mt-2 text-sm leading-6 text-[#3c4043]">
                              {intervention.rationale}
                            </p>
                          </div>
                        </div>

                        {intervention.actions?.length > 0 && (
                          <ul className="mt-4 list-disc space-y-1 pl-7 text-sm text-[#3c4043]">
                            {intervention.actions.map((action, actionIndex) => (
                              <li key={`${action}-${actionIndex}`}>{action}</li>
                            ))}
                          </ul>
                        )}

                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                          <PlanDetail
                            label="Suggested schedule"
                            value={intervention.schedule}
                          />

                          <PlanDetail
                            label="Success indicator"
                            value={intervention.successIndicator}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </RecommendationSection>
              )}

              {plan?.enrichmentActivities?.length > 0 && (
                <RecommendationSection title="Recommended Enrichment Activities">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {plan.enrichmentActivities.map((activity, index) => (
                      <div
                        key={`${activity.title}-${index}`}
                        className="rounded-[24px] border border-l-4 border-[#34a853] bg-white p-5"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#34a853] font-bold text-white">
                            {index + 1}
                          </span>

                          <div>
                            <h4 className="text-lg font-bold text-[#202124]">
                              {activity.title}
                            </h4>

                            <p className="mt-2 text-sm leading-6 text-[#3c4043]">
                              {activity.description}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 space-y-3">
                          <PlanDetail
                            label="Implementation"
                            value={activity.implementation}
                          />

                          <PlanDetail
                            label="Expected outcome"
                            value={activity.expectedOutcome}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </RecommendationSection>
              )}

              {plan?.monitoringPlan?.length > 0 && (
                <RecommendationSection title="Progress Monitoring">
                  <div className="overflow-x-auto rounded-[22px] border border-l-4 border-[#fbbc04] bg-white">
                    <table className="w-full min-w-[700px]">
                      <thead className="border-b border-[#fbbc04] bg-white/55">
                        <tr>
                          <TableHeading>Metric</TableHeading>
                          <TableHeading>Frequency</TableHeading>
                          <TableHeading>Target</TableHeading>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-[#fbbc04]">
                        {plan.monitoringPlan.map((item, index) => (
                          <tr key={`${item.metric}-${index}`}>
                            <td className="px-6 py-4 text-[#3c4043]">
                              {item.metric}
                            </td>

                            <td className="px-6 py-4 text-[#3c4043]">
                              {item.frequency}
                            </td>

                            <td className="px-6 py-4 text-[#3c4043]">
                              {item.target}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </RecommendationSection>
              )}

              {plan?.teacherNotes?.length > 0 && (
                <RecommendationSection title="Teacher Notes">
                  <div className="rounded-[22px] border border-l-4 border-[#4285f4] bg-white p-5">
                    <ul className="list-disc space-y-2 pl-5 text-[#3c4043]">
                      {plan.teacherNotes.map((note, index) => (
                        <li key={`${note}-${index}`}>{note}</li>
                      ))}
                    </ul>
                  </div>
                </RecommendationSection>
              )}

              <div className="rounded-[22px] border border-[#dadce0] bg-[#f1f3f4] p-4 text-sm leading-6 text-[#3c4043]">
                Gemini recommendations are generated from recorded academic data
                only. Review them using your professional judgment and knowledge
                of the learner before applying them.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecommendationMetric({ label, value, tone = "blue" }) {
  const tones = {
    blue: "border-[#4285f4] bg-[#4285f4] text-white",
    red: "border-[#ea4335] bg-[#ea4335] text-white",
    green: "border-[#34a853] bg-[#34a853] text-white",
    yellow: "border-[#fbbc04] bg-[#fbbc04] text-[#202124]",
  };

  const selectedTone = tones[tone] ?? tones.blue;

  return (
    <div className={`rounded-[22px] border p-4 ${selectedTone}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
        {label}
      </p>

      <p className="mt-2 text-lg font-bold tracking-tight">{value}</p>
    </div>
  );
}

function RecommendationSection({ title, children }) {
  return (
    <section>
      <h3 className="mb-3 text-xl font-bold text-[#202124]">{title}</h3>
      {children}
    </section>
  );
}

function PlanDetail({ label, value }) {
  return (
    <div className="rounded-[16px] border border-[#dadce0] bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#5f6368]">
        {label}
      </p>

      <p className="mt-1 text-sm leading-6 text-[#3c4043]">{value || "—"}</p>
    </div>
  );
}

function formatPercentage(value) {
  return value === null || value === undefined
    ? "—"
    : `${Number(value).toFixed(1)}%`;
}

function formatSavedDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value || "Unknown date";
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function TableHeading({ children, align = "left" }) {
  return (
    <th
      className={`px-6 py-4 text-xs font-semibold uppercase tracking-wide text-[#5f6368] ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}