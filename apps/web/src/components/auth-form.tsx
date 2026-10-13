import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import {
  ChartColumn,
  Check,
  ChevronRight,
  CircleAlert,
  Clock,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  LogIn,
  Mail,
  Package,
  QrCode,
  StickyNote,
  Store,
  TriangleAlert,
  User,
  X,
  Zap,
} from "lucide-react";
import { SETTINGS } from "@starter/shared/fnb/fixtures";
import { initials } from "@starter/shared/fnb/domain";
import { authClient } from "@/lib/auth-client";
import { tableMenuUrl } from "@/lib/env";
import { useToast } from "@/components/fnb/dialog";
import { siteConfig } from "@/config/site";

// Port of design/src/pages/login.page.html (page id "login"). The prototype's
// fake staff list and "masuk cepat" demo buttons are gone: this signs in for
// real with Better Auth, and the role comes from the account.

// These routes render before anyone signs in, so the brand copy uses the
// static seed settings rather than the cafe settings from the API.
const CAFE = SETTINGS.cafeName;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EMAIL_MAX = 254;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;
const NAME_MAX = 100;

type Mode = "sign-in" | "sign-up";
type FieldName = "name" | "email" | "password";
type Errors = Partial<Record<FieldName, string>>;
type AuthError = { code?: string; status?: number };

const emailMsg = (v: string, who = "kamu") =>
  !v
    ? `Masukkan email ${who}.`
    : v.length > EMAIL_MAX
      ? `Email terlalu panjang, maksimal ${EMAIL_MAX} karakter.`
      : !EMAIL_RE.test(v)
        ? "Format email belum benar, contoh: nama@kedaisenja.id"
        : "";
const passwordMsg = (v: string, signingUp: boolean) =>
  !v
    ? signingUp
      ? "Buat kata sandi untuk akun ini."
      : "Masukkan kata sandi."
    : v.length < PASSWORD_MIN
      ? `Kata sandi minimal ${PASSWORD_MIN} karakter.`
      : v.length > PASSWORD_MAX
        ? `Kata sandi maksimal ${PASSWORD_MAX} karakter.`
        : "";
const nameMsg = (v: string) => (v.trim() ? "" : "Masukkan nama kamu.");

const NETWORK_MSG =
  "Tidak bisa terhubung ke server. Periksa koneksi internet, lalu coba lagi.";
const RATE_LIMIT_MSG =
  "Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.";

/** Friendly Indonesian copy. Never says whether an email is registered. */
function describeError(
  error: AuthError,
  signingUp: boolean,
): { alert?: string; field?: FieldName; fieldMsg?: string } {
  const code = error.code ?? "";
  if (!error.status) return { alert: NETWORK_MSG };
  if (error.status === 429) return { alert: RATE_LIMIT_MSG };
  if (code === "INVALID_EMAIL")
    return { field: "email", fieldMsg: emailMsg("x") };
  if (code === "PASSWORD_TOO_SHORT")
    return { field: "password", fieldMsg: passwordMsg("x", signingUp) };
  if (code === "PASSWORD_TOO_LONG")
    return {
      field: "password",
      fieldMsg: passwordMsg("x".repeat(PASSWORD_MAX + 1), signingUp),
    };
  if (signingUp)
    return {
      alert:
        "Akun belum bisa dibuat. Periksa lagi datanya, atau masuk kalau kamu sudah punya akun.",
    };
  if (code === "BANNED_USER")
    return { alert: "Akun ini sudah dinonaktifkan pemilik." };
  if (code === "INVALID_EMAIL_OR_PASSWORD" || error.status === 401)
    return {
      alert: "Email atau kata sandi salah. Periksa lagi, lalu coba masuk.",
    };
  return { alert: "Belum bisa masuk. Coba lagi sebentar lagi." };
}

/* ---------- Panel merek (kiri) ---------- */

