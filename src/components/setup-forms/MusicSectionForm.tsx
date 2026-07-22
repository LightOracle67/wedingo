import { useTranslation } from "react-i18next";
import { useApp } from "../../contexts/AppContext";
import MusicArrayEditor from "../MusicArrayEditor";

export default function MusicSectionForm() {
  const { inviteToken, formData, updateFormField } = useApp();
  const { t } = useTranslation();

  return (
    <MusicArrayEditor
      inviteToken={inviteToken}
      value={formData.musicFile || formData.musicUrl}
      onChange={(val: string) => updateFormField("musicFile", val)}
      t={t}
    />
  );
}
