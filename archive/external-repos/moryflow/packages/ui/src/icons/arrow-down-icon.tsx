import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const ArrowDownIcon = memo(({ className, ...props }: SvgProps) => {
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
        d="M12.707 19.707C12.3165 20.0976 11.6835 20.0976 11.293 19.707L4.29297 12.707C3.90245 12.3165 3.90245 11.6835 4.29297 11.293C4.68349 10.9024 5.31651 10.9024 5.70703 11.293L11 16.5859L11 5C11 4.44771 11.4477 4 12 4C12.5523 4 13 4.44771 13 5L13 16.5859L18.293 11.293C18.6835 10.9024 19.3165 10.9024 19.707 11.293C20.0976 11.6835 20.0976 12.3165 19.707 12.707L12.707 19.707Z"
        fill="currentColor"
      />
    </svg>
  )
})

ArrowDownIcon.displayName = "ArrowDownIcon"
