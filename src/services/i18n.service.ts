import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ptBR from "@/locales/pt-BR.json";

i18n.use(initReactI18next).init({
  lng: "pt-BR",
  fallbackLng: "pt-BR",
  resources: {
    "pt-BR": { translation: ptBR },
  },
  interpolation: {
    escapeValue: false, // React já escapa por padrão
  },
});

export default i18n;
