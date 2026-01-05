import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const AddRowBottomIcon = memo(({ className, ...props }: SvgProps) => {
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
        d="M12 14C12.5523 14 13 14.4477 13 15V17H15C15.5523 17 16 17.4477 16 18C16 18.5523 15.5523 19 15 19H13V21C13 21.5523 12.5523 22 12 22C11.4477 22 11 21.5523 11 21V19H9C8.44772 19 8 18.5523 8 18C8 17.4477 8.44772 17 9 17H11V15C11 14.4477 11.4477 14 12 14Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M19 2C20.6569 2 22 3.34315 22 5V9C22 10.6569 20.6569 12 19 12H5C3.34315 12 2 10.6569 2 9V5C2 3.34315 3.34315 2 5 2H19ZM5 4C4.44772 4 4 4.44772 4 5V9C4 9.55228 4.44772 10 5 10H11V4H5ZM13 10H19C19.5523 10 20 9.55228 20 9V5C20 4.44772 19.5523 4 19 4H13V10Z"
        fill="currentColor"
      />
    </svg>
  )
})

AddRowBottomIcon.displayName = "AddRowBottomIcon"
