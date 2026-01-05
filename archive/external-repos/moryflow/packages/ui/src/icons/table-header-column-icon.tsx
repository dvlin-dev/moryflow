import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const TableHeaderColumnIcon = memo(
  ({ className, ...props }: SvgProps) => {
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
          d="M22 19V5C22 3.34315 20.6569 2 19 2H5C3.34315 2 2 3.34315 2 5V19C2 20.6569 3.34315 22 5 22H19C20.6569 22 22 20.6569 22 19ZM8 20V16H20V19C20 19.5523 19.5523 20 19 20H8ZM8 14L20 14V10L8 10V14ZM20 8L8 8V4H19C19.5523 4 20 4.44772 20 5V8Z"
          fill="currentColor"
        />
      </svg>
    )
  }
)

TableHeaderColumnIcon.displayName = "TableHeaderColumnIcon"