export function AuthBrandPanel() {
  return (
    <aside className="lg-brand" aria-label={`Tentang ${CAFE}`}>
      <div className="lg-brand-top">
        <span className="lg-mono" aria-hidden="true">
          {initials(CAFE)}
        </span>
        <div>
          <strong>{CAFE}</strong>
          <small>Kasir &amp; Pemilik · {siteConfig.name}</small>
        </div>
      </div>
      <div className="lg-brand-mid">
        <span className="lg-chip lg-kicker" data-tone="plain">
          <Zap aria-hidden="true" />
          Aplikasi kasir
        </span>
        <p className="lg-thesis">Semua pesanan di satu layar.</p>
        <p className="lg-lede">
          Pesanan dari QR meja dan dari kasir masuk ke tempat yang sama. Rapi,
          cepat, dan tidak ada yang terlewat.
        </p>
        <ul className="lg-props">
          <li>
            <span className="lg-pi" aria-hidden="true">
              <QrCode />
            </span>
            <div>
              <strong>Pesanan QR langsung masuk ke kasir</strong>
              <small>Lengkap dengan nomor meja dan catatan pelanggan.</small>
            </div>
          </li>
          <li>
            <span className="lg-pi" aria-hidden="true">
              <Package />
            </span>
            <div>
              <strong>Stok bahan berkurang otomatis</strong>
              <small>
                Setiap menu terjual, bahan yang terpakai langsung tercatat.
              </small>
            </div>
          </li>
          <li>
            <span className="lg-pi" aria-hidden="true">
              <ChartColumn />
            </span>
            <div>
              <strong>Laporan harian tanpa hitung manual</strong>
              <small>Penjualan, menu terlaris, dan pajak siap diunduh.</small>
            </div>
          </li>
        </ul>
        <div
          className="lg-proof"
          role="img"
          aria-label="Contoh kartu pesanan baru: Meja 07, 2 Nasi Goreng Kampung tidak pedas dan 1 Kopi Susu Gula Aren, total Rp 94.600"
        >
          <div className="lg-proof-head">
            <span className="lg-chip" data-tone="accent">
              Pesanan baru
            </span>
            <span className="lg-proof-time">
              <Clock aria-hidden="true" />
              baru saja
            </span>
          </div>
          <div className="lg-proof-title">
            <strong>Meja 07</strong>
            <span>
              A-027 · <QrCode aria-hidden="true" />
              Pesanan QR
            </span>
          </div>
          <ul>
            <li>
              <b>2×</b>Nasi Goreng Kampung
              <span className="lg-proof-note">
                <StickyNote aria-hidden="true" />
                Tidak pedas
              </span>
            </li>
            <li>
              <b>1×</b>Kopi Susu Gula Aren
            </li>
          </ul>
          <div className="lg-proof-foot">
            <strong>Rp 94.600</strong>
            <span className="lg-chip" data-tone="warning">
              Belum bayar
            </span>
          </div>
          <span className="lg-proof-act">Terima &amp; proses</span>
        </div>
      </div>
      <p className="lg-brand-foot">
        Didukung oleh <strong>{siteConfig.name}</strong>
      </p>
    </aside>
  );
}

/* ---------- Formulir ---------- */

function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <p className="lg-err" id={id} hidden={!message}>
      {message ? (
        <>
          <CircleAlert aria-hidden="true" style={{ fontSize: 14 }} />
          <span>{message}</span>
        </>
      ) : null}
    </p>
  );
}

function AffixField({
  id,
  label,
  icon,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  icon: ReactNode;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="lg-field">
      <label htmlFor={id}>{label}</label>
      <div className="lg-affix" data-invalid={error ? "" : undefined}>
        {icon}
        {children}
      </div>
      <FieldError id={`${id}-err`} message={error} />
      {hint}
    </div>
  );
}

