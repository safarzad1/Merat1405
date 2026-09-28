
// Start Login



export async function DFNByPID(pid) {
  try {
    const res = await fetch("/Api/DFN/GetDFnByPID", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({ pid }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("خطا در فراخوانی :", error);
    throw error;
  }
}

// End Login
// -------------------------------------------------------------------
export async function Login(username, password, ip) {
  try {
    const res = await fetch("/Api/Users/CheckUserPassword", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password, ip }),
    });

    const data = await res.json();

    return data;
  } catch (error) {
    console.error("خطا در فراخوانی :", error);
    throw error;
  }
}

// -------------------------------------------------------------------
export async function GetTahghighat(
  erjastate,
  codeentekhabat,
  mahalreciver,
  page,
  sizepage,
  indexsort,
  ascdesc,
  search,
  idValue, userId
) {
  try {
    const res = await fetch("/Api/Tahghigh/GetTahghighat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        codeentekhabat,
        mahalreciver,
        erjastate,
        page,
        sizepage,
        indexsort,
        ascdesc,
        search,
        idValue, userId
      }),
    });

    if (res.status === 401) {
      return { status: 401 };
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("خطا در دریافت تحقیقات:", error);
    throw error;
  }
}

// -----------------------------------------------------------------

export async function GetTahghighByID(erjaid, erjaParentId, lenhozeostan) {
  try {
    const res = await fetch("/Api/Tahghigh/GetTahghighByID", {

      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ erjaid, erjaParentId, lenhozeostan }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("خطا در انجام فرآیند:", error);
    throw error;
  }
}
// -----------------------------------------------------------------

export async function DeleteErja(erjaid, userId) {
  try {
    const res = await fetch("/Api/Tahghigh/DeleteErjaByID", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({ erjaid, userId }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("خطا در انجام فرآیند:", error);
    throw error;
  }
}
// -----------------------------------------------------------------

export async function DeleteErjabyId(erjaid, userId) {
  try {
    const res = await fetch("/Api/Tahghigh/DeleteErjaByID", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({ erjaid, userId }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("خطا در انجام فرآیند:", error);
    throw error;
  }
}
// -----------------------------------------------------------------
export async function DeleteErjaTahghighbyId(id, userId, sharh) {
  try {
    const res = await fetch("/Api/Tahghigh/DeleteErjaByTahghighID", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({ id, userId, sharh }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("خطا در انجام فرآیند:", error);
    throw error;
  }
}
// -----------------------------------------------------------------
export async function GetTahghigh_Mohagheghin(erjaid) {
  try {
    const res = await fetch("/Api/Tahghigh/GetTahghigh_Mohagheghin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({ erjaid }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("خطا در انجام فرآیند:", error);
    throw error;
  }
}
// -----------------------------------------------------------------

export async function MohagheghEntekhabat(codeEntekhabat, mahal, noeHamkari, vije) {
  try {
    const res = await fetch("/Api/Mohaghegh/InEntekhabat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({ codeEntekhabat, mahal, noeHamkari, vije }),
    });
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("خطا در اجرای فرآیند:", error);
    throw error;
  }
}

// -----------------------------------------------------------------

export async function ErjaBeMohaghegh(
  erjaId, perjaId, codeMohaghegh, expireDate, description, userId, isInsert
) {
  try {
    const res = await fetch("/Api/Mohaghegh/ErjaBeMohaghegh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({
        erjaId, perjaId, codeMohaghegh, expireDate, description, userId, isInsert
      }),
    });
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("خطا در اجرای فرآیند:", error);
    throw error;
  }
}
// -----------------------------------------------------------------
export async function Get_Tahghigh_Karbarg(
  taghighid
) {
  // console.log("taghighid = "+taghighid);
  try {
    const res = await fetch("/Api/Tahghigh/Tahghigh_Karbarg", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({
        taghighid
      }),
    });
    const data = await res.json();

    return data;
  } catch (error) {
    console.error("خطا در اجرای فرآیند:", error);
    throw error;
  }
}


// -----------------------------------------------------------------
export async function InsertKarbarg(
  karbargid, tahghightype, typeMahalTahghigh, azSal, taSal
  , CodeManba, tahghighid, tozihat, nahve_Ashnai, userid
  , noeParvandeh, nameSazman, nameShahr, naveBazkhani, peyvast
) {

  try {
    const res = await fetch("/Api/Mohaghegh/AddKarbarg", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({
        karbargid, tahghightype, typeMahalTahghigh, azSal, taSal
        , CodeManba, tahghighid, tozihat, nahve_Ashnai, userid
        , noeParvandeh, nameSazman, nameShahr, naveBazkhani, peyvast
      }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("خطا در فراخوانی :", error);
    throw error;
  }
}

// -----------------------------------------------------------------
export async function DeleteKarbargTahghigh(karbargid, userid) {
  try {
    const res = await fetch("/Api/Mohaghegh/DeleteKarbarg", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({ karbargid, userid }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("خطا در فراخوانی :", error);
    throw error;
  }
}

// -----------------------------------------------------------------
export async function InsertKarbargTahghighPeyvast(karbargid, filename, fileextend, filesize, userid) {
  try {
    const res = await fetch("/Api/Mohaghegh/AddPeyvastTahghigh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({ karbargid, filename, fileextend, filesize, userid }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("خطا در فراخوانی :", error);
    throw error;
  }
}

// -----------------------------------------------------------------
export async function GetKarbargPeyvast(karbargid) {
  try {
    const res = await fetch("/Api/Mohaghegh/GetKarbargPeyvast", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({ karbargid }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("خطا در فراخوانی :", error);
    throw error;
  }
}

// -----------------------------------------------------------------
export async function DeletePeyvastTahghigh(filename, userid) {
  try {
    const res = await fetch("/Api/Mohaghegh/DeletePeyvastTahghigh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({ filename, userid }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("خطا در فراخوانی :", error);
    throw error;
  }
}
// -----------------------------------------------------------------
export async function UpdateDoneKarbarg(karbargid, isdone, userid) {
  try {
    const res = await fetch("/Api/Mohaghegh/UpdateDoneKarbarg", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({ karbargid, isdone, userid }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("خطا در فراخوانی :", error);
    throw error;
  }
}
// -----------------------------------------------------------------

export async function JambandiMohagheghPeyvast(tahghighid, fileName, fileExtend, fileSize, userid) {
  try {
    const res = await fetch("/Api/Mohaghegh/JambandiMohagheghPeyvast", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({ tahghighid, fileName, fileExtend, fileSize, userid }),
    });

    const data = await res.json();
    console.log(data);

    return data;
  } catch (error) {
    console.error("خطا در انجام فرآیند:", error);
    throw error;
  }
}
// -----------------------------------------------------------------
export async function GetJambandiMohagheghPeyvast(tahghighid) {
  try {
    const res = await fetch("/Api/Mohaghegh/GetJambandiMohagheghPeyvast", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({ tahghighid }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("خطا در انجام فرآیند:", error);
    throw error;
  }
}
export async function GetJambandiOstanPeyvast(erjaid) {
  try {
    const res = await fetch("/Api/Tahghigh/GetJambandiOstanPeyvast", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({ erjaid }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("خطا در انجام فرآیند:", error);
    throw error;
  }
}


// -----------------------------------------------------------------

export async function UpdateEghdamMohaghegh(tahghighid, isdone, sharheghdam, userid) {
  try {
    const res = await fetch("/Api/Mohaghegh/UpdateEghdamMohaghegh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({ tahghighid, isdone, sharheghdam, userid }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("خطا در انجام فرآیند:", error);
    throw error;
  }
}
// -----------------------------------------------------------------

export async function UpdateEghdamErja(erjaid, isdone, sharheghdam, userid) {
  try {
    const res = await fetch("/Api/Tahghigh/UpdateEghdamErja", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({ erjaid, isdone, sharheghdam, userid }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("خطا در انجام فرآیند:", error);
    throw error;
  }
}
// -----------------------------------------------------------------
export async function GetUsers() {
  try {
    const res = await fetch("/Api/getUsers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },

    });

    const data = await res.json();
    console.log(data);
    return data.data;
  } catch (error) {
    console.error("خطا در انجام فرآیند:", error);
    throw error;
  }
}
// -----------------------------------------------------------------
export async function Delete_JambandiMohagheh_Peyvast(tahghighId, fileName, userid) {
  try {

    const res = await fetch("/Api/Mohaghegh/DeletePeyvastJambandiTahghigh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({ tahghighId, fileName, userid }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("خطا در انجام فرآیند:", error);
    throw error;
  }
}
// -----------------------------------------------------------------
export async function Update_ErjaParvandeh(erjaid, isdone, erjaLastState, sharheghdam, userid) {

  try {
    const res = await fetch("/Api/Tahghigh/UpdateErjaParvandeh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({ erjaid, isdone, erjaLastState, sharheghdam, userid }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("خطا در انجام فرآیند:", error);
    throw error;
  }
}

// -----------------------------------------------------------------
export async function Update_ErjaParvandehState(erjaid, erjaLastState, sharheghdam, userid) {

  try {
    const res = await fetch("/Api/Tahghigh/UpdateStateParvandeh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({ erjaid, erjaLastState, sharheghdam, userid }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("خطا در انجام فرآیند:", error);
    throw error;
  }
}

// -----------------------------------------------------------------
export async function Get_AmarTahghight_Shahrestan(mahal, userId) {
  try {
    const res = await fetch("/Api/Tahghigh/AmarShahrestan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mahal, userId }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("خطا در انجام فرآیند:", error);
    throw error;
  }
}

// -----------------------------------------------------------------
export async function GetJambandiForHozeh(erjaId) {
  try {
    const res = await fetch("/Api/Tahghigh/GetJambandiForHozeh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({ erjaId }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("خطا در انجام فرآیند:", error);
    throw error;
  }
}
// -----------------------------------------------------------------
export async function GetTahghighat_Mohaghegh_ByID(tahghighid) {
  try {
    const res = await fetch("/Api/Mohaghegh/GetTahghighat_Mohaghegh_ByID", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({ tahghighid }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("خطا در انجام فرآیند:", error);
    throw error;
  }
}
// -----------------------------------------------------------------
export async function GetCityFare(cityId) {
  try {
    const res = await fetch("/Api/Citys/GetCityFare", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({ cityId }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("خطا در انجام فرآیند:", error);
    throw error;
  }
}

// -----------------------------------------------------------------
export async function GetKarbargByID(karbargid) {
  try {
    const res = await fetch("/Api/Tahghigh/GetKarbargByID", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({ karbargid }),
    });


    const data = await res.json();

    console.log(data);

    return data;
  } catch (error) {
    console.error("خطا در فراخوانی :", error);
    throw error;
  }
}
// -----------------------------------------------------------------
export async function GetErjaByID(erjaId) {
  try {
    const res = await fetch("/Api/Tahghigh/GetErjaByID", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({ erjaId }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("خطا در فراخوانی :", error);
    throw error;
  }
}
// -----------------------------------------------------------------
export async function JambandiOstan(erjaId) {
  try {
    const res = await fetch("/Api/Tahghigh/JambandiOstan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({ erjaId }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("خطا در فراخوانی :", error);
    throw error;
  }
}
// -----------------------------------------------------------------
export async function InsertJambandiOstan(
  erjaId, pasokh1, pasokh2, pasokh3, pasokh4
  , pasokh5, pasokh6, pasokh7, pasokh8
  , valuesoal1, valuesoal2, valuesoal3, valuesoal4, valuesoal5
  , valuesoal6, valuesoal7, jambandi, filepage1, filepage2, userId
  // , file1, file2
) {

  // console.log(erjaId, pasokh1, pasokh2, pasokh3, pasokh4
  //   , pasokh5, pasokh6, pasokh7, pasokh8
  //   , valuesoal1, valuesoal2, valuesoal3, valuesoal4, valuesoal5
  //   , valuesoal6, valuesoal7, jambandi, filepage1, filepage2, userId);

  try {
    const formData = new FormData();

    formData.append("erjaId", erjaId);
    formData.append("pasokh1", pasokh1);
    formData.append("pasokh2", pasokh2);
    formData.append("pasokh3", pasokh3);
    formData.append("pasokh4", pasokh4);
    formData.append("pasokh5", pasokh5);
    formData.append("pasokh6", pasokh6);
    formData.append("pasokh7", pasokh7);
    formData.append("pasokh8", pasokh8);
    formData.append("valuesoal1", valuesoal1);
    formData.append("valuesoal2", valuesoal2);
    formData.append("valuesoal3", valuesoal3);
    formData.append("valuesoal4", valuesoal4);
    formData.append("valuesoal5", valuesoal5);
    formData.append("valuesoal6", valuesoal6);
    formData.append("valuesoal7", valuesoal7);
    formData.append("jambandi", jambandi);
    formData.append("filepage1", filepage1);
    formData.append("filepage2", filepage2);
    formData.append("userId", userId);

    // if (file1) {
    //   formData.append("file1", file1);
    // }
    // if (file2) {
    //   formData.append("file2", file2);
    // }

    const res = await fetch("/Api/Tahghigh/InsertJambandiOstan", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("خطا در فراخوانی :", error);
    throw error;
  }
}

// -----------------------------------------------------------------

export async function InsertJambandiOstan_Peyvast(erjaId, fileName, fileExtend, fileSize, userid) {
  try {
    const res = await fetch("/Api/Tahghigh/InsertJambandiOstan_Peyvast", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({ erjaId, fileName, fileExtend, fileSize, userid }),
    });

    const data = await res.json();
    console.log(data);

    return data;
  } catch (error) {
    console.error("خطا در انجام فرآیند:", error);
    throw error;
  }
}
// -----------------------------------------------------------------

export async function GetTahghighatState(erjaid) {
  try {
    const res = await fetch("/Api/Tahghigh/GetTahghighatState", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({ erjaid }),
    });

    const data = await res.json();
    console.log(data);

    return data;
  } catch (error) {
    console.error("خطا در انجام فرآیند:", error);
    throw error;
  }
}
// -----------------------------------------------------------------

export async function GetCitys(pcityId) {
  try {
    const res = await fetch("/Api/Citys/GetCitys", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pcityId
      }),
    });

    if (!res.ok) {
      throw new Error("خطا در دریافت شهرها");
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ خطا در فراخوانی GetCitys:", error);
    throw error;
  }
}


// -----------------------------------------------------------------
export async function GetErjaIdByParvandeh(shomarehParvandeh, mahal) {
  try {
    const res = await fetch("/Api/Tahghigh/GetErjaId", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        shomarehParvandeh, mahal
      }),
    });

    if (!res.ok) {
      throw new Error("خطا در دریافت اطلاعات");
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ خطا در فراخوانی GetCitys:", error);
    throw error;
  }
}

// -----------------------------------------------------------------
export async function IranNationalCode(codemelli, userid) {
  try {
    const res = await fetch("/Api/Users/IsValidIranNationalCode", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        codemelli, userid
      }),
    });

    if (!res.ok) {
      throw new Error("خطا در دریافت اطلاعات");
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ خطا در فراخوانی ", error);
    throw error;
  }
}

// -----------------------------------------------------------------
export async function IranTelHamrahCode(telhamrah, userid) {
  try {
    const res = await fetch("/Api/Users/IsValidIranTelHamrah", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        telhamrah, userid
      }),
    });

    if (!res.ok) {
      throw new Error("خطا در دریافت اطلاعات");
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ خطا در فراخوانی ", error);
    throw error;
  }
}
// -----------------------------------------------------------------
export async function AddKarbargEmteaz(karbargid, emteyazKeyfi, emteyazPrice, userId) {
  try {
    const res = await fetch("/Api/Tahghigh/InsertKarbargEmteaz", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        karbargid, emteyazKeyfi, emteyazPrice, userId
      }),
    });

    if (!res.ok) {
      throw new Error("خطا در دریافت اطلاعات");
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ خطا در فراخوانی ", error);
    throw error;
  }
}// -----------------------------------------------------------------
export async function JambandiOstan1(erjaid) {
  try {
    const res = await fetch("/Api/Tahghigh/GetJambandiOstan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        erjaid
      }),
    });

    if (!res.ok) {
      throw new Error("خطا در دریافت اطلاعات");
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ خطا در فراخوانی ", error);
    throw error;
  }
}
// -----------------------------------------------------------------
export async function AsddPeyvastKarbargTahghigh(karbargId, fileName, userId, file) {
  try {
    const form = new FormData();
    form.append("karbargId", karbargId);
    form.append("fileName", fileName);
    form.append("userId", String(userId));
    form.append("file", file);

    const res = await fetch("/Api/Tahghigh/InsertPeyvastKarbargTahghigh", {
      method: "POST",
      body: form,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "خطا در آپلود");

    return data;
  } catch (error) {
    console.error("خطا در انجام فرآیند:", error);
    throw error;
  }
}


// -----------------------------------------------------------------
export async function GetListpost(mahal) {
  try {
    const res = await fetch("/Api/Users/Getpost", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mahal
      }),
    });

    if (!res.ok) {
      throw new Error("خطا در دریافت شهرها");
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ خطا در فراخوانی GetCitys:", error);
    throw error;
  }
}


// -----------------------------------------------------------------
export async function GetParvandehShorayeTahghighByID(erjaId) {
  try {
    const res = await fetch("/Api/ShorayeTahghigh/GetTahghigh_Shoraye_ErjaId", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        erjaId
      }),
    });

    if (!res.ok) {
      throw new Error("خطا در دریافت شهرها");
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ خطا در فراخوانی GetCitys:", error);
    throw error;
  }
}

// -----------------------------------------------------------------
export async function DeleteParvandehShorayeTahghighByID(erjaId, userId) {
  try {
    const res = await fetch("/Api/ShorayeTahghigh/DeleteShoreyeTahghigh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        erjaId, userId
      }),
    });

    if (!res.ok) {
      throw new Error("خطا در دریافت شهرها");
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ خطا در فراخوانی GetCitys:", error);
    throw error;
  }
}

// -----------------------------------------------------------------
export async function GetJambandiNahiiOstan(erjaid) {
  try {
    const res = await fetch("/Api/Tahghigh/GetJambandiOstan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        erjaid
      }),
    });

    if (!res.ok) {
      throw new Error("خطا در دریافت ");
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ خطا در فراخوانی :", error);
    throw error;
  }
}
// -----------------------------------------------------------------
export async function GetCheckEmteyaz(shomarehParvandeh) {
  try {
    const res = await fetch("/Api/Tahghigh/CheckEmteyaz", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        shomarehParvandeh
      }),
    });

    if (!res.ok) {
      throw new Error("خطا در دریافت ");
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ خطا در فراخوانی :", error);
    throw error;
  }
}
