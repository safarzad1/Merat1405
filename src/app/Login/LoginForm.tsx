"use client";

import { useEffect, useMemo, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Login } from "@/services/ApiService";
import styles from "./Login.module.css";

type CaptchaState = {
  first: number;
  second: number;
};

type LoginResult = {
  status?: number;
  message?: string;
  data?: Record<string, unknown>;
};


type AuthFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "size"> & {
  label: string;
  icon: ReactNode;
  containerClassName?: string;
  error?: string;
};

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
      {crossed ? <path d="m4 4 16 16" /> : null}
    </svg>
  );
}

function AuthField({
  id,
  name,
  label,
  icon,
  containerClassName = "",
  error,
  type = "text",
  ...inputProps
}: AuthFieldProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword && passwordVisible ? "text" : type;
  const inputId = id ?? name;

  return (
    <div className={`${styles.authField} ${containerClassName}`}>
      <label htmlFor={inputId}>{label}</label>
      <div className={`${styles.authInputWrap} ${error ? styles.authInputWrapError : ""}`}>
        <span className={styles.authIcon}>{icon}</span>
        <input
          {...inputProps}
          id={inputId}
          name={name}
          type={resolvedType}
          className={styles.authInput}
          aria-invalid={Boolean(error)}
          aria-describedby={error && inputId ? `${inputId}-error` : undefined}
        />
        {isPassword ? (
          <button
            className={styles.authAction}
            type="button"
            onClick={() => setPasswordVisible((value) => !value)}
            aria-label={passwordVisible ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"}
            tabIndex={-1}
          >
            <EyeIcon crossed={!passwordVisible} />
          </button>
        ) : null}
      </div>
      {error ? (
        <small id={inputId ? `${inputId}-error` : undefined} className={styles.authErrorText}>
          {error}
        </small>
      ) : null}
    </div>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="10" width="16" height="11" rx="2.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M18.5 10A7 7 0 0 0 6 7l-2 3M5.5 14A7 7 0 0 0 18 17l2-3" />
    </svg>
  );
}

function toPersianDigits(value: string | number) {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function cleanServerMessage(message?: string) {
  return (message || "ورود انجام نشد.").replace(/^\s*❌\s*/, "").trim();
}

export default function LoginForm() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captcha, setCaptcha] = useState<CaptchaState | null>(null);
  const [clientIp, setClientIp] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ userName?: string; password?: string; captcha?: string }>({});
  const [loading, setLoading] = useState(false);

  function refreshCaptcha() {
    setCaptcha({
      first: Math.floor(Math.random() * 8) + 1,
      second: Math.floor(Math.random() * 8) + 1,
    });
    setCaptchaAnswer("");
    setFieldErrors((current) => ({ ...current, captcha: undefined }));
  }

  useEffect(() => {
    refreshCaptcha();

    let active = true;
    fetch("/Api/GetIP", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { ip?: string | null }) => {
        if (active) setClientIp(result?.ip ?? "");
      })
      .catch(() => {
        if (active) setClientIp("");
      });

    return () => {
      active = false;
    };
  }, []);

  const captchaText = useMemo(() => {
    if (!captcha) return "...";
    return `${toPersianDigits(captcha.first)}  +  ${toPersianDigits(captcha.second)}  =  ؟`;
  }, [captcha]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const nextErrors: { userName?: string; password?: string; captcha?: string } = {};
    const normalizedUserName = normalizeDigits(userName).trim();
    const normalizedCaptcha = normalizeDigits(captchaAnswer).trim();

    if (!normalizedUserName) nextErrors.userName = "شماره ملی الزامی است.";
    if (!password.trim()) nextErrors.password = "رمز عبور الزامی است.";
    if (!normalizedCaptcha) nextErrors.captcha = "کد امنیتی الزامی است.";

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError("");
      return;
    }

    if (!captcha || Number(normalizedCaptcha) !== captcha.first + captcha.second) {
      setFieldErrors({ captcha: "پاسخ کد امنیتی صحیح نیست." });
      setError("");
      refreshCaptcha();
      return;
    }

    setLoading(true);
    setError("");
    setFieldErrors({});

    try {
      const result = (await Login(normalizedUserName, password, clientIp)) as LoginResult;

      if (result?.status === 200) {
        try {
          if (result.data) localStorage.setItem("merat-user", JSON.stringify(result.data));
        } catch {
          // Login must not fail when browser storage is unavailable.
        }
        router.replace("/Dashboard");
        router.refresh();
        return;
      }

      const message = cleanServerMessage(result?.message);
      if (result?.status === 201) {
        setFieldErrors({ password: message });
      } else if (result?.status === 202 || result?.status === 203 || result?.status === 404) {
        setFieldErrors({ userName: message });
      } else {
        setError(message || "ارتباط با سرور امکان‌پذیر نیست.");
      }
      refreshCaptcha();
    } catch {
      setError("خطا در ارتباط با سرور. لطفاً دوباره تلاش کنید.");
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <AuthField
        id="userName"
        name="userName"
        label="شماره ملی"
        icon={<UserIcon />}
        value={userName}
        onChange={(event) => {
          const value = normalizeDigits(event.target.value).replace(/\D/g, "").slice(0, 10);
          setUserName(value);
          if (fieldErrors.userName) setFieldErrors((current) => ({ ...current, userName: undefined }));
        }}
        placeholder="شماره ملی خود را وارد کنید"
        autoComplete="username"
        inputMode="numeric"
        maxLength={10}
        required
        autoFocus
        disabled={loading}
        error={fieldErrors.userName}
      />

      <AuthField
        id="password"
        name="password"
        label="رمز عبور"
        icon={<LockIcon />}
        type="password"
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          if (fieldErrors.password) setFieldErrors((current) => ({ ...current, password: undefined }));
        }}
        placeholder="رمز عبور خود را وارد کنید"
        autoComplete="current-password"
        maxLength={256}
        required
        disabled={loading}
        containerClassName={styles.passwordField}
        error={fieldErrors.password}
      />

      <div className={styles.captchaBlock}>
        <label className={styles.captchaLabel} htmlFor="captcha">
          کد امنیتی
        </label>
        <div className={styles.captchaRow}>
          <div className={styles.captchaImageWrap} aria-label="عبارت کد امنیتی">
            <span className={styles.captchaNoiseOne} aria-hidden="true" />
            <span className={styles.captchaNoiseTwo} aria-hidden="true" />
            <strong className={styles.captchaText}>{captchaText}</strong>
            <button
              className={styles.captchaRefresh}
              type="button"
              onClick={refreshCaptcha}
              disabled={loading}
              aria-label="تولید کد امنیتی جدید"
              title="کد جدید"
            >
              <RefreshIcon />
            </button>
          </div>
          <input
            className={`${styles.captchaInput} ${fieldErrors.captcha ? styles.captchaInputError : ""}`}
            id="captcha"
            name="captcha"
            value={captchaAnswer}
            onChange={(event) => {
              setCaptchaAnswer(normalizeDigits(event.target.value).replace(/\D/g, "").slice(0, 2));
              if (fieldErrors.captcha) setFieldErrors((current) => ({ ...current, captcha: undefined }));
            }}
            placeholder="پاسخ"
            autoComplete="off"
            inputMode="numeric"
            maxLength={2}
            required
            disabled={loading || !captcha}
          />
        </div>
        {fieldErrors.captcha ? <small className={styles.captchaError}>{fieldErrors.captcha}</small> : null}
      </div>

      {error ? (
        <div className={styles.errorBox} role="alert">
          <span>!</span>
          {error}
        </div>
      ) : null}

      <button className={styles.submitButton} type="submit" disabled={loading || !captcha}>
        {loading ? (
          <>
            <span className={styles.spinner} aria-hidden="true" />
            در حال بررسی...
          </>
        ) : (
          <>
            ورود به سامانه
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19 12H5M10 7l-5 5 5 5" />
            </svg>
          </>
        )}
      </button>

      <div className={styles.supportBox}>
        <span>پشتیبانی سامانه</span>
        <div>
          <span>۲۲۴۵۵</span>
          <i aria-hidden="true" />
          <span>۲۲۳۵۰</span>
        </div>
      </div>
    </form>
  );
}