export function AuthForm({ mode }: { mode: Mode }) {
  const signingUp = mode === "sign-up";
  const router = useRouter();
  const navigate = useNavigate();
  const toast = useToast();

  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [tried, setTried] = useState(false);
  const [alert, setAlert] = useState("");
  const [phase, setPhase] = useState<"idle" | "busy" | "done">("idle");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const refs: Record<FieldName, RefObject<HTMLInputElement | null>> = {
    name: nameRef,
    email: emailRef,
    password: passwordRef,
  };
  const order: FieldName[] = signingUp
    ? ["name", "email", "password"]
    : ["email", "password"];

  const validate = (field: FieldName, v: string) =>
    field === "name"
      ? nameMsg(v)
      : field === "email"
        ? emailMsg(v.trim())
        : passwordMsg(v, signingUp);

  // Focus the first field on wide screens only (on phones the keyboard would
  // cover the page), like the prototype.
  useEffect(() => {
    if (window.matchMedia("(min-width: 900px)").matches) {
      (signingUp ? nameRef : emailRef).current?.focus({ preventScroll: true });
    }
  }, [signingUp]);

  function onInput(field: FieldName, v: string) {
    setValues((prev) => ({ ...prev, [field]: v }));
    setAlert("");
    if (tried || errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: validate(field, v) }));
    }
  }

  function forgetPassword() {
    setValues((prev) => ({ ...prev, password: "" }));
    setShowPassword(false);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase !== "idle") return;
    setTried(true);
    setAlert("");
    const next: Errors = {};
    for (const field of order) next[field] = validate(field, values[field]);
    setErrors(next);
    const firstInvalid = order.find((field) => next[field]);
    if (firstInvalid) {
      refs[firstInvalid].current?.focus();
      return;
    }

    setPhase("busy");
    const email = values.email.trim();
    try {
      const result = signingUp
        ? await authClient.signUp.email({
            name: values.name.trim(),
            email,
            password: values.password,
          })
        : await authClient.signIn.email({
            email,
            password: values.password,
            rememberMe: remember,
          });
      if (result.error) {
        const {
          alert: message,
          field,
          fieldMsg,
        } = describeError(result.error, signingUp);
        setPhase("idle");
        if (field) {
          setErrors((prev) => ({ ...prev, [field]: fieldMsg }));
          refs[field].current?.focus();
        } else {
          setAlert(message ?? "");
          emailRef.current?.focus();
        }
        return;
      }
      forgetPassword();
      setPhase("done");
      const firstName = result.data.user.name.trim().split(/\s+/)[0];
      toast(
        `${firstName ? `Halo, ${firstName}!` : "Halo!"} Membuka layar Pesanan…`,
      );
      // Re-run route guards with the new cookie, then move to the app.
      await router.invalidate();
      await navigate({ to: siteConfig.homePath, replace: true });
    } catch {
      setPhase("idle");
      setAlert(NETWORK_MSG);
    }
  }

  const busy = phase === "busy";
  const done = phase === "done";
  const emailValid = EMAIL_RE.test(values.email.trim());

  return (
    <>
      <div className="lg-card">
        <h1>{signingUp ? "Buat akun pemilik" : "Masuk ke akun"}</h1>
        <p className="lg-sub">
          {signingUp
            ? `Untuk pemilik ${CAFE} yang baru mulai memakai ${siteConfig.name}`
            : `Untuk kasir dan pemilik ${CAFE}`}
        </p>

        <div className="lg-alert" role="alert" hidden={!alert}>
          {alert ? (
            <>
              <TriangleAlert aria-hidden="true" style={{ fontSize: 18 }} />
              <div>{alert}</div>
            </>
          ) : null}
        </div>

        <form
          className="lg-form"
          noValidate
          onSubmit={onSubmit}
          aria-busy={busy}
        >
          {signingUp ? (
            <AffixField
              id="login-name"
              label="Nama"
              icon={<User aria-hidden="true" />}
              error={errors.name}
            >
              <input
                ref={nameRef}
                id="login-name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Nama lengkap"
                maxLength={NAME_MAX}
                required
                aria-required="true"
                aria-invalid={errors.name ? true : false}
                aria-describedby="login-name-err"
                value={values.name}
                onChange={(e) => onInput("name", e.target.value)}
              />
            </AffixField>
          ) : null}

          <AffixField
            id="login-email"
            label="Email"
            icon={<Mail aria-hidden="true" />}
            error={errors.email}
          >
            <input
              ref={emailRef}
              id="login-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete={signingUp ? "email" : "username"}
              autoCapitalize="off"
              spellCheck={false}
              placeholder="nama@kedaisenja.id"
              maxLength={EMAIL_MAX}
              required
              aria-required="true"
              aria-invalid={errors.email ? true : false}
              aria-describedby="login-email-err"
              value={values.email}
              onChange={(e) => onInput("email", e.target.value)}
              onBlur={() => {
                const v = values.email.trim();
                if (v) setErrors((prev) => ({ ...prev, email: emailMsg(v) }));
              }}
            />
          </AffixField>

          <AffixField
            id="login-pw"
            label="Kata sandi"
            icon={<Lock aria-hidden="true" />}
            error={errors.password}
            hint={
              signingUp ? (
                <p className="lg-hint" id="login-pw-hint">
                  Minimal {PASSWORD_MIN} karakter. Jangan pakai kata sandi yang
                  sama dengan akun lain.
                </p>
              ) : null
            }
          >
            <input
              ref={passwordRef}
              id="login-pw"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={signingUp ? "new-password" : "current-password"}
              placeholder={
                signingUp ? "Buat kata sandi" : "Masukkan kata sandi"
              }
              maxLength={PASSWORD_MAX}
              required
              aria-required="true"
              aria-invalid={errors.password ? true : false}
              aria-describedby={
                signingUp ? "login-pw-err login-pw-hint" : "login-pw-err"
              }
              value={values.password}
              onChange={(e) => onInput("password", e.target.value)}
            />
            <button
              type="button"
              className="lg-pw-toggle"
              aria-label="Tampilkan kata sandi"
              aria-pressed={showPassword}
              aria-controls="login-pw"
              title={
                showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
              }
              onClick={() => setShowPassword((show) => !show)}
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" />
              ) : (
                <Eye aria-hidden="true" />
              )}
            </button>
          </AffixField>

          {signingUp ? null : (
            <div className="lg-row">
              <label className="lg-check">
                <input
                  type="checkbox"
                  name="remember"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Ingat saya
              </label>
              <button
                type="button"
                className="lg-link"
                aria-haspopup="dialog"
                onClick={() => setForgotOpen(true)}
              >
                Lupa kata sandi?
              </button>
            </div>
          )}

          <button
            type="submit"
            className="lg-btn lg-submit"
            data-variant="primary"
            data-size="lg"
            data-block=""
            data-state={done ? "done" : undefined}
            disabled={busy || done}
            aria-busy={busy || undefined}
          >
            {busy ? (
              <>
                <LoaderCircle className="lg-spin" aria-hidden="true" />
                {signingUp ? "Membuat akun…" : "Memeriksa…"}
              </>
            ) : done ? (
              <>
                <Check aria-hidden="true" />
                {signingUp ? "Akun dibuat" : "Berhasil masuk"}
              </>
            ) : signingUp ? (
              "Buat akun"
            ) : (
              "Masuk"
            )}
          </button>
        </form>

        <div className="lg-divider" aria-hidden="true">
          atau
        </div>

        <section className="lg-demo" aria-labelledby="login-switch-title">
          <div className="lg-demo-head">
            <h2 id="login-switch-title">
              {signingUp ? "Sudah punya akun?" : "Belum punya akun?"}
            </h2>
          </div>
          <p>
            {signingUp
              ? "Akun kasir biasanya ditambahkan oleh pemilik dari halaman Akun & Staf, jadi kasir tidak perlu mendaftar sendiri."
              : "Akun kasir dibuat oleh pemilik. Kalau kamu pemilik yang baru mulai, buat akun pertamamu di sini."}
          </p>
          <div className="lg-demo-btns">
            <Link
              className="lg-demo-btn"
              to={signingUp ? "/sign-in" : "/sign-up"}
            >
              <span className="lg-avatar" aria-hidden="true">
                {signingUp ? <LogIn /> : <Store />}
              </span>
              <span className="lg-grow">
                <strong>
                  {signingUp ? "Masuk ke akun" : "Buat akun pemilik"}
                </strong>
                <small>
                  {signingUp
                    ? "Untuk kasir dan pemilik yang sudah terdaftar"
                    : "Penjualan, menu, stok, staf & pengaturan"}
                </small>
              </span>
              <ChevronRight aria-hidden="true" style={{ fontSize: 16 }} />
            </Link>
          </div>
        </section>

        <a className="lg-cust" href={tableMenuUrl("07")}>
          <QrCode aria-hidden="true" />
          Lihat halaman pelanggan (QR)
        </a>
      </div>

      {signingUp ? null : (
        <ForgotPasswordDialog
          open={forgotOpen}
          onClose={() => setForgotOpen(false)}
          email={emailValid ? values.email.trim() : ""}
        />
      )}
    </>
  );
}

