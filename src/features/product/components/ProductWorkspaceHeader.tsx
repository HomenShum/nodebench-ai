import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ProductWorkspaceHeaderProps = {
  kicker: string;
  title: string;
  description: string;
  aside?: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function ProductWorkspaceHeader({
  kicker,
  title,
  description,
  aside,
  className,
  contentClassName,
}: ProductWorkspaceHeaderProps) {
  return (
    <section
      className={cn(
        "nb-panel flex flex-col gap-4 px-5 py-5 xl:flex-row xl:items-end xl:justify-between xl:px-6",
        className,
      )}
    >
      <div className={cn("max-w-[760px]", contentClassName)}>
        <div className="nb-section-kicker">{kicker}</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-content md:text-[2.65rem] md:leading-[1.02]">
          {title}
        </h1>
        <p className="mt-3 max-w-[680px] text-sm leading-7 text-content-muted xl:text-base">
          {description}
        </p>
      </div>
      {aside ? <div className="flex flex-wrap gap-2 xl:justify-end">{aside}</div> : null}
    </section>
  );
}

export default ProductWorkspaceHeader;
