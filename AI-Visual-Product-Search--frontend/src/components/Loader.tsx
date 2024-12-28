export default function Loader({ message }: { message?: string }) {
    return (
      <div className="loader-container">
        <div className="loader"></div>
        <p className="loader-message">{message || 'Loading...'}</p>
      </div>
    );
  }
