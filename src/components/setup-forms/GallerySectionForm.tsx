import { useTranslation } from "react-i18next";
import { useApp } from "../../contexts/AppContext";
import GalleryArrayEditor from "../GalleryArrayEditor";

export default function GallerySectionForm() {
  const { inviteToken } = useApp();
  const { t } = useTranslation();

  return (
    <GalleryArrayEditor inviteToken={inviteToken} t={t} />
  );
}
