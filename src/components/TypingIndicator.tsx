export default function TypingIndicator() {
  return (
    <div className="flex gap-1 px-4 py-3">
      <div className="w-2 h-2 rounded-full bg-gray-400 dot-1" />
      <div className="w-2 h-2 rounded-full bg-gray-400 dot-2" />
      <div className="w-2 h-2 rounded-full bg-gray-400 dot-3" />
    </div>
  );
}
