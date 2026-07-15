import {
  useEffect,
  useMemo,
  useState
} from "react";

import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:3000";


export default function AssessmentForm() {
  const [students, setStudents] =
    useState([]);

  const [scores, setScores] =
    useState({});

  const [formData, setFormData] =
    useState({
      name: "",
      type: "Major Exam",
      date: "",
      total_items: ""
    });

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const navigate = useNavigate();


  useEffect(() => {
    const user =
      localStorage.getItem("user");

    if (!user) {
      navigate("/");
      return;
    }

    fetchStudents();

  }, [navigate]);


  const fetchStudents = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get(
        `${API_URL}/students`
      );

      setStudents(response.data);

    } catch (error) {
      console.error(
        "Error loading students:",
        error
      );

      setError(
        error.response?.data?.message ||
        "Unable to load registered students."
      );

    } finally {
      setLoading(false);
    }
  };


  /*
    Group the registered students
    according to their section.
  */
  const studentsBySection =
    useMemo(() => {
      return students.reduce(
        (groups, student) => {
          const sectionName =
            student.section ||
            "No Section";

          if (!groups[sectionName]) {
            groups[sectionName] = [];
          }

          groups[sectionName].push(
            student
          );

          return groups;
        },
        {}
      );

    }, [students]);


  const handleInputChange = (
    event
  ) => {
    const {
      name,
      value
    } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value
    }));
  };


  const handleScoreChange = (
    studentId,
    value
  ) => {
    setScores((currentScores) => ({
      ...currentScores,

      /*
        The student's ID is used as the
        key, ensuring that the score is
        connected to the correct student.
      */
      [studentId]: value
    }));
  };


  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");

    const totalItems =
      Number(formData.total_items);

    if (
      !Number.isInteger(totalItems) ||
      totalItems <= 0
    ) {
      setError(
        "Total assessment items must be a positive whole number."
      );

      return;
    }

    const scoreList = [];

    for (const student of students) {
      const enteredScore =
        scores[student.id];

      if (
        enteredScore === "" ||
        enteredScore === undefined ||
        enteredScore === null
      ) {
        continue;
      }

      const numericScore =
        Number(enteredScore);

      if (
        !Number.isInteger(numericScore) ||
        numericScore < 0 ||
        numericScore > totalItems
      ) {
        setError(
          `${student.name}'s score must be between 0 and ${totalItems}.`
        );

        return;
      }

      /*
        This is the data sent to the
        backend.

        The backend stores:
        student_id + assessment_id + score
      */
      scoreList.push({
        student_id: student.id,
        score: numericScore
      });
    }

    setSaving(true);

    try {
      await axios.post(
        `${API_URL}/assessments`,
        {
          name: formData.name.trim(),
          type: formData.type,
          date: formData.date,
          total_items: totalItems,
          scores: scoreList
        }
      );

      navigate("/dashboard");

    } catch (error) {
      console.error(
        "Error saving assessment:",
        error
      );

      setError(
        error.response?.data?.message ||
        "Unable to save the assessment."
      );

    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto">

        <div className="mb-6">
          <button
            type="button"
            onClick={() =>
              navigate("/dashboard")
            }
            className="
              text-blue-600
              hover:text-blue-700
              font-medium
            "
          >
            ← Back to Dashboard
          </button>
        </div>


        <div
          className="
            bg-white
            border
            border-slate-200
            rounded-2xl
            shadow-lg
            overflow-hidden
          "
        >
          <div
            className="
              border-b
              border-slate-200
              px-6
              py-5
              md:px-8
            "
          >
            <h1
              className="
                text-2xl
                font-bold
                text-slate-900
              "
            >
              Add New Assessment
            </h1>

            <p
              className="
                text-slate-500
                text-sm
                mt-1
              "
            >
              Enter the assessment details
              and record the scores of the
              registered students.
            </p>
          </div>


          <div className="p-6 md:p-8">

            {error && (
              <div
                className="
                  mb-6
                  bg-red-50
                  border
                  border-red-200
                  text-red-700
                  p-4
                  rounded-lg
                "
              >
                {error}
              </div>
            )}


            {loading ? (
              <div
                className="
                  py-12
                  text-center
                  text-slate-500
                "
              >
                Loading registered students...
              </div>

            ) : (
              <form
                onSubmit={handleSubmit}
                className="space-y-8"
              >

                {/* ASSESSMENT DETAILS */}

                <section>
                  <h2
                    className="
                      text-lg
                      font-semibold
                      text-slate-900
                      mb-4
                    "
                  >
                    Assessment Details
                  </h2>

                  <div
                    className="
                      grid
                      grid-cols-1
                      md:grid-cols-2
                      gap-5
                    "
                  >
                    <div className="md:col-span-2">
                      <label
                        className="
                          block
                          text-slate-700
                          text-sm
                          font-medium
                          mb-2
                        "
                      >
                        Assessment Name

                        <span className="text-red-500">
                          {" "}*
                        </span>
                      </label>

                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={
                          handleInputChange
                        }
                        placeholder="e.g. First Quarter Examination"
                        className="
                          w-full
                          bg-white
                          border
                          border-slate-300
                          rounded-lg
                          px-4
                          py-3
                          text-slate-900
                          placeholder-slate-400
                          focus:outline-none
                          focus:ring-2
                          focus:ring-blue-500
                          focus:border-blue-500
                        "
                        required
                      />
                    </div>


                    <div>
                      <label
                        className="
                          block
                          text-slate-700
                          text-sm
                          font-medium
                          mb-2
                        "
                      >
                        Classification

                        <span className="text-red-500">
                          {" "}*
                        </span>
                      </label>

                      <select
                        name="type"
                        value={formData.type}
                        onChange={
                          handleInputChange
                        }
                        className="
                          w-full
                          bg-white
                          border
                          border-slate-300
                          rounded-lg
                          px-4
                          py-3
                          text-slate-900
                          focus:outline-none
                          focus:ring-2
                          focus:ring-blue-500
                          focus:border-blue-500
                        "
                        required
                      >
                        <option value="Major Exam">
                          Major Exam
                        </option>

                        <option value="Activity">
                          Activity
                        </option>

                        <option value="Quiz">
                          Quiz
                        </option>
                      </select>
                    </div>


                    <div>
                      <label
                        className="
                          block
                          text-slate-700
                          text-sm
                          font-medium
                          mb-2
                        "
                      >
                        Date

                        <span className="text-red-500">
                          {" "}*
                        </span>
                      </label>

                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={
                          handleInputChange
                        }
                        className="
                          w-full
                          bg-white
                          border
                          border-slate-300
                          rounded-lg
                          px-4
                          py-3
                          text-slate-900
                          focus:outline-none
                          focus:ring-2
                          focus:ring-blue-500
                          focus:border-blue-500
                        "
                        required
                      />
                    </div>


                    <div>
                      <label
                        className="
                          block
                          text-slate-700
                          text-sm
                          font-medium
                          mb-2
                        "
                      >
                        Total Assessment Items

                        <span className="text-red-500">
                          {" "}*
                        </span>
                      </label>

                      <input
                        type="number"
                        name="total_items"
                        min="1"
                        step="1"
                        value={
                          formData.total_items
                        }
                        onChange={
                          handleInputChange
                        }
                        placeholder="e.g. 50"
                        className="
                          w-full
                          bg-white
                          border
                          border-slate-300
                          rounded-lg
                          px-4
                          py-3
                          text-slate-900
                          placeholder-slate-400
                          focus:outline-none
                          focus:ring-2
                          focus:ring-blue-500
                          focus:border-blue-500
                        "
                        required
                      />
                    </div>
                  </div>
                </section>


                <hr className="border-slate-200" />


                {/* SCORES BY SECTION */}

                <section>
                  <h2
                    className="
                      text-lg
                      font-semibold
                      text-slate-900
                    "
                  >
                    Registered Student Scores
                  </h2>

                  <p
                    className="
                      text-slate-500
                      text-sm
                      mt-1
                      mb-5
                    "
                  >
                    Each score is saved using
                    the registered student's ID.
                    A score may be left blank.
                  </p>


                  <div className="space-y-6">
                    {Object.entries(
                      studentsBySection
                    ).map(
                      ([
                        sectionName,
                        sectionStudents
                      ]) => (
                        <div
                          key={sectionName}
                          className="
                            border
                            border-slate-200
                            rounded-xl
                            overflow-hidden
                          "
                        >
                          <div
                            className="
                              bg-slate-50
                              border-b
                              border-slate-200
                              px-5
                              py-3
                            "
                          >
                            <h3
                              className="
                                font-semibold
                                text-slate-900
                              "
                            >
                              Section {sectionName}
                            </h3>

                            <p
                              className="
                                text-slate-500
                                text-sm
                              "
                            >
                              {
                                sectionStudents.length
                              }
                              {" registered student"}
                              {
                                sectionStudents.length ===
                                1
                                  ? ""
                                  : "s"
                              }
                            </p>
                          </div>


                          <div className="overflow-x-auto">
                            <table
                              className="
                                w-full
                                min-w-[650px]
                              "
                            >
                              <thead
                                className="
                                  bg-white
                                  border-b
                                  border-slate-200
                                "
                              >
                                <tr>
                                  <th
                                    className="
                                      text-left
                                      text-xs
                                      font-semibold
                                      uppercase
                                      tracking-wide
                                      text-slate-600
                                      px-5
                                      py-3
                                    "
                                  >
                                    Student
                                  </th>

                                  <th
                                    className="
                                      text-left
                                      text-xs
                                      font-semibold
                                      uppercase
                                      tracking-wide
                                      text-slate-600
                                      px-5
                                      py-3
                                    "
                                  >
                                    Grade
                                  </th>

                                  <th
                                    className="
                                      text-left
                                      text-xs
                                      font-semibold
                                      uppercase
                                      tracking-wide
                                      text-slate-600
                                      px-5
                                      py-3
                                    "
                                  >
                                    Score
                                  </th>
                                </tr>
                              </thead>


                              <tbody
                                className="
                                  divide-y
                                  divide-slate-200
                                "
                              >
                                {sectionStudents.map(
                                  (student) => (
                                    <tr
                                      key={student.id}
                                      className="
                                        hover:bg-slate-50
                                      "
                                    >
                                      <td
                                        className="
                                          px-5
                                          py-4
                                          text-slate-900
                                          font-medium
                                        "
                                      >
                                        {student.name}
                                      </td>

                                      <td
                                        className="
                                          px-5
                                          py-4
                                          text-slate-600
                                        "
                                      >
                                        {student.grade}
                                      </td>

                                      <td
                                        className="
                                          px-5
                                          py-4
                                        "
                                      >
                                        <div
                                          className="
                                            flex
                                            items-center
                                            gap-2
                                          "
                                        >
                                          <input
                                            type="number"
                                            min="0"
                                            max={
                                              formData.total_items ||
                                              undefined
                                            }
                                            step="1"
                                            value={
                                              scores[
                                                student.id
                                              ] ?? ""
                                            }
                                            onChange={(
                                              event
                                            ) =>
                                              handleScoreChange(
                                                student.id,
                                                event
                                                  .target
                                                  .value
                                              )
                                            }
                                            placeholder="Score"
                                            className="
                                              w-28
                                              bg-white
                                              border
                                              border-slate-300
                                              rounded-lg
                                              px-3
                                              py-2
                                              text-slate-900
                                              focus:outline-none
                                              focus:ring-2
                                              focus:ring-blue-500
                                              focus:border-blue-500
                                            "
                                          />

                                          <span
                                            className="
                                              text-slate-500
                                            "
                                          >
                                            /
                                            {" "}
                                            {
                                              formData.total_items ||
                                              "?"
                                            }
                                          </span>
                                        </div>
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )
                    )}


                    {students.length === 0 && (
                      <div
                        className="
                          border
                          border-slate-200
                          bg-slate-50
                          rounded-xl
                          p-10
                          text-center
                          text-slate-500
                        "
                      >
                        No registered students
                        were found.
                      </div>
                    )}
                  </div>
                </section>


                <div
                  className="
                    flex
                    flex-col
                    sm:flex-row
                    gap-3
                  "
                >
                  <button
                    type="submit"
                    disabled={saving}
                    className="
                      flex-1
                      bg-green-600
                      hover:bg-green-700
                      disabled:bg-green-300
                      disabled:cursor-not-allowed
                      text-white
                      font-semibold
                      py-3
                      rounded-lg
                      shadow-sm
                      transition
                    "
                  >
                    {saving
                      ? "Saving..."
                      : "Save Assessment and Scores"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      navigate("/dashboard")
                    }
                    className="
                      flex-1
                      bg-slate-600
                      hover:bg-slate-700
                      text-white
                      font-semibold
                      py-3
                      rounded-lg
                      shadow-sm
                      transition
                    "
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}