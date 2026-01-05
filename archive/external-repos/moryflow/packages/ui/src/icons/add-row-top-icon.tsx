import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const AddRowTopIcon = memo(({ className, ...props }: SvgProps) => {
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
        d="M19 12C20.6569 12 22 13.3431 22 15V19C22 20.6569 20.6569 22 19 22H5C3.34315 22 2 20.6569 2 19V15C2 13.3431 3.34315 12 5 12H19ZM5 14C4.44772 14 4 14.4477 4 15V19C4 19.5523 4.44772 20 5 20H11V14H5ZM13 20H19C19.5523 20 20 19.5523 20 19V15C20 14.4477 19.5523 14 19 14H13V20Z"
        fill="currentColor"
      />
      <path
        d="M12 2C12.5523 2 13 2.44772 13 3V5H15C15.5523 5 16 5.44772 16 6C16 6.55228 15.5523 7 15 7H13V9C13 9.55228 12.5523 10 12 10C11.4477 10 11 9.55228 11 9V7H9C8.44772 7 8 6.55228 8 6C8 5.44772 8.44772 5 9 5H11V3C11 2.44772 11.4477 2 12 2Z"
        fill="currentColor"
      />
    </svg>
  )
})

AddRowTopIcon.displayName = "AddRowTopIcon"
