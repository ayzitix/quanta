import { additionalIcons, additionalIconViewBox } from "./icon/additional-icons"
import { solar } from "./solar"

// Consumers center the SVG viewport, so each icon must center its artwork within its viewBox.
const icons = {
  lock: {
    viewBox: "0 0 16 16",
    body: `<rect x="3.5" y="7" width="9" height="7" rx="1" stroke="currentColor"/><path d="M5 7V5a3 3 0 0 1 6 0v2M8 10v1" stroke="currentColor" stroke-linecap="round"/>`,
  },
  globe: {
    viewBox: "0 0 16 16",
    body: `<circle cx="8" cy="8" r="6" stroke="currentColor"/><ellipse cx="8" cy="8" rx="2.5" ry="6" stroke="currentColor"/><path d="M2 8h12" stroke="currentColor"/>`,
  },
  flask: {
    viewBox: "0 0 16 16",
    body: `<path d="M5.5 2H10.5M6 2V6L2.5 12C2 13 2.5 14 3.5 14H12.5C13.5 14 14 13 13.5 12L10 6V2M4.25 9H11.75" stroke="currentColor" stroke-linecap="square" stroke-linejoin="round"/>`,
  },
  edit: {
    viewBox: "0 0 16 16",
    body: `<path d="M13.5556 8.21529V13.5556H2.44446L2.44446 2.44445H7.78474M6.00002 8.16216V10H7.83786L14 3.83784L12.1622 2L6.00002 8.16216Z" stroke="currentColor"/>`,
  },
  "folder-add-left": {
    viewBox: "0 0 16 16",
    body: `<path d="M7.5 13.3333H1.5V2H6.83333L8.83333 4H14.8333V6M10.1667 11.3333H15.5M12.8333 8.66667V14" stroke="currentColor" stroke-miterlimit="10" stroke-linecap="square"/>`,
  },
  branch: {
    viewBox: "0 0 16 16",
    body: `<path d="M5.118 5.686V10.314M5.118 5.686C5.97 5.686 6.661 4.995 6.661 4.143C6.661 3.291 5.97 2.6 5.118 2.6C4.266 2.6 3.575 3.291 3.575 4.143C3.575 4.995 4.266 5.686 5.118 5.686ZM5.118 10.314C4.266 10.314 3.575 11.005 3.575 11.857C3.575 12.709 4.266 13.4 5.118 13.4C5.97 13.4 6.661 12.709 6.661 11.857M5.118 10.314C5.97 10.314 6.661 11.005 6.661 11.857M10.882 5.686C11.734 5.686 12.425 4.995 12.425 4.143C12.425 3.291 11.734 2.6 10.882 2.6C10.03 2.6 9.339 3.291 9.339 4.143C9.339 4.995 10.03 5.686 10.882 5.686ZM10.882 5.686V9.457C10.882 10.783 9.807 11.857 8.482 11.857H6.661" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  "branch-out": {
    viewBox: "0 0 16 16",
    body: `<path d="M10.4225 3.35355L12.9024 5.83344L10.4225 8.31333" stroke="currentColor"/><path d="M1 12.2852H4.23042C4.89912 12.2852 5.52359 11.951 5.89452 11.3946L9.00783 6.72462C8.37877 6.16823 10.0032 5.83402 10.6719 5.83402H12.9024" stroke="currentColor"/><path d="M8.5 12.2852H14" stroke="currentColor" stroke-linejoin="round"/>`,
  },
  "grid-plus": {
    viewBox: "0 0 16 16",
    body: `<path d="M13.9948 11.668H9.32812M11.6641 9.33203V13.9987M6.66667 9.33203V13.9987H2V9.33203H6.66667ZM6.66667 2V6.66667H2V2H6.66667ZM13.9948 2V6.66667H9.32812V2H13.9948Z" stroke="currentColor" stroke-miterlimit="10" stroke-linecap="square"/>`,
  },
  help: {
    viewBox: "0 0 16 16",
    body: `<path d="M6.33345 6.33349V5.00015H9.66679V7.00015L8.00015 8.00015V9.66679M8.27485 11.6819H7.71897M14.4446 8.00011C14.4446 11.5593 11.5593 14.4446 8.00011 14.4446C4.44094 14.4446 1.55566 11.5593 1.55566 8.00011C1.55566 4.44094 4.44094 1.55566 8.00011 1.55566C11.5593 1.55566 14.4446 4.44094 14.4446 8.00011Z" stroke="currentColor" stroke-linecap="square"/>`,
  },
  info: {
    viewBox: "0 0 16 16",
    body: `<g transform="translate(2 2)"><path d="M12 12H0V0H12V12ZM1 1V11H11V1H1ZM6.5791 4.81641V9.37207H5.5791V5.81641H4.46777V4.81641H6.5791ZM6.85645 2.62891V3.62891H5.30078V2.62891H6.85645Z" fill="currentColor"/></g>`,
  },
  "circle-exclamation": {
    viewBox: "0 0 16 16",
    body: `<path d="M8.75 11.75H7.25V10.25H8.75V11.75Z" fill="currentColor"/><path d="M8.75 9.25H7.25V4.25H8.75V9.25Z" fill="currentColor"/><path fill-rule="evenodd" clip-rule="evenodd" d="M8 1C9.93286 1 11.684 1.7836 12.9502 3.0498C14.2164 4.31601 15 6.06714 15 8C15 11.866 11.866 15 8 15C6.06714 15 4.31601 14.2164 3.0498 12.9502C1.7836 11.684 1 9.93286 1 8C1 4.13401 4.13401 1 8 1ZM8 2C4.68629 2 2 4.68629 2 8C2 9.65699 2.67148 11.1559 3.75781 12.2422C4.84415 13.3285 6.34301 14 8 14C11.3137 14 14 11.3137 14 8C14 6.34301 13.3285 4.84415 12.2422 3.75781C11.1559 2.67148 9.65699 2 8 2Z" fill="currentColor"/>`,
  },
  status: {
    viewBox: "0 0 20 20",
    body: `<path d="M2 10V18H18V10M2 10V2H18V10M2 10H18M5 6H9M5 14H9" stroke="currentColor"/>`,
  },
  "status-active": {
    viewBox: "0 0 20 20",
    body: `<path d="M18 2H2V10H18V2Z" fill="currentColor" fill-opacity="0.1"/><path d="M2 18H18V10H2V18Z" fill="currentColor" fill-opacity="0.1"/><path d="M2 10V18H18V10M2 10V2H18V10M2 10H18M5 6H9M5 14H9" stroke="currentColor"/>`,
  },
  menu: {
    viewBox: "0 0 16 16",
    body: `<path d="M2 8H14M2 4.664H14M2 11.336H14" stroke="currentColor"/>`,
  },
  plus: {
    viewBox: "0 0 16 16",
    body: `<path d="M8 2.88867V13.1109" stroke="currentColor" stroke-linejoin="round"/><path d="M2.88867 8H13.1109" stroke="currentColor" stroke-linejoin="round"/>`,
  },
  "chevron-down": {
    viewBox: "0 0 16 16",
    body: `<path d="M5 6.5L8 9.5L11 6.5" stroke="currentColor"/>`,
  },
  collapse: {
    viewBox: "0 0 16 16",
    body: `<path d="M8 1V6M11 3L8 6L5 3" stroke="currentColor"/><path d="M8 15V10M11 13L8 10L5 13" stroke="currentColor"/><path d="M4 8H6" stroke="currentColor"/><path d="M7 8H9" stroke="currentColor"/><path d="M10 8H12" stroke="currentColor"/>`,
  },
  check: {
    viewBox: "0 0 16 16",
    body: `<path d="M3.53613 8.17857L6.39328 11.75L12.4647 4.25" stroke="currentColor"/>`,
  },
  monitor: {
    viewBox: "0 0 16 16",
    body: `<path d="M4.05559 9.38889H0.500007C0.500007 9.38889 0.500017 8.59298 0.500017 7.61112V2.27778C0.500017 1.29594 0.500102 0.5 0.500102 0.5H13.3889C13.3889 0.5 13.3889 1.29594 13.3889 2.27778V7.61112C13.3889 8.59298 13.3889 9.38889 13.3889 9.38889H9.83336M4.05559 9.38889V11.6111H6.94448H9.83336V9.38889M4.05559 9.38889H9.83336" transform="translate(1.05556 1.94444)" stroke="currentColor"/>`,
  },
  workspace: {
    viewBox: "0 0 16 16",
    body: `<path d="M2 10.668V14.0013H10.6667M13.9974 10.6667V2H2.66406M13.9974 10.668V14.0013H10.6641M2 10V2H5.33333" stroke="currentColor" stroke-miterlimit="10" stroke-linecap="square"/><path d="M10.6693 10.6654V5.33203H5.33594V10.6654H10.6693Z" fill="currentColor"/>`,
  },
  "outline-worktree": {
    viewBox: "0 0 16 16",
    body: `<path d="M12 3.11133L14.3885 5.49977L12 7.88822M14.5 5.49972H10.058L5.13456 11.8139M14.5 11.6606L8.5 11.6606M5.50012 11.6597H1.5" stroke="currentColor"/>`,
  },
  "outline-trash": {
    viewBox: "0 0 16 16",
    body: `<path d="M2.44434 4.22224H13.5554M5.99994 4.22224V2.44446C5.99994 1.95557 5.99992 1.55557 5.99992 1.55557H9.99989C9.99989 1.55557 9.99994 1.95557 9.99994 2.44446V4.22224M6.55545 7.77779L6.7485 11.7778M9.44437 7.77779L9.2513 11.7778M12.1756 6.88891L11.8666 12.7556C11.8168 13.7068 11.7748 14.4445 11.7748 14.4445H4.22511C4.22511 14.4445 4.18392 13.7067 4.13414 12.7556L3.82509 6.88891" stroke="currentColor"/>`,
  },
  close: {
    viewBox: "0 0 20 20",
    body: `<path d="M14.4446 5.55566L5.55566 14.4446M5.55566 5.55566L14.4446 14.4446" stroke="currentColor" stroke-linejoin="round"/>`,
  },
  "outline-xmark": {
    viewBox: "0 0 16 16",
    body: `<path fill-rule="evenodd" clip-rule="evenodd" d="M4.99487 5.70186L7.29297 7.99995L4.99487 10.2981L5.70198 11.0052L8.00008 8.70706L10.2982 11.0052L11.0053 10.2981L8.70718 7.99995L11.0053 5.70186L10.2982 4.99475L8.00008 7.29285L5.70198 4.99475L4.99487 5.70186Z" fill="currentColor"/>`,
  },
  expand: {
    viewBox: "0 0 16 16",
    body: `<path d="M8.25 6.17773V1.17773M11.25 4.17773L8.25 1.17773L5.25 4.17773" stroke="currentColor"/><path d="M8.25 9.17773V14.1777M11.25 11.1777L8.25 14.1777L5.25 11.1777" stroke="currentColor"/><path d="M4.25 7.67773H12.25" stroke="currentColor"/>`,
  },
  filetree: {
    viewBox: "0 0 16 16",
    body: `<path d="M2.5 1.5V12.2484H6.75M2.5 4.74838H6.75" stroke="currentColor"/><rect x="8.5" y="3.2168" width="6" height="3" fill="none" stroke="currentColor"/><rect x="8.5" y="10.75" width="6" height="3" fill="none" stroke="currentColor"/>`,
  },
  split: {
    viewBox: "0 0 16 16",
    body: `<path d="M1 14H15L15 2H1V14Z" stroke="currentColor"/><rect x="3" y="4" width="4" height="8" fill="currentColor" fill-opacity="0.5"/><rect x="9" y="4" width="4" height="8" fill="currentColor" fill-opacity="0.5"/>`,
  },
  unified: {
    viewBox: "0 0 16 16",
    body: `<path d="M3.00001 4.00045L12.9998 4L13 6.99955L3 7L3.00001 4.00045Z" fill="currentColor" fill-opacity="0.5"/><path d="M3.0001 9H13L12.9999 12H3L3.0001 9Z" fill="currentColor" fill-opacity="0.5"/><path d="M1 14H15L15 2H1V14Z" stroke="currentColor"/>`,
  },
  review: {
    viewBox: "0 0 20 20",
    body: `<path d="M7 14.5H13M7 7.99512H10.0049M10.0049 7.99512H13M10.0049 7.99512V5M10.0049 7.99512V11M18 18V2L2 2L2 18H18Z" stroke="currentColor"/>`,
  },
  "window-analytics": {
    viewBox: "0 0 16 16",
    body: `<path d="M14.5 9.8333V13.5H1.5V2.5H7.1667M9.5 2.5V7.5H14.5V2.5H9.5Z" stroke="currentColor" stroke-miterlimit="10" stroke-linecap="square"/>`,
  },
  "graduation-cap": {
    viewBox: "0 0 16 16",
    body: `<path d="M12.3327 7.50065V11.0007L7.99935 13.6673L3.66602 11.0007V7.50065M14.3327 9.83398V6.16732M7.99935 2.33398L1.66602 6.00065L7.99935 10.0007L14.3327 6.00065L7.99935 2.33398Z" stroke="currentColor" stroke-linecap="square"/>`,
  },
  "code-slash": {
    viewBox: "0 0 16 16",
    body: `<path fill-rule="evenodd" clip-rule="evenodd" d="M10.0812 2.10803L6.55974 14.0809L5.92016 13.8928L9.44161 1.91992L10.0812 2.10803ZM4.13793 4.97275L1.44666 8.00045L4.13793 11.0281L3.63966 11.471L0.554688 8.00045L3.63966 4.52984L4.13793 4.97275ZM12.3617 4.52984L15.4467 8.00045L12.3617 11.471L11.8634 11.0281L14.5547 8.00045L11.8634 4.97275L12.3617 4.52984Z" fill="currentColor"/>`,
  },
  "outline-arrow-left": {
    viewBox: "0 0 16 16",
    body: `<path d="M2.44442 7.99999H13.5555M6.22221 4.22222L2.44442 7.99999L6.22221 11.7778" stroke="currentColor"/>`,
  },
  "outline-arrow-right": {
    viewBox: "0 0 16 16",
    body: `<path d="M13.5555 7.99999H2.4444M9.77773 11.7778L13.5555 7.99999L9.77773 4.22222" stroke="currentColor"/>`,
  },
  "outline-arrow-up-right": {
    viewBox: "0 0 16 16",
    body: `<path d="M12.5 3.5L3.5 12.5M12.5 9.62L12.5 3.5L6.38 3.5" stroke="currentColor"/>`,
  },
  "outline-rotate-clockwise": {
    viewBox: "0 0 16 16",
    body: `<path d="M14.1992 8C14.1992 9.18669 13.8473 10.3467 13.188 11.3334C12.5288 12.3201 11.5917 13.0892 10.4953 13.5433C9.39897 13.9974 8.19257 14.1162 7.02868 13.8847C5.86479 13.6532 4.7957 13.0818 3.95658 12.2426C3.11747 11.4035 2.54602 10.3344 2.31451 9.17054C2.083 8.00666 2.20182 6.80026 2.65594 5.7039C3.11007 4.60754 3.87911 3.67047 4.8658 3.01118C5.85249 2.35189 7.01253 2 8.19922 2C9.87922 2 11.4859 2.66667 12.6926 3.82667L14.1992 5.33333M10.866 5.33333L14.1992 5.33333L14.1993 2" stroke="currentColor" stroke-linecap="square" stroke-linejoin="round"/>`,
  },
  "outline-globe": {
    viewBox: "0 0 16 16",
    body: `<path d="M8.00001 14.4445C9.47277 14.4445 10.6667 11.5592 10.6667 8.00001C10.6667 4.44085 9.47277 1.55557 8.00001 1.55557M8.00001 14.4445C6.52725 14.4445 5.33335 11.5592 5.33335 8.00001C5.33335 4.44085 6.52725 1.55557 8.00001 1.55557M8.00001 14.4445C11.5592 14.4445 14.4444 11.5592 14.4444 8C14.4444 4.44083 11.5592 1.55557 8.00001 1.55557M8.00001 14.4445C4.44085 14.4445 1.55556 11.5592 1.55556 8C1.55556 4.44083 4.44085 1.55557 8.00001 1.55557M1.87203 6.00001H14.128M2.03555 10.4445H13.9644" stroke="currentColor"/>`,
  },
  "outline-globe-plus": {
    viewBox: "0 0 16 16",
    body: `<path d="M7 12.6667C5.71133 12.6667 4.66667 10.1296 4.66667 7C4.66667 3.87039 5.71133 1.33333 7 1.33333C8.2426 1.33333 9.25833 3.69221 9.32933 6.66667" stroke="currentColor" stroke-miterlimit="10"/><path d="M12.6667 6.66667H1.33333" stroke="currentColor"/><path d="M12.6667 7.72825V7C12.6667 3.87039 10.1296 1.33333 7 1.33333C3.8704 1.33333 1.33333 3.87039 1.33333 7C1.33333 10.1296 3.8704 12.6667 7 12.6667H7.58694" stroke="currentColor" stroke-miterlimit="10"/><path d="M9.5 11.5H13.5M11.5 9.5V13.5" stroke="currentColor" stroke-miterlimit="10" stroke-linecap="square"/>`,
  },
  "outline-cookie": {
    viewBox: "0 0 16 16",
    body: `<path d="M14 8.5A6 6 0 1 1 7.5 2a2 2 0 0 0 2.5 2.5 2 2 0 0 0 2.5 2.5c.4.6.9 1.1 1.5 1.5Z" stroke="currentColor" stroke-linejoin="round"/><path d="M5.5 6.5h.01M5.5 10h.01M8.5 9h.01M10.5 11.5h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  },
  "outline-browser-annotate": {
    viewBox: "0 0 16 16",
    body: `<path d="M10.6667 2H14V5.33333M2 5.33333V2H5.33333M2 10.6667V14H5.33333" stroke="currentColor" stroke-linecap="square"/><path d="M11.8571 11.8572L14 14M6.50008 6.50033L14.0001 9.00033L9.00008 14.0003L6.50008 6.50033Z" stroke="currentColor" stroke-linecap="square"/>`,
  },
  "outline-arrow-to-corner-top-right": {
    viewBox: "0 0 16 16",
    body: `<path d="M2 8.5V2H14V14H8M5 5.66667H10.3333V11M3.66797 12.333L9.94292 6.05806" stroke="currentColor" stroke-linecap="square"/>`,
  },
  "outline-share": {
    viewBox: "0 0 16 16",
    body: `<path d="M13.5554 10.4445V13.5556C13.5554 13.5556 12.7599 13.5556 11.7777 13.5556H4.22211C3.23989 13.5556 2.44434 13.5556 2.44434 13.5556V10.4445M4.88878 5.55557L7.99989 2.44446L11.111 5.55557M7.99989 2.44446L7.99989 9.11112" stroke="currentColor"/>`,
  },
  "outline-eye": {
    viewBox: "0 0 20 20",
    body: `<path d="M2.5 10s3.33-5.42 7.5-5.42S17.5 10 17.5 10s-3.33 5.42-7.5 5.42S2.5 10 2.5 10Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="10" r="2.5" stroke="currentColor"/>`,
  },
  "outline-eye-slash": {
    viewBox: "0 0 20 20",
    body: `<path d="M2.5 10s3.33-5.42 7.5-5.42S17.5 10 17.5 10s-3.33 5.42-7.5 5.42S2.5 10 2.5 10Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="10" r="2.5" stroke="currentColor"/><path d="M3 3 17 17" stroke="currentColor" stroke-linecap="round"/>`,
  },
  refresh: {
    viewBox: "0 0 20 20",
    body: `<path d="M16.25 7.5A6.5 6.5 0 1 0 16.5 11M16.25 3.5v4h-4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  reset: {
    viewBox: "0 0 20 20",
    body: `<path d="M5.83333 4.16406L2.5 7.4974L5.83333 10.8307M3.33333 7.4974H17.9167V15.4141H10" stroke="currentColor" stroke-linecap="square"/>`,
  },
  "outline-reset": {
    viewBox: "0 0 20 20",
    body: `<path d="M5.83333 4.16406L2.5 7.4974L5.83333 10.8307M3.33333 7.4974H17.9167V15.4141H10" stroke="currentColor" stroke-linecap="square"/>`,
  },
  waveform: {
    viewBox: "0 0 16 16",
    body: `<path d="M2 7V9M4.5 5V11M7 2.5V13.5M9.5 4.5V11.5M12 6V10M14.5 7.25V8.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  },
  archive: {
    viewBox: "0 0 16 16",
    body: `<path d="M13.1112 13.5555V14.0555H13.6112V13.5555H13.1112ZM2.889 13.5555H2.389L2.389 14.0555H2.889V13.5555ZM3.38901 5.55546L3.38901 5.05546L2.38901 5.05546L2.38901 5.55546L2.88901 5.55546L3.38901 5.55546ZM14.4446 2.44434H14.9446V1.94434L14.4446 1.94434L14.4446 2.44434ZM14.4446 5.55545L14.4446 6.05545L14.9446 6.05545V5.55545H14.4446ZM1.55566 5.55546L1.05566 5.55545L1.05566 6.05546L1.55566 6.05546L1.55566 5.55546ZM1.5557 2.44436L1.5557 1.94436L1.05571 1.94436L1.0557 2.44435L1.5557 2.44436ZM13.1112 5.55546H12.6112V13.5555H13.1112H13.6112V5.55546H13.1112ZM2.889 13.5555H3.389L3.38901 5.55546L2.88901 5.55546L2.38901 5.55546L2.389 13.5555H2.889ZM14.4446 2.44434H13.9446V5.55545H14.4446H14.9446V2.44434H14.4446ZM1.55566 5.55546L2.05566 5.55547L2.0557 2.44436L1.5557 2.44436L1.0557 2.44435L1.05566 5.55545L1.55566 5.55546ZM6.22234 8.22213V8.72213H9.7779V8.22213V7.72213H6.22234V8.22213ZM13.1112 13.5555V13.0555H2.889V13.5555V14.0555H13.1112V13.5555ZM1.5557 2.44436L1.5557 2.94436L14.4446 2.94434L14.4446 2.44434L14.4446 1.94434L1.5557 1.94436L1.5557 2.44436ZM14.4446 5.55545L14.4446 5.05545L1.55566 5.05546L1.55566 5.55546L1.55566 6.05546L14.4446 6.05545L14.4446 5.55545Z" fill="currentColor"/>`,
  },
  // Solar's artwork is spread **last** so a name it defines wins over the hand-drawn entry above. The order
  // is load-bearing and reads backwards from what looks tidy: spread first, every pre-existing name kept its
  // original artwork and only the names Solar introduces changed, which is exactly what it did the first time.
  // The sets stay separate rather than merged in place so the boundary stays a readable list.
  ...solar,
}

/** Icon names derived from the shared artwork, with no UI or runtime dependencies. */
export type IconName = keyof typeof icons | keyof typeof additionalIcons

/** The artwork catalog's names, in sprite order. */
export function iconNames() {
  // SAFETY: every key comes from one of the two artwork records that define IconName.
  return Array.from(new Set([...Object.keys(additionalIcons), ...Object.keys(icons)])) as IconName[]
}

/**
 * Narrows a name against the shared artwork catalog.
 * @param name - A name supplied by a caller, including names unknown to this build.
 */
export function isIconName(name: string): name is IconName {
  return Object.hasOwn(icons, name) || Object.hasOwn(additionalIcons, name)
}

/**
 * The SVG body and viewport for a known catalog name, with primary artwork taking precedence.
 * @param name - A name validated by the type or by `isIconName`.
 */
export function getIcon(name: IconName) {
  // SAFETY: IconName is the union of both catalogs' keys; an absent primary entry falls back to additional artwork.
  const icon = icons[name as keyof typeof icons]

  if (icon) return icon
  // SAFETY: the primary lookup ruled out its entries, so the remaining name belongs to additionalIcons.
  const key = name as keyof typeof additionalIcons

  return { body: additionalIcons[key], viewBox: additionalIconViewBox(key) }
}
