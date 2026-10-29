// Ошибка от сервера (409 email занят, 401 неверный пароль и т. п.)
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {message}
    </p>
  );
}
