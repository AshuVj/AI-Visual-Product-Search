// components/ErrorDisplay.tsx
export default function ErrorDisplay({ error, onRetry }: { error: string; onRetry?: () => void }) {
    return (
      <div className="text-center py-8 px-4 bg-red-50 rounded-lg">
        <p className="text-red-600 text-lg font-medium">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }
  