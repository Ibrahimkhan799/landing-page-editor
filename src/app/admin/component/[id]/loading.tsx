export default function ComponentEditorLoading() {
  return (
    <div className="flex h-screen flex-col bg-zinc-100 text-zinc-500">
      <div className="h-11 shrink-0 border-b border-zinc-200 bg-white" />
      <div className="flex min-h-0 flex-1">
        <div className="w-60 shrink-0 border-r border-zinc-200 bg-white" />
        <div className="grid min-w-0 flex-1 place-items-center">
          <div className="flex items-center gap-2 text-xs">
            <span className="size-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" />
            Opening component editor…
          </div>
        </div>
        <div className="w-64 shrink-0 border-l border-zinc-200 bg-white" />
      </div>
    </div>
  );
}
