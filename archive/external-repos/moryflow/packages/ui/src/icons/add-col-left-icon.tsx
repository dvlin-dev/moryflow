import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const AddColLeftIcon = memo(({ className, ...props }: SvgProps) => {
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
        d="M19 2C20.6569 2 22 3.34315 22 5V19C22 20.6569 20.6569 22 19 22H15C13.3431 22 12 20.6569 12 19V5C12 3.34315 13.3431 2 15 2H19ZM14 19C14 19.5523 14.4477 20 15 20H19C19.5523 20 20 19.5523 20 19V13H14V19ZM15 4C14.4477 4 14 4.44772 14 5V11H20V5C20 4.44772 19.5523 4 19 4H15Z"
        fill="currentColor"
      />
      <path
        d="M6 8C6.55228 8 7 8.44772 7 9V11H9C9.55228 11 10 11.4477 10 12C10 12.5523 9.55228 13 9 13H7V15C7 15.5523 6.55228 16 6 16C5.44772 16 5 15.5523 5 15V13H3C2.44772 13 2 12.5523 2 12C2 11.4477 2.44772 11 3 11H5V9C5 8.44772 5.44772 8 6 8Z"
        fill="currentColor"
      />
    </svg>
  )
})

AddColLeftIcon.displayName = "AddColLeftIcon"
