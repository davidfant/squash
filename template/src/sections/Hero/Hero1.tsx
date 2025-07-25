import { useTranslation } from "react-i18next";
import { Link } from "react-router";

export const name = "My Hero 1";

export default () => {
  const { t } = useTranslation("hero");
  return (
    <div className="w-screen aspect-video bg-blue-100 flex flex-col items-center justify-center">
      <h1 className="text-blue-500 text-4xl font-bold">{t("title")}</h1>
      <p className="text-blue-500 text-2xl">{t("description")}</p>
      <Link to="/about">About</Link>
    </div>
  );
};
