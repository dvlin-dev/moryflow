import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const TableHeaderRowIcon = memo(({ className, ...props }: SvgProps) => {
  return (
    <svg
      width="24"
      height="24"
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2 5V7V19C2 20.6569 3.34315 22 5 22H19C20.6569 22 22 20.6569 22 19V7V5C22 3.34315 20.6569 2 19 2H5C3.34315 2 2 3.34315 2 5ZM20 19V8H16V20H19C19.5523 20 20 19.5523 20 19ZM14 20L14 8H10L10 20H14ZM8 20L8 8H4V19C4 19.5523 4.44772 20 5 20H8Z"
        fill="currentColor"
      />
    </svg>
  )
})

TableHeaderRowIcon.displayName = "TableHeaderRowIcon"
