export const CommandPalette = ({ isOpen, onClose, onCommand }: any) => {
  if (!isOpen) return null;
  return (
    <div className="absolute inset-0 z-50 bg-black/80 p-4" onClick={onClose}>
      <div className="bg-[#0a0a0a] border border-cyan-500/30 rounded-lg p-2" onClick={e => e.stopPropagation()}>
        <input autoFocus className="w-full bg-transparent p-2 text-white outline-none" placeholder="CMD >" />
        <div className="flex flex-col gap-1 mt-2">
           <button onClick={() => { onCommand('save'); onClose(); }} className="text-left text-xs p-2 hover:bg-white/5">SALVAR WORKSPACE</button>
           <button onClick={() => { onCommand('run'); onClose(); }} className="text-left text-xs p-2 hover:bg-white/5">EXECUTAR SCRIPT</button>
        </div>
      </div>
    </div>
  );
};