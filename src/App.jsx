export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-boda-fondo">
      <div className="text-center">
        <h1 className="text-5xl font-serif text-boda-texto">
          Nuestra Boda
        </h1>
        <p className="mt-4 text-gray-600">
          12 de septiembre de 2027
        </p>

        <div className="mt-8">
          <button className="px-6 py-2 bg-boda-dorado text-white rounded-full hover:opacity-90 transition">
            Confirmar asistencia
          </button>
        </div>
      </div>
    </div>
  );
}