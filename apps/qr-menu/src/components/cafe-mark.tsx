import { initials } from "@starter/shared/fnb/domain";
import type { PublicCafeDto } from "@starter/shared/fnb/api";

/** The cafe's logo from Pengaturan, or its initials until one is uploaded. */
export function CafeMark({
  cafe,
  className,
}: {
  cafe: Pick<PublicCafeDto, "cafeName" | "logoUrl">;
  className: string;
}) {
  return (
    <span
      className={className}
      data-logo={cafe.logoUrl ? "" : undefined}
      aria-hidden="true"
    >
      {cafe.logoUrl ? (
        <img src={cafe.logoUrl} alt="" />
      ) : (
        initials(cafe.cafeName)
      )}
    </span>
  );
}
