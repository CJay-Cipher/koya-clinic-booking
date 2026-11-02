import Spinner from "./Spinner.jsx";

const variants = {
  primary: "bg-primary text-paper hover:bg-primary-dark shadow-sm",
  accent: "bg-accent text-white hover:bg-accent-dark shadow-sm",
  outline: "border border-primary/40 text-primary-dark hover:border-primary hover:bg-primary hover:text-paper",
  ghost: "text-ink/70 hover:bg-ink/5 hover:text-ink",
  danger: "border border-danger/40 text-danger hover:border-danger hover:bg-danger hover:text-white",
  light: "border border-paper/40 text-paper hover:bg-paper hover:text-primary-dark",
};
const sizes = { sm: "h-9 px-4 text-sm", md: "h-11 px-6 text-sm" };

export default function Button({ variant = "primary", size = "md", loading = false, loadingText, disabled, className = "", type = "button", children, ...props }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && <Spinner size={14} />}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}