/* ---------- Dialog lupa kata sandi ---------- */

// There is no email service yet, so the dialog keeps the design's look but
// tells the truth: the owner resets the password from Akun & Staf.
function ForgotPasswordDialog({
  open,
  onClose,
  email,
}: {
  open: boolean;
  onClose: () => void;
  email: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="lg-dialog"
      aria-labelledby="login-f-title"
      aria-describedby="login-f-desc"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target === e.currentTarget || target.closest("[data-close]")) {
          onClose();
        }
      }}
    >
      <div className="lg-dialog-form">
        <div className="lg-dialog-head">
          <div>
            <h2 id="login-f-title">Atur ulang kata sandi</h2>
            <p id="login-f-desc">
              Untuk saat ini kata sandi diatur ulang oleh pemilik kafe, belum
              lewat tautan email.
            </p>
          </div>
          <button
            type="button"
            className="lg-iconbtn"
            data-close=""
            aria-label="Tutup"
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <div className="lg-dialog-body">
          <ol className="lg-steps">
            <li>
              <span>
                Hubungi pemilik {CAFE} dan sebutkan email akunmu
                {email ? (
                  <>
                    : <strong>{email}</strong>
                  </>
                ) : null}
                .
              </span>
            </li>
            <li>
              <span>
                Pemilik mengatur ulang kata sandimu dari halaman Akun &amp;
                Staf.
              </span>
            </li>
            <li>
              <span>Masuk lagi dengan kata sandi yang baru.</span>
            </li>
          </ol>
          <p className="lg-hint">
            Kamu pemilik dan lupa kata sandi? Hubungi tim {siteConfig.name}{" "}
            untuk bantuan.
          </p>
        </div>
        <div className="lg-dialog-foot">
          <button
            type="button"
            className="lg-btn"
            data-variant="primary"
            data-close=""
            autoFocus
          >
            Mengerti
          </button>
        </div>
      </div>
    </dialog>
  );
}
