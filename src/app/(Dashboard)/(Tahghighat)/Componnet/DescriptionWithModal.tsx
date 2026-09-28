// components/DescriptionWithModal.tsx
"use client";

import { useState } from "react";

interface DescriptionWithModalProps {
  description: string;
  status?: "success" | "warning" | "danger" | "info"; // وضعیت مودال
}

export default function DescriptionWithModal({ description, status = "info" }: DescriptionWithModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  // تعیین رنگ بک‌گراند هدر بر اساس status
  const headerBgColor = {
    success: "bg-green-600",
    warning: "bg-yellow-500",
    danger: "bg-red-600",
    info: "bg-blue-600",
  }[status];

  return (
    <>
      {/* متن کوتاه قابل کلیک */}
      <span
        className="text-gray-700 cursor-pointer text-[15px] mr-2"
        onClick={() => setIsOpen(true)}
      >
        {(description ?? "").length > 40
          ? (description ?? "").substring(0, 40) + "..."
          : (description ?? "")
        }

      </span>

      {/* مودال */}
      {isOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          onClick={() => setIsOpen(false)} // کلیک بیرون مودال باعث بسته شدن می‌شود
        >
          <div
            className="bg-white p-4 rounded-lg shadow-lg max-w-lg w-full text-gray-800"
            onClick={(e) => e.stopPropagation()} // جلوگیری از بسته شدن مودال با کلیک داخل آن
          >
            {/* هدر مودال با بک‌گراند رنگی و متن سفید */}
            <h3 className={`font-semibold text-base mb-2 text-white ${headerBgColor} px-4 py-2 rounded-t`}>
              توضیحات کامل
            </h3>

            {/* کادر textarea برای نمایش متن کامل */}
            <textarea
              className="w-full h-40 p-2 border border-gray-300 rounded resize-none mt-2"
              value={description}
              readOnly
            />

            <div className="mt-3 flex justify-end">
              <button
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                onClick={() => setIsOpen(false)}
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
