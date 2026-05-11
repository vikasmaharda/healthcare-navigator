import { createContext, useContext } from "react";

export type Lang = "en" | "hi";

export const dict: Record<Lang, Record<string, string>> = {
  en: {
    home: "Home", hospitals: "Hospitals", doctors: "Doctors", appointments: "Appointments",
    emergency: "Emergency", ai: "AI Assistant", blood: "Blood Bank", pharmacy: "Pharmacy",
    schemes: "Govt Schemes", records: "My Records", login: "Login", logout: "Logout",
    smartSearch: "Smart Search — try 'chest pain', 'cardiologist Mumbai', 'AIIMS'",
    sosTitle: "Emergency SOS",
    book: "Book Appointment",
    nearby: "Nearby Hospitals",
    compare: "Compare",
  },
  hi: {
    home: "होम", hospitals: "अस्पताल", doctors: "डॉक्टर", appointments: "अपॉइंटमेंट",
    emergency: "इमरजेंसी", ai: "एआई सहायक", blood: "ब्लड बैंक", pharmacy: "फार्मेसी",
    schemes: "सरकारी योजनाएं", records: "मेरे रिकॉर्ड", login: "लॉगिन", logout: "लॉगआउट",
    smartSearch: "स्मार्ट खोज — 'सीने में दर्द', 'कार्डियोलॉजिस्ट मुंबई'",
    sosTitle: "आपातकालीन SOS",
    book: "अपॉइंटमेंट बुक करें",
    nearby: "नजदीकी अस्पताल",
    compare: "तुलना करें",
  },
};

export const I18nContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string }>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

export const useI18n = () => useContext(I18nContext);
