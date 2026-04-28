export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full space-y-3">
        <div className="eyebrow text-rust">/ EXCAVATING</div>
        <div className="space-y-2">
          <div className="h-3 skeleton" />
          <div className="h-3 skeleton w-2/3" />
          <div className="h-3 skeleton w-1/2" />
        </div>
      </div>
    </div>
  );
}
