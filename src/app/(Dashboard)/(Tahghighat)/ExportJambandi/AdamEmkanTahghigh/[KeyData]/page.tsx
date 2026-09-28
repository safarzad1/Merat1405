'use client';
import { useParams } from "next/navigation";
import { useMeratUser } from "@/lib/useMeratUser";
import { useEffect, useState } from "react";
import { useRef } from 'react';
import html2canvas from '@/lib/html2canvasCompat';
import jsPDF from '@/lib/jsPdfCompat';
import { useRouter } from "next/navigation";
import { decryptText } from "@/lib/cryptoUtil";
import { GetTahghighat_Mohaghegh_ByID } from '@/services/ApiServiceShorayeTahghigh'

export default function A4LetterWithHeaderThreeColumns() {
    const [IDTahghigh, SetIDTahghigh] = useState(0);

    const divRef = useRef<HTMLDivElement>(null);
    const user = useMeratUser();
    const router = useRouter();
    const params = useParams();
    // خروجی PNG
    const handleExportPNG = async () => {

        useEffect(() => {

            const keyData = params?.KeyData as string;
            if (keyData) {
                try {
                    const tahghigh = Number(decryptText(decodeURIComponent(keyData)));
                    SetIDTahghigh(tahghigh);
                    loadData(tahghigh);

                } catch (err) {
                    console.error("❌ خطا در رمزگشایی شناسه:", err);
                }
            }
        }, [params, user]);

        const loadData = async (idtahghigh: number) => {

            const result = await GetTahghighat_Mohaghegh_ByID(idtahghigh);
            console.log(result);
        }


        if (!divRef.current) return;

        const canvas = await html2canvas(divRef.current, { scale: 3, useCORS: true, backgroundColor: 'white' });
        const dataURL = canvas.toDataURL('image/png');

        const link = document.createElement('a');
        link.href = dataURL;
        link.download = 'letter.png';
        link.click();
    };

    // خروجی PDF
    const handleExportPDF = async () => {
        if (!divRef.current) return;

        const canvas = await html2canvas(divRef.current, { scale: 3, useCORS: true, backgroundColor: 'white' });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');

        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = 210;
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save('letter.pdf');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20, backgroundColor: '#f0f0f0', minHeight: '100vh', boxSizing: 'border-box' }}>
            {/* دکمه‌ها بالای نامه */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button onClick={handleExportPNG} style={{ padding: '10px 20px', fontSize: 16 }}>دانلود PNG</button>
                <button onClick={handleExportPDF} style={{ padding: '10px 20px', fontSize: 16 }}>دانلود PDF</button>
            </div>

            <div
                ref={divRef}
                style={{
                    width: '230mm',
                    minHeight: '320mm',
                    padding: '5mm',
                    backgroundColor: 'white',
                    color: 'black',
                    fontSize: 16,
                    lineHeight: 1.6,
                    boxSizing: 'border-box',
                    border: '3px solid blue',
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <div style={{ width: '100%', height: '120px', marginBottom: '2px', display: 'flex', flexDirection: 'row', border: '2px solid #000', borderRadius: '5px', boxSizing: 'border-box' }}>

                    <div style={{ width: '20%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <img src="/logo/karbargmohaghegh/LogoEntekhabat.png" alt="لوگو اول" style={{ height: '100px', width: '120px', objectFit: 'contain' }} />
                    </div>

                    <div style={{ width: '55%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <img src="/logo/karbargmohaghegh/AdamEmkanTahghigh.png" alt="لوگو دوم" style={{ height: '110px', objectFit: 'contain', margin: 0, padding: 0, display: 'block' }} />
                    </div>

                    <div style={{ width: '25%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: '2px', paddingRight: '5px' }}>
                        <div className='flex items-center justify-end'>
                            <span className="bnaznin text-[18px]">استان :</span>
                            <span className='mx-1 text-[14px]'>آذربایجان شرقی</span>
                        </div>
                        <div className='flex items-center justify-end'>
                            <span className="bnaznin text-[18px]">حوزه انتخابیه:</span>
                            <span className='mx-1 text-[14px]'>تبریز، آذرشهر و اسکو</span>
                        </div>
                        <span className="text-[13px] bnaznin text-right">آیتم محرمانه</span>
                    </div>
                </div>

                <div style={{ width: '100%', minHeight: '160px', marginBottom: '0px', padding: '10px', border: '2px solid #000', borderRadius: '5px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="flex items-center bnaznin text-[18px]" style={{ width: '100%' }}>
                        <span>نام و نام خانوادگی داوطلب :</span>
                        <span style={{ position: 'relative', marginRight: '10px', display: 'inline-block' }}>
                            <span style={{ position: 'relative', zIndex: 1, background: 'white', padding: '0 2px' }}>قاسم صفرزاد</span>
                        </span>

                        <div style={{ width: '30px' }}></div>
                        <span className="ml-2">شماره ملی :</span>
                        <div className="flex gap-1 text-[20px]">
                            {"3125697410".split("").map((num, idx) => (
                                <span key={idx}>{num}</span>
                            ))}
                        </div>


                        <div style={{ width: '30px' }}></div>
                        <span>نام پدر :</span>
                        <span style={{ position: 'relative', marginRight: '10px', display: 'inline-block' }}>
                            <span style={{ position: 'relative', zIndex: 1, background: 'white', padding: '0 2px' }}>قاسم</span>
                        </span>
                    </div>

                    <div className="flex items-center bnaznin text-[18px]" style={{ width: '100%' }}>
                        <span>مشخصات محل تحقیق:</span>
                        <span className='mx-1'> محل کار </span>
                        {/* <div className="w-6 h-6 rounded-full border-black border"></div> */}
                        <span className='mr-35 ml-1'> محل تحصیل </span>
                        {/* <div className="w-6 h-6 rounded-full border-black border"></div> */}
                        <span className='mr-35 ml-1'> محل زندگی </span>
                        {/* <div className="w-6 h-6 rounded-full border-black border"></div> */}
                    </div>

                    <div className="flex items-center bnaznin text-[18px]" style={{ width: '100%' }}>
                        <span>آدرس دقیق محل تحقیق : </span>
                    </div>

                    <div className="flex items-center bnaznin text-[18px]" style={{ width: '100%' }}>
                        <span>مشخصات منبع : </span>
                        <span className='mx-1'> شناسه منبع </span>
                        <span className='rounded-2xl px-3 mx-1'>  2514521 </span>
                        <span className='mx-1'>  مدت آشنایی با داوطلب : </span>
                        <span className='rounded-2xl px-3 mx-1'>  1380-1404 </span>

                        <span className='mx-1'>  شغل : </span>
                        <span className='rounded-2xl px-2 mx-1'>  کارمند </span>

                        <span className='mx-1'>  تحصیلات : </span>
                        <span className='rounded-2xl px-3 mx-1'>  فوق لیسانس </span>
                    </div>
                </div>

                <div style={{ width: '100%', flex: 1, padding: '5px', border: '2px solid #000', borderRadius: '5px', boxSizing: 'border-box', marginTop: '4px' }}>
                    <h3 className='bnaznin' style={{ marginBottom: '10px', fontSize: '20px' }}> شرح گزارش و دلایل عدم امکان تحقیق : </h3>
                </div>

            </div>
        </div>
    );
}
