"use client";

export function ConfirmSubmit({
  label,
  confirm,
  className,
}: {
  label: string;
  confirm: string;
  className: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(confirm)) event.preventDefault();
      }}
    >
      {label}
    </button>
  );
}
