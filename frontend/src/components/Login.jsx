import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:3000";
const APPLE_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif';

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
    <div
      className="edulite-ios-corners min-h-screen bg-[#F2F2F7] text-[#1C1C1E]"
      style={{ fontFamily: APPLE_FONT }}
    >
      <style>{`
        .edulite-ios-corners [class*="rounded-["]:not(.rounded-full) {
          corner-shape: squircle;
        }

        .login-glass {
          background: rgba(255, 255, 255, 0.72);
          -webkit-backdrop-filter: blur(28px) saturate(180%);
          backdrop-filter: blur(28px) saturate(180%);
          box-shadow:
            0 24px 70px rgba(60, 60, 67, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }

        .edulite-ios-corners button {
          transition:
            transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1),
            box-shadow 220ms ease,
            background-color 220ms ease,
            color 220ms ease,
            opacity 220ms ease,
            filter 220ms ease;
          will-change: transform;
        }

        .edulite-ios-corners button:not(:disabled):hover {
          transform: translateY(-1px) scale(1.01);
          filter: brightness(1.025);
        }

        .edulite-ios-corners button:not(:disabled):active {
          transform: translateY(0) scale(0.97);
          transition-duration: 90ms;
        }

        .edulite-ios-corners input {
          transition:
            border-color 220ms ease,
            box-shadow 220ms ease,
            background-color 220ms ease,
            transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .edulite-ios-corners input:focus {
          transform: translateY(-1px);
        }

        .login-panel-enter {
          animation: login-panel-in 560ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }

        @keyframes login-panel-in {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .edulite-ios-corners *,
          .edulite-ios-corners *::before,
          .edulite-ios-corners *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
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

            <section className="login-glass login-panel-enter overflow-hidden rounded-[32px]">
              <div className="border-b border-[#E5E5EA] px-6 py-6 sm:px-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#007AFF]">
                      EduLITE Account
                    </p>

                    <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#1C1C1E]">
                      {isLoginMode ? "Welcome back" : "Create your account"}
                    </h1>

                    <p className="mt-2 max-w-md text-sm leading-6 text-[#636366]">
                      {isLoginMode
                        ? "Sign in to manage students, assessments, learning records, and Gemini insights."
                        : "Register an EduLITE account to begin managing student learning records."}
                    </p>
                  </div>

                  <span
                    className={`hidden h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold sm:flex ${
                      isLoginMode
                        ? "bg-[#007AFF] text-white"
                        : "bg-[#34C759] text-white"
                    }`}
                    aria-hidden="true"
                  >
                    {isLoginMode ? "L" : "+"}
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-2 rounded-full border border-[#E5E5EA] bg-[#f1f3f4] p-1">
                  <ModeButton
                    active={isLoginMode}
                    label="Sign In"
                    activeClassName="bg-[#007AFF] text-white"
                    onClick={() => {
                      if (!isLoginMode) {
                        switchMode();
                      }
                    }}
                  />

                  <ModeButton
                    active={!isLoginMode}
                    label="Register"
                    activeClassName="bg-[#34C759] text-white"
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
                    className="mb-6 rounded-[18px] bg-[#FF3B30]/10 p-4 text-sm font-medium text-[#D70015]"
                  >
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="username"
                      className="mb-2 block text-sm font-semibold text-[#3A3A3C]"
                    >
                      Username
                    </label>

                    <div className="relative">
                      <span
                        className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center text-sm font-bold text-[#007AFF]"
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
                        className="w-full rounded-[16px] border border-[#E5E5EA] bg-white py-3.5 pl-12 pr-4 text-[#1C1C1E] placeholder-[#8E8E93] outline-none transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/20 disabled:cursor-not-allowed disabled:bg-[#f1f3f4]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="mb-2 block text-sm font-semibold text-[#3A3A3C]"
                    >
                      Password
                    </label>

                    <div className="relative">
                      <span
                        className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center text-sm font-bold text-[#34C759]"
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
                        className="w-full rounded-[16px] border border-[#E5E5EA] bg-white py-3.5 pl-12 pr-20 text-[#1C1C1E] placeholder-[#8E8E93] outline-none transition focus:border-[#34C759] focus:ring-4 focus:ring-[#34C759]/20 disabled:cursor-not-allowed disabled:bg-[#f1f3f4]"
                        required
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword((currentValue) => !currentValue)
                        }
                        disabled={submitting}
                        className="absolute inset-y-0 right-0 flex items-center px-4 text-xs font-semibold text-[#0051D5] transition hover:text-[#007AFF] disabled:cursor-not-allowed disabled:text-[#8E8E93]"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  {!isLoginMode && (
                  <div className="rounded-[18px] bg-[#FFCC00]/15 p-4 text-sm leading-6 text-[#8A5A00]">
                      Your username will be used to sign in to EduLITE. Choose a
                      password that is difficult for other people to guess.
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className={`w-full rounded-full px-6 py-3.5 font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-[#E5E5EA] disabled:text-[#8E8E93] ${
                      isLoginMode
                        ? "bg-[#007AFF] hover:bg-[#0051D5]"
                        : "bg-[#34C759] hover:bg-[#248A3D]"
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
                  <div className="h-px flex-1 bg-[#E5E5EA]" />

                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8E8E93]">
                    EduLITE
                  </span>

                  <div className="h-px flex-1 bg-[#E5E5EA]" />
                </div>

                <p className="text-center text-sm text-[#636366]">
                  {isLoginMode
                    ? "Don't have an account?"
                    : "Already have an account?"}{" "}
                  <button
                    type="button"
                    onClick={switchMode}
                    disabled={submitting}
                    className={`font-semibold transition disabled:cursor-not-allowed disabled:text-[#8E8E93] ${
                      isLoginMode
                        ? "text-[#248A3D] hover:text-[#248A3D]"
                        : "text-[#0051D5] hover:text-[#007AFF]"
                    }`}
                  >
                    {isLoginMode ? "Create one" : "Sign in instead"}
                  </button>
                </p>
              </div>
            </section>

            <p className="mt-5 text-center text-xs leading-5 text-[#8E8E93]">
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
    <aside className="relative hidden min-h-screen overflow-hidden bg-[#1C1C1E] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
      <img
        src="/hero.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/72 via-black/45 to-black/20" />

      <div className="relative">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-white/85 shadow-xl backdrop-blur-xl">
            <img
              src="/logo.png"
              alt="EduLITE logo"
              className="h-16 w-16 object-contain"
            />
          </div>

          <div>
            <p className="text-3xl font-bold tracking-tight text-white">
              EduLITE
            </p>

            <p className="mt-1 text-sm font-medium text-white/70">
              Teacher Workspace
            </p>
          </div>
        </div>

        <div className="mt-16 max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
            Learning Intelligence
          </p>

          <h2 className="mt-4 text-5xl font-bold leading-[1.08] tracking-tight text-white">
            Understand progress.
            <span className="block text-[#007AFF]">Support every learner.</span>
          </h2>

          <p className="mt-6 max-w-lg text-base leading-8 text-white/75">
            Manage student profiles, record assessment scores, review class
            analytics, and generate targeted learning-support recommendations
            in one workspace.
          </p>
        </div>

        <div className="mt-12 grid max-w-xl grid-cols-2 gap-4">
          <FeatureCard
            colorClassName="border-[#007AFF]"
            markerClassName="bg-[#007AFF]"
            title="Student Records"
            description="Keep academic information organized and accessible."
          />

          <FeatureCard
            colorClassName="border-[#34C759]"
            markerClassName="bg-[#34C759]"
            title="Performance Analytics"
            description="Review averages, passing rates, and learning needs."
          />

          <FeatureCard
            colorClassName="border-[#FFCC00]"
            markerClassName="bg-[#FFCC00]"
            title="Assessments"
            description="Create assessments and record student scores."
          />

          <FeatureCard
            colorClassName="border-[#FF3B30]"
            markerClassName="bg-[#FF3B30]"
            title="Gemini Insights"
            description="Generate interventions and enrichment activities."
          />
        </div>
      </div>

      <div className="relative flex items-center justify-between gap-4 border-t border-white/20 pt-6">
        <p className="text-sm text-white/75">
          {isLoginMode
            ? "Securely access your EduLITE workspace."
            : "Create your EduLITE account to get started."}
        </p>

        <div className="flex gap-2" aria-hidden="true">
          <span className="h-3 w-3 rounded-full bg-[#007AFF]" />
          <span className="h-3 w-3 rounded-full bg-[#FF3B30]" />
          <span className="h-3 w-3 rounded-full bg-[#FFCC00]" />
          <span className="h-3 w-3 rounded-full bg-[#34C759]" />
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
      className="rounded-[22px] bg-black/30 p-5 text-white shadow-lg backdrop-blur-xl"
    >
      <span
        className={`block h-3 w-3 rounded-full ${markerClassName}`}
        aria-hidden="true"
      />

      <h3 className="mt-4 font-bold text-white">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-white/70">{description}</p>
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
          : "text-[#636366] hover:bg-white hover:text-[#1C1C1E]"
      }`}
    >
      {label}
    </button>
  );
}