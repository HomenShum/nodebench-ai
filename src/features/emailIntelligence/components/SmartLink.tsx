import React from "react";

type SmartLinkProps = {
  children: React.ReactNode;
  summary?: string;
  source?: string;
};

const SmartLink: React.FC<SmartLinkProps> = ({ children, summary, source }) => {
  if (!summary) {
    return <span className="font-semibold text-gray-900">{children}</span>;
  }

  return (
    <span className="group relative inline-flex cursor-help font-medium text-blue-700 decoration-blue-300 underline underline-offset-2 transition-colors hover:text-blue-800">
      {children}
      <span className="pointer-events-none absolute left-0 top-full z-50 hidden w-72 translate-y-2 rounded-lg border border-gray-200 bg-white p-4 text-left shadow-xl ring-1 ring-black/5 group-hover:block">
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">AI Summary</h4>
          <p className="text-sm leading-relaxed text-gray-700">{summary}</p>
          {source && <div className="border-t border-gray-100 pt-2 text-[10px] text-gray-400">Source: {source}</div>}
        </div>
      </span>
    </span>
  );
};

export default SmartLink;
