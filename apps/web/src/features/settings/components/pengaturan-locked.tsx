import { Link } from "@tanstack/react-router";
import { ClipboardList, Lock } from "lucide-react";
import { StafPage } from "@/components/fnb/shell";

/** Owner-only page opened by a cashier (prototype applyRole → locked). */
export function PengaturanLocked({ userName }: { userName: string }) {
  return (
    <StafPage id="pengaturan" title="Pengaturan Kafe">
      <main aria-label="Pengaturan Kafe" className="p-pengaturan" tabIndex={-1}>
        <section
          className="l-staf-card pg-locked"
          aria-labelledby="pengaturan-locked-title"
          data-part="locked"
        >
          <div className="l-staf-empty">
            <Lock aria-hidden="true" />
            <h2 className="pg-sr" id="pengaturan-locked-title">
              Akses terbatas
            </h2>
            <strong>Halaman ini khusus Pemilik</strong>
            <p data-part="locked-text">
              Akun <b>{userName}</b> (Kasir) tidak punya akses ke{" "}
              <b>Pengaturan</b>. Minta pemilik mengubah hak akses di menu Akun
              &amp; Staf.
            </p>
            <Link className="l-staf-btn" data-variant="primary" to="/kasir">
              <ClipboardList aria-hidden="true" />
              Kembali ke Pesanan
            </Link>
          </div>
        </section>
      </main>
    </StafPage>
  );
}
