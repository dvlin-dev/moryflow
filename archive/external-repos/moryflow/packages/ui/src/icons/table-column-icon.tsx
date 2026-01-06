import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const TableColumnIcon = memo(({ className, ...props }: SvgProps) => {
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
        d="M4 5C4 4.44772 4.44772 4 5 4H8V20H5C4.44772 20 4 19.5523 4 19V5ZM9 22H5C3.34315 22 2 20.6569 2 19V5C2 3.34315 3.34315 2 5 2H9H15H19C20.6569 2 22 3.34315 22 5V19C22 20.6569 20.6569 22 19 22H15H9ZM14 20H10V4H14V20ZM16 20H19C19.5523 20 20 19.5523 20 19V5C20 4.44772 19.5523 4 19 4H16V20Z"
        fill="currentColor"
      />
    </svg>
  )
})

TableColumnIcon.displayName = "TableColumnIcon"
