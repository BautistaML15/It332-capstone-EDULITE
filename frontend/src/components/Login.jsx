import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:3000";

export default function Login() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedName = name.trim();

    setError("");

    if (!trimmedName) {
      setError("Enter your username.");
      return;
    }

    if (!password) {
      setError("Enter your password.");
      return;
    }

    setSubmitting(true);

    const endpoint = isLoginMode ? "/login" : "/register";

    try {
      const response = await axios.post(`${API_URL}${endpoint}`, {
        name: trimmedName,
        password,
      });

      const user = response.data.user || {
        name: trimmedName,
      };

      localStorage.setItem("user", JSON.stringify(user));

      navigate("/dashboard");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to connect to the server.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = () => {
    if (submitting) {
      return;
    }

    setIsLoginMode((currentMode) => !currentMode);
    setError("");
    setPassword("");
    setShowPassword(false);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans text-[#202124]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
        <BrandPanel isLoginMode={isLoginMode} />

        <main className="flex items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-lg">
            <div className="mb-6 flex items-center justify-center lg:hidden">
              <img
                src="/logo.png"
                alt="EduLITE logo"
                className="h-28 w-28 object-contain"
              />
            </div>

            <section className="overflow-hidden rounded-[30px] border-2 border-[#1A2CA3] bg-white">
              <div className="border-b border-[#dadce0] px-6 py-6 sm:px-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1A2CA3]">
                      EduLITE Account
                    </p>

                    <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#202124]">
                      {isLoginMode ? "Welcome back" : "Create your account"}
                    </h1>

                    <p className="mt-2 max-w-md text-sm leading-6 text-[#5f6368]">
                      {isLoginMode
                        ? "Sign in to manage students, assessments, learning records, and Gemini insights."
                        : "Register an EduLITE account to begin managing student learning records."}
                    </p>
                  </div>

                  <span
                    className={`hidden h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold sm:flex ${
                      isLoginMode
                        ? "bg-[#4285f4] text-white"
                        : "bg-[#34a853] text-white"
                    }`}
                    aria-hidden="true"
                  >
                    {isLoginMode ? "L" : "+"}
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-2 rounded-full border border-[#dadce0] bg-[#f1f3f4] p-1">
                  <ModeButton
                    active={isLoginMode}
                    label="Sign In"
                    activeClassName="bg-[#4285f4] text-white"
                    onClick={() => {
                      if (!isLoginMode) {
                        switchMode();
                      }
                    }}
                  />

                  <ModeButton
                    active={!isLoginMode}
                    label="Register"
                    activeClassName="bg-[#34a853] text-white"
                    onClick={() => {
                      if (isLoginMode) {
                        switchMode();
                      }
                    }}
                  />
                </div>
              </div>

              <div className="px-6 py-6 sm:px-8 sm:py-8">
                {error && (
                  <div
                    role="alert"
                    className="mb-6 rounded-[18px] border border-l-8 border-[#ea4335] bg-white p-4 text-sm font-medium text-[#c5221f]"
                  >
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="username"
                      className="mb-2 block text-sm font-semibold text-[#3c4043]"
                    >
                      Username
                    </label>

                    <div className="relative">
                      <span
                        className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center text-sm font-bold text-[#4285f4]"
                        aria-hidden="true"
                      >
                        U
                      </span>

                      <input
                        id="username"
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Enter your username"
                        autoComplete="username"
                        disabled={submitting}
                        className="w-full rounded-[16px] border border-[#dadce0] bg-white py-3.5 pl-12 pr-4 text-[#202124] placeholder-[#80868b] outline-none transition focus:border-[#4285f4] focus:ring-4 focus:ring-[#4285f4]/20 disabled:cursor-not-allowed disabled:bg-[#f1f3f4]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="mb-2 block text-sm font-semibold text-[#3c4043]"
                    >
                      Password
                    </label>

                    <div className="relative">
                      <span
                        className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center text-sm font-bold text-[#34a853]"
                        aria-hidden="true"
                      >
                        P
                      </span>

                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter your password"
                        autoComplete={
                          isLoginMode ? "current-password" : "new-password"
                        }
                        disabled={submitting}
                        className="w-full rounded-[16px] border border-[#dadce0] bg-white py-3.5 pl-12 pr-20 text-[#202124] placeholder-[#80868b] outline-none transition focus:border-[#34a853] focus:ring-4 focus:ring-[#34a853]/20 disabled:cursor-not-allowed disabled:bg-[#f1f3f4]"
                        required
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword((currentValue) => !currentValue)
                        }
                        disabled={submitting}
                        className="absolute inset-y-0 right-0 flex items-center px-4 text-xs font-semibold text-[#174ea6] transition hover:text-[#1a73e8] disabled:cursor-not-allowed disabled:text-[#80868b]"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  {!isLoginMode && (
                    <div className="rounded-[18px] border border-l-8 border-[#fbbc04] bg-white p-4 text-sm leading-6 text-[#5f6368]">
                      Your username will be used to sign in to EduLITE. Choose a
                      password that is difficult for other people to guess.
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className={`w-full rounded-full px-6 py-3.5 font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-[#dadce0] disabled:text-[#80868b] ${
                      isLoginMode
                        ? "bg-[#1a73e8] hover:bg-[#1765cc]"
                        : "bg-[#34a853] hover:bg-[#188038]"
                    }`}
                  >
                    {submitting
                      ? isLoginMode
                        ? "Signing in..."
                        : "Creating account..."
                      : isLoginMode
                        ? "Sign In"
                        : "Create Account"}
                  </button>
                </form>

                <div className="my-7 flex items-center gap-4">
                  <div className="h-px flex-1 bg-[#dadce0]" />

                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#80868b]">
                    EduLITE
                  </span>

                  <div className="h-px flex-1 bg-[#dadce0]" />
                </div>

                <p className="text-center text-sm text-[#5f6368]">
                  {isLoginMode
                    ? "Don't have an account?"
                    : "Already have an account?"}{" "}
                  <button
                    type="button"
                    onClick={switchMode}
                    disabled={submitting}
                    className={`font-semibold transition disabled:cursor-not-allowed disabled:text-[#80868b] ${
                      isLoginMode
                        ? "text-[#137333] hover:text-[#188038]"
                        : "text-[#174ea6] hover:text-[#1a73e8]"
                    }`}
                  >
                    {isLoginMode ? "Create one" : "Sign in instead"}
                  </button>
                </p>
              </div>
            </section>

            <p className="mt-5 text-center text-xs leading-5 text-[#80868b]">
              EduLITE student performance analytics and learning-support
              workspace.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

function BrandPanel({ isLoginMode }) {
  return (
    <aside className="relative hidden min-h-screen overflow-hidden border-r border-[#dadce0] bg-white p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
      <div className="absolute left-0 top-0 h-3 w-full">
        <div className="grid h-full grid-cols-4">
          <div className="bg-[#4285f4]" />
          <div className="bg-[#ea4335]" />
          <div className="bg-[#fbbc04]" />
          <div className="bg-[#34a853]" />
        </div>
      </div>

      <div className="relative">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border-2 border-[#1A2CA3] bg-white">
            <img
              src="/logo.png"
              alt="EduLITE logo"
              className="h-16 w-16 object-contain"
            />
          </div>

          <div>
            <p className="text-3xl font-bold tracking-tight text-[#202124]">
              EduLITE
            </p>

            <p className="mt-1 text-sm font-medium text-[#5f6368]">
              Teacher Workspace
            </p>
          </div>
        </div>

        <div className="mt-16 max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1A2CA3]">
            Learning Intelligence
          </p>

          <h2 className="mt-4 text-5xl font-bold leading-[1.08] tracking-tight text-[#202124]">
            Understand progress.
            <span className="block text-[#4285f4]">Support every learner.</span>
          </h2>

          <p className="mt-6 max-w-lg text-base leading-8 text-[#5f6368]">
            Manage student profiles, record assessment scores, review class
            analytics, and generate targeted learning-support recommendations
            in one workspace.
          </p>
        </div>

        <div className="mt-12 grid max-w-xl grid-cols-2 gap-4">
          <FeatureCard
            colorClassName="border-[#4285f4]"
            markerClassName="bg-[#4285f4]"
            title="Student Records"
            description="Keep academic information organized and accessible."
          />

          <FeatureCard
            colorClassName="border-[#34a853]"
            markerClassName="bg-[#34a853]"
            title="Performance Analytics"
            description="Review averages, passing rates, and learning needs."
          />

          <FeatureCard
            colorClassName="border-[#fbbc04]"
            markerClassName="bg-[#fbbc04]"
            title="Assessments"
            description="Create assessments and record student scores."
          />

          <FeatureCard
            colorClassName="border-[#ea4335]"
            markerClassName="bg-[#ea4335]"
            title="Gemini Insights"
            description="Generate interventions and enrichment activities."
          />
        </div>
      </div>

      <div className="relative flex items-center justify-between gap-4 border-t border-[#dadce0] pt-6">
        <p className="text-sm text-[#5f6368]">
          {isLoginMode
            ? "Securely access your EduLITE workspace."
            : "Create your EduLITE account to get started."}
        </p>

        <div className="flex gap-2" aria-hidden="true">
          <span className="h-3 w-3 rounded-full bg-[#4285f4]" />
          <span className="h-3 w-3 rounded-full bg-[#ea4335]" />
          <span className="h-3 w-3 rounded-full bg-[#fbbc04]" />
          <span className="h-3 w-3 rounded-full bg-[#34a853]" />
        </div>
      </div>
    </aside>
  );
}

function FeatureCard({
  colorClassName,
  markerClassName,
  title,
  description,
}) {
  return (
    <article
      className={`rounded-[22px] border-2 bg-white p-5 ${colorClassName}`}
    >
      <span
        className={`block h-3 w-3 rounded-full ${markerClassName}`}
        aria-hidden="true"
      />

      <h3 className="mt-4 font-bold text-[#202124]">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-[#5f6368]">{description}</p>
    </article>
  );
}

function ModeButton({
  active,
  label,
  activeClassName,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? activeClassName
          : "text-[#5f6368] hover:bg-white hover:text-[#202124]"
      }`}
    >
      {label}
    </button>
  );
}