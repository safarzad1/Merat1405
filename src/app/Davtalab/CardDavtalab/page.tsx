"use client";

import { useCallback, useState } from "react";
import { useMeratUser } from "@/lib/useMeratUser";
import { Newspaper, HomeIcon } from "@/component/ResearchIcons";
import Breadcrumbkhabar from "@/component/Breadcrumb/Breadcrumb";
import ElectionAreaTree, { AreaSelection } from "@/app/Davtalab/components/ElectionAreaTree";
import FehrestUsersClient from "./FehrestDavtalab";

export default function Page() {
  const user = useMeratUser();
  const [selection, setSelection] = useState<AreaSelection | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const userMahal = Number(user?.Mahal ?? 0);
  const codeEntekhabat = 31210;

  const handleSelectionChange = useCallback((next: AreaSelection | null) => {
    setSelection(next);
    setReloadTick((value) => value + 1);
  }, []);

  const mahal = selection?.provinceId ?? userMahal;
  const codeHozeh = selection?.codeHozeh ?? 0;

  return (
    <div className="davtalab-module-page">
      <div className="davtalab-breadcrumb-bar">
        <Breadcrumbkhabar
          items={[
            { label: "داشبورد", href: "/Dashboard", icon: <HomeIcon className="w-4 h-4" /> },
            { label: "فهرست پیش‌ثبت‌نام", icon: <Newspaper className="w-4 h-4" /> },
          ]}
        />
      </div>

      <section className="davtalab-module-card">
        <header className="davtalab-module-header">
          <div className="davtalab-module-title-wrap">
            <span className="davtalab-module-mark" aria-hidden="true" />
            <div>
              <h1>فهرست پیش‌ثبت‌نام</h1>
              <p>پرونده‌های پیش‌ثبت‌نام داوطلبان انتخابات</p>
            </div>
          </div>
          <div className="davtalab-context-chip">
            {selection ? selection.pathLabel : "یک استان، حوزه یا شهرستان را انتخاب کنید"}
          </div>
        </header>

        <div className="davtalab-workspace">
          <ElectionAreaTree
            userMahal={userMahal}
            codeEntekhabat={codeEntekhabat}
            selectedKey={selection?.key ?? null}
            onSelectionChange={handleSelectionChange}
          />

          <main className="davtalab-list-panel">
            <FehrestUsersClient
              key={`${mahal}-${codeEntekhabat}-${codeHozeh}-${selection?.key ?? "all"}-${reloadTick}`}
              mahal={mahal}
              CodeEntekhabat={codeEntekhabat}
              CodeHozeh={codeHozeh}
              Natije={0}
              value={0}
              reloadTick={reloadTick}
            />
          </main>
        </div>
      </section>
    </div>
  );
}
