export default function VideoPlayer({ src, type }) {
  return (
    <div className="video-container">
      <video preload="metadata" controls>
        <source src={src} type={type} />
        Sorry, your browser does not support embedded videos.
      </video>
    </div>
  );
}
