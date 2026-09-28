"use client";

import { useEffect, useState } from "react";

export type MeratUser = {
  UserName: string;
  UserId: number;
  Mahal: number;
  PostId: number;
  FullName: string;
  NameMahal?: string;
  OnvanSemat?: string;
  DateNow?: string;
  IsMarkazShahrestan?: string | boolean;
};

const emptyUser: MeratUser = {
  UserName: "",
  UserId: 0,
  Mahal: 0,
  PostId: 0,
  FullName: "",
};

export function useMeratUser() {
  const [user, setUser] = useState<MeratUser>(emptyUser);

  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem("merat-user");
        if (!raw) return setUser(emptyUser);
        const value = JSON.parse(raw) as Partial<MeratUser>;
        setUser({
          ...emptyUser,
          ...value,
          UserId: Number(value.UserId || 0),
          Mahal: Number(value.Mahal || 0),
          PostId: Number(value.PostId || 0),
        });
      } catch {
        setUser(emptyUser);
      }
    };

    load();
    window.addEventListener("storage", load);
    window.addEventListener("merat-user-change", load as EventListener);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("merat-user-change", load as EventListener);
    };
  }, []);

  return user;
}
