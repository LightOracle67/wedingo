const CornerDecorations = ({ src }: { src?: string | undefined }) => (
  <div className="story-card__backdrop" aria-hidden="true">
    <div className="story-card__pattern" />
    {src ? (
      <>
        <img src={src} alt="" aria-hidden="true" className="invite-corner invite-corner--tl" />
        <img src={src} alt="" aria-hidden="true" className="invite-corner invite-corner--tr" />
        <img src={src} alt="" aria-hidden="true" className="invite-corner invite-corner--bl" />
        <img src={src} alt="" aria-hidden="true" className="invite-corner invite-corner--br" />
      </>
    ) : null}
  </div>
);

export default CornerDecorations;
