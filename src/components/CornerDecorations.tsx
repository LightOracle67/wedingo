const CornerDecorations = ({ src }: { src?: string | undefined }) => {
  if (!src) return null;
  return (
    <>
      <img src={src} alt="" aria-hidden="true" className="invite-corner invite-corner--tl" />
      <img src={src} alt="" aria-hidden="true" className="invite-corner invite-corner--tr" />
      <img src={src} alt="" aria-hidden="true" className="invite-corner invite-corner--bl" />
      <img src={src} alt="" aria-hidden="true" className="invite-corner invite-corner--br" />
    </>
  );
};

export default CornerDecorations;
