import React from "react";

export function Logo() {
  return (
    <div className="landing-logo select-none flex items-center gap-3 cursor-pointer">
      <img
        src="/Teemoney.png"
        alt="Temoney Logo"
        className="w-10 h-10 object-contain drop-shadow-sm"
      />
      <div className="flex flex-col text-left">
        <span className="font-extrabold text-2xl text-amber-950 tracking-tight leading-none">Temoney</span>
        <span className="text-[10px] font-bold text-amber-700 tracking-widest uppercase mt-0.5">Quản lý tài chính</span>
      </div>
    </div>
  );
}

