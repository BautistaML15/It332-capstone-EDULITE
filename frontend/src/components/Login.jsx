import { useEffect, useState } from "react";
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
  const [errorVisible, setErrorVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (!error) {
      setErrorVisible(false);
      return undefined;
    }

    setErrorVisible(true);

    const hideTimer = window.setTimeout(() => {
      setErrorVisible(false);
    }, 4800);

    const clearTimer = window.setTimeout(() => {
      setError("");
    }, 5150);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(clearTimer);
    };
  }, [error]);

  const showError = (message) => {
    setError("");

    window.requestAnimationFrame(() => {
      setError(message);
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedName = name.trim();

    setError("");

    if (!trimmedName) {
      showError("Enter your username.");
      return;
    }

    if (!password) {
      showError("Enter your password.");
      return;
    }

    setSubmitting(true);

    const endpoint = isLoginMode
      ? "/login"
      : "/register";

    try {
      const response = await axios.post(
        `${API_URL}${endpoint}`,
        {
          name: trimmedName,
          password,
        },
      );

      const user =
        response.data.user || {
          name: trimmedName,
        };

      /*
        Keep compatibility with the current EduLITE dashboard.

        If the backend returns a token, store it.
      */
      const token =
        response.data.token ??
        response.data.accessToken ??
        response.data.access_token ??
        null;

      if (token) {
        localStorage.setItem(
          "eduliteToken",
          token,
        );
      }

      localStorage.setItem(
        "user",
        JSON.stringify(user),
      );

      navigate("/dashboard");
    } catch (requestError) {
      showError(
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

    setIsLoginMode(
      (currentMode) => !currentMode,
    );

    setError("");
    setPassword("");
    setShowPassword(false);
  };

  const dismissError = () => {
    setErrorVisible(false);

    window.setTimeout(() => {
      setError("");
    }, 300);
  };

  return (
    <div
      className="edulite-login min-h-screen bg-white text-[#1C1C1E]"
      style={{
        fontFamily: APPLE_FONT,
      }}
    >
      <style>{`
        .edulite-login * {
          box-sizing: border-box;
        }

        .edulite-login {
          color-scheme: light;
          overflow-x: hidden;
        }

        .edulite-login button,
        .edulite-login input {
          font: inherit;
        }

        .edulite-login button {
          transition:
            transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1),
            background-color 180ms ease,
            color 180ms ease,
            border-color 180ms ease,
            opacity 180ms ease;
        }

        .edulite-login button:not(:disabled):active {
          transform: scale(0.98);
        }

        .edulite-login input {
          transition:
            border-color 180ms ease,
            box-shadow 180ms ease,
            background-color 180ms ease;
        }

        .edulite-login :where(button, input):focus-visible {
          outline: none;
          box-shadow: 0 0 0 4px rgba(0, 145, 255, 0.16);
        }

        .login-page-enter {
          animation:
            login-page-in
            520ms
            cubic-bezier(0.2, 0.8, 0.2, 1)
            both;
        }

        .login-form-enter {
          animation:
            login-form-in
            560ms
            cubic-bezier(0.2, 0.8, 0.2, 1)
            both;
        }

        .login-toast {
          transform:
            translateY(-10px)
            scale(0.98);

          opacity: 0;

          pointer-events: none;

          transition:
            transform
              300ms
              cubic-bezier(0.2, 0.8, 0.2, 1),
            opacity
              260ms
              ease;
        }

        .login-toast.is-visible {
          transform:
            translateY(0)
            scale(1);

          opacity: 1;

          pointer-events: auto;
        }

        @keyframes login-page-in {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @keyframes login-form-in {
          from {
            opacity: 0;

            transform:
              translateY(14px);
          }

          to {
            opacity: 1;

            transform:
              translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .edulite-login *,
          .edulite-login *::before,
          .edulite-login *::after {
            animation-duration:
              0.01ms !important;

            animation-iteration-count:
              1 !important;

            transition-duration:
              0.01ms !important;
          }
        }
      `}</style>

      {error && (
        <div
          className={`login-toast fixed right-4 top-4 z-50 w-[calc(100%-2rem)] max-w-[380px] rounded-[18px] border border-black/5 bg-white/90 p-4 shadow-[0_18px_50px_rgba(31,41,55,0.16)] backdrop-blur-[24px] sm:right-6 sm:top-6 ${
            errorVisible
              ? "is-visible"
              : ""
          }`}
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FF3B30] text-sm font-bold text-white">
              !
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#1C1C1E]">
                EduLITE
              </p>

              <p className="mt-0.5 text-sm leading-5 text-[#636366]">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={
                dismissError
              }
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg leading-none text-[#8E8E93] hover:bg-[#F2F2F7] hover:text-[#1C1C1E]"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <main className="login-page-enter relative min-h-screen">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-[-180px] top-[-220px] h-[520px] w-[520px] rounded-full bg-[#0091FF]/8 blur-3xl"
        />

        <div className="mx-auto grid min-h-screen w-full max-w-[1500px] grid-cols-1 lg:grid-cols-[1.08fr_0.92fr]">
          {/* LEFT SIDE */}
          <section className="relative flex min-h-[44vh] flex-col justify-between px-6 pb-10 pt-7 sm:px-10 sm:pb-14 sm:pt-10 lg:min-h-screen lg:px-16 lg:py-14 xl:px-24">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-[14px] border border-[#E5E5EA] bg-white">
                <img
                  src="/logo.png"
                  alt="EduLITE logo"
                  className="h-9 w-9 object-contain"
                />
              </div>

              <div>
                <p className="text-sm font-bold tracking-tight text-[#36454F]">
                  EduLITE
                </p>

                <p className="text-[11px] text-[#8E8E93]">
                  Teacher Workspace
                </p>
              </div>
            </div>

            <div className="max-w-[720px] py-12 lg:py-0">
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0091FF]">
                Student Learning Workspace
              </p>

              <h1 className="mt-5 text-[clamp(3.4rem,7vw,7.5rem)] font-bold leading-[0.84] tracking-[-0.065em] text-[#0091FF]">
                EduLITE:

                <span className="mt-2 block text-[#3AAAE8]">
                  The Current
                  <br />
                  State.
                </span>
              </h1>

              <p className="mt-7 max-w-lg text-base leading-7 text-[#636366] sm:text-lg sm:leading-8">
                A focused workspace for
                student records,
                assessment results,
                performance review,
                and learning support.
              </p>
            </div>

            <p className="hidden max-w-md text-xs leading-5 text-[#A1A1A6] lg:block">
              Built for clear academic
              records and teacher-guided
              decisions.
            </p>
          </section>

          {/* RIGHT SIDE */}
          <section className="flex items-center border-t border-[#ECEFF2] bg-[#FAFBFC] px-6 py-10 sm:px-10 lg:min-h-screen lg:border-l lg:border-t-0 lg:px-14 xl:px-20">
            <div className="login-form-enter mx-auto w-full max-w-[460px]">
              <div className="mb-10">
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#0091FF]">
                  {isLoginMode
                    ? "Welcome Back"
                    : "Create Account"}
                </p>

                <h2 className="mt-3 text-4xl font-bold tracking-[-0.04em] text-[#36454F] sm:text-5xl">
                  {isLoginMode
                    ? "Sign in."
                    : "Get started."}
                </h2>

                <p className="mt-3 max-w-md text-sm leading-6 text-[#7A7A7F]">
                  {isLoginMode
                    ? "Enter your EduLITE account details to continue."
                    : "Create an account to begin using the EduLITE workspace."}
                </p>
              </div>

              <div className="mb-7 inline-flex rounded-[13px] bg-[#ECEFF2] p-1">
                <ModeButton
                  active={
                    isLoginMode
                  }
                  label="Sign In"
                  onClick={() => {
                    if (
                      !isLoginMode
                    ) {
                      switchMode();
                    }
                  }}
                />

                <ModeButton
                  active={
                    !isLoginMode
                  }
                  label="Register"
                  onClick={() => {
                    if (
                      isLoginMode
                    ) {
                      switchMode();
                    }
                  }}
                />
              </div>

              <form
                onSubmit={
                  handleSubmit
                }
                className="space-y-5"
              >
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#3A3A3C]">
                    Username
                  </span>

                  <input
                    id="username"
                    type="text"
                    value={name}
                    onChange={(
                      event,
                    ) =>
                      setName(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Enter your username"
                    autoComplete="username"
                    disabled={
                      submitting
                    }
                    className="w-full rounded-[15px] border border-[#D9DDE2] bg-white px-4 py-3.5 text-base text-[#1C1C1E] placeholder-[#A1A1A6] outline-none focus:border-[#0091FF] disabled:cursor-not-allowed disabled:bg-[#F2F2F7]"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#3A3A3C]">
                    Password
                  </span>

                  <div className="relative">
                    <input
                      id="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={password}
                      onChange={(
                        event,
                      ) =>
                        setPassword(
                          event.target
                            .value,
                        )
                      }
                      placeholder="Enter your password"
                      autoComplete={
                        isLoginMode
                          ? "current-password"
                          : "new-password"
                      }
                      disabled={
                        submitting
                      }
                      className="w-full rounded-[15px] border border-[#D9DDE2] bg-white px-4 py-3.5 pr-20 text-base text-[#1C1C1E] placeholder-[#A1A1A6] outline-none focus:border-[#0091FF] disabled:cursor-not-allowed disabled:bg-[#F2F2F7]"
                      required
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (
                            currentValue,
                          ) =>
                            !currentValue,
                        )
                      }
                      disabled={
                        submitting
                      }
                      className="absolute inset-y-0 right-0 flex items-center px-4 text-xs font-semibold text-[#007AFF] disabled:cursor-not-allowed disabled:text-[#A1A1A6]"
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showPassword
                        ? "Hide"
                        : "Show"}
                    </button>
                  </div>
                </label>

                {!isLoginMode && (
                  <p className="text-xs leading-5 text-[#8E8E93]">
                    Your username will be
                    used when signing in.
                    Use a password that is
                    difficult for other
                    people to guess.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={
                    submitting
                  }
                  className="mt-2 w-full rounded-[15px] bg-[#0091FF] px-5 py-3.5 text-sm font-semibold text-white hover:bg-[#007AFF] disabled:cursor-not-allowed disabled:bg-[#C7C7CC]"
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

              <p className="mt-7 text-sm text-[#7A7A7F]">
                {isLoginMode
                  ? "New to EduLITE?"
                  : "Already have an EduLITE account?"}{" "}

                <button
                  type="button"
                  onClick={
                    switchMode
                  }
                  disabled={
                    submitting
                  }
                  className="font-semibold text-[#007AFF] hover:text-[#005FCC] disabled:cursor-not-allowed disabled:text-[#A1A1A6]"
                >
                  {isLoginMode
                    ? "Create an account"
                    : "Sign in"}
                </button>
              </p>

              <p className="mt-12 text-[11px] leading-5 text-[#A1A1A6]">
                EduLITE · Student
                performance and
                learning-support
                workspace
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function ModeButton({
  active,
  label,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-[10px] px-4 py-2 text-sm font-semibold ${
        active
          ? "bg-white text-[#1C1C1E] shadow-[0_1px_4px_rgba(31,41,55,0.08)]"
          : "text-[#8E8E93] hover:text-[#3A3A3C]"
      }`}
    >
      {label}
    </button>
  );
}