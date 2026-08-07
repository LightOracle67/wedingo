import { useConfig } from "../../contexts";
import GalleryArrayEditor from "../GalleryArrayEditor";

export default function GallerySectionForm() {
  const { inviteToken } = useConfig();

  return (
    <GalleryArrayEditor inviteToken={inviteToken} />
  );
}
