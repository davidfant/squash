import { useTranslation } from "react-i18next";

export const name = "My Hero";

export default () => {
  const { t } = useTranslation("hero");
  return (
    <div className="w-screen aspect-video bg-red-100 flex flex-col items-center justify-center">
      <h1 className="text-red-500 text-4xl font-bold">{t("title")}</h1>
      <p className="text-red-500 text-2xl">{t("description")}</p>
    </div>
  );
};
