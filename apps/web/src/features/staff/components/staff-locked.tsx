import { Link } from "@tanstack/react-router";
import { ClipboardList, Lock } from "lucide-react";

/** Role gate: a cashier opening this owner-only page. */
export function StaffLocked({ name }: { name: string }) {
  return (
    <section
      className="l-staf-card ak-locked"
      aria-labelledby="staf-locked-title"
    >
      <div className="l-staf-empty">
        <Lock aria-hidden="true" />
        <h2 id="staf-locked-title">Halaman ini khusus Pemilik</h2>
        <p>
          Akun <b>{name}</b> (Kasir) tidak punya akses ke <b>Akun &amp; Staf</b>
          . Minta pemilik mengubah hak akses di menu Akun &amp; Staf.
        </p>
        <Link className="l-staf-btn" data-variant="primary" to="/kasir">
          <ClipboardList aria-hidden="true" />
          Kembali ke Pesanan
        </Link>
      </div>
    </section>
  );
}
