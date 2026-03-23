interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DashboardConfirmation({ onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75">
      <div className="rounded-2xl bg-white p-8 max-w-md text-center space-y-4 shadow-2xl">
        <div className="text-6xl">🚀</div>
        <h3 className="text-2xl font-bold text-gray-900">¿Ir al Hub?</h3>
        <p className="text-gray-600">Volverás al panel principal de MEWE Training</p>
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={onCancel}
            className="rounded-lg bg-gray-200 px-6 py-3 text-gray-800 transition-colors hover:bg-gray-300"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-gradient-to-r from-pink-500 to-blue-600 px-6 py-3 text-white transition-colors hover:opacity-90"
          >
            Ir al Hub
          </button>
        </div>
      </div>
    </div>
  );
}
