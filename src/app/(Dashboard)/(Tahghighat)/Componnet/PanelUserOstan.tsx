"use client";

import React from "react";
import { UserCheck, Users, Globe, FileText, XCircle } from "@/component/ResearchIcons";

interface ButtonItem {
  text: string;
  icon: React.ReactNode;
  onClick?: (data?: any) => void;
  count?: number;    // عدد خاکستری
  countok?: number;  // عدد سبز
}

interface ActionButtonsRowProps {
  data?: any;
}

export default function ActionButtonsRow({ data }: ActionButtonsRowProps) {
  const buttons: ButtonItem[] = [
    {
      text: "  حوزه انتخابیه",
      icon: <Users size={20} />,
      count: data?.CountErjaShahrestan,
      countok: data?.CountErjaShahrestanDone,
      onClick: (d) => console.log("حوزه انتخابیه:", d),
    },
    {
      text: " محقق ویژه",
      icon: <UserCheck size={20} />,
      count: data?.CountErjaMohaghegh,
      countok: data?.CountErjaMohagheghDone,
      onClick: (d) => console.log("محقق ویژه:", d),
    },
    {
      text: " استان دیگر",
      icon: <Globe size={20} />,
      count: data?.CountErjaOstan,
      countok: data?.CountErjaOstanDone,
      onClick: (d) => console.log("استان دیگر:", d),
    },
    {
      text: "کارگروه ویژه مصاحبه",
      icon: <FileText size={20} />,
      onClick: (d) => console.log("کارگروه ویژه:", d),
    },
    {
      text: "عدم نیاز به تحقیق",
      icon: <XCircle size={20} />,
      onClick: (d) => console.log("عدم نیاز:", d),
    },
  ];

  return (
    <div className="flex gap-4">
      {buttons.map((btn, idx) => (
        <button
          key={idx}
          onClick={() => btn.onClick && btn.onClick(data)}
          className="flex items-center h-8 gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition relative"
        >
          {btn.icon}
          <span className="text-[15px]">{btn.text}</span>

          {/* دایره خاکستری */}
          {btn.count !== undefined && (
            <span className="ml-2 flex items-center justify-center w-5 h-5 bg-gray-400 text-white text-[14px] font-semibold rounded-full">
              {btn.count}
            </span>
          )}

          {/* دایره سبز برای اوکی‌ها */}
          {btn.countok !== undefined && (
            <span className="ml-1 flex items-center justify-center w-5 h-5 bg-green-500 text-white text-[14px] font-semibold rounded-full">
              {btn.countok}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
