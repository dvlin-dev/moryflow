import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const AddColRightIcon = memo(({ className, ...props }: SvgProps) => {
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
        d="M9 2C10.6569 2 12 3.34315 12 5V19C12 20.6569 10.6569 22 9 22H5C3.34315 22 2 20.6569 2 19V5C2 3.34315 3.34315 2 5 2H9ZM4 19C4 19.5523 4.44772 20 5 20H9C9.55228 20 10 19.5523 10 19V13H4V19ZM5 4C4.44772 4 4 4.44772 4 5V11H10V5C10 4.44772 9.55228 4 9 4H5Z"
        fill="currentColor"
      />
      <path
        d="M18 8C18.5523 8 19 8.44772 19 9V11H21C21.5523 11 22 11.4477 22 12C22 12.5523 21.5523 13 21 13H19V15C19 15.5523 18.5523 16 18 16C17.4477 16 17 15.5523 17 15V13H15C14.4477 13 14 12.5523 14 12C14 11.4477 14.4477 11 15 11H17V9C17 8.44772 17.4477 8 18 8Z"
        fill="currentColor"
      />
    </svg>
  )
})

AddColRightIcon.displayName = "AddColRightIcon"
