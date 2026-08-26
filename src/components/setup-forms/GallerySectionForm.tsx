import { memo } from "react";
import { useConfigActions } from "../../contexts";
import GalleryArrayEditor from "../GalleryArrayEditor";

const GallerySectionForm = memo(function GallerySectionForm() {
  const { inviteToken } = useConfigActions();

  return <GalleryArrayEditor inviteToken={inviteToken} />;
});

export default GallerySectionForm;
