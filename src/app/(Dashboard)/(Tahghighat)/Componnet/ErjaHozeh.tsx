"use client";

import { useEffect, useState } from "react";
import { useMeratUser } from "@/lib/useMeratUser";
import { useRouter } from "next/navigation";
import DescriptionWithModal from "./DescriptionWithModal";
import { ArrowBigLeft, Delete } from "@/component/ResearchIcons";
import { useConfirm } from "@/Utils/ConfirmModalContext";
import { DeleteErjabyId, GetTahghighByID } from "@/services/ApiService";
import ErjaMohaghegh from "../Componnet/ErjaMohaghegh";
import TextArea1 from '@/component/Objects/Textarea1'
import { Update_ErjaParvandehState } from "@/services/ApiService";

interface TahghighItem {
  ErjaId: number;
  CountErja: number;
  ErjaLastState: number;
  CountErjaDone: number;
  CountErjaShahrestan: number;
  CountErjaShahrestanDone: number;
  CountErjaMohaghegh: number;
  CountErjaMohagheghDone: number;
  IsDone: boolean;
  MahalReciver_NameFarsi: string;
  CreateDateTime: string;
  Description: string;
}

interface ErjaHozehProps {
  erjaParentId: number;
  typeLevel: "shahrestan" | "ostan"; // 🔹 سطح فعلی (شهرستان یا استان)
  onChangeCountErjaHozeh?: (count: number, doneCount: number) => void;
}

