import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const ImageCaptionIcon = memo(({ className, ...props }: SvgProps) => {
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
        d="M7 22C7 21.4477 7.44772 21 8 21H16C16.5523 21 17 21.4477 17 22C17 22.5523 16.5523 23 16 23H8C7.44772 23 7 22.5523 7 22Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3 18C3 17.4477 3.44772 17 4 17H20C20.5523 17 21 17.4477 21 18C21 18.5523 20.5523 19 20 19H4C3.44772 19 3 18.5523 3 18Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3 5C3 3.34315 4.34315 2 6 2H18C19.6569 2 21 3.34315 21 5V11C21 12.6569 19.6569 14 18 14H6C4.34315 14 3 12.6569 3 11V5ZM6 4C5.44772 4 5 4.44772 5 5V11C5 11.5523 5.44772 12 6 12H18C18.5523 12 19 11.5523 19 11V5C19 4.44772 18.5523 4 18 4H6Z"
        fill="currentColor"
      />
    </svg>
  )
})

ImageCaptionIcon.displayName = "ImageCaptionIcon"
