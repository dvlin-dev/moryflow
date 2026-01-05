import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const TableRowIcon = memo(({ className, ...props }: SvgProps) => {
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
        d="M5 4C4.44772 4 4 4.44772 4 5V8H20V5C20 4.44772 19.5523 4 19 4H5ZM2 5V9V15V19C2 20.6569 3.34315 22 5 22H19C20.6569 22 22 20.6569 22 19V15V9V5C22 3.34315 20.6569 2 19 2H5C3.34315 2 2 3.34315 2 5ZM20 14V10H4V14H20ZM4 16H20V19C20 19.5523 19.5523 20 19 20H5C4.44772 20 4 19.5523 4 19V16Z"
        fill="currentColor"
      />
    </svg>
  )
})

TableRowIcon.displayName = "TableRowIcon"