const ErjaHozeh = ({ erjaParentId, onChangeCountErjaHozeh }: ErjaHozehProps) => {
  const user = useMeratUser();
  const router = useRouter();
  const { showConfirm } = useConfirm();
  const [errortozihat, setErrortozihat] = useState(false);
  const [tozihat, setTozihat] = useState("");
  const [idErja, setidErja] = useState<number>(0);
  const [userId, setUserId] = useState<number>(0);
  const [data, setData] = useState<TahghighItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [openErjaId, setOpenErjaId] = useState<number | null>(null);

  const [ModalBargashtParvandeh, setModalBargashtParvandeh] = useState(false);
  const [ModalTaidParvandeh, setModalTaidParvandeh] = useState(false);
  // 📦 بارگذاری داده‌ها
  const loadData = async () => {
    try {

      const result = await GetTahghighByID(0, erjaParentId, 5);

      if (result.status === 200) {
        const list = result.data || [];
        setData(list);

        if (onChangeCountErjaHozeh) {
          const doneCount = list.filter((x: any) => x.IsDone).length;
          onChangeCountErjaHozeh(list.length, doneCount);
        }
      } else if (result.status === 401) {
        router.push("/Login");
      } else {
        setData([]);
      }
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setUserId(user.UserId);
    loadData();
  }, [erjaParentId, router]);

  const DeleteErja = async (ID: number) => {
    await DeleteErjabyId(ID, userId);
    await loadData();
  };

  const ResultToHozeh = async (erjaid: number, stateparvandeh: number, tozihat: string) => {
    const result = await Update_ErjaParvandehState(erjaid, stateparvandeh, tozihat, user.UserId);
    if (result.state == 401) {
      router.push("/Login");
    }
    else {
      setModalTaidParvandeh(false);
      await loadData();
    }
  };

  if (loading) return <div>در حال بارگذاری...</div>;
  if (data.length === 0) return <div>داده‌ای وجود ندارد.</div>;

  return (
    <div className="px-1">
      <ul>
        {data.map((item) => (
          <li
            key={item.ErjaId}
            className={`my-1 py-1 p-3 rounded-xl shadow-sm border border-gray-200 
  hover:shadow-md transition-all duration-200 flex flex-col
  ${item.ErjaLastState === 3
                ? "bg-yellow-100"
                : item.IsDone
                  ? "bg-green-100"
                  : "bg-white"
              }`}


          >
            <div className="flex gap-5 whitespace-nowrap items-center">
              {(item.CountErja === 0 && item.ErjaLastState === 1 && !item.IsDone) && (
                <p className="cursor-pointer">
                  <Delete
                    onClick={() =>
                      showConfirm(
                        "آیا از حذف ارجاع اطمینان دارید؟",
                        () => DeleteErja(item.ErjaId),
                        "هشدار!",
                        "error"
                      )
                    }
                    className="text-red-500"
                  />
                </p>
              )}

              {(item.CountErja > 0 || item.IsDone || item.ErjaLastState != 1) && (
                <p><Delete className="text-gray-400" /></p>
              )}

              <p>
                <span className="font-semibold text-blue-600 text-[13px]">ارسال به:</span>
                <span className="text-gray-700 text-[15px] mr-2 inline-block min-w-[250px]">
                  {item.MahalReciver_NameFarsi}
                </span>
              </p>

              <p>
                <span className="font-semibold text-blue-600 text-[13px]">زمان ارجاع:</span>
                <span className="text-gray-700 text-[14px] mr-2">{item.CreateDateTime}</span>
              </p>

              <p>
                <span className="font-semibold text-blue-600 text-[13px]">توضیحات:</span>
                <DescriptionWithModal status="info" description={item.Description || ""} />
              </p>

              {item.CountErjaMohaghegh > 0 && (
                <>
                  <button
                    onClick={() => setOpenErjaId(openErjaId === item.ErjaId ? null : item.ErjaId)}
                    type="button"
                    className="gap-2 py-1 pl-3.5 pr-3 text-sm bg-sky-200 text-black rounded-full 
                 cursor-pointer font-semibold text-center shadow-xs transition-all 
                 duration-500 flex items-center hover:bg-sky-500"
                  >
                    <ArrowBigLeft className="w-4 h-4" />
                    محققین پرونده
                  </button>
                </>
              )}
              {item.IsDone && item.ErjaLastState == 2 && (
                <button
                  onClick={() => {
                    setidErja(item.ErjaId);
                    setTozihat("");
                    setModalBargashtParvandeh(true);
                  }
                  }
                  type="button"
                  className="gap-2 py-1 pl-3.5 pr-3 text-sm bg-yellow-300 text-black rounded-full 
                 cursor-pointer font-semibold text-center shadow-xs transition-all 
                 duration-500 flex items-center hover:bg-yellow-500"
                >
                  <ArrowBigLeft className="w-4 h-4" />
                  برگشت پرونده به حوزه
                </button>

              )}


              {item.IsDone && item.ErjaLastState == 2 && (
                <button
                  onClick={() => {
                    setidErja(item.ErjaId);
                    setTozihat("");
                    setModalTaidParvandeh(true);
                  }
                  }
                  type="button"
                  className="gap-2 py-1 pl-3.5 pr-3 text-sm bg-green-300 text-black rounded-full 
                 cursor-pointer font-semibold text-center shadow-xs transition-all 
                 duration-500 flex items-center hover:bg-green-500"
                >
                  <ArrowBigLeft className="w-4 h-4" />
                  تایید تحقیق
                </button>

              )}


            </div>

            {openErjaId === item.ErjaId && (
              <div className="border-t mt-3 pt-3">
                <ErjaMohaghegh
                  erjaId={item.ErjaId}
                  onChangeCountJambandi={(doneCount) => {
                    const newData = structuredClone(data);
                    const idx = newData.findIndex((x) => x.ErjaId === item.ErjaId);
                    if (idx !== -1) newData[idx].CountErjaMohagheghDone = doneCount;
                    setData(newData);
                  }}
                />
              </div>
            )}
          </li>
        ))}
      </ul>



      {ModalBargashtParvandeh && (
        <div className="fixed inset-0 z-50">

          <div
            className="absolute inset-0 bg-black opacity-40"
            onClick={() => setModalBargashtParvandeh(false)}
          ></div>

          <div className="bg-white rounded-lg px-6 pb-4 shadow-lg z-50 w-[30%] max-h-[90vh] overflow-hidden absolute top-5 left-1/2 -translate-x-1/2">

            <div className="bg-gray-200 -mx-6 p-3 rounded-t-lg border-b border-gray-300">
              <h2 className="text-lg font-bold">برگشت پرونده به حوزه</h2>
            </div>
            <hr className="mb-3 text-blue-800" />

            <TextArea1
              height="h-90"
              justify={true}
              readOnly={false}
              label="توضیحات دلایل برگشت :"
              placeholder="توضیحات مورد نظر را وارد کنید"
              value={tozihat || ""}
              onChange={(e: any) => setTozihat(e.target.value)}
              maxLength={3000}
              onlyNumber={false}
              error={errortozihat}
              errorMessage={errortozihat ? "این فیلد اجباری است حداقل 10 رقم " : ""}
            />

            <div className="flex justify-end mt-4 gap-2">
              <button
                className="bg-gray-300 hover:bg-gray-400 px-4 py-1 cursor-pointer rounded"
                onClick={() => setModalBargashtParvandeh(false)}
              >
                بستن
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (tozihat.length > 10) {
                    setErrortozihat(false);
                    await ResultToHozeh(idErja, 3, tozihat);
                  }
                  else {
                    setErrortozihat(true);

                  }

                }}
                // disabled={!canSubmit}
                className={`cursor-pointer px-4 py-1 rounded-xl bg-green-700 text-white 
                  ? "bg-green-600 hover:bg-green-700 cursor-pointer"
                  : "bg-gray-300 cursor-not-allowed"
                  }`}
              >
                ارسال
              </button>

            </div>
          </div>

        </div >
      )
      }


      {ModalTaidParvandeh && (
        <div className="fixed inset-0 z-50">

          <div
            className="absolute inset-0 bg-black opacity-40"
            onClick={() => setModalTaidParvandeh(false)}
          ></div>

          <div className="bg-white rounded-lg px-6 pb-4 shadow-lg z-50 w-[30%] max-h-[90vh] overflow-hidden absolute top-5 left-1/2 -translate-x-1/2">

            <div className="bg-gray-200 -mx-6 p-3 rounded-t-lg border-b border-gray-300">
              <h2 className="text-lg font-bold">تایید پرونده</h2>
            </div>
            <hr className="mb-3 text-blue-800" />

            <TextArea1
              height="h-90"
              justify={true}
              readOnly={false}
              label="توضیحات :"
              placeholder="توضیحات مورد نظر را وارد کنید"
              value={tozihat || ""}
              onChange={(e: any) => setTozihat(e.target.value)}
              maxLength={3000}
              onlyNumber={false}
              error={errortozihat}
              errorMessage={errortozihat ? "این فیلد اجباری است حداقل 10 رقم " : ""}
            />

            <div className="flex justify-end mt-4 gap-2">
              <button
                className="bg-gray-300 hover:bg-gray-400 px-4 py-1 cursor-pointer rounded"
                onClick={() => setModalTaidParvandeh(false)}
              >
                بستن
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (tozihat.length > 10) {
                    setErrortozihat(false);
                    await ResultToHozeh(idErja, 4, tozihat);
                  }
                  else {
                    setErrortozihat(true);

                  }

                }}
                // disabled={!canSubmit}
                className={`cursor-pointer px-4 py-1 rounded-xl bg-green-700 text-white 
                  ? "bg-green-600 hover:bg-green-700 cursor-pointer"
                  : "bg-gray-300 cursor-not-allowed"
                  }`}
              >
                تایید تحقیق
              </button>

            </div>
          </div>

        </div >
      )
      }

    </div >
  );
};

export default ErjaHozeh;
