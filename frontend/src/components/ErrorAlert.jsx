function ErrorAlert({ message }) {
  if (!message) return null;

  return (
    <div className="whitespace-pre-line rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      {message}
    </div>
  );
}

export default ErrorAlert;
